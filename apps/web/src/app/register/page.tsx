import DeviceRegistrationForm from '@/components/DeviceRegistrationForm'

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Register Your Device</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Onboard your IoT device to the Stellar pay-per-use platform.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <DeviceRegistrationForm />
        </div>
      </div>
    </div>
  )
}
