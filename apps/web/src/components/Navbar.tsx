import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-stellar-purple">Stellar IoT</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-stellar-purple">
              Devices
            </Link>
            <button className="bg-stellar-purple text-white px-4 py-2 rounded-lg hover:bg-opacity-90">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
