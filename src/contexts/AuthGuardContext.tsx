import React, { createContext, useContext, useState, ReactNode } from 'react'

interface AuthGuardContextType {
  showAuthModal: boolean
  setShowAuthModal: (show: boolean) => void
  requireAuth: () => boolean
}

const AuthGuardContext = createContext<AuthGuardContextType | undefined>(undefined)

interface AuthGuardProviderProps {
  children: ReactNode
  isAuthenticated: boolean
}

export const AuthGuardProvider: React.FC<AuthGuardProviderProps> = ({
  children,
  isAuthenticated
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false)

  const requireAuth = (): boolean => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return false
    }
    return true
  }

  return (
    <AuthGuardContext.Provider value={{ showAuthModal, setShowAuthModal, requireAuth }}>
      {children}
    </AuthGuardContext.Provider>
  )
}

export const useAuthGuard = (): AuthGuardContextType => {
  const context = useContext(AuthGuardContext)
  if (!context) {
    throw new Error('useAuthGuard must be used within AuthGuardProvider')
  }
  return context
}
