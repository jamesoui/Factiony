import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  MessageCircle,
  Eye,
  ThumbsUp,
  Pin,
  Lock,
  AlertTriangle,
  ChevronLeft,
  Clock,
  TrendingUp,
  Flame,
  Trash2,
  CornerDownRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthGuard } from '../contexts/AuthGuardContext';
import ContentActionsMenu from './ContentActionsMenu';
import * as LucideIcons from 'lucide-react';
import {
  getCategories,
  getThreads,
  searchThreads,
  getThreadById,
  getThreadPosts,
  createThread,
  createPost,
  deleteThread,
  deletePost,
  incrementThreadViews,
  ForumCategory,
  ForumThread,
  ForumPost,
} from '../lib/api/forum';
import { supabase } from '../lib/supabaseClient';

interface GameForumProps {
  gameId: string;
  gameName: string;
}

const SpoilerText: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {!isRevealed && (
        <div
          className="absolute inset-0 bg-gray-700/90 backdrop-blur-sm rounded flex items-center justify-center z-10 cursor-pointer hover:bg-gray-700/80 transition-colors"
          onClick={() => setIsRevealed(true)}
        >
          <div className="text-center px-4">
            <AlertTriangle className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <span className="text-yellow-400 text-sm font-medium">Contenu masqué (spoilers)</span>
            <p className="text-gray-400 text-xs mt-1">Cliquez pour révéler</p>
          </div>
        </div>
      )}
      <div className={`transition-all duration-300 ${!isRevealed ? 'blur-sm select-none' : ''}`}>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

interface PostItemProps {
  post: ForumPost;
  userId: string | undefined;
  level: number;
  onLike: (postId: string) => void;
  onDelete: (postId: string) => void;
  onReply: (postId: string, username: string) => void;
}

const PostItem: React.FC<PostItemProps> = ({ post, userId, level, onLike, onDelete, onReply }) => {
  const marginLeft = level * 32;

  return (
    <div className="space-y-4">
      <div
        className={`bg-gray-800/30 rounded-lg p-5 border border-gray-700/30 ${level > 0 ? 'ml-8' : ''}`}
      >
        {level > 0 && (
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
            <CornerDownRight className="h-4 w-4" />
            <span>En réponse</span>
          </div>
        )}
        <div className="flex items-start gap-4">
          {post.author?.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={post.author.username}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm flex-shrink-0">
              {post.author?.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-300">
                  {post.author?.username || 'Utilisateur'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(post.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {post.author_id && (
                <ContentActionsMenu
                  authorUserId={post.author_id}
                  authorUsername={post.author?.username}
                  contentType="forum_reply"
                  contentId={post.id}
                  contentUrl={`${window.location.origin}/forum/post/${post.id}`}
                  contentExcerpt={post.body}
                />
              )}
            </div>

            {post.contains_spoilers ? (
              <SpoilerText content={post.body} className="text-gray-300 mb-3" />
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap mb-3 leading-relaxed">{post.body}</p>
            )}

            <div className="flex items-center gap-4">
              <button
                onClick={() => onLike(post.id)}
                className={`flex items-center gap-1 text-sm transition-colors ${
                  post.is_liked
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-blue-400'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{post.like_count || 0}</span>
              </button>
              <button
                onClick={() => onReply(post.id, post.author?.username || 'Utilisateur')}
                className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Répondre
              </button>
              {userId && userId === post.author_id && (
                <button
                  onClick={() => onDelete(post.id)}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors text-sm ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {post.replies && post.replies.length > 0 && (
        <div className="space-y-4">
          {post.replies.map((reply) => (
            <PostItem
              key={reply.id}
              post={reply}
              userId={userId}
              level={level + 1}
              onLike={onLike}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const GameForum: React.FC<GameForumProps> = ({ gameId, gameName }) => {
  const { user } = useAuth();
  const { withAuthCheck } = useAuthGuard();

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [threadPosts, setThreadPosts] = useState<ForumPost[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'activity' | 'replies' | 'likes'>('activity');
  const [loading, setLoading] = useState(true);

  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');
  const [newThreadSpoilers, setNewThreadSpoilers] = useState(false);

  const [newPostBody, setNewPostBody] = useState('');
  const [newPostSpoilers, setNewPostSpoilers] = useState(false);
  const [replyToPostId, setReplyToPostId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadThreads();
    }
  }, [gameId, selectedCategory, searchQuery, sortBy]);

  useEffect(() => {
    if (selectedThread) {
      loadThreadPosts();
      incrementThreadViews(selectedThread.id);
    }
  }, [selectedThread]);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadThreads = async () => {
    if (!selectedCategory) return;

    try {
      let results: ForumThread[];

      if (searchQuery.trim()) {
        results = await searchThreads({
          gameId,
          searchQuery: searchQuery.trim(),
          categoryId: selectedCategory.id,
          sortBy: sortBy === 'activity' ? 'activity' : sortBy === 'replies' ? 'replies' : 'likes',
          limit: 50,
        });
      } else {
        results = await getThreads({
          gameId,
          categoryId: selectedCategory.id,
          sortBy,
          limit: 50,
        });
      }

      setThreads(results);
    } catch (error) {
      console.error('Error loading threads:', error);
    }
  };

  const loadThreadPosts = async () => {
    if (!selectedThread) return;
    try {
      const posts = await getThreadPosts(selectedThread.id);
      setThreadPosts(posts);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadBody.trim() || !selectedCategory) return;

    try {
      await createThread({
        gameId,
        categoryId: selectedCategory.id,
        title: newThreadTitle,
        body: newThreadBody,
        containsSpoilers: newThreadSpoilers,
      });

      setNewThreadTitle('');
      setNewThreadBody('');
      setNewThreadSpoilers(false);
      setShowCreateThread(false);
      loadThreads();
    } catch (error) {
      console.error('Error creating thread:', error);
      alert('Erreur lors de la création du sujet');
    }
  };

  const handleCreatePost = async () => {
    if (!selectedThread || !newPostBody.trim()) return;

    try {
      await createPost(selectedThread.id, newPostBody, newPostSpoilers, replyToPostId);
      setNewPostBody('');
      setNewPostSpoilers(false);
      setReplyToPostId(null);
      loadThreadPosts();

      const updated = await getThreadById(selectedThread.id);
      if (updated) setSelectedThread(updated);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Erreur lors de la création de la réponse');
    }
  };

  const handleThreadLike = async (threadId: string) => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) return;

      const { data: existing, error: selErr } = await supabase
        .from("forum_thread_likes")
        .select("thread_id")
        .eq("thread_id", threadId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (selErr) throw selErr;

      if (existing) {
        await supabase
          .from("forum_thread_likes")
          .delete()
          .eq("thread_id", threadId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("forum_thread_likes")
          .insert({ thread_id: threadId, user_id: user.id });
      }

      loadThreads();
      if (selectedThread?.id === threadId) {
        const updated = await getThreadById(threadId);
        if (updated) setSelectedThread(updated);
      }
    } catch (e) {
      console.error("Error toggling thread like:", e);
    }
  };

  const handlePostLike = async (postId: string) => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        console.warn("User not authenticated");
        return;
      }

      const { data: existing, error: selErr } = await supabase
        .from("forum_post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (selErr) throw selErr;

      if (existing) {
        await supabase
          .from("forum_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("forum_post_likes")
          .insert({ post_id: postId, user_id: user.id });
      }

      await loadThreadPosts();
    } catch (e) {
      console.error("Error toggling post like:", e);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce sujet ? Cette action est irréversible.')) {
      return;
    }

    try {
      await deleteThread(threadId);
      setSelectedThread(null);
      loadThreads();
    } catch (error) {
      console.error('Error deleting thread:', error);
      alert('Erreur lors de la suppression du sujet');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réponse ? Cette action est irréversible.')) {
      return;
    }

    try {
      await deletePost(postId);
      loadThreadPosts();
      if (selectedThread) {
        const updated = await getThreadById(selectedThread.id);
        if (updated) setSelectedThread(updated);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Erreur lors de la suppression de la réponse');
    }
  };

  const handleReplyToPost = (postId: string, username: string) => {
    setReplyToPostId(postId);
    setNewPostBody(`@${username} `);
    // Scroll to reply form
    setTimeout(() => {
      const replyForm = document.getElementById('reply-form');
      if (replyForm) {
        replyForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const textarea = replyForm.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }
    }, 100);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || MessageCircle;
  };

  const countTotalPosts = (posts: ForumPost[]): number => {
    let count = posts.length;
    posts.forEach(post => {
      if (post.replies && post.replies.length > 0) {
        count += countTotalPosts(post.replies);
      }
    });
    return count;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Chargement du forum...</div>
      </div>
    );
  }

  if (selectedThread) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedThread(null)}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux discussions
        </button>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-start gap-4 mb-4">
            {selectedThread.author?.avatar_url ? (
              <img
                src={selectedThread.author.avatar_url}
                alt={selectedThread.author.username}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                {selectedThread.author?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedThread.is_pinned && <Pin className="h-4 w-4 text-yellow-400" />}
                  {selectedThread.is_locked && <Lock className="h-4 w-4 text-gray-400" />}
                  <h2 className="text-xl font-semibold text-white">{selectedThread.title}</h2>
                </div>
                {selectedThread.author_id && (
                  <ContentActionsMenu
                    authorUserId={selectedThread.author_id}
                    authorUsername={selectedThread.author?.username}
                    contentType="forum_post"
                    contentId={selectedThread.id}
                    contentUrl={`${window.location.origin}/forum/${selectedThread.id}`}
                    contentExcerpt={selectedThread.body}
                  />
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <span className="font-medium text-gray-300">
                  {selectedThread.author?.username || 'Utilisateur'}
                </span>
                <span>•</span>
                <span>{new Date(selectedThread.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</span>
                {selectedThread.category && (
                  <>
                    <span>•</span>
                    <span className="text-blue-400">{selectedThread.category.name}</span>
                  </>
                )}
              </div>

              {selectedThread.contains_spoilers ? (
                <SpoilerText content={selectedThread.body} className="text-gray-300" />
              ) : (
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedThread.body}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
            <div className="flex items-center gap-6">
              <button
                onClick={() => handleThreadLike(selectedThread.id)}
                className={`flex items-center gap-2 transition-colors ${
                  selectedThread.is_liked
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-blue-400'
                }`}
              >
                <ThumbsUp className="h-5 w-5" />
                <span className="font-medium">{selectedThread.like_count}</span>
              </button>
              <span className="flex items-center gap-2 text-gray-400">
                <MessageCircle className="h-5 w-5" />
                <span>{selectedThread.reply_count}</span>
              </span>
              <span className="flex items-center gap-2 text-gray-400">
                <Eye className="h-5 w-5" />
                <span>{selectedThread.view_count}</span>
              </span>
            </div>
            {user && user.id === selectedThread.author_id && (
              <button
                onClick={() => handleDeleteThread(selectedThread.id)}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            {(() => {
              const totalCount = countTotalPosts(threadPosts);
              return `${totalCount} ${totalCount === 1 ? 'Réponse' : 'Réponses'}`;
            })()}
          </h3>

          <div className="space-y-4">
            {threadPosts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
                userId={user?.id}
                level={0}
                onLike={handlePostLike}
                onDelete={handleDeletePost}
                onReply={handleReplyToPost}
              />
            ))}
          </div>
        </div>

        {!selectedThread.is_locked && (
          <div id="reply-form" className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-semibold">Répondre</h4>
              {replyToPostId && (
                <button
                  onClick={() => {
                    setReplyToPostId(null);
                    setNewPostBody('');
                  }}
                  className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Annuler la réponse
                </button>
              )}
            </div>
            <textarea
              value={newPostBody}
              onChange={(e) => setNewPostBody(e.target.value)}
              placeholder={replyToPostId ? "Répondre à ce commentaire..." : "Votre réponse..."}
              className="w-full bg-gray-800 text-white rounded-lg p-4 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
              rows={5}
            />
            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPostSpoilers}
                  onChange={(e) => setNewPostSpoilers(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600"
                />
                Contient des spoilers
              </label>
              <button
                onClick={() => {
                  if (user) {
                    handleCreatePost();
                  } else {
                    withAuthCheck(() => {});
                  }
                }}
                disabled={!newPostBody.trim()}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Publier
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 sticky top-4">
            <h3 className="text-white font-semibold mb-4">Catégories</h3>
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = getIconComponent(category.icon);
                const isSelected = selectedCategory?.id === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border-2 border-blue-500'
                        : 'bg-gray-700/30 border-2 border-transparent hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium mb-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {category.name}
                        </div>
                        <div className="text-xs text-gray-400 line-clamp-2">
                          {category.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {selectedCategory && (
            <>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher dans le forum..."
                      className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (user) {
                        setShowCreateThread(true);
                      } else {
                        withAuthCheck(() => {});
                      }
                    }}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <Plus className="h-5 w-5" />
                    Nouveau sujet
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Trier par:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy('activity')}
                      className={`text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        sortBy === 'activity'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      Récent
                    </button>
                    <button
                      onClick={() => setSortBy('replies')}
                      className={`text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        sortBy === 'replies'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      Populaire
                    </button>
                    <button
                      onClick={() => setSortBy('likes')}
                      className={`text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        sortBy === 'likes'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Flame className="h-4 w-4" />
                      Appréciés
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {threads.length === 0 ? (
                  <div className="bg-gray-800/30 rounded-xl p-12 border border-gray-700/30 text-center">
                    <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">Aucune discussion pour le moment</p>
                    <p className="text-sm text-gray-500">
                      Soyez le premier à créer un sujet dans cette catégorie
                    </p>
                  </div>
                ) : (
                  threads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className="bg-gray-800/30 hover:bg-gray-800/50 rounded-lg p-5 cursor-pointer transition-all border border-gray-700/30 hover:border-gray-700"
                    >
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {thread.is_pinned && <Pin className="h-4 w-4 text-yellow-400 flex-shrink-0" />}
                            {thread.is_locked && <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                            {thread.contains_spoilers && <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />}
                            <h4 className="text-white font-medium text-lg">{thread.title}</h4>
                          </div>

                          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                            {thread.body}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="text-gray-400">{thread.author?.username || 'Utilisateur'}</span>
                            <span>•</span>
                            <span>{new Date(thread.last_activity_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 text-sm text-gray-400 flex-shrink-0">
                          <span className="flex items-center gap-1.5">
                            <MessageCircle className="h-4 w-4" />
                            <span className="font-medium">{thread.reply_count}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <ThumbsUp className="h-4 w-4" />
                            <span className="font-medium">{thread.like_count}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showCreateThread && selectedCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <h3 className="text-white text-2xl font-semibold mb-6">
              Créer une discussion dans "{selectedCategory.name}"
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="Un titre clair et descriptif"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contenu</label>
                <textarea
                  value={newThreadBody}
                  onChange={(e) => setNewThreadBody(e.target.value)}
                  placeholder="Décrivez votre sujet en détail..."
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 resize-none border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  rows={10}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newThreadSpoilers}
                  onChange={(e) => setNewThreadSpoilers(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600"
                />
                Cette discussion contient des spoilers
              </label>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setShowCreateThread(false);
                    setNewThreadTitle('');
                    setNewThreadBody('');
                    setNewThreadSpoilers(false);
                  }}
                  className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateThread}
                  disabled={!newThreadTitle.trim() || !newThreadBody.trim()}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  Créer le sujet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameForum;
