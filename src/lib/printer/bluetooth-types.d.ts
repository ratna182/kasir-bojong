interface BluetoothDevice {
  id: string
  name: string | null
  gatt: BluetoothRemoteGATTServer | null
  addEventListener(type: string, listener: EventListener): void
}

interface BluetoothRemoteGATTServer {
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>
}

interface BluetoothRemoteGATTCharacteristic {
  properties: { write: boolean }
  writeValueWithResponse(value: BufferSource): Promise<void>
}

interface BluetoothRequestDeviceOptions {
  filters?: Array<{
    services?: string[]
    name?: string
    namePrefix?: string
    deviceId?: string
  }>
  acceptAllDevices?: boolean
  optionalServices?: string[]
}

interface NavigatorBluetooth {
  requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>
}

declare global {
  interface Navigator {
    bluetooth?: NavigatorBluetooth
  }
}

export {}
