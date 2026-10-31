import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://kasir-bojong.vercel.app'

if (serverUrl && !/^https:\/\//.test(serverUrl)) {
  throw new Error('CAPACITOR_SERVER_URL harus menggunakan HTTPS')
}

const allowedHost = new URL(serverUrl).hostname

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID || 'id.kasirbojong.kasir',
  appName: process.env.CAPACITOR_APP_NAME || 'Kasir Bojong',
  webDir: 'www',
  server: serverUrl ? { url: serverUrl, androidScheme: 'https', allowNavigation: [allowedHost] } : undefined,
  loggingBehavior: 'production',
}

export default config
