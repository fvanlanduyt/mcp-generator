import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Clock,
  CheckCircle,
  Palmtree,
  CalendarDays,
  ArrowRight
} from 'lucide-react'
import Card, { CardHeader, CardBody } from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { dashboardApi, requestsApi } from '../api/client'

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    mint: 'bg-mint-100 text-mint-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, pendingData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getPending(5)
        ])
        setStats(statsData)
        setPendingRequests(pendingData)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleApprove = async (id) => {
    try {
      await requestsApi.approve(id, 1) // Using admin user ID 1 for demo
      setPendingRequests(prev => prev.filter(r => r.id !== id))
      setStats(prev => ({
        ...prev,
        pending_requests: prev.pending_requests - 1,
        approved_today: prev.approved_today + 1
      }))
    } catch (error) {
      console.error('Failed to approve request:', error)
    }
  }

  const handleReject = async (id) => {
    try {
      await requestsApi.reject(id, 1)
      setPendingRequests(prev => prev.filter(r => r.id !== id))
      setStats(prev => ({
        ...prev,
        pending_requests: prev.pending_requests - 1
      }))
    } catch (error) {
      console.error('Failed to reject request:', error)
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
        </div>
        <Link to="/requests/new">
          <Button>
            <CalendarDays className="w-4 h-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.total_users || 0}
          color="mint"
        />
        <StatCard
          icon={Clock}
          label="Pending Requests"
          value={stats?.pending_requests || 0}
          color="yellow"
        />
        <StatCard
          icon={CheckCircle}
          label="Approved Today"
          value={stats?.approved_today || 0}
          color="green"
        />
        <StatCard
          icon={Palmtree}
          label="On Holiday Today"
          value={stats?.on_holiday_today || 0}
          color="blue"
        />
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
          <Link to="/requests?status=pending" className="text-mint-600 hover:text-mint-700 text-sm font-medium flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {pendingRequests.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No pending requests
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingRequests.map((request) => (
                <div key={request.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: request.holiday_type?.color || '#14b8a6' }}
                    >
                      {request.user?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{request.user?.name}</p>
                      <p className="text-sm text-gray-500">
                        {request.holiday_type?.name} • {request.total_days} day{request.total_days !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      </p>
                      <Badge status="pending">Pending</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(request.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">This Month</h2>
          </CardHeader>
          <CardBody>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-mint-600">{stats?.total_days_booked_this_month || 0}</p>
              <p className="text-gray-500 mt-1">Total days booked</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/requests/new">
                <Button variant="secondary" className="w-full">
                  <CalendarDays className="w-4 h-4" />
                  Request Leave
                </Button>
              </Link>
              <Link to="/calendar">
                <Button variant="secondary" className="w-full">
                  <Palmtree className="w-4 h-4" />
                  View Calendar
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
