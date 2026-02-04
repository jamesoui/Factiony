import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReportPayload {
  contentType: 'review' | 'forum_post' | 'forum_reply';
  contentId: string;
  reportedUserId: string;
  reason: 'spam' | 'harassment' | 'hate' | 'illegal' | 'nsfw' | 'impersonation' | 'other';
  message?: string;
  contentUrl?: string;
  contentExcerpt?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const payload: ReportPayload = await req.json();

    const validContentTypes = ['review', 'forum_post', 'forum_reply'];
    const validReasons = ['spam', 'harassment', 'hate', 'illegal', 'nsfw', 'impersonation', 'other'];

    if (!validContentTypes.includes(payload.contentType)) {
      throw new Error('Invalid content type');
    }

    if (!validReasons.includes(payload.reason)) {
      throw new Error('Invalid reason');
    }

    if (payload.message && payload.message.length > 800) {
      throw new Error('Message too long (max 800 characters)');
    }

    if (payload.contentExcerpt && payload.contentExcerpt.length > 280) {
      payload.contentExcerpt = payload.contentExcerpt.substring(0, 280);
    }

    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentReports, error: checkError } = await supabase
      .from('content_reports')
      .select('id')
      .eq('reporter_user_id', user.id)
      .eq('content_id', payload.contentId)
      .gte('created_at', sixtySecondsAgo)
      .limit(1);

    if (checkError) {
      console.error('Error checking recent reports:', checkError);
    }

    if (recentReports && recentReports.length > 0) {
      throw new Error('Rate limit exceeded. Please wait before reporting again.');
    }

    const { data: reportData, error: insertError } = await supabase
      .from('content_reports')
      .insert({
        reporter_user_id: user.id,
        reported_user_id: payload.reportedUserId,
        content_type: payload.contentType,
        content_id: payload.contentId,
        reason: payload.reason,
        message: payload.message || null,
        content_excerpt: payload.contentExcerpt || null,
        content_url: payload.contentUrl || null,
        status: 'open',
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('Error inserting report:', insertError);
      throw new Error('Failed to create report');
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const reportsToEmail = Deno.env.get('REPORTS_TO_EMAIL') || 'moderation@factiony.com';
    const reportsFromEmail = Deno.env.get('REPORTS_FROM_EMAIL') || 'Factiony <no-reply@factiony.com>';

    if (resendApiKey) {
      try {
        const { data: reporterProfile } = await supabase
          .from('users')
          .select('email, username')
          .eq('id', user.id)
          .single();

        const reasonLabels: Record<string, string> = {
          spam: 'Spam / Publicité',
          harassment: 'Harcèlement',
          hate: 'Contenu haineux',
          illegal: 'Contenu illégal',
          nsfw: 'Contenu inapproprié (NSFW)',
          impersonation: 'Usurpation d\'identité',
          other: 'Autre',
        };

        const contentTypeLabels: Record<string, string> = {
          review: 'Critique',
          forum_post: 'Sujet de forum',
          forum_reply: 'Réponse de forum',
        };

        const emailBody = `
Nouveau signalement reçu sur Factiony

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS DU SIGNALEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID du signalement: ${reportData.id}
Date: ${new Date(reportData.created_at).toLocaleString('fr-FR')}
Type de contenu: ${contentTypeLabels[payload.contentType] || payload.contentType}
Raison: ${reasonLabels[payload.reason] || payload.reason}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UTILISATEURS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signalé par:
- ID: ${user.id}
- Username: ${reporterProfile?.username || 'N/A'}
- Email: ${reporterProfile?.email || 'N/A'}

Auteur signalé:
- ID: ${payload.reportedUserId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DÉTAILS DU CONTENU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID du contenu: ${payload.contentId}
URL: ${payload.contentUrl || 'N/A'}

${payload.contentExcerpt ? `Extrait:
${payload.contentExcerpt}
` : ''}
${payload.message ? `Message du signalement:
${payload.message}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vous pouvez gérer ce signalement dans le panneau d'administration Supabase.
        `.trim();

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: reportsFromEmail,
            to: reportsToEmail,
            subject: `[REPORT] ${contentTypeLabels[payload.contentType]} – ${reasonLabels[payload.reason]}`,
            text: emailBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          console.error('Resend API error:', errorText);
        } else {
          console.log('Email sent successfully via Resend');
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    } else {
      console.warn('RESEND_API_KEY not configured, skipping email notification');
    }

    return new Response(
      JSON.stringify({ ok: true, reportId: reportData.id }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in report-content function:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
