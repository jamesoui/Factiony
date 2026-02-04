import { useState } from "react"

export default function PremiumButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      // Appel vers ta fonction Supabase Edge
      const response = await fetch(
        "https://ffcocumtwoyydgsuhwxi.supabase.co/functions/v1/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      )

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url // Redirige l’utilisateur vers Stripe Checkout
      } else {
        console.error("Pas d’URL renvoyée :", data)
      }
    } catch (err) {
      console.error("Erreur paiement:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        background: "#635BFF",
        color: "white",
        padding: "10px 20px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
      }}
    >
      {loading ? "Redirection..." : "Passer à Premium"}
    </button>
  )
}
