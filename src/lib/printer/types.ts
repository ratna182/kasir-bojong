export type PrinterConnectionType = 'bluetooth' | 'imin' | 'network' | 'usb'

export interface PrinterConfig {
  deviceId: string
  deviceName: string
  width: '58mm' | '80mm'
  connectionType: PrinterConnectionType
  host?: string
  port?: number
  usbDeviceId?: string
}

export interface LanScanResult {
  ok: boolean
  localIp?: string
  subnet?: string
  port?: number
  hosts: string[]
  scanned?: number
  elapsedMs?: number
  errorClass?: string
  error?: string
  userMessage?: string | null
}

export interface UsbPrinterInfo {
  deviceId: string
  name: string
  vendorId: number
  productId: number
  hasPermission: boolean
  printable: boolean
}

export interface PrinterConnectResult {
  ok: boolean
  status?: string
  error?: string | null
  errorClass?: string
  userMessage?: string | null
  attempts?: number
}

export type PrinterStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported'

export const PAPER_CHARS = { '80mm': 48, '58mm': 32 } as const
export const CHAR_WIDTHS = PAPER_CHARS

// Legacy UUIDs kept for reference
export const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb'
export const WRITE_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'

// iMin SDK interface for built-in printer
export interface IMinPrinterSDK {
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  print(data: Uint8Array): Promise<boolean>
  getStatus(): Promise<PrinterStatus>
  isSupported(): boolean
}

export interface IMinPrintJobResult {
  ok: boolean
  status: 'printed' | 'failed' | 'unknown'
  error: string | null
  attempts: number
}
