import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultPrinterConfig, isPrinterTypeAllowed, readPrinterDefaults } from '../defaults'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('printer branch defaults', () => {
  it('returns LAN settings for the Comson branch', () => {
    vi.stubEnv('NEXT_PUBLIC_PRINTER_TYPE', 'network')
    vi.stubEnv('NEXT_PUBLIC_PRINTER_HOST', '192.168.1.50')
    vi.stubEnv('NEXT_PUBLIC_PRINTER_PORT', '9100')
    vi.stubEnv('NEXT_PUBLIC_PRINTER_WIDTH', '80mm')
    vi.stubEnv('NEXT_PUBLIC_PRINTER_ALLOWED', 'network,usb')

    const settings = readPrinterDefaults()
    expect(settings.connectionType).toBe('network')
    expect(settings.host).toBe('192.168.1.50')
    expect(settings.port).toBe(9100)
    expect(settings.width).toBe('80mm')
    expect(settings.allowed).toEqual(['network', 'usb'])
    expect(defaultPrinterConfig(settings)).toMatchObject({
      connectionType: 'network',
      host: '192.168.1.50',
      port: 9100,
      width: '80mm',
    })
  })

  it('falls back to port 9100 and 80 mm when the env values are invalid', () => {
    vi.stubEnv('NEXT_PUBLIC_PRINTER_PORT', 'not-a-port')
    vi.stubEnv('NEXT_PUBLIC_PRINTER_WIDTH', '112mm')

    const settings = readPrinterDefaults()
    expect(settings.port).toBe(9100)
    expect(settings.width).toBe('80mm')
  })

  it('ignores unknown allowed types and keeps known ones once', () => {
    vi.stubEnv('NEXT_PUBLIC_PRINTER_ALLOWED', 'network, network, wifi, usb')

    expect(readPrinterDefaults().allowed).toEqual(['network', 'usb'])
    expect(isPrinterTypeAllowed('usb', ['network', 'usb'])).toBe(true)
    expect(isPrinterTypeAllowed('bluetooth', ['network', 'usb'])).toBe(false)
  })

  it('does not create a config without a host or a selected USB device', () => {
    vi.stubEnv('NEXT_PUBLIC_PRINTER_TYPE', 'network')
    vi.stubEnv('NEXT_PUBLIC_PRINTER_HOST', '')
    expect(defaultPrinterConfig()).toBeNull()

    vi.stubEnv('NEXT_PUBLIC_PRINTER_TYPE', 'usb')
    expect(defaultPrinterConfig()).toMatchObject({ connectionType: 'usb', width: '80mm' })
  })
})
