import type {
  PrinterConfig,
  PrinterStatus,
  PrinterConnectionType,
  IMinPrintJobResult,
  LanScanResult,
  UsbPrinterInfo,
} from './types'
import { printer as bluetoothPrinter } from './bluetooth'
import { iminPrinter } from './imin-sdk'
import { loadPrinterConfig, savePrinterConfig, clearPrinterConfig } from './storage'
import { defaultPrinterConfig } from './defaults'

type StatusListener = (status: PrinterStatus) => void

/**
 * Unified Printer Manager.
 *
 * Transports:
 * - Bluetooth SPP (legacy external printers)
 * - iMin built-in printer (web bridge)
 * - LAN raw ESC/POS, port 9100 (Comson 80 mm USB & LAN)
 * - USB Host raw ESC/POS (Comson 80 mm USB & LAN)
 *
 * LAN and USB share the native `IMinPrinter` bridge; only the transport inside the APK differs.
 */
class UnifiedPrinter {
  private activePrinter: PrinterConnectionType | null = null
  private listeners: Set<StatusListener> = new Set()
  private currentStatus: PrinterStatus = 'idle'
  private lastError: string = ''
  private printQueue: Promise<boolean> = Promise.resolve(true)
  private jobSeq = 0

  get status(): PrinterStatus {
    return this.currentStatus
  }

  get error(): string {
    return this.lastError
  }

  get connectionType(): PrinterConnectionType | null {
    return this.activePrinter
  }

  private setStatus(status: PrinterStatus) {
    this.currentStatus = status
    this.listeners.forEach((fn) => fn(status))
  }

  private log(message: string, ...args: unknown[]) {
    console.log(`[UnifiedPrinter] ${message}`, ...args)
  }

  private logError(message: string, error?: unknown) {
    console.error(`[UnifiedPrinter] ${message}`, error)
    this.lastError = message
  }

  onStatusChange(fn: StatusListener): () => void {
    this.listeners.add(fn)

    // Also subscribe to active printer's status changes
    const unsubBluetooth = bluetoothPrinter.onStatusChange(fn)
    const unsubImin = iminPrinter.onStatusChange(fn)

    return () => {
      this.listeners.delete(fn)
      unsubBluetooth()
      unsubImin()
    }
  }

  /**
   * Check available printer connections. LAN and USB need the native APK bridge.
   */
  getAvailablePrinters(): { bluetooth: boolean; imin: boolean; network: boolean; usb: boolean } {
    const bridge = iminPrinter.isSupported()
    return {
      bluetooth: bluetoothPrinter.isSupported(),
      imin: bridge,
      network: bridge,
      usb: bridge,
    }
  }

  /**
   * Connect to printer based on saved config, branch default, or auto-detect.
   */
  async connect(savedConfig?: PrinterConfig): Promise<boolean> {
    const config = savedConfig || loadPrinterConfig() || defaultPrinterConfig()

    if (config) {
      if (config.connectionType === 'network') {
        return this.connectNetwork(config.host ?? '', config.port ?? 9100, config.width)
      }
      if (config.connectionType === 'usb') {
        return this.connectUsb(config.usbDeviceId || config.deviceId, config.deviceName, config.width)
      }
      if (config.connectionType === 'imin') {
        return this.connectImin(config)
      }
      return this.connectBluetooth(config)
    }

    // Auto-detect: prefer iMin if available (built-in printer)
    const available = this.getAvailablePrinters()

    if (available.imin) {
      this.log('iMin printer available, connecting to built-in printer...')
      return this.connectImin()
    }

    if (available.bluetooth) {
      this.log('Bluetooth printer available, connecting...')
      return this.connectBluetooth()
    }

    this.logError('No printers available')
    this.setStatus('unsupported')
    return false
  }

  /**
   * Connect to iMin built-in printer
   */
  async connectImin(savedConfig?: PrinterConfig): Promise<boolean> {
    this.log('Connecting to iMin built-in printer...')
    this.activePrinter = 'imin'

    const result = await iminPrinter.connect()
    if (result) {
      const config: PrinterConfig = {
        deviceId: 'imin-built-in',
        deviceName: 'iMin D4-504 Built-in Printer',
        width: savedConfig?.width || '80mm',
        connectionType: 'imin',
      }
      savePrinterConfig(config)
      this.setStatus('connected')
      return true
    }

    this.setStatus('idle')
    return false
  }

  /**
   * Connect to Bluetooth printer
   */
  async connectBluetooth(savedConfig?: PrinterConfig): Promise<boolean> {
    this.log('Connecting to Bluetooth printer...')
    this.activePrinter = 'bluetooth'

    const result = await bluetoothPrinter.connect(savedConfig)
    if (result) {
      this.setStatus('connected')
      return true
    }

    this.setStatus('idle')
    return false
  }

  /**
   * Connect to a LAN ESC/POS printer (Comson 80 mm raw TCP, default port 9100).
   */
  async connectNetwork(host: string, port: number = 9100, width: '58mm' | '80mm' = '80mm'): Promise<boolean> {
    const cleanHost = normalizeHost(host)
    if (!cleanHost) {
      this.logError('IP printer LAN tidak valid')
      this.setStatus('idle')
      return false
    }
    const cleanPort = normalizePort(port)
    this.log(`Connecting to LAN printer ${cleanHost}:${cleanPort}...`)
    this.activePrinter = 'network'
    this.setStatus('connecting')
    iminPrinter.setPaperWidth(width)

    const result = await iminPrinter.connectNetwork(cleanHost, cleanPort)
    if (result.ok) {
      savePrinterConfig({
        deviceId: `lan:${cleanHost}:${cleanPort}`,
        deviceName: `Printer LAN ${cleanHost}`,
        width,
        connectionType: 'network',
        host: cleanHost,
        port: cleanPort,
      })
      this.lastError = ''
      this.setStatus('connected')
      return true
    }

    this.logError(result.userMessage || result.error || 'Printer LAN tidak merespons')
    this.setStatus('idle')
    return false
  }

  /**
   * Connect to a USB ESC/POS printer chosen from the native device list.
   */
  async connectUsb(deviceId: string, deviceName: string = 'Printer USB', width: '58mm' | '80mm' = '80mm'): Promise<boolean> {
    if (!deviceId) {
      this.logError('Printer USB belum dipilih')
      this.setStatus('idle')
      return false
    }
    this.log(`Connecting to USB printer ${deviceName}...`)
    this.activePrinter = 'usb'
    this.setStatus('connecting')
    iminPrinter.setPaperWidth(width)

    const result = await iminPrinter.connectUsb(deviceId)
    if (result.ok) {
      savePrinterConfig({
        deviceId,
        deviceName: deviceName || 'Printer USB',
        width,
        connectionType: 'usb',
        usbDeviceId: deviceId,
      })
      this.lastError = ''
      this.setStatus('connected')
      return true
    }

    this.logError(result.userMessage || result.error || 'Printer USB tidak merespons')
    this.setStatus('idle')
    return false
  }

  async scanNetwork(port: number = 9100, timeoutMs: number = 8000): Promise<LanScanResult> {
    return iminPrinter.scanNetwork(normalizePort(port), timeoutMs)
  }

  async listUsbPrinters(): Promise<UsbPrinterInfo[]> {
    return iminPrinter.listUsbPrinters()
  }

  /**
   * Disconnect from current printer
   */
  async disconnect(): Promise<void> {
    if (this.activePrinter === 'imin') {
      await iminPrinter.disconnect()
    } else if (this.activePrinter === 'bluetooth') {
      await bluetoothPrinter.disconnect()
    } else if (this.activePrinter === 'network' || this.activePrinter === 'usb') {
      await iminPrinter.disconnect()
    }

    this.activePrinter = null
    this.setStatus('idle')
    clearPrinterConfig()
  }

  /**
   * Auto-reconnect to saved printer
   */
  async autoReconnect(): Promise<boolean> {
    const saved = loadPrinterConfig()
    if (!saved) {
      this.log('No saved printer config found')
      return false
    }
    if (saved.connectionType === 'network' && !saved.host) return false
    if (saved.connectionType === 'usb' && !saved.usbDeviceId && !saved.deviceId) return false

    this.log('Attempting auto-reconnect to:', saved.deviceName)
    return this.connect(saved)
  }

  /**
   * Force reconnect current printer (call when print fails)
   */
  async forceReconnect(): Promise<boolean> {
    const saved = loadPrinterConfig()
    if (this.activePrinter === 'imin') {
      this.log('Force reconnecting iMin printer...')
      return iminPrinter.reconnect()
    }
    if (this.activePrinter === 'bluetooth') {
      this.log('Force reconnecting Bluetooth printer...')
      await bluetoothPrinter.disconnect()
      return this.connectBluetooth()
    }
    if (this.activePrinter === 'network') {
      this.log('Force reconnecting LAN printer...')
      if (!saved?.host) return false
      return this.connectNetwork(saved.host, saved.port ?? 9100, saved.width)
    }
    if (this.activePrinter === 'usb') {
      this.log('Force reconnecting USB printer...')
      const deviceId = saved?.usbDeviceId || saved?.deviceId
      if (!deviceId) return false
      return this.connectUsb(deviceId, saved?.deviceName ?? 'Printer USB', saved?.width ?? '80mm')
    }
    return false
  }

  /**
   * Print data using active printer
   */
  async print(data: Uint8Array): Promise<boolean> {
    const job = this.printQueue.then(() => this.printNow(data))
    this.printQueue = job.catch(() => false)
    return job
  }

  async printReceipt(data: Uint8Array, jobId: string): Promise<IMinPrintJobResult | boolean> {
    if (!this.activePrinter) {
      const saved = loadPrinterConfig()
      if (saved) {
        await this.connect(saved)
      }
    }
    if (this.activePrinter === 'imin' || this.activePrinter === 'network' || this.activePrinter === 'usb') {
      return iminPrinter.printJob(jobId, data)
    }
    return this.print(data)
  }

  private async printNow(data: Uint8Array): Promise<boolean> {
    // The page can reload while the saved printer config remains available.
    // Reconnect here instead of relying on a background effect finishing first.
    if (!this.activePrinter) {
      const saved = loadPrinterConfig()
      if (!saved || !(await this.connect(saved))) {
        this.logError('No printer connected')
        return false
      }
    }

    if (this.activePrinter === 'imin' && iminPrinter.status !== 'connected') {
      if (!(await this.connectImin())) return false
    }

    if (!this.activePrinter) {
      this.logError('No printer connected')
      return false
    }

    if (this.activePrinter === 'imin') {
      return iminPrinter.print(data)
    }

    if (this.activePrinter === 'network' || this.activePrinter === 'usb') {
      const jobId = `unified-${Date.now()}-${++this.jobSeq}`
      const result = await iminPrinter.printJob(jobId, data)
      if (typeof result === 'boolean') {
        if (!result) this.logError('Gagal mencetak ke printer')
        return result
      }
      if (!result.ok) {
        this.logError(result.error || 'Gagal mencetak ke printer')
        return false
      }
      return true
    }

    return bluetoothPrinter.write(data)
  }
}

function normalizeHost(host: string): string {
  return host.trim().replace(/\s+/g, '')
}

function normalizePort(port: number): number {
  return Number.isFinite(port) && port >= 1 && port <= 65535 ? Math.trunc(port) : 9100
}

export const printer = new UnifiedPrinter()
