export interface Device {
  id: string
  name: string
  description: string
  price: number
  available: boolean
  location: string
}

export interface PaymentRequest {
  device_id: string
  user_address: string
  amount: number
}

export interface PaymentResponse {
  access_granted: boolean
  session_id: string
  expires_at: string
}

export interface Session {
  id: string
  device_id: string
  device_name: string
  user_address: string
  created_at: string
  expires_at: string
  active: boolean
}

export type DeviceCategory = 'sensor' | 'camera' | 'actuator' | 'gateway' | 'tracker' | 'other'
export type ConnectivityType = 'wifi' | 'lora' | 'zigbee' | 'bluetooth' | '4g' | 'ethernet'

export interface DeviceRegistrationForm {
  name: string
  type: DeviceCategory
  description: string
  price: number
  location: string
  connectivity: ConnectivityType
  owner_address: string
}

export interface DeviceRegistrationResponse {
  id: string
  name: string
  message: string
}
