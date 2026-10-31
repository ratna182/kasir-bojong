import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://kasir-bojongkulur.vercel.app'

if (serverUrl && !/^https:\/\//.test(serverUrl)) {
  throw new Error('CAPACITOR_SERVER_URL harus menggunakan HTTPS')
}

const allowedHost = new URL(serverUrl).hostname

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID || 'id.kasirbojongkulur.kasir',
  appName: process.env.CAPACITOR_APP_NAME || 'Kasir Bojong Kulur',
  webDir: 'www',
  server: serverUrl ? { url: serverUrl, androidScheme: 'https', allowNavigation: [allowedHost] } : undefined,
  loggingBehavior: 'production',
}

export default config
