import Link from 'next/link'
import { Device } from '@/types'

interface DeviceCardProps {
  device: Device
}

export default function DeviceCard({ device }: DeviceCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">{device.name}</h3>
          <span className={`px-2 py-1 text-xs rounded ${device.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {device.available ? 'Available' : 'Unavailable'}
          </span>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {device.description}
        </p>
        
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">{device.location}</span>
          <span className="text-lg font-bold text-stellar-purple">{device.price} XLM</span>
        </div>
        
        <Link 
          href={`/device/${device.id}`}
          className="block w-full text-center bg-stellar-purple text-white py-2 rounded-lg hover:bg-opacity-90 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}
