import HargaWarungManager from './HargaWarungManager'

export const metadata = {
  title: 'Harga per Cabang - Admin',
}

export default function HargaWarungPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <HargaWarungManager />
      </div>
    </main>
  )
}
