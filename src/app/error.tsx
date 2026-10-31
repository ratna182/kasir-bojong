'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>Halaman Tidak Dapat Dimuat</h1>
        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
          Sesi Anda tetap aman. Coba muat ulang halaman ini.
        </p>
        <button type="button" className="btn btn-primary" onClick={reset}>Coba Lagi</button>
      </div>
    </div>
  )
}
