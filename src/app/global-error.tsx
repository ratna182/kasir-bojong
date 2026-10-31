'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="id">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#EAE7DE', color: '#1B1B1B', fontFamily: 'Arial, sans-serif', padding: '1rem' }}>
        <main style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.4rem' }}>Aplikasi Perlu Dimuat Ulang</h1>
          <p style={{ color: '#6B6B6B', margin: '0.75rem 0 1.5rem' }}>Sesi Anda tetap aman.</p>
          <button type="button" onClick={reset} style={{ background: '#4F5D23', border: 0, borderRadius: '10px', color: 'white', cursor: 'pointer', fontSize: '1rem', padding: '0.75rem 1.25rem' }}>Muat Ulang</button>
        </main>
      </body>
    </html>
  )
}
