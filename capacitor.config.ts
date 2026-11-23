import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://kasir-pinang-ranti.vianjaya-pos.workers.dev'

if (serverUrl && !/^https:\/\//.test(serverUrl)) {
  throw new Error('CAPACITOR_SERVER_URL harus menggunakan HTTPS')
}

const allowedHosts = [
  new URL(serverUrl).hostname,
  'kasir-pinang-ranti.vianjaya-pos.workers.dev',
  'kasir-bojongkulur.vercel.app',
]

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID || 'id.kasirbojongkulur.kasir',
  appName: process.env.CAPACITOR_APP_NAME || 'Pinang Ranti',
  webDir: 'www',
  server: serverUrl ? {
    url: serverUrl,
    androidScheme: 'https',
    allowNavigation: [...new Set(allowedHosts)]
  } : undefined,
  loggingBehavior: 'production',
}

export default config
