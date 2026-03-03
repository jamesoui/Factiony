import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

type Role = 'user' | 'assistant' | 'recommendations';

type ChatMessage = {
  role: Role;
  content: string;
  recommendations?: Array<{ slug: string; title: string; why: string; url?: string }>;
};

type AiRecoResponse = {
  recommendations?: Array<{ slug: string; title: string; why: string; url?: string }>;
  follow_up_question?: string;
  answer?: string;
  has_community_context?: boolean;
  personal_message?: string;
};

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

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const data: AiRecoResponse = await res.json();
      let hasAddedRecos = false;

      // Si ce sont des recos
      if (data.recommendations?.length) {
        setMessages((prev) => [...prev, {
          role: 'recommendations',
          content: '',
          recommendations: data.recommendations,
        }]);
        hasAddedRecos = true;
      }

      // Si c'est une réponse texte
      if (data.answer) {
        const lines: string[] = [data.answer];
        if (data.has_community_context) lines.push('\n💬 _Basé sur l\'expérience de la communauté Factiony_');
        if (data.follow_up_question) lines.push(`\n${data.follow_up_question}`);

        setMessages((prev) => [...prev, { role: 'assistant', content: lines.join('\n') }]);
      }

      // Ajoute le message perso SEULEMENT si recos et message perso existe
      if (hasAddedRecos && data.recommendations?.length && data.personal_message) {
        const followUp = `\n\n📱 ${data.personal_message}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: followUp }]);
      }

      // Sauvegarde conversation
      if (user?.id) {
  try {
    await supabase
      .from('ai_conversations')
      .upsert({
        user_id: user.id,
        session_id: sessionId,
        messages: JSON.stringify([...messages, { role: 'user', content: finalQuery }]),
        last_query: finalQuery,
      });
  } catch (saveErr) {
    console.error('Save error:', saveErr);
  }
}
    } catch (e: any) {
      console.error('Error:', e);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: 'Désolé, j\'ai eu une erreur technique. Réessaie dans un instant.' 
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">On joue à quoi aujourd'hui ? 🤖</h1>
        <p className="text-gray-400">{user ? 'Basé sur tes goûts Factiony' : 'Assistant gaming intelligent'}</p>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-96 overflow-y-auto mb-6">
        {messages.map((m, i) => (
          <div key={i}>
            {m.role === 'user' && (
              <div className="mb-4 flex justify-end">
                <div className="max-w-md px-4 py-3 rounded-lg whitespace-pre-wrap text-sm bg-orange-600 text-white rounded-br-none">
                  {m.content}
                </div>
              </div>
            )}

            {m.role === 'assistant' && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-md px-4 py-3 rounded-lg whitespace-pre-wrap text-sm bg-gray-700 text-gray-100 rounded-bl-none">
                  {m.content}
                </div>
              </div>
            )}

            {m.role === 'recommendations' && m.recommendations && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-md px-4 py-3 rounded-lg bg-gray-700 rounded-bl-none w-full">
                  <p className="text-gray-100 font-semibold mb-3">Voilà 3 jeux pour toi :</p>
                  <div className="space-y-3">
                    {m.recommendations.map((r, idx) => (
                      <div key={idx} className="border-l-2 border-orange-500 pl-3 py-2">
                        <p className="text-gray-100 text-sm mb-1">🎮 <span className="font-semibold">{r.title}</span></p>
                        <p className="text-gray-400 text-xs mb-2">{r.why}</p>
                        <a 
                          href={r.url || '#'} 
                          target='_blank' 
                          rel='noopener noreferrer' 
                          className='text-orange-400 hover:text-orange-300 text-xs underline'
                        >
                          Pour en savoir plus sur {r.title}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="text-gray-400 text-sm">⏳ Factiony réfléchit…</div>
        )}
        <div ref={bottomRef} />
      </div>

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

      <div className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-500 text-xs">
        <p>Powered by Factiony AI • Les données Factiony rendent tes recos uniques</p>
      </div>
    </div>
  );
}