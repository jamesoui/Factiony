import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = signature.split(",").reduce((acc: Record<string, string>, part) => {
    const [key, value] = part.split("=");
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts["t"];
  const sig = parts["v1"];

  // Protection replay : rejeter si > 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    console.error("Webhook trop ancien, possible replay attack");
    return false;
  }

  const signedPayload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );

  const expectedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparaison en temps constant — résistant aux timing attacks
  const expectedBytes = new TextEncoder().encode(expectedSig);
  const sigBytes = new TextEncoder().encode(sig);
  if (expectedBytes.length !== sigBytes.length) return false;

  let result = 0;
  for (let i = 0; i < expectedBytes.length; i++) {
    result |= expectedBytes[i] ^ sigBytes[i];
  }
  return result === 0;
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  const valid = await verifyStripeSignature(body, signature, secret);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error("userId manquant dans metadata");
      return new Response("userId manquant", { status: 400 });
    }

    // 1. Annuler les anciens abonnements actifs
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "active");

    // 2. Créer le nouvel abonnement dans subscriptions
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan: "premium",
        status: "active",
        stripe_subscription_id: session.subscription,
        start_date: new Date().toISOString(),
      });

    if (subError) console.error("Erreur insert subscription:", subError);

    // 3. Mettre à jour is_premium sur users
    const { error: userError } = await supabase
      .from("users")
      .update({ is_premium: true, stripe_customer_id: session.customer })
      .eq("id", userId);

    if (userError) console.error("Erreur update user:", userError);

    console.log(`✅ Premium activé pour ${userId}`);
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;

    // Trouver le user via stripe_subscription_id
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", sub.id)
      .single();

    if (subscription) {
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", sub.id);

      await supabase
        .from("users")
        .update({ is_premium: false })
        .eq("id", subscription.user_id);

      console.log(`✅ Premium désactivé pour ${subscription.user_id}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});