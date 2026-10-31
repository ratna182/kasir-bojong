'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button id="btn-logout" onClick={handleLogout} disabled={loading} className="btn btn-ghost btn-sm">
      {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <LogOut size={14} />}
      <span>Logout</span>
    </button>
  )
}
