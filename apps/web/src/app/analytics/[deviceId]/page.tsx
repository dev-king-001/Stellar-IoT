import AnalyticsDashboard from '@/components/AnalyticsDashboard'

interface Props {
  params: { deviceId: string }
}

export default function AnalyticsPage({ params }: Props) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Device Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Device ID: <span className="font-mono">{params.deviceId}</span>
        </p>
      </div>
      <AnalyticsDashboard deviceId={params.deviceId} />
    </main>
  )
}
