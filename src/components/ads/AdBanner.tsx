import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

type Props = {
  slot: string;
  className?: string;
};

export default function AdBanner({ slot, className = "" }: Props) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // noop (adblock / script not loaded / etc.)
    }
  }, [slot]);

  return (
    <div className={`my-8 w-full ${className}`}>
      <div className="mx-auto w-full max-w-[900px] px-3">
        <div className="mb-2 text-xs opacity-50">Publicité</div>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-8256533514731326"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
