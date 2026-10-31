'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface ToastContextType {
  addToast: (type: Toast['type'], message: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev, { id, type, message }])
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '380px',
        width: '100%',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const icons: Record<Toast['type'], string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }

  const colors: Record<Toast['type'], string> = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-accent)',
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${colors[toast.type]}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-lg)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'all 0.3s ease',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{icons[toast.type]}</span>
      <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--color-text)' }}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          padding: '0.25rem',
          fontSize: '1rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
