import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Server, Trash2, RefreshCw, MoreHorizontal, Check, X } from 'lucide-react'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { getServers, createServer, deleteServer, syncServer, updateServer } from '../api/client'

export default function Settings() {
  const navigate = useNavigate()
  const [servers, setServers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newServer, setNewServer] = useState({ name: '', url: '', description: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    loadServers()
  }, [])

  const loadServers = async () => {
    try {
      const response = await getServers()
      setServers(response.data)
    } catch (error) {
      console.error('Failed to load servers:', error)
      setServers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddServer = async (e) => {
    e.preventDefault()
    setError('')

    if (!newServer.name.trim() || !newServer.url.trim()) {
      setError('Name and URL are required')
      return
    }

    try {
      await createServer(newServer)
      setShowAddModal(false)
      setNewServer({ name: '', url: '', description: '' })
      loadServers()
    } catch (error) {
      console.error('Failed to add server:', error)
      setError('Failed to add server. Please check your input.')
    }
  }

  const handleDeleteServer = async (id) => {
    if (!confirm('Are you sure you want to delete this server?')) return

    try {
      await deleteServer(id)
      loadServers()
    } catch (error) {
      console.error('Failed to delete server:', error)
    }
  }

  const handleSyncServer = async (id) => {
    try {
      await syncServer(id)
      alert('Sync initiated successfully')
    } catch (error) {
      console.error('Failed to sync server:', error)
    }
  }

  const handleToggleServer = async (server) => {
    try {
      await updateServer(server.id, { is_active: !server.is_active })
      loadServers()
    } catch (error) {
      console.error('Failed to update server:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-mint-50">
      {/* Header */}
      <header className="bg-white border-b border-mint-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-gray-500 hover:text-mint-600 hover:bg-mint-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* MCP Servers Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">MCP Servers</h2>
              <p className="text-sm text-gray-500 mt-1">
                Connect to MCP servers to access their tools and functions.
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} size="sm">
              <Plus className="w-4 h-4" />
              Add Server
            </Button>
          </div>

          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Loading servers...
              </div>
            ) : servers.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No MCP servers configured yet. Click "Add Server" to get started.
              </div>
            ) : (
              servers.map((server) => (
                <div
                  key={server.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-mint-100 rounded-lg flex items-center justify-center">
                      <Server className="w-5 h-5 text-mint-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{server.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            server.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {server.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{server.url}</p>
                      {server.description && (
                        <p className="text-sm text-gray-400 mt-1">{server.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleServer(server)}
                      className={`p-2 rounded-lg transition-colors ${
                        server.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={server.is_active ? 'Disable' : 'Enable'}
                    >
                      {server.is_active ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSyncServer(server.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-mint-600 hover:bg-mint-50 transition-colors"
                      title="Sync functions"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteServer(server.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete server"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Add Server Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setNewServer({ name: '', url: '', description: '' })
          setError('')
        }}
        title="Add MCP Server"
      >
        <form onSubmit={handleAddServer} className="space-y-4">
          <Input
            label="Name"
            placeholder="My MCP Server"
            value={newServer.name}
            onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
          />
          <Input
            label="Server URL"
            placeholder="http://localhost:3000"
            value={newServer.url}
            onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
          />
          <Input
            label="Description (optional)"
            placeholder="A brief description of this server"
            value={newServer.description}
            onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddModal(false)
                setNewServer({ name: '', url: '', description: '' })
                setError('')
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              Add Server
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
