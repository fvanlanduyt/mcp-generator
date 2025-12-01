import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ServerStackIcon,
  PencilSquareIcon,
  TrashIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  getConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  testConnection,
  getConnectionPlaceholder,
} from '../api';

const DB_TYPES = [
  { value: 'sqlite', label: 'SQLite', icon: '📄' },
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
  { value: 'mysql', label: 'MySQL', icon: '🐬' },
  { value: 'mssql', label: 'MS SQL Server', icon: '🗄️' },
];

export default function Connections() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    db_type: 'sqlite',
    connection_string: '',
  });
  const [placeholder, setPlaceholder] = useState('');

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    loadPlaceholder(formData.db_type);
  }, [formData.db_type]);

  const loadConnections = async () => {
    try {
      const res = await getConnections();
      setConnections(res.data);
    } catch (error) {
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const loadPlaceholder = async (dbType) => {
    try {
      const res = await getConnectionPlaceholder(dbType);
      setPlaceholder(res.data.placeholder);
    } catch {
      setPlaceholder('');
    }
  };

  const openModal = (connection = null) => {
    if (connection) {
      setEditingConnection(connection);
      setFormData({
        name: connection.name,
        db_type: connection.db_type,
        connection_string: connection.connection_string,
      });
    } else {
      setEditingConnection(null);
      setFormData({
        name: '',
        db_type: 'sqlite',
        connection_string: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingConnection(null);
    setFormData({
      name: '',
      db_type: 'sqlite',
      connection_string: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingConnection) {
        await updateConnection(editingConnection.id, formData);
        toast.success('Connection updated');
      } else {
        await createConnection(formData);
        toast.success('Connection created');
      }
      closeModal();
      loadConnections();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save connection');
    }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const res = await testConnection(id);
      setTestResults({ ...testResults, [id]: res.data });
      if (res.data.success) {
        toast.success('Connection successful');
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      setTestResults({ ...testResults, [id]: { success: false, message: 'Test failed' } });
      toast.error('Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this connection? All associated capabilities will also be deleted.')) {
      return;
    }
    try {
      await deleteConnection(id);
      toast.success('Connection deleted');
      loadConnections();
    } catch (error) {
      toast.error('Failed to delete connection');
    }
  };

  const getDbIcon = (dbType) => {
    const db = DB_TYPES.find((d) => d.value === dbType);
    return db?.icon || '📦';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
          <h1 className="text-2xl font-bold text-text-primary">Database Connections</h1>
          <p className="text-text-secondary mt-1">Manage your database connections</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Connection
        </button>
      </div>

      {/* Connection Cards */}
      {connections.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center">
          <ServerStackIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-text-secondary mb-4">No database connections yet</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add your first connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-white rounded-card shadow-card p-5 hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getDbIcon(conn.db_type)}</span>
                  <div>
                    <h3 className="font-semibold text-text-primary">{conn.name}</h3>
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mt-1">
                      {conn.db_type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {testResults[conn.id]?.success === true && (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  )}
                  {testResults[conn.id]?.success === false && (
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 text-xs text-text-secondary">
                <ClockIcon className="w-4 h-4" />
                Last connected: {formatDate(conn.last_connected_at)}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/analyze/${conn.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-600 hover:bg-accent-50 rounded-md transition-colors"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Analyze
                </button>
                <button
                  onClick={() => handleTest(conn.id)}
                  disabled={testing === conn.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                >
                  {testing === conn.id ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={() => openModal(conn)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(conn.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors ml-auto"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-card shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingConnection ? 'Edit Connection' : 'Add Connection'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Production Database"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Database Type</label>
                <select
                  value={formData.db_type}
                  onChange={(e) => setFormData({ ...formData, db_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                >
                  {DB_TYPES.map((db) => (
                    <option key={db.value} value={db.value}>
                      {db.icon} {db.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Connection String</label>
                <input
                  type="text"
                  value={formData.connection_string}
                  onChange={(e) => setFormData({ ...formData, connection_string: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none font-mono text-sm"
                  required
                />
                <p className="text-xs text-text-secondary mt-1">Example: {placeholder}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
                >
                  {editingConnection ? 'Save Changes' : 'Create Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
