import { Routes, Route, Navigate } from 'react-router-dom'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import ServerDetail from './pages/ServerDetail'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Chat />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/server/:id" element={<ServerDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
