import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Stations from './pages/Stations'
import LoadingSlots from './pages/LoadingSlots'
import Reservations from './pages/Reservations'
import Customers from './pages/Customers'
import NewReservation from './pages/NewReservation'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stations" element={<Stations />} />
        <Route path="/slots" element={<LoadingSlots />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/reservations/new" element={<NewReservation />} />
        <Route path="/customers" element={<Customers />} />
      </Routes>
    </Layout>
  )
}

export default App
