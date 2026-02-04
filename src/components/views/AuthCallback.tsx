import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface AuthCallbackProps {
  onRedirect: () => void
}

const AuthCallback: React.FC<AuthCallbackProps> = ({ onRedirect }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔐 Traitement callback Supabase Auth...')

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('❌ Erreur récupération session:', sessionError)
          setStatus('error')
          setMessage('Erreur lors de la vérification de la session')
          return
        }

        if (!session) {
          console.warn('⚠️ Aucune session trouvée après callback')
          setStatus('error')
          setMessage('Lien invalide ou expiré')
          return
        }

        console.log('✅ Session récupérée:', session.user?.email)
        setStatus('success')
        setMessage('Email vérifié avec succès !')

        setTimeout(() => {
          console.log('↪️ Redirection vers feed...')
          onRedirect()
        }, 2000)

      } catch (error) {
        console.error('❌ Exception dans handleCallback:', error)
        setStatus('error')
        setMessage('Une erreur inattendue est survenue')
      }
    }

    handleCallback()
  }, [onRedirect])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-700">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-orange-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Vérification en cours...
            </h2>
            <p className="text-gray-400">
              Merci de patienter pendant que nous confirmons ton email.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {message}
            </h2>
            <p className="text-gray-400 mb-4">
              Tu seras redirigé automatiquement...
            </p>
            <div className="animate-pulse text-orange-500">
              Redirection en cours...
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {message}
            </h2>
            <p className="text-gray-400 mb-6">
              Le lien a peut-être expiré ou a déjà été utilisé.
            </p>
            <button
              onClick={onRedirect}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 px-6 rounded-lg font-bold transition-all duration-200"
            >
              Retour à l'accueil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallback
