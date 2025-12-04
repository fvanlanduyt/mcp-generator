export default function Input({
  label,
  error,
  className = '',
  type = 'text',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        type={type}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500
          ${error ? 'border-red-300' : 'border-gray-300'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export function Textarea({
  label,
  error,
  className = '',
  rows = 3,
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`
          w-full px-3 py-2 border rounded-lg resize-none
          focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500
          ${error ? 'border-red-300' : 'border-gray-300'}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
