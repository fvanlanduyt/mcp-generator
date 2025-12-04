import { useNavigate } from 'react-router-dom'
import { Settings, MessageSquare } from 'lucide-react'

export default function Header({ title = 'MCP Client' }) {
  const navigate = useNavigate()

  return (
    <header className="bg-white border-b border-mint-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-mint-400 to-mint-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-800">{title}</span>
        </div>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg text-gray-500 hover:text-mint-600 hover:bg-mint-50 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
