import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  Clock,
  Users,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowRight
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { dashboardApi } from '../api/client'

function StatCard({ icon: Icon, label, value, subValue, color }) {
  const colorClasses = {
    mint: 'bg-mint-100 text-mint-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subValue && (
              <p className="text-sm text-gray-500 mt-1">{subValue}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        const [statsData, scheduleData, activityData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getTodaySchedule(),
          dashboardApi.getRecentActivity(5),
        ])
        setStats(statsData)
        setSchedule(scheduleData)
        setRecentActivity(activityData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        Error loading dashboard: {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to LNG Load Hub</p>
        </div>
        <Link to="/reservations/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Reservation
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={CalendarCheck}
          label="Reservations Today"
          value={stats?.total_reservations_today || 0}
          color="mint"
        />
        <StatCard
          icon={Clock}
          label="Available Slots Today"
          value={stats?.available_slots_today || 0}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Active Customers"
          value={stats?.active_customers || 0}
          color="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed This Week"
          value={stats?.completed_loadings_this_week || 0}
          subValue={`${stats?.total_volume_this_week?.toFixed(1) || 0} m³ loaded`}
          color="green"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
            <Link to="/reservations" className="text-mint-600 hover:text-mint-700 text-sm font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {schedule.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No loadings scheduled for today
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {schedule.map((item) => (
                  <div key={item.reservation_id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatTime(item.slot_start_time)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(item.slot_end_time)}
                          </p>
                        </div>
                        <div className="h-12 w-px bg-gray-200" />
                        <div>
                          <p className="font-medium text-gray-900">{item.customer_name}</p>
                          <p className="text-sm text-gray-500">
                            {item.station_name} • {item.truck_license_plate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">
                          {item.requested_volume} m³
                        </span>
                        <Badge status={item.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </CardHeader>
          <CardBody className="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No recent activity
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full ${
                        activity.type.includes('completed') ? 'bg-green-500' :
                        activity.type.includes('cancelled') ? 'bg-red-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
