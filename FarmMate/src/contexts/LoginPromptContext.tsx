import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface LoginPromptContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  openLoginPrompt: () => void
}

const LoginPromptContext = createContext<LoginPromptContextValue | undefined>(undefined)

export function LoginPromptProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const openLoginPrompt = useCallback(() => {
    setOpen(true)
  }, [])

  const value = useMemo(
    () => ({ open, setOpen, openLoginPrompt }),
    [open, openLoginPrompt],
  )

  return (
    <LoginPromptContext.Provider value={value}>
      {children}
    </LoginPromptContext.Provider>
  )
}

export function useLoginPrompt() {
  const ctx = useContext(LoginPromptContext)
  if (!ctx) {
    throw new Error('useLoginPrompt must be used within LoginPromptProvider')
  }
  return ctx
}
