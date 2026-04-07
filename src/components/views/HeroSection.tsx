import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthGuard } from '../../contexts/AuthGuardContext'

const HeroSection: React.FC = () => {
  const { setShowAuthModal } = useAuthGuard()
  const navigate = useNavigate()

  const features = [
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
    desc: 'Abonne-toi à tes amis et à des joueurs du monde entier et découvre leurs coups de cœur en temps réel.',
  },
  {
    emoji: '🧙',
    title: 'Albus, l\'IA gaming',
    desc: 'L\'assistant IA de référence pour le jeu vidéo. Recommandations, strats, builds — il connaît tout.',
  },
]

  return (
    <div className="relative overflow-hidden rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 50%, #0d1117 100%)' }}>
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600 opacity-5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500 opacity-5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
        {/* Eyebrow */}
        <p className="text-orange-500 text-sm font-semibold tracking-widest uppercase mb-4">
          Le réseau social du jeu vidéo
        </p>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
          Note. Partage.<br />
          <span className="text-orange-500">Découvre.</span>
        </h1>

        {/* Subline */}
        <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
          Note tes jeux, échange sur les forums, explore avec l'IA et connecte-toi avec des gamers du monde entier.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors text-base"
          >
            Créer mon compte — c'est gratuit
          </button>
          <button
            onClick={() => navigate('/search')}
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-xl transition-colors text-base border border-gray-700"
          >
            Explorer les jeux
          </button>
        </div>

        {/* Feature grid */}
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
