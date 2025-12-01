import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { slotsApi, stationsApi } from '../api/client'

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

function SlotForm({ stations, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    station_id: stations[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '10:00',
    max_volume: '50',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        station_id: parseInt(formData.station_id),
        max_volume: parseFloat(formData.max_volume),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Station
        </label>
        <select
          required
          value={formData.station_id}
          onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
        >
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input
            type="time"
            required
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time
          </label>
          <input
            type="time"
            required
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max Volume (m³)
        </label>
        <input
          type="number"
          required
          min="0"
          step="0.1"
          value={formData.max_volume}
          onChange={(e) => setFormData({ ...formData, max_volume: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? 'Creating...' : 'Create Slot'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function LoadingSlots() {
  const [slots, setSlots] = useState([])
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Filters
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return {
      from: today.toISOString().split('T')[0],
      to: nextWeek.toISOString().split('T')[0]
    }
  })

  useEffect(() => {
    loadStations()
  }, [])

  useEffect(() => {
    loadSlots()
  }, [selectedStation, selectedStatus, dateRange])

  async function loadStations() {
    try {
      const data = await stationsApi.getAll()
      setStations(data)
    } catch (err) {
      console.error('Error loading stations:', err)
    }
  }

  async function loadSlots() {
    try {
      setLoading(true)
      const data = await slotsApi.getAll({
        station_id: selectedStation || undefined,
        status: selectedStatus || undefined,
        date_from: dateRange.from,
        date_to: dateRange.to,
        limit: 200
      })
      setSlots(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    await slotsApi.create(data)
    setModalOpen(false)
    loadSlots()
  }

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const date = slot.date
    if (!acc[date]) acc[date] = []
    acc[date].push(slot)
    return acc
  }, {})

  const sortedDates = Object.keys(slotsByDate).sort()

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        Error loading slots: {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loading Slots</h1>
          <p className="text-gray-500 mt-1">Manage available time slots for truck loading</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Slot
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Filters:</span>
            </div>

            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
            >
              <option value="">All Stations</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Slots Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading slots...</div>
        </div>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No slots found for the selected filters</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <Card key={date}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-mint-600" />
                  <h3 className="font-semibold text-gray-900">{formatDate(date)}</h3>
                  <span className="text-sm text-gray-500 ml-2">
                    {slotsByDate[date].length} slot{slotsByDate[date].length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-gray-100">
                  {slotsByDate[date]
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((slot) => (
                      <div key={slot.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </span>
                            </div>

                            <div className="text-sm text-gray-600">
                              {slot.station?.name || 'Unknown Station'}
                            </div>

                            <div className="text-sm text-gray-600">
                              Max: <span className="font-medium">{slot.max_volume} m³</span>
                            </div>
                          </div>

                          <Badge status={slot.status} />
                        </div>
                      </div>
                    ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Loading Slot"
      >
        <SlotForm
          stations={stations}
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

export default LoadingSlots
