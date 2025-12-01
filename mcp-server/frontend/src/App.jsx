import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import AnalyzeList from './pages/AnalyzeList';
import Analyze from './pages/Analyze';
import Capabilities from './pages/Capabilities';
import CapabilityEditor from './pages/CapabilityEditor';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="flex h-screen bg-gradient-main">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/analyze" element={<AnalyzeList />} />
            <Route path="/analyze/:connectionId" element={<Analyze />} />
            <Route path="/capabilities" element={<Capabilities />} />
            <Route path="/capabilities/new" element={<CapabilityEditor />} />
            <Route path="/capabilities/:id/edit" element={<CapabilityEditor />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
