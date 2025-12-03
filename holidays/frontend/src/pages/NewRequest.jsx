import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ArrowLeft } from 'lucide-react'
import Card, { CardHeader, CardBody } from '../components/Card'
import Button from '../components/Button'
import Input, { Select, Textarea } from '../components/Input'
import { requestsApi, usersApi, holidayTypesApi } from '../api/client'

export default function NewRequest() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [holidayTypes, setHolidayTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    user_id: '',
    holiday_type_id: '',
    start_date: '',
    end_date: '',
    notes: '',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersData, typesData] = await Promise.all([
          usersApi.getAll(true),
          holidayTypesApi.getAll(true),
        ])
        setUsers(usersData)
        setHolidayTypes(typesData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  function calculateDays() {
    if (!formData.start_date || !formData.end_date) return 0
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.user_id || !formData.holiday_type_id || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields')
      return
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      alert('End date must be after start date')
      return
    }

    setSaving(true)

    try {
      await requestsApi.create({
        user_id: parseInt(formData.user_id),
        holiday_type_id: parseInt(formData.holiday_type_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes || null,
      })
      navigate('/requests')
    } catch (error) {
      console.error('Failed to create request:', error)
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-600"></div>
      </div>
    )
  }

  const selectedType = holidayTypes.find(t => t.id === parseInt(formData.holiday_type_id))
  const days = calculateDays()

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Request</h1>
          <p className="text-gray-500">Submit a new holiday request</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-mint-100 rounded-lg">
              <CalendarDays className="w-5 h-5 text-mint-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Request Details</h2>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Select
              label="Employee"
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              required
            >
              <option value="">Select an employee...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.department})
                </option>
              ))}
            </Select>

            <Select
              label="Holiday Type"
              value={formData.holiday_type_id}
              onChange={(e) => setFormData({ ...formData, holiday_type_id: e.target.value })}
              required
            >
              <option value="">Select a type...</option>
              {holidayTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} (max {type.max_days_per_request} days)
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                required
              />
            </div>

            {days > 0 && (
              <div className="p-4 bg-mint-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-mint-700 font-medium">Total days:</span>
                  <span className="text-2xl font-bold text-mint-700">{days}</span>
                </div>
                {selectedType && days > selectedType.max_days_per_request && (
                  <p className="text-red-600 text-sm mt-2">
                    Warning: Exceeds maximum of {selectedType.max_days_per_request} days for {selectedType.name}
                  </p>
                )}
              </div>
            )}

            <Textarea
              label="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional information..."
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
