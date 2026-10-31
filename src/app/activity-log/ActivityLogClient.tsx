'use client'

import { useEffect, useState } from 'react'

interface ActivityLog {
  id: string
  aktivitas: string
  detail: string | null
  createdAt: string
  user: { username: string; namaLengkap: string | null; role: string }
  warung: { nama: string; kode: string } | null
}

const activityLabels: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  BUKA_KASIR: 'Buka kasir',
  TUTUP_KASIR: 'Tutup kasir',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export default function ActivityLogClient() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLogs() {
    try {
      const response = await fetch('/api/activity-logs?limit=200', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message)
      setLogs(result.data)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat log aktivitas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadLogs() }, 0)
    const interval = window.setInterval(loadLogs, 5000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Realtime Log Activity</h1>
          <p className="text-secondary text-sm">Aktivitas kasir diperbarui otomatis setiap 5 detik.</p>
        </div>
        <span className="badge badge-success" aria-live="polite">Live</span>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="table-container">
        <table className="table">
          <caption className="sr-only">Log aktivitas kasir</caption>
          <thead>
            <tr>
              <th>Tanggal &amp; waktu</th>
              <th>Kasir</th>
              <th>Aktivitas</th>
              <th>Warung</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Memuat log aktivitas...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Belum ada aktivitas tercatat.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                <td><strong>{log.user.namaLengkap || log.user.username}</strong><br /><span className="text-muted text-xs">{log.user.username}</span></td>
                <td><span className="badge badge-success">{activityLabels[log.aktivitas] || log.aktivitas}</span></td>
                <td>{log.warung ? `${log.warung.nama} (${log.warung.kode})` : '-'}</td>
                <td>{log.detail || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
