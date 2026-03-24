import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Trash2, Plus, AlertCircle } from 'lucide-react';

type Role = 'user' | 'assistant' | 'recommendations';

type ChatMessage = {
  role: Role;
  content: string;
  recommendations?: Array<{ slug: string; title: string; summary?: string; why: string; url?: string }>;
};

type AiRecoResponse = {
  recommendations?: Array<{ slug: string; title: string; summary?: string; why: string; url?: string }>;
  follow_up_question?: string;
  answer?: string;
  has_community_context?: boolean;
  personal_message?: string;
  tokens_used?: number;
  error?: string;
  message?: string;
};

type Conversation = {
  user_id: string;
  session_id: string;
  last_query: string;
  updated_at: string;
};

export default function AssistantPage() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Joueur';
  const userPseudo = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Gamer';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: user
        ? `Salut ${firstName} 👋\n\nOn joue à quoi aujourd'hui ?\n\nJe peux te recommander des jeux basé sur tes goûts Factiony, répondre à tes questions gaming (boss, builds, strats), et utiliser la sagesse de notre communauté !`
        : `Salut 👋\n\nJe suis Albus, l'Assistant IA de Factiony.\n\nJe peux :\n• Te recommander des jeux\n• Répondre à tes questions gaming (boss, builds, strats)\n• Utiliser ton historique pour des conseils perso\n\nConnecte-toi pour des recos personnalisées !`,
    },
  ]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tokenStatus, setTokenStatus] = useState<{ used: number; limit: number; tier: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (user?.id) {
      loadConversations();
      loadTokenStatus();
    }
  }, [user?.id]);

  async function loadTokenStatus() {
    if (!user?.id) return;

    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('token_usage')
        .select('tokens_used')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .single();

      const tier = user.app_metadata?.tier === 'premium' ? 'premium' : 'free';
      const limit = tier === 'premium' ? 100000 : 15000;
      const used = data?.tokens_used ?? 0;

      setTokenStatus({ used, limit, tier });
    } catch (e) {
      console.error('Token status error:', e);
    }
  }

  async function loadConversations() {
    if (!user?.id) {
      setConversations([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('user_id, session_id, last_query, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading conversations:', error);
        setConversations([]);
      } else {
        setConversations(data ?? []);
      }
    } catch (e) {
      console.error('Load conversations error:', e);
      setConversations([]);
    }
  }

  async function loadConversation(sessionId: string) {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .single();

      if (error) {
        console.error('Error loading conversation:', error);
        return;
      }

      if (data?.messages) {
        setMessages(JSON.parse(data.messages));
      }
    } catch (e) {
      console.error('Load conversation error:', e);
    }
  }

  async function deleteConversation(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error deleting conversation:', error);
      } else {
        loadConversations();
      }
    } catch (e) {
      console.error('Delete conversation error:', e);
    }
  }

  function startNewConversation() {
    setMessages([
      {
        role: 'assistant',
        content: `Salut ${firstName} 👋\n\nOn joue à quoi aujourd'hui ?\n\nJe peux te recommander des jeux basé sur tes goûts Factiony, répondre à tes questions gaming (boss, builds, strats), et utiliser la sagesse de notre communauté !`,
      },
    ]);
    setError(null);
  }

  async function sendMessage(query?: string) {
    const finalQuery = (query || input).trim();
    if (!finalQuery || loading) return;

    if (!query) setInput('');
    setError(null);

    setMessages((prev) => [...prev, { role: 'user', content: finalQuery }]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const tier = user?.app_metadata?.tier === 'premium' ? 'premium' : 'free';

      const res = await fetch('/api/ai-reco', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ 
          query: finalQuery,
          user_pseudo: userPseudo,
          user_id: user?.id || '',
          tier: tier,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const data: AiRecoResponse = await res.json();

      // Check for token limit error
      if (data.error === 'token_limit_exceeded') {
        setError(data.message || 'Token limit reached');
        setMessages((prev) => [...prev, { 
          role: 'assistant', 
          content: '⚠️ ' + (data.message || 'Limite de tokens atteinte. Upgrade à premium pour illimité!')
        }]);
        return;
      }

      let hasAddedRecos = false;

      if (data.recommendations?.length) {
        setMessages((prev) => [...prev, {
          role: 'recommendations',
          content: '',
          recommendations: data.recommendations,
        }]);
        hasAddedRecos = true;
      }

      if (data.answer) {
        const lines: string[] = [data.answer];
        if (data.has_community_context) lines.push('\n💬 _Basé sur l\'expérience de la communauté Factiony_');
        if (data.follow_up_question) lines.push(`\n${data.follow_up_question}`);

        setMessages((prev) => [...prev, { role: 'assistant', content: lines.join('\n') }]);
      }

      if (hasAddedRecos && data.recommendations?.length && data.personal_message) {
        const followUp = `${data.personal_message}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: followUp }]);
      }

      // Update token status
      if (data.tokens_used) {
        setTokenStatus(prev => prev ? { ...prev, used: prev.used + data.tokens_used } : null);
      }

      if (user?.id) {
        try {
          const newMessages = [...messages, { role: 'user' as Role, content: finalQuery }];
          await supabase
            .from('ai_conversations')
            .upsert({
              user_id: user.id,
              session_id: sessionId,
              messages: JSON.stringify(newMessages),
              last_query: finalQuery,
            });

          loadConversations();
        } catch (saveErr) {
          console.error('Save error:', saveErr);
        }
      }
    } catch (e: any) {
      console.error('Error:', e);
      const errorMsg = e.message || 'Erreur technique. Réessaie.';
      setError(errorMsg);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: 'Désolé, j\'ai eu une erreur. Réessaie dans un instant.' 
      }]);
    } finally {
      setLoading(false);
    }
  }

  document.title = 'Albus - Assistant Gaming Factiony';

  const tokenPercentage = tokenStatus ? (tokenStatus.used / tokenStatus.limit) * 100 : 0;
  const isLowOnTokens = tokenPercentage > 80;

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      {user && (
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all bg-gray-800 border-r border-gray-700 overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={startNewConversation}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              <Plus size={18} />
              Nouvelle conv.
            </button>
          </div>

          {/* Token Status */}
          {tokenStatus && (
            <div className="p-4 border-b border-gray-700">
              <p className="text-xs text-gray-400 font-semibold mb-2">Tokens {tokenStatus.tier}</p>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${isLowOnTokens ? 'bg-red-500' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {tokenStatus.used} / {tokenStatus.limit}
              </p>
              {isLowOnTokens && tokenStatus.tier === 'free' && (
                <p className="text-xs text-red-400 mt-2">Presque à limite. Upgrade premium!</p>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs text-gray-400 font-semibold mb-3">Historique</p>
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune conversation</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.session_id}
                  onClick={() => loadConversation(conv.session_id)}
                  className="group relative bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition text-left"
                >
                  <p className="text-xs font-medium text-white truncate">{conv.last_query}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                  <button
                    onClick={(e) => deleteConversation(conv.session_id, e)}
                    className="opacity-0 group-hover:opacity-100 absolute right-2 top-3 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold">Albus</span>
              <div>
                <h1 className="text-2xl font-bold text-white">On joue avec Albus 🤖</h1>
                <p className="text-sm text-gray-400">{user ? 'Basé sur tes goûts Factiony' : 'Assistant gaming intelligent'}</p>
              </div>
            </div>
            {user && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-white transition px-4"
              >
                {sidebarOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900 border-b border-red-700 p-3">
            <div className="flex items-center gap-2 max-w-5xl mx-auto text-red-200">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 min-h-96">
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
                        <p className="text-gray-100 font-semibold mb-3">Voilà {m.recommendations.length} jeu{m.recommendations.length > 1 ? 'x' : ''} pour toi :</p>
                        <div className="space-y-3">
                          {m.recommendations.map((r, idx) => (
                            <div key={idx} className="border-l-2 border-orange-500 pl-3 py-2">
                              <p className="text-gray-100 text-sm mb-1">🎮 <span className="font-semibold">{r.title}</span></p>
                              {r.summary && (
                                <p className="text-gray-300 text-xs mb-2">{r.summary}</p>
                              )}
                              <p className="text-gray-400 text-xs mb-2">{r.why}</p>
                              {r.url && (
                                <a 
                                  href={r.url}
                                  target='_blank' 
                                  rel='noopener noreferrer' 
                                  className='text-orange-400 hover:text-orange-300 text-xs underline block'
                                >
                                  Pour en savoir plus sur {r.title}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="mb-4 flex justify-start">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="animate-spin">⏳</div>
                    <span>Albus réfléchit…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-3xl mx-auto">
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
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition text-sm"
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
            <p className="text-xs text-gray-500 mt-2 text-center">Powered by Albus AI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
