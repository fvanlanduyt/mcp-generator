import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  BoltIcon,
  PencilSquareIcon,
  TrashIcon,
  PlayIcon,
  SignalIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getCapabilities, getConnections, deleteCapability, toggleCapabilityLive, testCapability } from '../api';

export default function Capabilities() {
  const navigate = useNavigate();
  const [capabilities, setCapabilities] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    connection_id: '',
    is_live: '',
    search: '',
  });
  const [testing, setTesting] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [capsRes, connsRes] = await Promise.all([getCapabilities(), getConnections()]);
      setCapabilities(capsRes.data);
      setConnections(connsRes.data);
    } catch (error) {
      toast.error('Failed to load capabilities');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this capability?')) return;

    try {
      await deleteCapability(id);
      toast.success('Capability deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete capability');
    }
  };

  const handleToggleLive = async (id) => {
    try {
      const res = await toggleCapabilityLive(id);
      setCapabilities((prev) =>
        prev.map((cap) => (cap.id === id ? { ...cap, is_live: res.data.is_live } : cap))
      );
      toast.success(res.data.is_live ? 'Capability is now live' : 'Capability is now draft');
    } catch (error) {
      toast.error('Failed to toggle capability status');
    }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const res = await testCapability(id, {});
      if (res.data.success) {
        toast.success(`Test passed (${res.data.row_count} rows, ${res.data.execution_time_ms}ms)`);
      } else {
        toast.error(res.data.error || 'Test failed');
      }
    } catch (error) {
      toast.error('Failed to test capability');
    } finally {
      setTesting(null);
    }
  };

  const filteredCapabilities = capabilities.filter((cap) => {
    if (filters.connection_id && cap.connection_id !== parseInt(filters.connection_id)) {
      return false;
    }
    if (filters.is_live !== '' && cap.is_live !== (filters.is_live === 'true')) {
      return false;
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        cap.name.toLowerCase().includes(search) ||
        cap.description.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-accent-500 rounded-full loading-dot"></div>
          <div className="w-2 h-2 bg-accent-500 rounded-full loading-dot"></div>
          <div className="w-2 h-2 bg-accent-500 rounded-full loading-dot"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">MCP Capabilities</h1>
          <p className="text-text-secondary mt-1">Define query capabilities for AI assistants</p>
        </div>
        <Link
          to="/capabilities/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Capability
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search capabilities..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
          />
        </div>
        <select
          value={filters.connection_id}
          onChange={(e) => setFilters({ ...filters, connection_id: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
        >
          <option value="">All Connections</option>
          {connections.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {conn.name}
            </option>
          ))}
        </select>
        <select
          value={filters.is_live}
          onChange={(e) => setFilters({ ...filters, is_live: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
        >
          <option value="">All Status</option>
          <option value="true">Live</option>
          <option value="false">Draft</option>
        </select>
      </div>

      {/* Capabilities List */}
      {filteredCapabilities.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center">
          <BoltIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-text-secondary mb-4">
            {capabilities.length === 0
              ? 'No capabilities yet'
              : 'No capabilities match your filters'}
          </p>
          {capabilities.length === 0 && (
            <Link
              to="/capabilities/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create your first capability
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Database
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCapabilities.map((cap) => (
                <tr key={cap.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="text-sm font-medium text-accent-700 bg-accent-50 px-2 py-0.5 rounded">
                      {cap.name}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-text-secondary line-clamp-1">{cap.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-secondary">{cap.connection_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleLive(cap.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        cap.is_live
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {cap.is_live ? (
                        <>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse"></span>
                          Live
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          Draft
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleTest(cap.id)}
                        disabled={testing === cap.id}
                        className="p-2 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Test"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/capabilities/${cap.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cap.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
