const variants = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-mint-100 text-mint-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
}

const statusMap = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
  employee: 'default',
  manager: 'primary',
  admin: 'purple',
}

export default function Badge({
  children,
  variant = 'default',
  status = null,
  className = '',
  ...props
}) {
  const resolvedVariant = status ? (statusMap[status] || 'default') : variant

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        rounded-full text-xs font-medium
        ${variants[resolvedVariant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}
