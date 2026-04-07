import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Check, CheckCircle, AlertCircle } from 'lucide-react'

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Supabase injecte le token dans le hash de l'URL au format #access_token=...
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('access_token')) {
      setError('Lien invalide ou expiré. Demande un nouveau lien de réinitialisation.')
    }
  }, [])

  const validate = () => {
    if (password.length < 9) return 'Le mot de passe doit contenir au moins 9 caractères.'
    if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir une majuscule.'
    if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir une minuscule.'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Le mot de passe doit contenir un caractère spécial.'
    if (password !== confirm) return 'Les mots de passe ne correspondent pas.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabaseClient')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => navigate('/'), 3000)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const checks = [
    { label: 'Au moins 9 caractères', ok: password.length >= 9 },
    { label: 'Une majuscule (A-Z)', ok: /[A-Z]/.test(password) },
    { label: 'Une minuscule (a-z)', ok: /[a-z]/.test(password) },
    { label: 'Un caractère spécial (!@#$...)', ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Nouveau mot de passe
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          Choisis un mot de passe sécurisé pour ton compte Factiony.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-green-900 bg-opacity-50 border border-green-700 rounded-lg flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-200 text-sm">
              Mot de passe mis à jour ! Tu vas être redirigé vers l'accueil...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nouveau mot de passe <span className="text-red-400">*</span>
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="mt-3 space-y-1">
                {checks.map(({ label, ok }) => (
                  <div key={label} className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${ok ? 'bg-green-500' : 'bg-gray-600'}`}>
                      {ok && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className={`text-xs ${ok ? 'text-green-400' : 'text-gray-500'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirmer le mot de passe <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 px-6 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mise à jour...' : 'Changer mon mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordPage
