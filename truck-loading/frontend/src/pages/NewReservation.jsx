import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Factory,
  Calendar,
  Truck
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { customersApi, stationsApi, slotsApi, reservationsApi } from '../api/client'

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const steps = [
  { id: 1, title: 'Select Customer', icon: Building2 },
  { id: 2, title: 'Select Station', icon: Factory },
  { id: 3, title: 'Choose Slot', icon: Calendar },
  { id: 4, title: 'Truck Details', icon: Truck },
  { id: 5, title: 'Confirm', icon: Check },
]

function NewReservation() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [customers, setCustomers] = useState([])
  const [stations, setStations] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form data
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [truckDetails, setTruckDetails] = useState({
    truck_license_plate: '',
    driver_name: '',
    requested_volume: '',
    notes: ''
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedStation && selectedDate) {
      loadAvailableSlots()
    }
  }, [selectedStation, selectedDate])

  async function loadInitialData() {
    try {
      setLoading(true)
      const [customersData, stationsData] = await Promise.all([
        customersApi.getAll(),
        stationsApi.getAll({ is_active: true })
      ])
      setCustomers(customersData)
      setStations(stationsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadAvailableSlots() {
    try {
      const data = await slotsApi.getAvailable({
        station_id: selectedStation.id,
        date: selectedDate
      })
      setAvailableSlots(data)
    } catch (err) {
      console.error('Error loading slots:', err)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await reservationsApi.create({
        slot_id: selectedSlot.id,
        customer_id: selectedCustomer.id,
        truck_license_plate: truckDetails.truck_license_plate,
        driver_name: truckDetails.driver_name,
        requested_volume: parseFloat(truckDetails.requested_volume),
        notes: truckDetails.notes || null
      })
      navigate('/reservations')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedCustomer !== null
      case 2: return selectedStation !== null
      case 3: return selectedSlot !== null
      case 4: return truckDetails.truck_license_plate && truckDetails.driver_name && truckDetails.requested_volume
      default: return true
    }
  }

  const nextStep = () => {
    if (canProceed() && currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/reservations')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Reservation</h1>
          <p className="text-gray-500 mt-1">Create a new truck loading reservation</p>
        </div>
      </div>

      {/* Steps Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-2 ${step.id === currentStep ? 'text-mint-600' : step.id < currentStep ? 'text-mint-500' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.id === currentStep
                    ? 'bg-mint-600 text-white'
                    : step.id < currentStep
                    ? 'bg-mint-100 text-mint-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.id < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`hidden sm:block text-sm font-medium ${
                  step.id === currentStep ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 lg:w-24 h-0.5 mx-2 ${
                  step.id < currentStep ? 'bg-mint-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card className="mb-6">
        <CardBody>
          {/* Step 1: Select Customer */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Customer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedCustomer?.id === customer.id
                        ? 'border-mint-500 bg-mint-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-mint-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-mint-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.contact_person}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Badge status={customer.contract_type} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Station */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Station</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stations.map((station) => (
                  <div
                    key={station.id}
                    onClick={() => setSelectedStation(station)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedStation?.id === station.id
                        ? 'border-mint-500 bg-mint-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-mint-100 rounded-lg flex items-center justify-center">
                        <Factory className="w-5 h-5 text-mint-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{station.name}</p>
                        <p className="text-sm text-gray-500">{station.location}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Capacity: {station.capacity_per_hour} m³/hour
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Choose Slot */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Available Slot</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedSlot(null)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                />
              </div>

              {availableSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No available slots for the selected date
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableSlots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedSlot?.id === slot.id
                          ? 'border-mint-500 bg-mint-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-mint-600" />
                        <span className="font-medium text-gray-900">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Max volume: {slot.max_volume} m³
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Truck Details */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Enter Truck Details</h2>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Truck License Plate
                  </label>
                  <input
                    type="text"
                    required
                    value={truckDetails.truck_license_plate}
                    onChange={(e) => setTruckDetails({ ...truckDetails, truck_license_plate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                    placeholder="e.g., 1-ABC-123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    required
                    value={truckDetails.driver_name}
                    onChange={(e) => setTruckDetails({ ...truckDetails, driver_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requested Volume (m³)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedSlot?.max_volume || 100}
                    step="0.1"
                    value={truckDetails.requested_volume}
                    onChange={(e) => setTruckDetails({ ...truckDetails, requested_volume: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                    placeholder={`Max: ${selectedSlot?.max_volume || 0} m³`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={truckDetails.notes}
                    onChange={(e) => setTruckDetails({ ...truckDetails, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                    rows={3}
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Reservation</h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium text-gray-900">{selectedCustomer?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Station</p>
                    <p className="font-medium text-gray-900">{selectedStation?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedSlot?.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">
                      {formatTime(selectedSlot?.start_time)} - {formatTime(selectedSlot?.end_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Truck</p>
                    <p className="font-medium text-gray-900">{truckDetails.truck_license_plate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Driver</p>
                    <p className="font-medium text-gray-900">{truckDetails.driver_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Volume</p>
                    <p className="font-medium text-gray-900">{truckDetails.requested_volume} m³</p>
                  </div>
                </div>
                {truckDetails.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-gray-900">{truckDetails.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {currentStep < 5 ? (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Reservation'}
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default NewReservation
