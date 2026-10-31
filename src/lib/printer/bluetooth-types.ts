// Web Bluetooth API types
// These types are not officially provided by TypeScript, so we define them here

export interface BluetoothDevice {
  id: string
  name?: string
  gatt?: BluetoothRemoteGATTServer
  addEventListener(event: string, handler: (event: Event) => void): void
}

export interface BluetoothRemoteGATTServer {
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>
}

export interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>
}

export interface BluetoothRemoteGATTCharacteristic {
  uuid: string
  properties: {
    write: boolean
    writeWithoutResponse: boolean
    notify: boolean
  }
  writeValueWithResponse(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
  startNotifications(): Promise<void>
  addEventListener(event: string, handler: (event: Event) => void): void
}

export interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
  getDevices(): Promise<BluetoothDevice[]>
}

export interface RequestDeviceOptions {
  filters?: BluetoothRequestFilter[]
  acceptAllDevices?: boolean
  optionalServices?: string[]
}

export interface BluetoothRequestFilter {
  deviceId?: string
  services?: string[]
  name?: string
  namePrefix?: string
}

// Extend Navigator interface
declare global {
  interface Navigator {
    bluetooth?: Bluetooth
  }
}
