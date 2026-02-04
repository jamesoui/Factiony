import React, { useState, useRef } from 'react'
import { X, Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface AuthModalProps {
  onClose: () => void
}

interface PasswordValidation {
  minLength: boolean
  hasUpperCase: boolean
  hasLowerCase: boolean
  hasSpecialChar: boolean
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const submitInProgressRef = useRef(false)

  const validatePassword = (pass: string): PasswordValidation => {
    return {
      minLength: pass.length >= 9,
      hasUpperCase: /[A-Z]/.test(pass),
      hasLowerCase: /[a-z]/.test(pass),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass),
    }
  }

  const passwordValidation = validatePassword(password)
  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submitInProgressRef.current || loading) {
      console.warn('⚠️ Soumission déjà en cours, ignorée')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)
    submitInProgressRef.current = true

    try {
      console.log('📝 Soumission formulaire connexion')
      await login(email, password)
      console.log('✅ Connexion terminée, fermeture modal')
      window.location.reload()
    } catch (err: any) {
      console.error('❌ Erreur dans handleLogin:', err)
      setError(err.message || 'Email ou mot de passe incorrect')
      setLoading(false)
      submitInProgressRef.current = false
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submitInProgressRef.current || loading) {
      console.warn('⚠️ Soumission déjà en cours, ignorée')
      return
    }

    if (cooldownUntil && Date.now() < cooldownUntil) {
      const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000)
      setError(`Trop de tentatives. Réessayez dans ${remainingSeconds} secondes.`)
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)
    submitInProgressRef.current = true

    try {
      if (!username.trim()) {
        setError('Le pseudo est obligatoire')
        setLoading(false)
        submitInProgressRef.current = false
        return
      }

      if (username.length < 3) {
        setError('Le pseudo doit contenir au moins 3 caractères')
        setLoading(false)
        submitInProgressRef.current = false
        return
      }

      if (!isPasswordValid) {
        setError('Le mot de passe ne respecte pas les critères de sécurité requis')
        setLoading(false)
        submitInProgressRef.current = false
        return
      }

      const { supabase } = await import('../lib/supabaseClient')
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle()

      if (existingUser) {
        setError('Ce pseudo est déjà utilisé. Merci d\'en choisir un autre.')
        setLoading(false)
        submitInProgressRef.current = false
        return
      }

      console.log('📝 Soumission formulaire inscription - UN SEUL APPEL')
      await register(email, password, username)
      console.log('✅ Inscription réussie')

      setSuccess('Inscription réussie ! Vérifie ton email pour confirmer ton compte.')
      setLoading(false)
      submitInProgressRef.current = false

      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (err: any) {
      console.error('❌ Erreur dans handleRegister:', err)

      const errorMessage = err.message || 'Une erreur est survenue lors de l\'inscription'
      const isRateLimit = errorMessage.toLowerCase().includes('rate limit') ||
                         errorMessage.toLowerCase().includes('too many')
      const isDuplicateUsername = errorMessage.toLowerCase().includes('username') &&
                                  (errorMessage.toLowerCase().includes('unique') ||
                                   errorMessage.toLowerCase().includes('duplicate') ||
                                   errorMessage.toLowerCase().includes('already exists'))

      if (isRateLimit) {
        const cooldownTime = Date.now() + 60000
        setCooldownUntil(cooldownTime)
        setError('Trop de tentatives. Attends 60 secondes avant de réessayer.')

        setTimeout(() => {
          setCooldownUntil(null)
        }, 60000)
      } else if (isDuplicateUsername) {
        setError('Ce pseudo est déjà utilisé. Merci d\'en choisir un autre.')
      } else {
        setError(errorMessage)
      }

      setLoading(false)
      submitInProgressRef.current = false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === 'login') {
      handleLogin(e)
    } else {
      handleRegister(e)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setSuccess('')
    setEmail('')
    setPassword('')
    setUsername('')
    setShowPassword(false)
    submitInProgressRef.current = false
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="text-gray-400 text-center mb-6">
            {mode === 'login'
              ? 'Connectez-vous pour accéder à toutes les fonctionnalités'
              : 'Rejoignez la communauté Factiony'}
          </p>

          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Inscription
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900 bg-opacity-50 border border-green-700 rounded-lg flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pseudo <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Votre pseudo"
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required={mode === 'register'}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                  minLength={mode === 'register' ? 9 : 6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {mode === 'register' && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-400">Le mot de passe doit contenir :</p>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                        passwordValidation.minLength ? 'bg-green-500' : 'bg-gray-600'
                      }`}>
                        {passwordValidation.minLength && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={`text-xs ${
                        passwordValidation.minLength ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        Au moins 9 caractères
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                        passwordValidation.hasUpperCase ? 'bg-green-500' : 'bg-gray-600'
                      }`}>
                        {passwordValidation.hasUpperCase && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={`text-xs ${
                        passwordValidation.hasUpperCase ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        Une lettre majuscule (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                        passwordValidation.hasLowerCase ? 'bg-green-500' : 'bg-gray-600'
                      }`}>
                        {passwordValidation.hasLowerCase && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={`text-xs ${
                        passwordValidation.hasLowerCase ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        Une lettre minuscule (a-z)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                        passwordValidation.hasSpecialChar ? 'bg-green-500' : 'bg-gray-600'
                      }`}>
                        {passwordValidation.hasSpecialChar && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={`text-xs ${
                        passwordValidation.hasSpecialChar ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        Un caractère spécial (!@#$%^&*...)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (cooldownUntil !== null && Date.now() < cooldownUntil)}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 px-6 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (mode === 'login' ? 'Connexion...' : 'Création...')
                : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {mode === 'login' ? "Pas encore de compte ?" : 'Vous avez déjà un compte ?'}
              <button
                onClick={switchMode}
                className="ml-2 text-orange-500 hover:text-orange-400 font-medium transition-colors"
              >
                {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
