import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Filter, CheckCircle, XCircle, Eye } from 'lucide-react'
import Card, { CardHeader, CardBody } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { Select } from '../components/Input'
import { requestsApi, usersApi, holidayTypesApi } from '../api/client'

export default function Requests() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [holidayTypes, setHolidayTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)

  const statusFilter = searchParams.get('status') || ''
  const userFilter = searchParams.get('user_id') || ''

  useEffect(() => {
    fetchData()
  }, [statusFilter, userFilter])

  async function fetchData() {
    try {
      const [requestsData, usersData, typesData] = await Promise.all([
        requestsApi.getAll({
          status: statusFilter || undefined,
          userId: userFilter || undefined,
        }),
        usersApi.getAll(),
        holidayTypesApi.getAll(),
      ])
      setRequests(requestsData)
      setUsers(usersData)
      setHolidayTypes(typesData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  function updateFilter(key, value) {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  async function handleApprove(id) {
    try {
      await requestsApi.approve(id, 1)
      await fetchData()
      setSelectedRequest(null)
    } catch (error) {
      console.error('Failed to approve request:', error)
      alert(error.message)
    }
  }

  async function handleReject(id) {
    try {
      await requestsApi.reject(id, 1)
      await fetchData()
      setSelectedRequest(null)
    } catch (error) {
      console.error('Failed to reject request:', error)
      alert(error.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this request?')) return

    try {
      await requestsApi.delete(id)
      setRequests(prev => prev.filter(r => r.id !== id))
      setSelectedRequest(null)
    } catch (error) {
      console.error('Failed to delete request:', error)
      alert(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Requests</h1>
          <p className="text-gray-500">View and manage leave requests</p>
        </div>
        <Link to="/requests/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <Select
            value={statusFilter}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-40"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select
            value={userFilter}
            onChange={(e) => updateFilter('user_id', e.target.value)}
            className="w-48"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {/* Requests Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Employee</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Dates</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Days</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-6 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: request.holiday_type?.color || '#14b8a6' }}
                        >
                          {request.user?.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{request.user?.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-600">{request.holiday_type?.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-600">
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-900">{request.total_days}</span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge status={request.status}>{request.status}</Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-mint-600 hover:bg-mint-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Request Details"
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium"
                style={{ backgroundColor: selectedRequest.holiday_type?.color || '#14b8a6' }}
              >
                {selectedRequest.user?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedRequest.user?.name}</h3>
                <p className="text-sm text-gray-500">{selectedRequest.user?.department}</p>
              </div>
              <Badge status={selectedRequest.status} className="ml-auto">
                {selectedRequest.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-500">Holiday Type</p>
                <p className="font-medium text-gray-900">{selectedRequest.holiday_type?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Days</p>
                <p className="font-medium text-gray-900">{selectedRequest.total_days} days</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedRequest.start_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedRequest.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {selectedRequest.notes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-700">{selectedRequest.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedRequest.id)}
              >
                Delete Request
              </Button>
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={() => handleReject(selectedRequest.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => handleApprove(selectedRequest.id)}
                  >
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
