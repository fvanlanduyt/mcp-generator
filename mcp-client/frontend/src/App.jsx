import { Routes, Route, Navigate } from 'react-router-dom'
import Chat from './pages/Chat'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Chat />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
