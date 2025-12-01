import { useState, useEffect } from 'react'
import {
  Factory,
  MapPin,
  Clock,
  Gauge,
  Plus,
  Edit2
} from 'lucide-react'
import { Card, CardBody } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { stationsApi } from '../api/client'

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

function StationForm({ station, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: station?.name || '',
    location: station?.location || '',
    capacity_per_hour: station?.capacity_per_hour || '',
    operating_hours_start: station?.operating_hours_start || '06:00',
    operating_hours_end: station?.operating_hours_end || '22:00',
    is_active: station?.is_active ?? true,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        capacity_per_hour: parseFloat(formData.capacity_per_hour),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Station Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
          placeholder="e.g., Zeebrugge Terminal 1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          type="text"
          required
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
          placeholder="Full address"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capacity (m³/hour)
        </label>
        <input
          type="number"
          required
          min="0"
          step="0.1"
          value={formData.capacity_per_hour}
          onChange={(e) => setFormData({ ...formData, capacity_per_hour: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
          placeholder="150"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opening Time
          </label>
          <input
            type="time"
            required
            value={formData.operating_hours_start}
            onChange={(e) => setFormData({ ...formData, operating_hours_start: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Closing Time
          </label>
          <input
            type="time"
            required
            value={formData.operating_hours_end}
            onChange={(e) => setFormData({ ...formData, operating_hours_end: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded border-gray-300 text-mint-600 focus:ring-mint-500"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Station is active
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? 'Saving...' : (station ? 'Update Station' : 'Create Station')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function Stations() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStation, setEditingStation] = useState(null)

  useEffect(() => {
    loadStations()
  }, [])

  async function loadStations() {
    try {
      setLoading(true)
      const data = await stationsApi.getAll()
      setStations(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    await stationsApi.create(data)
    setModalOpen(false)
    loadStations()
  }

  const handleUpdate = async (data) => {
    await stationsApi.update(editingStation.id, data)
    setEditingStation(null)
    loadStations()
  }

  const openEditModal = (station) => {
    setEditingStation(station)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading stations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        Error loading stations: {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stations</h1>
          <p className="text-gray-500 mt-1">Manage LNG loading terminals</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Station
        </Button>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((station) => (
          <Card key={station.id} className="relative">
            <CardBody>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-mint-100 rounded-lg flex items-center justify-center">
                  <Factory className="w-6 h-6 text-mint-600" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={station.is_active ? 'active' : 'inactive'} />
                  <button
                    onClick={() => openEditModal(station)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 text-lg mb-2">
                {station.name}
              </h3>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{station.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-gray-400" />
                  <span>{station.capacity_per_hour} m³/hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    {formatTime(station.operating_hours_start)} - {formatTime(station.operating_hours_end)}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Station"
      >
        <StationForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingStation}
        onClose={() => setEditingStation(null)}
        title="Edit Station"
      >
        {editingStation && (
          <StationForm
            station={editingStation}
            onSubmit={handleUpdate}
            onCancel={() => setEditingStation(null)}
          />
        )}
      </Modal>
    </div>
  )
}

export default Stations
