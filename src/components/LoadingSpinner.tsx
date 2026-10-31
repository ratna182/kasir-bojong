export default function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizes = {
    sm: { width: 16, height: 16, borderWidth: 2 },
    md: { width: 24, height: 24, borderWidth: 3 },
    lg: { width: 40, height: 40, borderWidth: 4 },
  }

  const { width, height, borderWidth } = sizes[size]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
      <div
        style={{
          width,
          height,
          border: `${borderWidth}px solid rgba(255, 255, 255, 0.15)`,
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      {text && <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{text}</span>}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="app-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <LoadingSpinner size="lg" text="Memuat..." />
      </div>
    </div>
  )
}
