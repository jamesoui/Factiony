import React from 'react'
import { Crown, Star, Users, Mail, Heart } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { createClient } from '@supabase/supabase-js'

// 🧠 Connexion Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const PremiumView: React.FC = () => {
  const { t } = useLanguage()

  const handleSubscribe = async () => {
    try {
      // 1️⃣ Récupère l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        alert('Veuillez vous connecter pour passer Premium.')
        return
      }

      // 2️⃣ Récupère le token de session (JWT)
      const { data: { session } } = await supabase.auth.getSession()
      console.log("SESSION TOKEN >>>", session?.access_token)
      if (!session?.access_token) {
        alert("Impossible de récupérer la session utilisateur.")
        return
      }

      // 3️⃣ Appelle la fonction Edge Stripe
      const response = await fetch(
        'https://ffcocumtwoyydgsuhwxi.supabase.co/functions/v1/create-checkout-session',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      )

      const result = await response.json()

      // 4️⃣ Redirige vers Stripe
      if (result.url) {
        window.location.href = result.url
      } else {
        console.error(result)
        alert('Erreur lors de la création de la session de paiement.')
      }

    } catch (error) {
      console.error("Erreur paiement:", error)
      alert('Erreur paiement')
    }
  }

  // Liste des avantages Premium
  const premiumFeatures = [
    { icon: Star, title: t('premium.detailedRating'), description: t('premium.detailedRatingDesc') },
    { icon: Users, title: t('premium.fullCustomization'), description: t('premium.fullCustomizationDesc') },
    { icon: Users, title: t('premium.unlimitedLists'), description: t('premium.unlimitedListsDesc') },
    { icon: Mail, title: t('premium.weeklyNewsletter'), description: t('premium.weeklyNewsletterDesc') },
    { icon: Heart, title: t('premium.supportBuff'), description: t('premium.supportBuffDesc') },
    { icon: Users, title: t('premium.adFree'), description: t('premium.adFreeDesc') },
    { icon: Star, title: t('premium.discordAccess'), description: t('premium.discordAccessDesc') }
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      <div className="bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-center mb-6">
          <Crown className="h-16 w-16 text-yellow-300" />
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <h1 className="text-4xl font-bold text-center">Factiony Premium</h1>
          <span className="bg-white/20 backdrop-blur-sm text-yellow-100 text-sm font-semibold px-3 py-1 rounded-full border border-white/30">
            À venir
          </span>
        </div>
        <p className="text-xl text-center text-yellow-100">{t('premium.subtitle')}</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-8 mb-8 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {t('premium.whatYouGet')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {premiumFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="flex items-start space-x-4">
                <div className="bg-yellow-600 p-3 rounded-lg flex-shrink-0">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-gray-700 rounded-xl p-6 text-center mb-6">
          <div className="text-4xl font-bold text-white mb-2">{t('premium.price')}</div>
          <div className="text-gray-400">{t('premium.perMonth')}</div>
          <div className="text-sm text-gray-500 mt-2">{t('premium.cancelAnytime')}</div>
        </div>

        <button
          disabled
          className="w-full bg-gray-600 text-gray-400 py-4 px-6 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center space-x-2 opacity-50"
        >
          <Crown className="h-6 w-6" />
          <span>Passer à Premium</span>
          <span className="ml-2 text-sm font-normal">(Bientôt disponible)</span>
        </button>
      </div>
    </div>
  )
}

export default PremiumView
