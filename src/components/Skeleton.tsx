export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-2)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: '60%',
              height: 16,
              borderRadius: 4,
              background: 'var(--color-surface-2)',
              marginBottom: 8,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <div
            style={{
              width: '40%',
              height: 12,
              borderRadius: 4,
              background: 'var(--color-surface-2)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {[1, 2, 3, 4].map((i) => (
              <th key={i}>
                <div
                  style={{
                    width: '80%',
                    height: 12,
                    borderRadius: 4,
                    background: 'var(--color-surface-3)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {[1, 2, 3, 4].map((j) => (
                <td key={j}>
                  <div
                    style={{
                      width: `${Math.random() * 40 + 40}%`,
                      height: 14,
                      borderRadius: 4,
                      background: 'var(--color-surface-2)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
