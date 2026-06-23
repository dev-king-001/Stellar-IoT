'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSession, extendSession, endSession, getTelemetryWsUrl } from '@/services/api'
import { Session } from '@/types'

interface TelemetryData {
  timestamp: string
  numeric_readings: Record<string, number>
  boolean_readings: Record<string, boolean>
  string_readings: Record<string, string>
  is_abnormal: boolean
}

// Countdown timer helper
function useCountdown(expiresAt: string, onExpired?: () => void): string {
  const calc = useCallback(() => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) {
      if (onExpired) onExpired()
      return '00:00:00'
    }
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    const s = Math.floor((diff % 60_000) / 1_000)
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
  }, [expiresAt, onExpired])

  const [time, setTime] = useState(calc)

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  }, [calc])

  return time
}

export default function TelemetryDashboard() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [latestData, setLatestData] = useState<TelemetryData | null>(null)
  const [history, setHistory] = useState<TelemetryData[]>([])
  const [selectedField, setSelectedField] = useState<string>('')
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; time: string } | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load Session details
  const loadSession = useCallback(async () => {
    try {
      const data = await getSession(sessionId)
      setSession(data)
      if (!data.active) {
        setError('This session has been terminated.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  // Establish WebSocket connection
  const connectWs = useCallback(() => {
    if (wsRef.current) wsRef.current.close()

    setWsStatus('connecting')
    const wsUrl = getTelemetryWsUrl(sessionId)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setWsStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Handle explicit session errors
        if (data.error) {
          setError(data.error)
          if (session) {
            setSession({ ...session, active: false })
          }
          ws.close()
          return
        }

        const packet = data as TelemetryData
        setLatestData(packet)
        setHistory((prev) => {
          const next = [...prev, packet]
          // Keep last 30 data points
          if (next.length > 30) next.shift()
          return next
        })

        // Auto-select first numeric field if none selected
        if (packet.numeric_readings && Object.keys(packet.numeric_readings).length > 0) {
          setSelectedField((prev) => prev || Object.keys(packet.numeric_readings)[0])
        }
      } catch (err) {
        console.error('Error parsing telemetry JSON:', err)
      }
    }

    ws.onclose = () => {
      setWsStatus('disconnected')
      // Try reconnecting after 3 seconds if session is active
      if (session?.active) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWs()
        }, 3000)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket telemetry error:', err)
    }
  }, [sessionId, session])

  useEffect(() => {
    if (session?.active && session?.id) {
      connectWs()
    }
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    }
  }, [session?.active, session?.id, connectWs])

  // Extend Session handler
  const handleExtend = async () => {
    if (!session) return
    try {
      await extendSession(session.id, {
        device_id: session.device_id,
        user_address: session.user_address,
        amount: 1,
        tx_hash: `mock_extend_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`,
      })
      await loadSession()
      alert('Session successfully extended by 1 hour!')
    } catch {
      alert('Failed to extend session')
    }
  }

  // End Session handler
  const handleEnd = async () => {
    if (!session) return
    if (!confirm('Are you sure you want to end this session?')) return
    try {
      await endSession(session.id)
      await loadSession()
    } catch {
      alert('Failed to end session')
    }
  }

  // Export to CSV handler
  const handleExport = () => {
    if (history.length === 0) {
      alert('No telemetry data collected yet.')
      return
    }

    // Identify all fields
    const numericKeys = Object.keys(history[0].numeric_readings)
    const booleanKeys = Object.keys(history[0].boolean_readings)
    const stringKeys = Object.keys(history[0].string_readings)

    // CSV Headers
    const headers = ['Timestamp', 'Abnormal', ...numericKeys, ...booleanKeys, ...stringKeys]
    
    // CSV Rows
    const rows = history.map((p) => {
      const line = [
        p.timestamp,
        p.is_abnormal ? 'TRUE' : 'FALSE',
        ...numericKeys.map(k => p.numeric_readings[k] ?? ''),
        ...booleanKeys.map(k => p.boolean_readings[k] ? 'TRUE' : 'FALSE'),
        ...stringKeys.map(k => `"${p.string_readings[k]?.replace(/"/g, '""') ?? ''}"`)
      ]
      return line.join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `telemetry_session_${sessionId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const countdown = useCountdown(session?.expires_at || '', () => {
    // Callback when expired
    if (session && session.active) {
      setSession({ ...session, active: false })
    }
  })

  // Render SVG Chart helper
  const renderChart = () => {
    if (!selectedField || history.length < 2) {
      return (
        <div className="flex items-center justify-center h-64 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">Waiting for more telemetry data to plot chart...</p>
        </div>
      )
    }

    const width = 600
    const height = 280
    const paddingLeft = 50
    const paddingRight = 20
    const paddingTop = 25
    const paddingBottom = 40

    const plotWidth = width - paddingLeft - paddingRight
    const plotHeight = height - paddingTop - paddingBottom

    const values = history.map(p => p.numeric_readings[selectedField] ?? 0)
    let minVal = Math.min(...values)
    let maxVal = Math.max(...values)

    // Ensure range isn't 0
    if (minVal === maxVal) {
      minVal -= 1
      maxVal += 1
    } else {
      const padding = (maxVal - minVal) * 0.1
      minVal -= padding
      maxVal += padding
    }

    const points = history.map((p, idx) => {
      const val = p.numeric_readings[selectedField] ?? 0
      const x = paddingLeft + (idx / (history.length - 1)) * plotWidth
      const y = paddingTop + plotHeight - ((val - minVal) / (maxVal - minVal)) * plotHeight
      return { x, y, val, timestamp: p.timestamp }
    })

    // Construct path string
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`

    // Generate Y-axis gridlines/ticks
    const yTicksCount = 4
    const yTicks = Array.from({ length: yTicksCount }).map((_, idx) => {
      const ratio = idx / (yTicksCount - 1)
      const val = minVal + ratio * (maxVal - minVal)
      const y = paddingTop + plotHeight - ratio * plotHeight
      return { y, val }
    })

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7B16FF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7B16FF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, idx) => (
            <g key={idx} className="opacity-40">
              <line 
                x1={paddingLeft} 
                y1={tick.y} 
                x2={width - paddingRight} 
                y2={tick.y} 
                stroke="currentColor" 
                strokeDasharray="4 4" 
                className="text-slate-200 dark:text-slate-800"
              />
              <text 
                x={paddingLeft - 8} 
                y={tick.y + 4} 
                textAnchor="end" 
                className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
              >
                {tick.val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Shaded Area */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Line Path */}
          <path 
            d={linePath} 
            fill="none" 
            stroke="#7B16FF" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Data Points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoveredPoint?.time === p.timestamp ? 5.5 : 3}
              fill={hoveredPoint?.time === p.timestamp ? '#00A8FF' : '#7B16FF'}
              stroke="white"
              strokeWidth="1.5"
              className="cursor-pointer transition-all duration-100"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setHoveredPoint({
                  x: p.x,
                  y: p.y,
                  val: p.val,
                  time: p.timestamp,
                })
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* X Axis Time Marks (Start, Mid, End) */}
          <g className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono">
            <text x={paddingLeft} y={height - 15} textAnchor="start">
              {new Date(points[0].timestamp).toLocaleTimeString()}
            </text>
            <text x={paddingLeft + plotWidth / 2} y={height - 15} textAnchor="middle">
              {new Date(points[Math.floor(points.length / 2)].timestamp).toLocaleTimeString()}
            </text>
            <text x={width - paddingRight} y={height - 15} textAnchor="end">
              {new Date(points[points.length - 1].timestamp).toLocaleTimeString()}
            </text>
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div 
            className="absolute z-10 bg-slate-900 text-white p-2 rounded-lg text-xs shadow-xl pointer-events-none"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 20}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="font-bold">{hoveredPoint.val.toFixed(2)}</p>
            <p className="text-[9px] text-slate-300 font-mono">
              {new Date(hoveredPoint.time).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 w-1/3 mx-auto rounded"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 w-1/4 mx-auto rounded"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 w-3/4 mx-auto rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md text-center">
        <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-lg">
          <h2 className="text-xl font-bold mb-2">Access Issue</h2>
          <p className="text-sm mb-6">{error}</p>
          <Link href="/sessions" className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700">
            Back to My Sessions
          </Link>
        </div>
      </div>
    )
  }

  const isExpired = countdown === '00:00:00'
  const isUrgent = !isExpired && (new Date(session?.expires_at || '').getTime() - Date.now() < 5 * 60_000)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Abnormal warning banner */}
      {latestData?.is_abnormal && (
        <div className="mb-6 bg-red-600 animate-pulse text-white p-4 rounded-xl shadow-lg flex items-center justify-between border-2 border-red-400">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold">CRITICAL WARNING: Abnormal Telemetry Detected!</p>
              <p className="text-xs text-red-100">
                Reading outside of thresholds: {latestData.string_readings['status'] || 'Anomaly flagged'}
              </p>
            </div>
          </div>
          <span className="text-xs px-2 py-1 bg-red-800 rounded font-mono">ALERT</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Session info & controls */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6">
            <Link href="/sessions" className="text-sm text-stellar-purple hover:underline flex items-center space-x-1 mb-4">
              <span>← Back to My Sessions</span>
            </Link>
            <h1 className="text-2xl font-bold truncate mb-2">{session?.device_name}</h1>
            <p className="text-xs text-slate-400 mb-6">Device ID: {session?.device_id}</p>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${session?.active && !isExpired ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                  {session?.active && !isExpired ? 'Active' : 'Expired'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">Telemetry Feed</span>
                <span className="flex items-center space-x-1.5 text-xs font-semibold">
                  <span className={`w-2.5 h-2.5 rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-ping' : wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="capitalize">{wsStatus}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">User Wallet</span>
                <span className="text-xs font-mono truncate max-w-[150px]">{session?.user_address}</span>
              </div>
            </div>

            {session?.active && !isExpired && (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 text-center border border-slate-100 dark:border-slate-800 mb-6">
                <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Time Remaining</p>
                <p className={`text-4xl font-bold font-mono ${isUrgent ? 'text-yellow-600 animate-pulse' : 'text-stellar-purple'}`}>{countdown}</p>
                {isUrgent && <p className="text-xs text-yellow-600 mt-2 font-medium">⚠ Session expires in less than 5 mins</p>}
              </div>
            )}

            {session?.active && !isExpired ? (
              <div className="space-y-3">
                <button 
                  onClick={handleExtend}
                  className="w-full bg-stellar-purple text-white py-3 rounded-xl font-semibold hover:bg-opacity-95 transition-all text-sm shadow-lg shadow-stellar-purple/20"
                >
                  Extend Session (1 XLM)
                </button>
                <button 
                  onClick={handleEnd}
                  className="w-full border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 py-3 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-all text-sm"
                >
                  Terminate Session
                </button>
              </div>
            ) : (
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-center py-4 rounded-xl text-sm font-medium">
                This session has ended. To resume telemetry, please make another payment for this device.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Dashboard display (stat grid + chart + download) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Readings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Numeric Readings Card */}
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-5">
              <p className="text-xs text-slate-400 font-semibold mb-2 uppercase">Numeric Readings</p>
              {latestData ? (
                <div className="space-y-3 mt-2">
                  {Object.entries(latestData.numeric_readings).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-xs capitalize font-medium text-slate-500 dark:text-slate-400">{key}</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {val}
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          {key === 'temperature' ? '°C' : key === 'humidity' ? '%' : key === 'battery_level' ? '%' : 'L/m'}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">Waiting for data...</p>
              )}
            </div>

            {/* 2. Boolean Status Card */}
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-5">
              <p className="text-xs text-slate-400 font-semibold mb-2 uppercase">Status States</p>
              {latestData ? (
                <div className="space-y-3 mt-2">
                  {Object.entries(latestData.boolean_readings).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-xs capitalize font-medium text-slate-500 dark:text-slate-400">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold font-mono ${val ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                        {val ? 'TRUE' : 'FALSE'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">Waiting for data...</p>
              )}
            </div>

            {/* 3. Text Info Card */}
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-5">
              <p className="text-xs text-slate-400 font-semibold mb-2 uppercase">System Log</p>
              {latestData ? (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Latest Status:</p>
                  <p className="text-sm font-bold text-stellar-purple mt-1 truncate">
                    {latestData.string_readings['status'] || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-3">
                    Updated: {new Date(latestData.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">Waiting for data...</p>
              )}
            </div>
          </div>

          {/* Visualizing Chart Box */}
          <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold">Telemetry Live Visualizer</h3>
                <p className="text-xs text-slate-400">Real-time charting of numeric sensor endpoints</p>
              </div>
              
              {/* Plot Variable Selector */}
              {latestData && Object.keys(latestData.numeric_readings).length > 0 && (
                <select 
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                >
                  {Object.keys(latestData.numeric_readings).map(k => (
                    <option key={k} value={k}>Plot {k.charAt(0).toUpperCase() + k.slice(1)}</option>
                  ))}
                </select>
              )}
            </div>

            {renderChart()}
          </div>

          {/* Export Panel */}
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-2xl p-6 border border-slate-150 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold">Export Telemetry Log</h4>
              <p className="text-xs text-slate-400">Download the sensor readings history collected during this active browser session.</p>
            </div>
            <button 
              onClick={handleExport}
              disabled={history.length === 0}
              className="bg-slate-800 dark:bg-slate-700 hover:bg-opacity-95 text-white py-2.5 px-5 rounded-xl text-xs font-semibold disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center space-x-1.5"
            >
              <span>📥</span>
              <span>Export CSV ({history.length} frames)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
