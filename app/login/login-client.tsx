'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

interface LoginClientProps {
  message?: string
  error?: string
}

export function LoginClient({ message, error }: LoginClientProps) {
  useEffect(() => {
    if (message) {
      toast.success(message)
    }
    if (error) {
      toast.error(error)
    }
  }, [message, error])

  return null
}
