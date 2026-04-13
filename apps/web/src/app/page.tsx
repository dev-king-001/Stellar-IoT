'use client'

import { useEffect, useState } from 'react'
import DeviceCard from '@/components/DeviceCard'
import { getDevices } from '@/services/api'
import { Device } from '@/types'

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      const data = await getDevices()
      setDevices(data)
    } catch (error) {
      console.error('Failed to load devices:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Available IoT Devices</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Pay with Stellar to unlock device access
        </p>
      </div>

      {loading ? (
        <div className="text-center">Loading devices...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  )
}
