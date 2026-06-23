'use client'

import { useEffect, useState } from 'react'
import { DeviceAnalyticsReport, ReportPeriod } from '@/types'
import { getDeviceAnalytics, getAnalyticsCsvUrl } from '@/services/api'

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

// ─── Simple bar chart ─────────────────────────────────────────────────────────

function BarChart({
  data,
  valueKey,
  labelKey,
  color = 'bg-indigo-500',
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  valueKey: string
  labelKey: string
  color?: string
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const pct = (Number(d[valueKey]) / max) * 100
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1">
            <div
              className={`w-full rounded-t ${color} transition-all`}
              style={{ height: `${pct}%` }}
              title={`${d[labelKey]}: ${d[valueKey]}`}
            />
            {data.length <= 12 && (
              <span className="text-[9px] text-gray-400 truncate w-full text-center">
                {String(d[labelKey]).slice(-5)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  deviceId: string
}

export default function AnalyticsDashboard({ deviceId }: Props) {
  const [report, setReport] = useState<DeviceAnalyticsReport | null>(null)
  const [period, setPeriod] = useState<ReportPeriod>('daily')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getDeviceAnalytics(deviceId, period)
      .then(setReport)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [deviceId, period])

  const fmtDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.round(secs % 60)
    return m >= 60
      ? `${Math.floor(m / 60)}h ${m % 60}m`
      : `${m}m ${s}s`
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <a
          href={getAnalyticsCsvUrl(deviceId, period)}
          download
          className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">Loading analytics…</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {report && !loading && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Revenue"
              value={`${report.total_revenue.toLocaleString()} XLM`}
            />
            <StatCard
              label="Total Sessions"
              value={report.total_sessions.toLocaleString()}
            />
            <StatCard
              label="Unique Users"
              value={report.total_unique_users.toLocaleString()}
            />
            <StatCard
              label="Avg Session"
              value={fmtDuration(report.avg_session_duration_secs)}
              sub="per session"
            />
          </div>

          {/* Revenue time-series */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
            <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-200">
              Revenue ({report.period})
            </h3>
            <BarChart
              data={report.time_series}
              valueKey="revenue"
              labelKey="date"
              color="bg-indigo-500"
            />
          </div>

          {/* Session count time-series */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
            <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-200">
              Sessions ({report.period})
            </h3>
            <BarChart
              data={report.time_series}
              valueKey="session_count"
              labelKey="date"
              color="bg-violet-400"
            />
          </div>

          {/* Bottom row: peak hours + retention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Peak hours */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
              <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-200">
                Peak Usage Hours (UTC)
              </h3>
              <div className="space-y-2">
                {report.peak_hours.map((h) => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="w-14 text-xs text-gray-500 shrink-0">
                      {String(h.hour).padStart(2, '0')}:00
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{
                          width: `${(h.session_count / (report.peak_hours[0]?.session_count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-xs text-right text-gray-500">
                      {h.session_count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention cohorts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
              <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-200">
                User Retention Cohorts
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 text-left border-b dark:border-gray-700">
                      <th className="pb-2 pr-3">Cohort</th>
                      <th className="pb-2 pr-3 text-right">New</th>
                      <th className="pb-2 pr-3 text-right">Returning</th>
                      <th className="pb-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.retention.map((r) => (
                      <tr key={r.cohort} className="border-b dark:border-gray-700 last:border-0">
                        <td className="py-2 pr-3 font-mono">{r.cohort}</td>
                        <td className="py-2 pr-3 text-right">{r.new_users}</td>
                        <td className="py-2 pr-3 text-right">{r.returning_users}</td>
                        <td className="py-2 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              r.retention_rate >= 50
                                ? 'bg-green-100 text-green-700'
                                : r.retention_rate >= 30
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {r.retention_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
