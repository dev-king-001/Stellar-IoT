import { Device, PaymentRequest, PaymentResponse } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function getDevices(): Promise<Device[]> {
  const response = await fetch(`${API_URL}/devices`)
  if (!response.ok) {
    throw new Error('Failed to fetch devices')
  }
  return response.json()
}

export async function makePayment(payment: PaymentRequest): Promise<PaymentResponse> {
  const response = await fetch(`${API_URL}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payment),
  })
  
  if (!response.ok) {
    throw new Error('Payment failed')
  }
  
  return response.json()
}

export async function getSession(sessionId: string): Promise<any> {
  const response = await fetch(`${API_URL}/session/${sessionId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch session')
  }
  return response.json()
}
