import React, { useState } from 'react'
import { Crown, MessageSquare, ThumbsUp, MessageCircle, TrendingUp, Clock, Filter, ChevronRight, Search, Plus, Send, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'

interface ForumCategory {
  id: string
  name: string
  description: string
  threadCount: number
  postCount: number
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
  comments?: Comment[]
}

interface Comment {
  id: string
  author: string
  authorAvatar: string
  content: string
  timestamp: string
  likes: number
  isLiked?: boolean
}

const PremiumForumView: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateThread, setShowCreateThread] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadCategory, setNewThreadCategory] = useState('general')
  const [newThreadContent, setNewThreadContent] = useState('')
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null)
  const [newComment, setNewComment] = useState('')
  const [threads, setThreads] = useState<ForumThread[]>([
    {
      id: '1',
      title: 'Les jeux indie qui méritent plus d\'attention en 2024',
      author: 'IndieLover42',
      authorAvatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'Recommandations Exclusives',
      replies: 45,
      likes: 128,
      views: 892,
      lastActivity: 'Il y a 2h',
      isPinned: true,
      isLiked: false,
      comments: [
        {
          id: 'c1',
          author: 'GameExplorer',
          authorAvatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=100',
          content: 'Excellente liste ! J\'ajouterais également "Hollow Knight" qui est un chef-d\'œuvre.',
          timestamp: 'Il y a 1h',
          likes: 12,
          isLiked: false
        }
      ]
    },
    {
      id: '2',
      title: 'Session co-op ce weekend - Qui est partant?',
      author: 'GameMaster2024',
      authorAvatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'Événements & Rencontres',
      replies: 23,
      likes: 67,
      views: 345,
      lastActivity: 'Il y a 4h',
      isLiked: false,
      comments: []
    },
    {
      id: '3',
      title: 'Vos attentes pour les annonces du Summer Game Fest?',
      author: 'HypeTrainConductor',
      authorAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'Discussion Générale',
      replies: 89,
      likes: 203,
      views: 1534,
      lastActivity: 'Il y a 6h',
      isLiked: true,
      comments: []
    },
    {
      id: '4',
      title: 'Conseils pour débuter dans le speedrun',
      author: 'SpeedDemon',
      authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: 'Discussion Générale',
      replies: 34,
      likes: 92,
      views: 678,
      lastActivity: 'Il y a 1j',
      isLiked: false,
      comments: []
    }
  ])

  if (!user?.isPremium) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <Crown className="h-24 w-24 text-yellow-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-4">
            Forum Premium
          </h1>
          <p className="text-gray-300 mb-8 text-lg leading-relaxed">
            Ce forum est exclusivement réservé aux membres Premium. Rejoignez Factiony+ pour accéder aux discussions, partager vos expériences et participer à la communauté.
          </p>
          <button
            onClick={() => window.location.hash = 'premium'}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Crown className="h-6 w-6" />
            <span>Devenir Premium</span>
          </button>
        </div>
      </div>
    )
  }

  const categories: ForumCategory[] = [
    {
      id: 'general',
      name: 'Discussion Générale',
      description: 'Parlez de tout et de rien avec la communauté Premium',
      threadCount: 342,
      postCount: 8745,
      icon: MessageSquare
    },
    {
      id: 'recommendations',
      name: 'Recommandations Exclusives',
      description: 'Partagez vos pépites et découvertes gaming',
      threadCount: 189,
      postCount: 4521,
      icon: TrendingUp
    },
    {
      id: 'events',
      name: 'Événements & Rencontres',
      description: 'Organisez des sessions de jeu entre membres Premium',
      threadCount: 67,
      postCount: 1893,
      icon: MessageCircle
    }
  ]

  const handleLikeThread = (threadId: string) => {
    setThreads(threads.map(thread =>
      thread.id === threadId
        ? { ...thread, isLiked: !thread.isLiked, likes: thread.isLiked ? thread.likes - 1 : thread.likes + 1 }
        : thread
    ))
  }

  const handleCreateThread = () => {
    if (!newThreadTitle.trim()) return

    const newThread: ForumThread = {
      id: Date.now().toString(),
      title: newThreadTitle,
      author: user?.username || 'Anonymous',
      authorAvatar: user?.avatar || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=100',
      category: categories.find(c => c.id === newThreadCategory)?.name || 'Discussion Générale',
      replies: 0,
      likes: 0,
      views: 0,
      lastActivity: 'À l\'instant',
      isLiked: false,
      comments: []
    }

    setThreads([newThread, ...threads])
    setNewThreadTitle('')
    setNewThreadContent('')
    setShowCreateThread(false)
  }

  const handleAddComment = (threadId: string) => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      author: user?.username || 'Anonymous',
      authorAvatar: user?.avatar || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=100',
      content: newComment,
      timestamp: 'À l\'instant',
      likes: 0,
      isLiked: false
    }

    setThreads(threads.map(thread =>
      thread.id === threadId
        ? { ...thread, comments: [...(thread.comments || []), comment], replies: thread.replies + 1 }
        : thread
    ))

    setNewComment('')
  }

  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Forum Premium</h1>
        <button
          onClick={() => setShowCreateThread(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle discussion</span>
        </button>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une discussion..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Catégories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <div
                key={category.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-yellow-600 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-yellow-600 p-3 rounded-lg group-hover:bg-yellow-500 transition-colors">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-yellow-500 transition-colors" />
                </div>
                <h3 className="font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-400 mb-4">{category.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{category.threadCount} sujets</span>
                  <span>•</span>
                  <span>{category.postCount} posts</span>
                </div>
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
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="recent">Plus récents</option>
              <option value="popular">Plus populaires</option>
              <option value="trending">Tendances</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredThreads.map((thread) => (
            <div key={thread.id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-l-transparent hover:border-l-yellow-500 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3 flex-1">
                  <img
                    src={thread.authorAvatar}
                    alt={thread.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {thread.isPinned && (
                        <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded font-semibold">
                          ÉPINGLÉ
                        </span>
                      )}
                      <h3
                        onClick={() => setSelectedThread(thread)}
                        className="font-semibold text-white hover:text-yellow-400 transition-colors cursor-pointer"
                      >
                        {thread.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <span>{thread.author}</span>
                      <span>•</span>
                      <span className="text-yellow-400">{thread.category}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{thread.lastActivity}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <button
                    onClick={() => handleLikeThread(thread.id)}
                    className={`flex items-center space-x-1 transition-colors ${
                      thread.isLiked ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'
                    }`}
                  >
                    <ThumbsUp className={`h-4 w-4 ${thread.isLiked ? 'fill-current' : ''}`} />
                    <span>{thread.likes}</span>
                  </button>
                  <button
                    onClick={() => setSelectedThread(thread)}
                    className="flex items-center space-x-1 text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{thread.replies}</span>
                  </button>
                  <div className="text-xs text-gray-500">
                    {thread.views} vues
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateThread && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Nouvelle discussion</h3>
              <button onClick={() => setShowCreateThread(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder="Entrez le titre de votre discussion..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
                <select
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  placeholder="Partagez vos pensées..."
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                />
              </div>
              <button
                onClick={handleCreateThread}
                className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition-colors"
              >
                Créer la discussion
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedThread && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">{selectedThread.title}</h3>
              <button onClick={() => setSelectedThread(null)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 text-sm text-gray-400">
                <img src={selectedThread.authorAvatar} alt={selectedThread.author} className="w-8 h-8 rounded-full" />
                <span>{selectedThread.author}</span>
                <span>•</span>
                <span className="text-yellow-400">{selectedThread.category}</span>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h4 className="text-lg font-bold text-white mb-4">Commentaires ({selectedThread.comments?.length || 0})</h4>
              <div className="space-y-4 mb-6">
                {selectedThread.comments?.map(comment => (
                  <div key={comment.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <img src={comment.authorAvatar} alt={comment.author} className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-white">{comment.author}</span>
                          <span className="text-xs text-gray-400">{comment.timestamp}</span>
                        </div>
                        <p className="text-gray-300">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start space-x-3">
                <img src={user?.avatar} alt={user?.username} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                  />
                  <button
                    onClick={() => handleAddComment(selectedThread.id)}
                    className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Commenter</span>
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
