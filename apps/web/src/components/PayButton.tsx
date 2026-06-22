'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Device } from '@/types'
import { makePayment } from '@/services/api'

interface PayButtonProps {
  device: Device
}

export default function PayButton({ device }: PayButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // TODO: Integrate with Stellar wallet (Freighter, etc.)
      const userAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // Placeholder
      
      const result = await makePayment({
        device_id: device.id,
        user_address: userAddress,
        amount: device.price,
        tx_hash: `mock_pay_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`,
      })
      
      if (result.access_granted) {
        setSuccess(true)
        router.push(`/sessions/${result.session_id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center">
        ✓ Access Granted! Unlocked. Redirecting...
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <button
        onClick={handlePayment}
        disabled={loading || !device.available}
        className="w-full bg-stellar-purple text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : `Pay ${device.price} XLM to Unlock`}
      </button>
      
      <p className="text-sm text-gray-500 mt-2 text-center">
        Payment will be processed via Stellar blockchain
      </p>
    </div>
  )
}
