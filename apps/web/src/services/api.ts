import { Device, PaymentRequest, PaymentResponse, Session, DeviceRegistrationForm, DeviceRegistrationResponse } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function getDevices(): Promise<Device[]> {
  const response = await fetch(`${API_URL}/devices`)
  if (!response.ok) throw new Error('Failed to fetch devices')
  return response.json()
}

export async function makePayment(payment: PaymentRequest): Promise<PaymentResponse> {
  const response = await fetch(`${API_URL}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  })
  if (!response.ok) throw new Error('Payment failed')
  return response.json()
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${API_URL}/session/${sessionId}`)
  if (!response.ok) throw new Error('Failed to fetch session')
  return response.json()
}

export async function getSessions(userAddress: string): Promise<Session[]> {
  const response = await fetch(`${API_URL}/sessions?user=${userAddress}`)
  if (!response.ok) throw new Error('Failed to fetch sessions')
  return response.json()
}

export async function extendSession(sessionId: string, payment: PaymentRequest): Promise<PaymentResponse> {
  const response = await fetch(`${API_URL}/session/${sessionId}/extend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  })
  if (!response.ok) throw new Error('Failed to extend session')
  return response.json()
}

export async function endSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/session/${sessionId}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to end session')
}

export async function registerDevice(data: DeviceRegistrationForm): Promise<DeviceRegistrationResponse> {
  const response = await fetch(`${API_URL}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to register device')
  return response.json()
}

import { DeviceAnalyticsReport, ReportPeriod } from '@/types'

export async function getDeviceAnalytics(
  deviceId: string,
  period: ReportPeriod = 'daily',
  lookback?: number,
): Promise<DeviceAnalyticsReport> {
  const params = new URLSearchParams({ period })
  if (lookback) params.set('lookback', String(lookback))
  const response = await fetch(`${API_URL}/devices/${deviceId}/analytics?${params}`)
  if (!response.ok) throw new Error('Failed to fetch analytics')
  return response.json()
}

export function getAnalyticsCsvUrl(
  deviceId: string,
  period: ReportPeriod = 'daily',
  lookback?: number,
): string {
  const params = new URLSearchParams({ period, format: 'csv' })
  if (lookback) params.set('lookback', String(lookback))
  return `${API_URL}/devices/${deviceId}/analytics?${params}`
}
