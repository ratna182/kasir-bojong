'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { printer } from '../lib/printer'
import { loadPrinterConfig, clearPrinterConfig } from '../lib/printer/storage'
import { defaultPrinterConfig, readPrinterDefaults } from '../lib/printer/defaults'
import type { PrinterConfig, PrinterStatus, UsbPrinterInfo } from '../lib/printer/types'

interface PrinterSetupProps {
  open: boolean
  onClose: () => void
  onConfigured: (config: PrinterConfig | null) => void
}

interface PrinterSetupDialogProps {
  onClose: () => void
  onConfigured: (config: PrinterConfig | null) => void
}

const TYPE_LABEL: Record<PrinterConfig['connectionType'], string> = {
  imin: 'Built-in',
  bluetooth: 'Bluetooth',
  network: 'LAN',
  usb: 'USB',
}

function initialPrinterState() {
  const defaults = readPrinterDefaults()
  const saved = loadPrinterConfig()
  const fallback = defaultPrinterConfig(defaults)
  return {
    config: saved,
    width: saved?.width ?? fallback?.width ?? defaults.width,
    lanHost: saved?.host ?? fallback?.host ?? '',
    lanPort: saved?.port ?? fallback?.port ?? defaults.port,
    availablePrinters: printer.getAvailablePrinters(),
  }
}

export default function PrinterSetup(props: PrinterSetupProps) {
  if (!props.open) return null
  return <PrinterSetupDialog onClose={props.onClose} onConfigured={props.onConfigured} />
}

function PrinterSetupDialog({ onClose, onConfigured }: PrinterSetupDialogProps) {
  const [initial] = useState(initialPrinterState)
  const [status, setStatus] = useState<PrinterStatus>('idle')
  const [config, setConfig] = useState<PrinterConfig | null>(initial.config)
  const [width, setWidth] = useState<'58mm' | '80mm'>(initial.width)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const [availablePrinters] = useState(initial.availablePrinters)
  const [lanHost, setLanHost] = useState(initial.lanHost)
  const [lanPort, setLanPort] = useState(initial.lanPort)
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<string[]>([])
  const [scanInfo, setScanInfo] = useState('')
  const [usbPrinters, setUsbPrinters] = useState<UsbPrinterInfo[]>([])
  const [usbLoading, setUsbLoading] = useState(false)
  const allowed = readPrinterDefaults().allowed

  useEffect(() => printer.onStatusChange(setStatus), [])

  const refreshUsb = useCallback(async () => {
    setUsbLoading(true)
    try {
      const devices = await printer.listUsbPrinters()
      setUsbPrinters(devices)
      if (devices.length === 0) setDebugInfo('Tidak ada perangkat USB terdeteksi. Pasang kabel USB printer lalu muat ulang.')
    } finally {
      setUsbLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!availablePrinters.usb) return
    let cancelled = false
    void printer.listUsbPrinters().then((devices) => {
      if (!cancelled) setUsbPrinters(devices)
    })
    return () => {
      cancelled = true
    }
  }, [availablePrinters.usb])

  const applyConnectedConfig = useCallback(() => {
    const currentConfig = loadPrinterConfig()
    setConfig(currentConfig)
    onConfigured(currentConfig)
  }, [onConfigured])

  const handleConnect = useCallback(async (type: 'bluetooth' | 'imin') => {
    setError('')
    setDebugInfo(`Menghubungkan ke ${type === 'imin' ? 'printer built-in' : 'printer Bluetooth'}...`)

    try {
      let ok: boolean
      if (type === 'imin') {
        ok = await printer.connectImin({ deviceId: 'imin-built-in', deviceName: 'iMin D4-504 Built-in Printer', width, connectionType: 'imin' })
      } else {
        const cfg = loadPrinterConfig()
        ok = await printer.connectBluetooth(cfg ? { ...cfg, width } : { deviceId: '', deviceName: '', width, connectionType: 'bluetooth' })
      }

      if (ok) {
        applyConnectedConfig()
        setDebugInfo('Printer berhasil terhubung!')
      } else {
        const errorMsg = printer.error || 'Printer tidak ditemukan.'
        setError(errorMsg)
        setDebugInfo(`Gagal: ${errorMsg}`)
      }
    } catch (e) {
      setError('Terjadi kesalahan saat menghubungkan printer.')
      setDebugInfo(`Error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [width, applyConnectedConfig])

  const handleConnectLan = useCallback(async () => {
    const host = lanHost.trim()
    if (!host) {
      setError('Masukkan IP printer LAN terlebih dahulu.')
      return
    }
    setError('')
    setScanInfo('')
    setDebugInfo(`Menghubungkan ke printer LAN ${host}:${lanPort}...`)
    const ok = await printer.connectNetwork(host, lanPort, width)
    if (ok) {
      applyConnectedConfig()
      setDebugInfo('Printer LAN berhasil terhubung!')
    } else {
      setError(printer.error || 'Printer LAN tidak merespons.')
      setDebugInfo(`Gagal: ${printer.error}`)
    }
  }, [lanHost, lanPort, width, applyConnectedConfig])

  const handleScanLan = useCallback(async () => {
    setError('')
    setScanning(true)
    setScanResults([])
    setScanInfo('Memindai jaringan, tunggu beberapa detik...')
    try {
      const result = await printer.scanNetwork(lanPort)
      if (!result.ok) {
        setScanInfo(result.userMessage || result.error || 'Pemindaian gagal.')
      } else {
        setScanResults(result.hosts)
        setScanInfo(result.hosts.length > 0
          ? `${result.hosts.length} printer ditemukan di ${result.subnet || 'jaringan lokal'}. Pilih salah satu.`
          : 'Tidak ada printer ditemukan. Masukkan IP printer secara manual.')
        if (result.hosts.length === 1) setLanHost(result.hosts[0])
      }
    } catch (e) {
      setScanInfo(`Pemindaian gagal: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setScanning(false)
    }
  }, [lanPort])

  const handleConnectUsb = useCallback(async (device: UsbPrinterInfo) => {
    setError('')
    setDebugInfo(`Menghubungkan ke ${device.name}...`)
    const ok = await printer.connectUsb(device.deviceId, device.name, width)
    if (ok) {
      applyConnectedConfig()
      setDebugInfo('Printer USB berhasil terhubung!')
    } else {
      setError(printer.error || 'Printer USB tidak merespons.')
      setDebugInfo(`Gagal: ${printer.error}`)
    }
    await refreshUsb()
  }, [width, applyConnectedConfig, refreshUsb])

  const handleDisconnect = useCallback(async () => {
    await printer.disconnect()
    setConfig(null)
    clearPrinterConfig()
    onConfigured(null)
    setDebugInfo('')
  }, [onConfigured])

  const handleForceReconnect = useCallback(async () => {
    setError('')
    setDebugInfo('Menyambungkan ulang printer...')
    try {
      const ok = await printer.forceReconnect()
      if (ok) {
        setDebugInfo('Reconnect berhasil!')
      } else {
        setError(printer.error || 'Reconnect gagal')
        setDebugInfo(`Reconnect gagal: ${printer.error}`)
      }
    } catch (e) {
      setError('Terjadi kesalahan saat reconnect.')
      setDebugInfo(`Error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [])

  const canUseNetwork = availablePrinters.network && allowed.includes('network')
  const canUseUsb = availablePrinters.usb && allowed.includes('usb')

  return (
    <div className="modal-overlay no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--color-bg)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '440px', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Setup Printer</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-text)' }}>&times;</button>
        </div>

        {config ? (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-success-soft, #d4edda)', borderRadius: '8px', border: '1px solid var(--color-success, #28a745)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28a745', display: 'inline-block' }} />
                <span style={{ fontWeight: 700 }}>{config.deviceName}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#28a745', fontWeight: 600 }}>{status.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
              Printer terhubung ({TYPE_LABEL[config.connectionType]}{config.connectionType === 'network' && config.host ? ` ${config.host}:${config.port ?? 9100}` : ''})
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-bg-secondary, #f8f9fa)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc3545', display: 'inline-block' }} />
              <span style={{ fontWeight: 600 }}>Belum terhubung</span>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Ukuran Kertas</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['58mm', '80mm'] as const).map((w) => (
              <button key={w} type="button" onClick={() => setWidth(w)} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: `2px solid ${width === w ? 'var(--color-brand)' : 'var(--color-border)'}`, background: width === w ? 'var(--color-brand-soft, #e7f1ff)' : 'transparent', fontWeight: width === w ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem' }}>
                {w}
              </button>
            ))}
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted, #777)' }}>Comson 80mm gunakan 80mm.</p>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'var(--color-danger-soft, #f8d7da)', borderRadius: '6px', color: 'var(--color-danger, #dc3545)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {debugInfo && (
          <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'var(--color-bg-secondary, #f8f9fa)', borderRadius: '6px', fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
            {debugInfo}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!config ? (
            <>
              {canUseNetwork && (
                <section style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Printer LAN (Comson)</h4>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <input
                      value={lanHost}
                      onChange={(event) => setLanHost(event.target.value)}
                      placeholder="192.168.1.50"
                      inputMode="decimal"
                      style={{ flex: 2, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
                    />
                    <input
                      value={lanPort}
                      onChange={(event) => setLanPort(Number(event.target.value) || 0)}
                      inputMode="numeric"
                      aria-label="Port printer LAN"
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="button" onClick={handleScanLan} disabled={scanning} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontWeight: 600, fontSize: '0.8rem', cursor: scanning ? 'wait' : 'pointer' }}>
                      {scanning ? 'Memindai...' : 'Cari Printer'}
                    </button>
                    <button type="button" onClick={handleConnectLan} disabled={status === 'connecting'} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: 'var(--color-brand)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: status === 'connecting' ? 'wait' : 'pointer', opacity: status === 'connecting' ? 0.7 : 1 }}>
                      {status === 'connecting' ? 'Menyambungkan...' : 'Hubungkan LAN'}
                    </button>
                  </div>
                  {scanInfo && <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted, #777)' }}>{scanInfo}</p>}
                  {scanResults.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                      {scanResults.map((host) => (
                        <button key={host} type="button" onClick={() => setLanHost(host)} style={{ padding: '0.35rem 0.55rem', borderRadius: '999px', border: `1px solid ${lanHost === host ? 'var(--color-brand)' : 'var(--color-border)'}`, background: lanHost === host ? 'var(--color-brand-soft, #e7f1ff)' : 'transparent', color: 'var(--color-text)', fontSize: '0.78rem', cursor: 'pointer' }}>
                          {host}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {canUseUsb && (
                <section style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Printer USB (Comson)</h4>
                    <button type="button" onClick={refreshUsb} disabled={usbLoading} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: '0.75rem', cursor: usbLoading ? 'wait' : 'pointer' }}>
                      {usbLoading ? 'Memuat...' : 'Muat Ulang'}
                    </button>
                  </div>
                  {usbPrinters.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted, #777)' }}>Pasang printer lewat kabel USB (OTG) lalu tekan Muat Ulang.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {usbPrinters.map((device) => (
                        <button key={device.deviceId} type="button" onClick={() => handleConnectUsb(device)} disabled={!device.printable || status === 'connecting'} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontWeight: 600, fontSize: '0.8rem', textAlign: 'left', cursor: device.printable ? 'pointer' : 'not-allowed', opacity: device.printable ? 1 : 0.5 }}>
                          {device.name} {device.hasPermission ? '' : '(izin diperlukan)'}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {availablePrinters.imin && allowed.includes('imin') && (
                <button type="button" onClick={() => handleConnect('imin')} disabled={status === 'connecting'} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'var(--color-brand)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: status === 'connecting' ? 'wait' : 'pointer', opacity: status === 'connecting' ? 0.7 : 1 }}>
                  {status === 'connecting' ? 'Menyambungkan...' : 'Gunakan Printer Built-in (iMin)'}
                </button>
              )}
              {availablePrinters.bluetooth && allowed.includes('bluetooth') && (
                <button type="button" onClick={() => handleConnect('bluetooth')} disabled={status === 'connecting'} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'var(--color-bg-secondary, #f8f9fa)', color: 'var(--color-text)', fontWeight: 700, fontSize: '0.95rem', cursor: status === 'connecting' ? 'wait' : 'pointer', opacity: status === 'connecting' ? 0.7 : 1 }}>
                  {status === 'connecting' ? 'Menyambungkan...' : 'Hubungkan Printer Bluetooth'}
                </button>
              )}
              {!availablePrinters.imin && !availablePrinters.bluetooth && !canUseNetwork && !canUseUsb && (
                <div style={{ padding: '0.75rem', background: 'var(--color-warning-soft, #fff3cd)', borderRadius: '8px', border: '1px solid var(--color-warning, #ffc107)', fontSize: '0.85rem' }}>
                  Tidak ada printer yang tersedia. Printer LAN/USB memerlukan APK Android.
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button type="button" onClick={handleDisconnect} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid var(--color-danger, #dc3545)', background: 'transparent', color: 'var(--color-danger, #dc3545)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                Putuskan Koneksi
              </button>
              <button type="button" onClick={handleForceReconnect} disabled={status === 'connecting'} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'var(--color-warning, #ffc107)', color: '#000', fontWeight: 700, fontSize: '0.95rem', cursor: status === 'connecting' ? 'wait' : 'pointer', opacity: status === 'connecting' ? 0.7 : 1 }}>
                {status === 'connecting' ? 'Menyambungkan ulang...' : 'Reconnect Printer'}
              </button>
            </div>
          )}
          <Link href="/printer-test" onClick={onClose} style={{ display: 'block', width: '100%', marginTop: '0.5rem', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary, #666)', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
            Buka Diagnostik Printer
          </Link>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted, #999)', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.25rem' }}>LAN: Comson 80mm, port 9100, satu jaringan dengan perangkat kasir.</p>
          <p style={{ margin: 0 }}>USB: Comson 80mm lewat kabel OTG. Bluetooth tetap tersedia untuk cabang lain.</p>
        </div>
      </div>
    </div>
  )
}
