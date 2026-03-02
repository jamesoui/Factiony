import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

type RecommendationItem = {
  slug: string;
  title: string;
  why: string;
  url?: string;
};

const RecommendationCard: React.FC<{ recommendations: RecommendationItem[] }> = ({ recommendations }) => {
  return (
    <div className="space-y-4">
      <p className="text-gray-100">Voilà 3 jeux pour toi :</p>
      {recommendations.map((r, i) => (
        <div key={i} className="border-l-2 border-orange-500 pl-4 py-2">
          <p className="text-gray-100 mb-1">🎮 <span className="font-semibold">{r.title}</span></p>
          <p className="text-gray-400 text-sm mb-2">{r.why}</p>
          
            href={r.url}
            className="text-orange-500 hover:text-orange-400 text-sm underline"
          >
            Pour en savoir plus sur {r.title}
          </a>
        </div>
      ))}
    </div>
  );
};

type Role = 'user' | 'assistant';

type ChatMessage = {
  role: Role;
  content: string;
};

type AiRecoResponse = {
  recommendations?: Array<{ slug: string; title: string; why: string; url?: string }>;
  follow_up_question?: string;
  answer?: string;
  has_community_context?: boolean;
};

const QUICK_PROMPTS = [
  { label: '🎮 Recommande-moi un jeu', prompt: 'Recommande-moi un jeu en ce moment' },
  { label: '⚔️ Comment battre ce boss ?', prompt: 'Comment je bats ce boss difficile ?' },
  { label: '🏗️ Meilleur build ?', prompt: 'Quel est le meilleur build en ce moment ?' },
  { label: '💡 Tips & tricks', prompt: 'Donne-moi des tips utiles' },
];

export default function AssistantPage() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Joueur';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: user
        ? `Salut ${firstName} 👋\n\nOn joue à quoi aujourd'hui ?\n\nJe peux te recommander des jeux basé sur tes goûts Factiony, répondre à tes questions gaming (boss, builds, strats), et utiliser la sagesse de notre communauté !`
        : `Salut 👋\n\nJe suis l'Assistant IA de Factiony.\n\nJe peux :\n• Te recommander des jeux\n• Répondre à tes questions gaming (boss, builds, strats)\n• Utiliser ton historique pour des conseils perso\n\nConnecte-toi pour des recos personnalisées !`,
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    document.title = 'Assistant IA Gaming - Factiony';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Assistant IA personnalisé pour tes recommandations de jeux et questions gaming. Basé sur ton historique Factiony.'
      );
    }
  }, []);

  async function sendMessage(query?: string) {
    const finalQuery = (query || input).trim();
    if (!finalQuery || loading) return;

    if (!query) setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: finalQuery }]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/ai-reco', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: finalQuery }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data: AiRecoResponse = await res.json();

if (data.recommendations?.length) {
  // Ajoute le message avec les recos
  setMessages((prev) => [...prev, { 
    role: 'assistant', 
    content: JSON.stringify({ type: 'recommendations', data: data.recommendations }) 
  }]);
} else if (data.answer) {
  // Ajoute le message texte normal
  const lines: string[] = [];
  
  if (data.answer) lines.push(data.answer);
  if (data.has_community_context) lines.push('\n💬 _Basé sur l\'expérience de la communauté Factiony_');
  if (data.follow_up_question) lines.push(`\n${data.follow_up_question}`);

  const responseText = lines.join('\n') || 'Je n\'ai pas trouvé de réponse.';

  setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);
}

      // Answer (gameplay, tips, etc)
      if (data.answer) {
        lines.push(data.answer);
      }

      // Community context badge
      if (data.has_community_context) {
        lines.push('\n💬 _Basé sur l\'expérience de la communauté Factiony_');
      }

      // Follow-up
      if (data.follow_up_question) {
        lines.push('');
        lines.push(data.follow_up_question);
      }

      const responseText = lines.join('\n') || 'Je n\'ai pas trouvé de réponse. Reformule ?';

      setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);

      // Save conversation
      if (user?.id) {
        await supabase
          .from('ai_conversations')
          .upsert({
            user_id: user.id,
            session_id: sessionId,
            messages: JSON.stringify([...messages, { role: 'user', content: finalQuery }, { role: 'assistant', content: responseText }]),
            last_query: finalQuery,
          })
          .catch(() => {});
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Désolé, j\'ai eu une erreur. Réessaie dans un instant.' }]);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          On joue à quoi aujourd'hui ? 🤖
        </h1>
        <p className="text-gray-400">
          {user ? 'Basé sur tes goûts Factiony' : 'Assistant gaming intelligent'}
        </p>
      </div>

      {/* Chat */}
      {messages.map((m, i) => {
  let isRecommendations = false;
  let recsData = null;
  
  try {
    const parsed = JSON.parse(m.content);
    if (parsed.type === 'recommendations') {
      isRecommendations = true;
      recsData = parsed.data;
    }
  } catch (e) {}

  return (
    <div key={i} className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`${m.role === 'user' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-100'} px-4 py-3 rounded-lg text-sm max-w-md`}>
        {isRecommendations && recsData ? (
          <RecommendationCard recommendations={recsData} />
        ) : (
          <div className="whitespace-pre-wrap">{m.content}</div>
        )}
      </div>
    </div>
  );
})}
        {loading && (
          <div className="text-gray-400 text-sm">
            ⏳ Factiony réfléchit…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p.prompt)}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium transition text-left truncate"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder='Ex: "Un jeu coop sur PS5" ou "Comment battre Malenia?"'
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition text-sm"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap"
        >
          Envoyer
        </button>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-500 text-xs">
        <p>Powered by Factiony AI • Les données Factiony rendent tes recos uniques</p>
      </div>
    </div>
  );
}