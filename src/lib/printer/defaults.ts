import type { PrinterConfig, PrinterConnectionType } from './types'

const ALL_TYPES: PrinterConnectionType[] = ['network', 'usb', 'bluetooth', 'imin']

export interface PrinterDefaultSettings {
  connectionType: PrinterConnectionType
  host: string
  port: number
  width: '58mm' | '80mm'
  allowed: PrinterConnectionType[]
}

/**
 * Per-branch printer defaults. Pinang Ranti runs on a generic Android device with a Comson
 * 80 mm USB & LAN printer, so it can be built with:
 *
 *   NEXT_PUBLIC_PRINTER_TYPE=network
 *   NEXT_PUBLIC_PRINTER_HOST=192.168.1.50
 *   NEXT_PUBLIC_PRINTER_PORT=9100
 *   NEXT_PUBLIC_PRINTER_ALLOWED=network,usb
 *
 * Env values are read with literal property access so Next.js can inline them at build time.
 */
export function readPrinterDefaults(): PrinterDefaultSettings {
  const type = parseType(process.env.NEXT_PUBLIC_PRINTER_TYPE)
  const width = process.env.NEXT_PUBLIC_PRINTER_WIDTH?.trim() === '58mm' ? '58mm' : '80mm'
  const rawPort = Number(process.env.NEXT_PUBLIC_PRINTER_PORT?.trim())
  const port = Number.isFinite(rawPort) && rawPort >= 1 && rawPort <= 65535 ? Math.trunc(rawPort) : 9100
  const host = process.env.NEXT_PUBLIC_PRINTER_HOST?.trim() ?? ''
  const allowed = parseAllowed(process.env.NEXT_PUBLIC_PRINTER_ALLOWED)
  return {
    connectionType: type ?? 'network',
    host,
    port,
    width,
    allowed: allowed.length > 0 ? allowed : ALL_TYPES,
  }
}

export function defaultPrinterConfig(settings: PrinterDefaultSettings = readPrinterDefaults()): PrinterConfig | null {
  if (settings.connectionType === 'network' && settings.host) {
    return {
      deviceId: `lan:${settings.host}:${settings.port}`,
      deviceName: `Printer LAN ${settings.host}`,
      width: settings.width,
      connectionType: 'network',
      host: settings.host,
      port: settings.port,
    }
  }
  if (settings.connectionType === 'usb') {
    return {
      deviceId: '',
      deviceName: 'Printer USB',
      width: settings.width,
      connectionType: 'usb',
    }
  }
  return null
}

export function isPrinterTypeAllowed(
  type: PrinterConnectionType,
  allowed: PrinterConnectionType[] = readPrinterDefaults().allowed,
): boolean {
  return allowed.includes(type)
}

function parseType(value: string | undefined): PrinterConnectionType | null {
  const normalized = value?.trim().toLowerCase()
  return ALL_TYPES.find((type) => type === normalized) ?? null
}

function parseAllowed(value: string | undefined): PrinterConnectionType[] {
  if (!value) return []
  const parsed = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .map((part) => parseType(part))
    .filter((type): type is PrinterConnectionType => type !== null)
  return Array.from(new Set(parsed))
}
