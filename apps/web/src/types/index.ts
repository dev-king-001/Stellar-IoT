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
  user_address: string
  created_at: string
  expires_at: string
  active: boolean
}
