const statusColors = {
  // Slot statuses
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',

  // Reservation statuses
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',

  // Contract types
  contract: 'bg-mint-100 text-mint-800',
  spot: 'bg-orange-100 text-orange-800',

  // Active status
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
}

function Badge({ status, className = '' }) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800'
  const displayText = status.replace('_', ' ')

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass} ${className}`}
    >
      {displayText}
    </span>
  )
}

export default Badge
