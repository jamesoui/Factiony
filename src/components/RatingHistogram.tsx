// RatingHistogram.tsx
// À placer entre la section Stats et le Top 4 dans la page Profil
// Dépendances : aucune (CSS Tailwind + variables CSS existantes de Factiony)

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // adapte le chemin si besoin

// ─── Types ────────────────────────────────────────────────────────────────────

interface RatingHistogramProps {
  userId: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// Toutes les valeurs possibles de ½ en ½ (comme Letterboxd)
const RATING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

// Labels étoiles pleines affichés sous l'histogramme (1 → 2 → 3 → 4 → 5)
const STAR_LABELS = [1, 2, 3, 4, 5];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function RatingHistogram({ userId }: RatingHistogramProps) {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRatings() {
      setLoading(true);

      // ⚠️  Adapte "game_ratings" et la colonne "rating" à ton vrai nom de table
      const { data, error } = await supabase
        .from("game_ratings")
        .select("rating")
        .eq("user_id", userId);

      if (error) {
        console.error("RatingHistogram fetch error:", error.message);
        setLoading(false);
        return;
      }

      // Initialise tous les steps à 0
      const map: Record<number, number> = {};
      RATING_STEPS.forEach((s) => (map[s] = 0));

      // Comptage
      data?.forEach(({ rating }) => {
        const rounded = Math.round(rating * 2) / 2; // normalise en 0.5 steps
        if (map[rounded] !== undefined) map[rounded]++;
      });

      setCounts(map);
      setLoading(false);
    }

    if (userId) fetchRatings();
  }, [userId]);

  const maxCount = Math.max(...Object.values(counts), 1);
  const totalRatings = Object.values(counts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="rating-histogram rating-histogram--skeleton">
        {RATING_STEPS.map((s) => (
          <div key={s} className="rating-histogram__bar-wrap">
            <div
              className="rating-histogram__bar rating-histogram__bar--skeleton"
              style={{ height: "40%" }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (totalRatings === 0) return null; // pas de note → on n'affiche rien

  return (
    <section className="rating-histogram-section">
      <h3 className="rating-histogram-section__title">Distribution des notes</h3>

      <div className="rating-histogram" role="img" aria-label="Histogramme des notes">
        {RATING_STEPS.map((step) => {
          const count = counts[step] ?? 0;
          const heightPct = Math.round((count / maxCount) * 100);
          const isHalf = step % 1 !== 0; // demi-étoile → barre plus fine / teinte différente

          return (
            <div
              key={step}
              className={`rating-histogram__bar-wrap ${isHalf ? "rating-histogram__bar-wrap--half" : ""}`}
              title={`${step}★ — ${count} jeu${count > 1 ? "x" : ""}`}
            >
              <div
                className={`rating-histogram__bar ${isHalf ? "rating-histogram__bar--half" : ""}`}
                style={{ height: `${Math.max(heightPct, count > 0 ? 4 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Axe étoiles */}
      <div className="rating-histogram__axis">
        {STAR_LABELS.map((n) => (
          <span key={n} className="rating-histogram__axis-label">
            {"★".repeat(n)}
          </span>
        ))}
      </div>
    </section>
  );
}
