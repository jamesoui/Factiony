import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const id = parts[parts.length - 1];
    const format = url.searchParams.get('format') === 'story' ? 'story' : 'square';

    if (!id) return new Response('Missing id', { status: 400 });

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: review } = await supabase
      .from('game_ratings')
      .select('id, user_id, game_id, rating, review_text')
      .eq('id', id)
      .maybeSingle();

    if (!review) return new Response('Review not found', { status: 404 });

    const [{ data: userData }, { data: gameData }] = await Promise.all([
      supabase.from('users').select('username').eq('id', review.user_id).maybeSingle(),
      supabase.from('games').select('name, cover, background_image').eq('id', review.game_id).maybeSingle(),
    ]);

    const username = userData?.username ?? 'Anonymous';
    const gameName = gameData?.name ?? 'Jeu inconnu';
    const coverUrl = gameData?.cover ?? gameData?.background_image ?? null;
    const rating = Math.round(review.rating * 10) / 10;
    const reviewText = review.review_text
      ? review.review_text.slice(0, 180) + (review.review_text.length > 180 ? '…' : '')
      : '';

    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    const BG = '#0d1117';
    const ORANGE = '#f97316';
    const MUTED = '#8892a4';
    const WHITE = '#ffffff';

    const Stars = ({ size }: { size: number }) => (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg key={`f${i}`} width={size} height={size} viewBox="0 0 16 16">
            <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,11.5 3.5,15 5,9.5 1,6 6,6" fill="#f97316" />
          </svg>
        ))}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg key={`e${i}`} width={size} height={size} viewBox="0 0 16 16">
            <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,11.5 3.5,15 5,9.5 1,6 6,6" fill="#2a3040" />
          </svg>
        ))}
      </div>
    );

    const Logo = ({ size }: { size: number }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <path fill="url(#lg)" d="M20 15 L80 15 L80 25 L30 25 L30 45 L70 45 L70 55 L30 55 L30 85 L20 85 Z" />
        </svg>
        <span style={{ fontSize: size * 0.75, fontWeight: 700, color: ORANGE, letterSpacing: '0.05em' }}>FACTIONY</span>
      </div>
    );

    const Cover = ({ height }: { height: number }) => (
      <div style={{ width: '100%', height: `${height}px`, position: 'relative', display: 'flex', overflow: 'hidden' }}>
        {coverUrl
          ? <img src={coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1a2d4a,#0d1f38)', display: 'flex' }} />
        }
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${height * 0.4}px`, background: `linear-gradient(to bottom,transparent,${BG})`, display: 'flex' }} />
      </div>
    );

    if (format === 'square') {
      return new ImageResponse(
        <div style={{ width: '1080px', height: '1080px', background: BG, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
          <div style={{ width: '100%', height: '5px', background: 'linear-gradient(90deg,#ea580c,#f97316)', display: 'flex' }} />
          <Cover height={460} />
          <div style={{ flex: 1, padding: '36px 64px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '22px', color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Critique</span>
            <span style={{ fontSize: '54px', fontWeight: 700, color: WHITE, lineHeight: 1.1 }}>{gameName}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Stars size={28} />
              <span style={{ fontSize: '28px', color: ORANGE, fontWeight: 700 }}>{rating} / 5</span>
            </div>
            {reviewText && <span style={{ fontSize: '27px', color: MUTED, lineHeight: 1.5, fontStyle: 'italic' }}>"{reviewText}"</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 64px 40px', borderTop: '1px solid rgba(249,115,22,0.2)', marginTop: '16px' }}>
            <span style={{ fontSize: '24px', color: MUTED }}>par @{username}</span>
            <Logo size={32} />
          </div>
        </div>,
        { width: 1080, height: 1080 }
      );
    }

    return new ImageResponse(
      <div style={{ width: '1080px', height: '1920px', background: BG, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
        <div style={{ width: '100%', height: '5px', background: 'linear-gradient(90deg,#ea580c,#f97316)', display: 'flex' }} />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '70px 0 50px' }}>
          <Logo size={42} />
        </div>
        <Cover height={860} />
        <div style={{ flex: 1, padding: '60px 80px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{ fontSize: '30px', color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Critique</span>
          <span style={{ fontSize: '74px', fontWeight: 700, color: WHITE, lineHeight: 1.1 }}>{gameName}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Stars size={34} />
            <span style={{ fontSize: '36px', color: ORANGE, fontWeight: 700 }}>{rating} / 5</span>
          </div>
          {reviewText && <span style={{ fontSize: '36px', color: MUTED, lineHeight: 1.6, fontStyle: 'italic' }}>"{reviewText}"</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 80px 100px', borderTop: '1px solid rgba(249,115,22,0.2)', marginTop: '40px' }}>
          <span style={{ fontSize: '30px', color: MUTED }}>@{username}</span>
          <span style={{ fontSize: '28px', color: ORANGE }}>factiony.com</span>
        </div>
      </div>,
      { width: 1080, height: 1920 }
    );

  } catch (err) {
    console.error('OG error:', err);
    return new Response('Error generating image', { status: 500 });
  }
}
