import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

type Props = {
  slot: string;
  className?: string;

  /** compact = plus discret (style Letterboxd) */
  variant?: "compact" | "default";

  /** libellé au-dessus de l’annonce */
  label?: string;

  /** limite la hauteur de la zone (évite la bannière énorme) */
  maxHeight?: number; // ex: 90

  /** centre + largeur max (par défaut style "barre" discrète) */
  maxWidth?: number; // ex: 980
};

export default function AdBanner({
  slot,
  className = "",
  variant = "compact",
  label = "Publicité",
  maxHeight = 90,
  maxWidth = 980,
}: Props) {
  const id = useId();
  const requestedRef = useRef(false);

  useEffect(() => {
    // Evite de "push" plusieurs fois sur le même rendu (StrictMode/dev + re-renders)
    if (requestedRef.current) return;
    requestedRef.current = true;

    // Laisse le script Adsense se charger
    const t = window.setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // noop (adblock / script not loaded / etc.)
      }
    }, 50);

    return () => window.clearTimeout(t);
  }, [slot]);

  const isCompact = variant === "compact";

  return (
    <div
      className={[
        "w-full",
        isCompact ? "my-3" : "my-8",
        className,
      ].join(" ")}
      aria-label={`AdSense slot ${slot}`}
    >
      <div className="mx-auto w-full px-3" style={{ maxWidth }}>
        {/* Header discret, façon Letterboxd */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] tracking-wide text-gray-400/70 uppercase">
            {label}
          </span>
          <span className="text-[11px] text-gray-500/60">•</span>
        </div>

        {/* Container qui évite les énormes formats auto */}
        <div
          className={[
            "relative overflow-hidden rounded-lg border border-white/10",
            "bg-white/[0.03]",
            isCompact ? "py-2" : "py-4",
          ].join(" ")}
          style={{ maxHeight }}
        >
          <ins
            key={`${slot}-${id}`}
            className="adsbygoogle"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
            }}
            data-ad-client="ca-pub-8256533514731326"
            data-ad-slot={slot}
            // IMPORTANT: "auto" peut générer des formats énormes.
            // On force un banner responsive plus contenu.
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />

          {/* petit spacer pour éviter le "collage" */}
          <div className="pointer-events-none absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
