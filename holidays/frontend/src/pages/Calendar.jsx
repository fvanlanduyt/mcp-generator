import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card, { CardBody } from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { dashboardApi } from '../api/client'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    fetchEvents()
  }, [year, month])

  async function fetchEvents() {
    setLoading(true)
    try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      const data = await dashboardApi.getCalendar(startDate, endDate)
      setEvents(data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function getDaysInMonth() {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  function getEventsForDay(day) {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(event => {
      const start = event.start_date
      const end = event.end_date
      return dateStr >= start && dateStr <= end
    })
  }

  function isToday(day) {
    if (!day) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  const days = getDaysInMonth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500">View all scheduled holidays</p>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardBody className="flex items-center justify-between">
          <Button variant="ghost" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {MONTHS[month]} {year}
            </h2>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <Button variant="ghost" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </CardBody>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardBody className="p-0">
          {/* Days header */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day)
              const today = isToday(day)

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border-b border-r border-gray-100 ${
                    !day ? 'bg-gray-50' : ''
                  } ${today ? 'bg-mint-50' : ''}`}
                >
                  {day && (
                    <>
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 text-sm ${
                          today
                            ? 'bg-mint-600 text-white rounded-full font-semibold'
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <button
                            key={`${event.id}-${i}`}
                            onClick={() => setSelectedEvent(event)}
                            className="block w-full text-left"
                          >
                            <div
                              className="px-2 py-1 rounded text-xs text-white truncate"
                              style={{ backgroundColor: event.color }}
                            >
                              {event.user_name}
                            </div>
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-xs text-gray-500 px-2">
                            +{dayEvents.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Event Legend */}
      <Card>
        <CardBody>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4">
            {Array.from(new Set(events.map(e => JSON.stringify({ type: e.holiday_type, color: e.color }))))
              .map(json => JSON.parse(json))
              .map(({ type, color }) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-600">{type}</span>
                </div>
              ))}
          </div>
        </CardBody>
      </Card>

      {/* Event Detail Popup */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <Card className="w-80" onClick={(e) => e.stopPropagation()}>
            <CardBody>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedEvent.user_name}</h3>
                  <p className="text-sm text-gray-500">{selectedEvent.holiday_type}</p>
                </div>
                <Badge status={selectedEvent.status}>{selectedEvent.status}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Start:</span>
                  <span className="text-gray-900">
                    {new Date(selectedEvent.start_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">End:</span>
                  <span className="text-gray-900">
                    {new Date(selectedEvent.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
