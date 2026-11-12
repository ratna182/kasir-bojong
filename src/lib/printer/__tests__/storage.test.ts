import { beforeEach, describe, expect, it } from 'vitest'
import { clearPrinterConfig, loadPrinterConfig, savePrinterConfig } from '../storage'

const BUILT_IN = {
  deviceId: 'imin-built-in',
  deviceName: 'iMin D4-504 Built-in Printer',
  width: '58mm',
  connectionType: 'imin',
} as const

describe('printer config storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when nothing was saved', () => {
    expect(loadPrinterConfig()).toBeNull()
  })

  it('keeps an 80 mm saved width', () => {
    savePrinterConfig({ ...BUILT_IN, width: '80mm' })
    expect(loadPrinterConfig()?.width).toBe('80mm')
  })

  it('widens a built-in config that was saved with the old 58 mm default', () => {
    savePrinterConfig(BUILT_IN)
    expect(loadPrinterConfig()?.width).toBe('80mm')
    expect(loadPrinterConfig()?.width).toBe('80mm')
  })

  it('persists the widened width so the migration only runs once', () => {
    savePrinterConfig(BUILT_IN)
    loadPrinterConfig()
    const persisted = JSON.parse(localStorage.getItem('kasir_printer_config') as string)
    expect(persisted.width).toBe('80mm')
  })

  it('leaves a bluetooth printer width untouched', () => {
    savePrinterConfig({ deviceId: 'aa:bb', deviceName: 'Printer Luar', width: '58mm', connectionType: 'bluetooth' })
    expect(loadPrinterConfig()?.width).toBe('58mm')
  })

  it('adds the raw ESC/POS port to a LAN config without one', () => {
    savePrinterConfig({
      deviceId: 'lan:192.168.1.50',
      deviceName: 'Printer LAN 192.168.1.50',
      width: '80mm',
      connectionType: 'network',
      host: ' 192.168.1.50 ',
    })
    expect(loadPrinterConfig()).toMatchObject({ host: '192.168.1.50', port: 9100 })
  })

  it('keeps a USB device id for reconnect', () => {
    savePrinterConfig({
      deviceId: '/dev/bus/usb/001/002',
      deviceName: 'Comson 80mm',
      width: '80mm',
      connectionType: 'usb',
    })
    expect(loadPrinterConfig()).toMatchObject({
      connectionType: 'usb',
      usbDeviceId: '/dev/bus/usb/001/002',
    })
  })

  it('drops everything on clear', () => {
    savePrinterConfig(BUILT_IN)
    clearPrinterConfig()
    expect(loadPrinterConfig()).toBeNull()
  })
})
