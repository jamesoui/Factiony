import React, { useState, useEffect } from 'react'
import { Crown, MessageSquare, ThumbsUp, MessageCircle, TrendingUp, Clock, Filter, ChevronRight, Search, Plus, Send, X, CornerDownRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'

interface ForumCategory {
  id: string
  name: string
  description: string
  icon: typeof MessageSquare
}

interface ForumThread {
  id: string
  title: string
  author: string
  authorAvatar: string
  category: string
  replies: number
  likes: number
  views: number
  lastActivity: string
  isPinned?: boolean
  isLiked?: boolean
  content?: string
}

interface Reply {
  id: string
  author: string
  authorAvatar: string
  content: string
  timestamp: string
  likes: number
  isLiked?: boolean
}

interface Comment {
  id: string
  author: string
  authorAvatar: string
  content: string
  timestamp: string
  likes: number
  isLiked?: boolean
  replies?: Reply[]
  showReplies?: boolean
  newReply?: string
}

const Avatar: React.FC<{ src?: string; name: string; size?: string }> = ({ src, name, size = 'w-8 h-8' }) => {
  if (src) return <img src={src} alt={name} className={`${size} rounded-full object-cover`} />
  return (
    <div className={`${size} rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

const PremiumForumView: React.FC = () => {
  const { user } = useAuth()
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCreateThread, setShowCreateThread] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadCategory, setNewThreadCategory] = useState('general')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null)
  const [newComment, setNewComment] = useState('')
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const categories: ForumCategory[] = [
    { id: 'general', name: 'Discussion Générale', description: 'Parlez de tout et de rien avec la communauté Premium', icon: MessageSquare },
    { id: 'recommendations', name: 'Recommandations Exclusives', description: 'Partagez vos pépites et découvertes gaming', icon: TrendingUp },
    { id: 'events', name: 'Événements & Rencontres', description: 'Organisez des sessions de jeu entre membres Premium', icon: MessageCircle }
  ]

  useEffect(() => {
    if (user?.isPremium) loadThreads()
  }, [user, sortBy])

  const loadThreads = async () => {
    setLoading(true)
    try {
      let query = supabase.from('premium_forum_threads').select('*')
      query = sortBy === 'popular'
        ? query.order('likes_count', { ascending: false })
        : query.order('created_at', { ascending: false })

      const { data } = await query

      const { data: likesData } = await supabase
        .from('premium_forum_likes')
        .select('target_id')
        .eq('user_id', user!.id)
        .eq('target_type', 'thread')

      const likedIds = new Set((likesData || []).map((l: any) => l.target_id))

      setThreads((data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        author: t.username,
        authorAvatar: t.avatar || '',
        category: t.category,
        replies: t.replies_count,
        likes: t.likes_count,
        views: t.views_count,
        lastActivity: new Date(t.created_at).toLocaleDateString('fr-FR'),
        isPinned: t.is_pinned,
        isLiked: likedIds.has(t.id),
        content: t.content
      })))
    } catch (e) {
      console.error('Error loading threads:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async (threadId: string) => {
    const { data: commentsData } = await supabase
      .from('premium_forum_comments')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    const commentIds = (commentsData || []).map((c: any) => c.id)

    const { data: repliesData } = commentIds.length > 0
      ? await supabase.from('premium_forum_replies').select('*').in('comment_id', commentIds).order('created_at', { ascending: true })
      : { data: [] }

    const { data: likesData } = await supabase
      .from('premium_forum_likes')
      .select('target_id, target_type')
      .eq('user_id', user!.id)
      .in('target_type', ['comment', 'reply'])

    const likedIds = new Set((likesData || []).map((l: any) => l.target_id))

    setComments((commentsData || []).map((c: any) => ({
      id: c.id,
      author: c.username,
      authorAvatar: c.avatar || '',
      content: c.content,
      timestamp: new Date(c.created_at).toLocaleDateString('fr-FR'),
      likes: c.likes_count,
      isLiked: likedIds.has(c.id),
      showReplies: false,
      newReply: '',
      replies: (repliesData || [])
        .filter((r: any) => r.comment_id === c.id)
        .map((r: any) => ({
          id: r.id,
          author: r.username,
          authorAvatar: r.avatar || '',
          content: r.content,
          timestamp: new Date(r.created_at).toLocaleDateString('fr-FR'),
          likes: r.likes_count,
          isLiked: likedIds.has(r.id)
        }))
    })))
  }

  const handleLikeThread = async (threadId: string, isLiked: boolean) => {
    if (!user) return
    const thread = threads.find(t => t.id === threadId)
    if (!thread) return
    const newLikes = isLiked ? Math.max(0, thread.likes - 1) : thread.likes + 1

    if (isLiked) {
      await supabase.from('premium_forum_likes').delete().eq('user_id', user.id).eq('target_id', threadId).eq('target_type', 'thread')
    } else {
      await supabase.from('premium_forum_likes').insert({ user_id: user.id, target_id: threadId, target_type: 'thread' })
    }
    await supabase.from('premium_forum_threads').update({ likes_count: newLikes }).eq('id', threadId)

    setThreads(threads.map(t => t.id === threadId ? { ...t, isLiked: !isLiked, likes: newLikes } : t))
    setSelectedThread(prev => prev?.id === threadId ? { ...prev, isLiked: !isLiked, likes: newLikes } : prev)
  }

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    const newLikes = isLiked ? comment.likes - 1 : comment.likes + 1

    if (isLiked) {
      await supabase.from('premium_forum_likes').delete().eq('user_id', user.id).eq('target_id', commentId).eq('target_type', 'comment')
    } else {
      await supabase.from('premium_forum_likes').insert({ user_id: user.id, target_id: commentId, target_type: 'comment' })
    }
    await supabase.from('premium_forum_comments').update({ likes_count: newLikes }).eq('id', commentId)
    setComments(comments.map(c => c.id === commentId ? { ...c, isLiked: !isLiked, likes: newLikes } : c))
  }

  const handleLikeReply = async (commentId: string, replyId: string, isLiked: boolean) => {
    if (!user) return
    const reply = comments.find(c => c.id === commentId)?.replies?.find(r => r.id === replyId)
    if (!reply) return
    const newLikes = isLiked ? reply.likes - 1 : reply.likes + 1

    if (isLiked) {
      await supabase.from('premium_forum_likes').delete().eq('user_id', user.id).eq('target_id', replyId).eq('target_type', 'reply')
    } else {
      await supabase.from('premium_forum_likes').insert({ user_id: user.id, target_id: replyId, target_type: 'reply' })
    }
    await supabase.from('premium_forum_replies').update({ likes_count: newLikes }).eq('id', replyId)
    setComments(comments.map(c => c.id === commentId
      ? { ...c, replies: (c.replies || []).map(r => r.id === replyId ? { ...r, isLiked: !isLiked, likes: newLikes } : r) }
      : c
    ))
  }

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim() || !user) return
    setSubmitting(true)
    try {
      const categoryName = categories.find(c => c.id === newThreadCategory)?.name || 'Discussion Générale'
      const { data, error } = await supabase
        .from('premium_forum_threads')
        .insert({ user_id: user.id, username: user.username, avatar: user.avatar, title: newThreadTitle, content: newThreadContent, category: categoryName })
        .select().single()

      if (error) throw error

      setThreads([{ id: data.id, title: data.title, author: data.username, authorAvatar: data.avatar || '', category: data.category, replies: 0, likes: 0, views: 0, lastActivity: 'À l\'instant', isLiked: false, content: data.content }, ...threads])
      setNewThreadTitle('')
      setNewThreadContent('')
      setShowCreateThread(false)
    } catch (e) {
      alert('Erreur lors de la création de la discussion')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddComment = async (threadId: string) => {
    if (!newComment.trim() || !user) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('premium_forum_comments')
        .insert({ thread_id: threadId, user_id: user.id, username: user.username, avatar: user.avatar, content: newComment })
        .select().single()

      if (error) throw error

      const newReplies = (selectedThread?.replies || 0) + 1
      await supabase.from('premium_forum_threads').update({ replies_count: newReplies }).eq('id', threadId)

      setComments([...comments, { id: data.id, author: data.username, authorAvatar: data.avatar || '', content: data.content, timestamp: 'À l\'instant', likes: 0, isLiked: false, replies: [], showReplies: false, newReply: '' }])
      setThreads(threads.map(t => t.id === threadId ? { ...t, replies: t.replies + 1 } : t))
      setSelectedThread(prev => prev ? { ...prev, replies: prev.replies + 1 } : null)
      setNewComment('')
    } catch (e) {
      console.error('Error adding comment:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddReply = async (commentId: string, content: string) => {
    if (!content.trim() || !user) return
    try {
      const { data, error } = await supabase
        .from('premium_forum_replies')
        .insert({ comment_id: commentId, user_id: user.id, username: user.username, avatar: user.avatar, content })
        .select().single()

      if (error) throw error

      setComments(comments.map(c => c.id === commentId
        ? { ...c, replies: [...(c.replies || []), { id: data.id, author: data.username, authorAvatar: data.avatar || '', content: data.content, timestamp: 'À l\'instant', likes: 0, isLiked: false }], newReply: '' }
        : c
      ))
    } catch (e) {
      console.error('Error adding reply:', e)
    }
  }

  const handleOpenThread = async (thread: ForumThread) => {
    setSelectedThread(thread)
    setComments([])
    await loadComments(thread.id)
    await supabase.from('premium_forum_threads').update({ views_count: thread.views + 1 }).eq('id', thread.id)
  }

  const filteredThreads = threads.filter(thread => {
    const matchSearch = thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCategory = selectedCategory ? thread.category === categories.find(c => c.id === selectedCategory)?.name : true
    return matchSearch && matchCategory
  })

  if (!user?.isPremium) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <Crown className="h-24 w-24 text-yellow-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">Forum Premium</h1>
          <p className="text-gray-300 mb-8 text-lg leading-relaxed">Ce forum est exclusivement réservé aux membres Premium.</p>
          <a href="/premium" className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-xl font-bold text-lg transition-all">
            <Crown className="h-6 w-6" />
            <span>Devenir Premium</span>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Forum Premium</h1>
        <button onClick={() => setShowCreateThread(true)} className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors">
          <Plus className="h-5 w-5" />
          <span>Nouvelle discussion</span>
        </button>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher une discussion..." className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Catégories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <div key={category.id} onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)} className={`bg-gray-800 border rounded-xl p-6 hover:border-yellow-600 transition-all duration-200 cursor-pointer group ${selectedCategory === category.id ? 'border-yellow-500' : 'border-gray-700'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-yellow-600 p-3 rounded-lg group-hover:bg-yellow-500 transition-colors">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-yellow-500 transition-colors" />
                </div>
                <h3 className="font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">{category.name}</h3>
                <p className="text-sm text-gray-400">{category.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Discussions</h2>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500">
              <option value="recent">Plus récents</option>
              <option value="popular">Plus populaires</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucune discussion pour le moment. Soyez le premier !</div>
        ) : (
          <div className="space-y-3">
            {filteredThreads.map((thread) => (
              <div key={thread.id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-l-transparent hover:border-l-yellow-500 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <Avatar src={thread.authorAvatar} name={thread.author} size="w-10 h-10" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {thread.isPinned && <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded font-semibold">ÉPINGLÉ</span>}
                        <h3 onClick={() => handleOpenThread(thread)} className="font-semibold text-white hover:text-yellow-400 transition-colors cursor-pointer">{thread.title}</h3>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-gray-400">
                        <span>{thread.author}</span>
                        <span>•</span>
                        <span className="text-yellow-400">{thread.category}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1"><Clock className="h-3 w-3" /><span>{thread.lastActivity}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <button onClick={() => handleLikeThread(thread.id, thread.isLiked || false)} className={`flex items-center space-x-1 transition-colors ${thread.isLiked ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}>
                      <ThumbsUp className={`h-4 w-4 ${thread.isLiked ? 'fill-current' : ''}`} />
                      <span>{thread.likes}</span>
                    </button>
                    <button onClick={() => handleOpenThread(thread)} className="flex items-center space-x-1 text-gray-400 hover:text-yellow-400 transition-colors">
                      <MessageCircle className="h-4 w-4" />
                      <span>{thread.replies}</span>
                    </button>
                    <div className="text-xs text-gray-500">{thread.views} vues</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Thread Modal */}
      {showCreateThread && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Nouvelle discussion</h3>
              <button onClick={() => setShowCreateThread(false)} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
                <input type="text" value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} placeholder="Entrez le titre de votre discussion..." className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
                <select value={newThreadCategory} onChange={(e) => setNewThreadCategory(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea value={newThreadContent} onChange={(e) => setNewThreadContent(e.target.value)} placeholder="Partagez vos pensées..." rows={6} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none" />
              </div>
              <button onClick={handleCreateThread} disabled={submitting || !newThreadTitle.trim() || !newThreadContent.trim()} className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors">
                {submitting ? 'Création...' : 'Créer la discussion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread Detail Modal */}
      {selectedThread && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">{selectedThread.title}</h3>
              <button onClick={() => { setSelectedThread(null); setComments([]) }} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 text-sm text-gray-400 mb-4">
                <Avatar src={selectedThread.authorAvatar} name={selectedThread.author} />
                <span>{selectedThread.author}</span>
                <span>•</span>
                <span className="text-yellow-400">{selectedThread.category}</span>
              </div>
              {selectedThread.content && (
                <div className="bg-gray-700 rounded-lg p-4 mb-3">
                  <p className="text-gray-300">{selectedThread.content}</p>
                </div>
              )}
              <button onClick={() => handleLikeThread(selectedThread.id, selectedThread.isLiked || false)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedThread.isLiked ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-yellow-400'}`}>
                <ThumbsUp className={`h-4 w-4 ${selectedThread.isLiked ? 'fill-current' : ''}`} />
                <span>{selectedThread.likes} j'aime</span>
              </button>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h4 className="text-lg font-bold text-white mb-4">Commentaires ({comments.length})</h4>
              <div className="space-y-4 mb-6">
                {comments.map(comment => (
                  <div key={comment.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar src={comment.authorAvatar} name={comment.author} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-white">{comment.author}</span>
                          <span className="text-xs text-gray-400">{comment.timestamp}</span>
                        </div>
                        <p className="text-gray-300 mb-3">{comment.content}</p>
                        <div className="flex items-center space-x-4">
                          <button onClick={() => handleLikeComment(comment.id, comment.isLiked || false)} className={`flex items-center space-x-1 text-sm transition-colors ${comment.isLiked ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}>
                            <ThumbsUp className={`h-3.5 w-3.5 ${comment.isLiked ? 'fill-current' : ''}`} />
                            <span>{comment.likes}</span>
                          </button>
                          <button
                            onClick={() => setComments(comments.map(c => c.id === comment.id ? { ...c, showReplies: !c.showReplies } : c))}
                            className="flex items-center space-x-1 text-sm text-gray-400 hover:text-yellow-400 transition-colors"
                          >
                            <CornerDownRight className="h-3.5 w-3.5" />
                            <span>Répondre {comment.replies && comment.replies.length > 0 ? `(${comment.replies.length})` : ''}</span>
                          </button>
                        </div>

                        {comment.showReplies && (
                          <div className="mt-3 ml-4 space-y-3">
                            {(comment.replies || []).map(reply => (
                              <div key={reply.id} className="bg-gray-600 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                  <Avatar src={reply.authorAvatar} name={reply.author} size="w-6 h-6" />
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-semibold text-white text-sm">{reply.author}</span>
                                      <span className="text-xs text-gray-400">{reply.timestamp}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm mb-2">{reply.content}</p>
                                    <button onClick={() => handleLikeReply(comment.id, reply.id, reply.isLiked || false)} className={`flex items-center space-x-1 text-xs transition-colors ${reply.isLiked ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}>
                                      <ThumbsUp className={`h-3 w-3 ${reply.isLiked ? 'fill-current' : ''}`} />
                                      <span>{reply.likes}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center space-x-2">
                              <Avatar src={user?.avatar} name={user?.username || ''} size="w-6 h-6" />
                              <input
                                type="text"
                                value={comment.newReply || ''}
                                onChange={(e) => setComments(comments.map(c => c.id === comment.id ? { ...c, newReply: e.target.value } : c))}
                                placeholder="Écrire une réponse..."
                                className="flex-1 px-3 py-1.5 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              />
                              <button
                                onClick={() => handleAddReply(comment.id, comment.newReply || '')}
                                disabled={!comment.newReply?.trim()}
                                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start space-x-3">
                <Avatar src={user?.avatar} name={user?.username || ''} size="w-10 h-10" />
                <div className="flex-1">
                  <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire..." rows={3} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none" />
                  <button onClick={() => handleAddComment(selectedThread.id)} disabled={submitting || !newComment.trim()} className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2">
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Envoi...' : 'Commenter'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PremiumForumView
