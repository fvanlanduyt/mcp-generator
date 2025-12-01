import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Plus,
  Filter,
  Truck,
  User,
  Calendar,
  MoreVertical,
  Eye,
  XCircle,
  CheckCircle
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { reservationsApi, stationsApi, customersApi } from '../api/client'

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function ReservationDetail({ reservation, onClose, onStatusChange }) {
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (newStatus) => {
    setUpdating(true)
    try {
      await onStatusChange(reservation.id, newStatus)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Customer</p>
          <p className="font-medium text-gray-900">{reservation.customer?.name || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <Badge status={reservation.status} className="mt-1" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Station</p>
          <p className="font-medium text-gray-900">{reservation.slot?.station?.name || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Date & Time</p>
          <p className="font-medium text-gray-900">
            {formatDate(reservation.slot?.date)}, {formatTime(reservation.slot?.start_time)} - {formatTime(reservation.slot?.end_time)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Truck</p>
          <p className="font-medium text-gray-900">{reservation.truck_license_plate}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Driver</p>
          <p className="font-medium text-gray-900">{reservation.driver_name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Volume</p>
          <p className="font-medium text-gray-900">{reservation.requested_volume} m³</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="font-medium text-gray-900">{new Date(reservation.created_at).toLocaleString()}</p>
        </div>
      </div>

      {reservation.notes && (
        <div>
          <p className="text-sm text-gray-500">Notes</p>
          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">{reservation.notes}</p>
        </div>
      )}

      {/* Status Actions */}
      {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500 mb-3">Update Status</p>
          <div className="flex gap-2">
            {reservation.status === 'pending' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('confirmed')}
                disabled={updating}
              >
                <CheckCircle className="w-4 h-4" />
                Confirm
              </Button>
            )}
            {reservation.status === 'confirmed' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                disabled={updating}
              >
                Start Loading
              </Button>
            )}
            {reservation.status === 'in_progress' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('completed')}
                disabled={updating}
              >
                <CheckCircle className="w-4 h-4" />
                Complete
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleStatusChange('cancelled')}
              disabled={updating}
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

function Reservations() {
  const [reservations, setReservations] = useState([])
  const [stations, setStations] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReservation, setSelectedReservation] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => {
    Promise.all([
      stationsApi.getAll(),
      customersApi.getAll()
    ]).then(([stationsData, customersData]) => {
      setStations(stationsData)
      setCustomers(customersData)
    })
  }, [])

  useEffect(() => {
    loadReservations()
  }, [selectedStation, selectedCustomer, selectedStatus, searchTerm])

  async function loadReservations() {
    try {
      setLoading(true)
      const data = await reservationsApi.getAll({
        station_id: selectedStation || undefined,
        customer_id: selectedCustomer || undefined,
        status: selectedStatus || undefined,
        search: searchTerm || undefined,
        limit: 100
      })
      setReservations(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (reservationId, newStatus) => {
    await reservationsApi.update(reservationId, { status: newStatus })
    loadReservations()
    setSelectedReservation(null)
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        Error loading reservations: {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-500 mt-1">Manage truck loading reservations</p>
        </div>
        <Link to="/reservations/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Reservation
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by truck plate or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
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
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading reservations...</div>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reservations found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date & Time</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Customer</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Station</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Truck</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Volume</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(reservation.slot?.date)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(reservation.slot?.start_time)} - {formatTime(reservation.slot?.end_time)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{reservation.customer?.name || 'Unknown'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{reservation.slot?.station?.name || 'Unknown'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{reservation.truck_license_plate}</p>
                          <p className="text-xs text-gray-500">{reservation.driver_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{reservation.requested_volume} m³</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={reservation.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedReservation(reservation)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedReservation}
        onClose={() => setSelectedReservation(null)}
        title="Reservation Details"
      >
        {selectedReservation && (
          <ReservationDetail
            reservation={selectedReservation}
            onClose={() => setSelectedReservation(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </Modal>
    </div>
  )
}

export default Reservations
