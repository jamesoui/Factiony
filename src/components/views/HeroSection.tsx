import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthGuard } from '../../contexts/AuthGuardContext'
import { useLanguage } from '../../contexts/LanguageContext'

const HeroSection: React.FC = () => {
  const { setShowAuthModal } = useAuthGuard()
  const navigate = useNavigate()
  const { language } = useLanguage()

  const features = language === 'en' ? [
    {
      emoji: '⭐',
      title: 'Rate your games',
      desc: 'Give a score out of 5, write a review and build your gaming history over time.',
    },
    {
      emoji: '📖',
      title: 'Journal & backlog',
      desc: 'Track your ongoing, completed games and wishlist. Your backlog finally under control.',
    },
    {
      emoji: '👥',
      title: 'Follow gamers',
      desc: 'Subscribe to friends and players from around the world and discover their favorites in real time.',
    },
    {
      emoji: '🧙',
      title: 'Albus, gaming AI',
      desc: 'The ultimate AI assistant for video games. Recommendations, strats, builds — it knows everything.',
    },
  ] : [
    {
      emoji: '⭐',
      title: 'Note tes jeux',
      desc: 'Attribue une note sur 5, écris une review et construis ton historique gaming au fil du temps.',
    },
    {
      emoji: '📖',
      title: 'Journal & backlog',
      desc: 'Suis tes jeux en cours, terminés et ta wishlist. Ton backlog enfin sous contrôle.',
    },
    {
      emoji: '👥',
      title: 'Suis des gamers',
      desc: "Abonne-toi à tes amis et à des joueurs du monde entier et découvre leurs coups de cœur en temps réel.",
    },
    {
      emoji: '🧙',
      title: "Albus, l'IA gaming",
      desc: "L'assistant IA de référence pour le jeu vidéo. Recommandations, strats, builds — il connaît tout.",
    },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 50%, #0d1117 100%)' }}>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600 opacity-5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500 opacity-5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
        <p className="text-orange-500 text-sm font-semibold tracking-widest uppercase mb-4">
          {language === 'en' ? 'The social network for video games' : 'Le réseau social du jeu vidéo'}
        </p>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
          {language === 'en' ? (
            <>Rate. Share.<br /><span className="text-orange-500">Discover.</span></>
          ) : (
            <>Note. Partage.<br /><span className="text-orange-500">Découvre.</span></>
          )}
        </h1>

        <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
          {language === 'en'
            ? 'Rate your games, discuss on forums, explore with AI and connect with gamers worldwide.'
            : "Note tes jeux, échange sur les forums, explore avec l'IA et connecte-toi avec des gamers du monde entier."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors text-base"
          >
            {language === 'en' ? "Create my account — it's free" : "Créer mon compte — c'est gratuit"}
          </button>
          <button
            onClick={() => navigate('/search')}
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-xl transition-colors text-base border border-gray-700"
          >
            {language === 'en' ? 'Browse games' : 'Explorer les jeux'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {features.map(({ emoji, title, desc }) => (
            <div
              key={title}
              className="bg-gray-800 bg-opacity-60 border border-gray-700 rounded-xl p-4 text-left hover:border-orange-600 transition-colors"
            >
              <div className="text-2xl mb-2">{emoji}</div>
              <p className="text-white font-semibold text-sm mb-1">{title}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HeroSection