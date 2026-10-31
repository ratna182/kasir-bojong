'use client'

import { useState, useEffect } from 'react'
import { User, Save, Key, Eye, EyeOff } from 'lucide-react'

interface UserProfile {
  id: string
  username: string
  namaLengkap: string | null
  role: string
  isActive: boolean
  createdAt: string
  warung: { id: string; nama: string; kode: string } | null
}

interface ProfilClientProps {
  session: { warungNama: string | null; warungKode: string | null; namaLengkap?: string | null; username: string; role: string }
}

export default function ProfilClient({ session }: ProfilClientProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ namaLengkap: '', currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    try {
      const res = await fetch('/api/auth/profile')
      const result = await res.json()
      if (result.success) { setProfile(result.data); setFormData((prev) => ({ ...prev, namaLengkap: result.data.namaLengkap || '' })) }
    } catch { setFeedback({ type: 'error', message: 'Gagal memuat profil' }) }
    finally { setLoading(false) }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setErrors({}); setSubmitting(true); setFeedback(null)
    try {
      const res = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ namaLengkap: formData.namaLengkap }) })
      const result = await res.json()
      if (result.success) { setFeedback({ type: 'success', message: 'Profil berhasil diupdate!' }); fetchProfile() }
      else { setErrors(result.errors || { message: result.message }) }
    } catch { setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem' }) }
    finally { setSubmitting(false) }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault(); setErrors({}); setFeedback(null)
    if (formData.newPassword !== formData.confirmPassword) { setErrors({ confirmPassword: 'Password baru tidak cocok.' }); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: formData.currentPassword, newPassword: formData.newPassword }) })
      const result = await res.json()
      if (result.success) { setFeedback({ type: 'success', message: 'Password berhasil diubah!' }); setFormData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' })) }
      else { setErrors(result.errors || { message: result.message }) }
    } catch { setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem' }) }
    finally { setSubmitting(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Memuat profil...</div>

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Profil Saya</h1>
        <p className="text-secondary text-sm">Kelola informasi akun Anda</p>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
          {feedback.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => setActiveTab('profile')} className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}>
          <User size={16} /> Profil
        </button>
        <button type="button" onClick={() => setActiveTab('password')} className={`btn ${activeTab === 'password' ? 'btn-primary' : 'btn-ghost'}`}>
          <Key size={16} /> Ganti Password
        </button>
      </div>

      {profile && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div><div className="text-sm text-muted">Username</div><div style={{ fontWeight: 600 }}>{profile.username}</div></div>
            <div><div className="text-sm text-muted">Role</div><span className={`badge ${profile.role === 'OWNER' ? 'badge-brand' : 'badge-success'}`}>{profile.role}</span></div>
            <div><div className="text-sm text-muted">Status</div><span className={`badge ${profile.isActive ? 'badge-success' : 'badge-warning'}`}>{profile.isActive ? 'Aktif' : 'Nonaktif'}</span></div>
            {profile.warung && <div><div className="text-sm text-muted">Warung</div><div style={{ fontWeight: 600 }}>{profile.warung.nama} ({profile.warung.kode})</div></div>}
            <div><div className="text-sm text-muted">Bergabung</div><div>{new Date(profile.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Edit Profil</h2>
          {errors.message && <div className="alert alert-error">{errors.message}</div>}
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input type="text" className="form-input" value={formData.namaLengkap} onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })} placeholder="Masukkan nama lengkap" />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Save size={16} /> {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Ganti Password</h2>
          {errors.message && <div className="alert alert-error">{errors.message}</div>}
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Password Lama *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} className="form-input" value={formData.currentPassword} onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })} placeholder="Masukkan password lama" required style={{ paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }} tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.currentPassword && <span className="text-danger text-sm">{errors.currentPassword}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Password Baru *</label>
              <input type="password" className="form-input" value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} placeholder="Masukkan password baru (min 6 karakter)" required minLength={6} />
              {errors.newPassword && <span className="text-danger text-sm">{errors.newPassword}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Konfirmasi Password Baru *</label>
              <input type="password" className="form-input" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Ulangi password baru" required minLength={6} />
              {errors.confirmPassword && <span className="text-danger text-sm">{errors.confirmPassword}</span>}
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Key size={16} /> {submitting ? 'Mengubah...' : 'Ubah Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
