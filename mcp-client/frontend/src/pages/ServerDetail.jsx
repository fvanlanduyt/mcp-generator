import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Server, Wifi, WifiOff,
  Clock, Hash, Code, ChevronDown, ChevronRight
} from 'lucide-react'
import Button from '../components/Button'
import { getServerStatus, syncServer } from '../api/client'

export default function ServerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [serverData, setServerData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [expandedFunctions, setExpandedFunctions] = useState({})

  useEffect(() => {
    loadServerStatus()
  }, [id])

  const loadServerStatus = async () => {
    setIsLoading(true)
    try {
      const response = await getServerStatus(id)
      setServerData(response.data)
    } catch (error) {
      console.error('Failed to load server status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncServer(id)
      await loadServerStatus()
    } catch (error) {
      console.error('Failed to sync server:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const toggleFunction = (funcName) => {
    setExpandedFunctions(prev => ({
      ...prev,
      [funcName]: !prev[funcName]
    }))
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-mint-50 flex items-center justify-center">
        <div className="text-gray-500">Loading server details...</div>
      </div>
    )
  }

  if (!serverData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-mint-50 flex items-center justify-center">
        <div className="text-gray-500">Server not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-mint-50">
      {/* Header */}
      <header className="bg-white border-b border-mint-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg text-gray-500 hover:text-mint-600 hover:bg-mint-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-800">{serverData.name}</h1>
            <p className="text-sm text-gray-500">{serverData.url}</p>
          </div>
          <Button onClick={handleSync} disabled={isSyncing} size="sm">
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Connection Status</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Online Status */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  serverData.online ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {serverData.online ? (
                    <Wifi className="w-5 h-5 text-green-600" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-semibold ${serverData.online ? 'text-green-600' : 'text-red-600'}`}>
                    {serverData.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Function Count */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-mint-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-5 h-5 text-mint-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Functions</p>
                  <p className="font-semibold text-gray-900">{serverData.function_count}</p>
                </div>
              </div>

              {/* Last Sync */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Sync</p>
                  <p className="font-semibold text-gray-900 text-sm">
                    {formatDate(serverData.config?.last_sync)}
                  </p>
                </div>
              </div>

              {/* Server Type */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-semibold text-gray-900">MCP Server</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {serverData.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{serverData.error}</p>
              </div>
            )}

            {/* Server Info */}
            {serverData.server_info && Object.keys(serverData.server_info).length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Server Info</p>
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(serverData.server_info, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Functions Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Available Functions ({serverData.function_count})
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              These functions are available for use in the chat
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {serverData.functions?.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No functions synced yet. Click "Sync" to fetch functions from the server.
              </div>
            ) : (
              serverData.functions?.map((func) => (
                <div key={func.name} className="px-6 py-4">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleFunction(func.name)}
                  >
                    <div className="w-8 h-8 bg-mint-100 rounded-lg flex items-center justify-center">
                      <Code className="w-4 h-4 text-mint-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{func.name}</h3>
                      <p className="text-sm text-gray-500">{func.description}</p>
                    </div>
                    {expandedFunctions[func.name] ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {expandedFunctions[func.name] && func.parameters && (
                    <div className="mt-3 ml-11 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Parameters</p>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(func.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
