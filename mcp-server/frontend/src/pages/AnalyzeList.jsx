import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServerStackIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getConnections } from '../api';

const DB_ICONS = {
  sqlite: '📄',
  postgresql: '🐘',
  mysql: '🐬',
  mssql: '🗄️',
};

export default function AnalyzeList() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Analyze Database</h1>
        <p className="text-text-secondary mt-1">
          Select a connection to start AI-powered database analysis
        </p>
      </div>

      {/* Connection Selection */}
      {connections.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center">
          <ServerStackIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-text-secondary mb-4">No database connections available</p>
          <button
            onClick={() => navigate('/connections')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            Add a connection first
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {connections.map((conn) => (
            <button
              key={conn.id}
              onClick={() => navigate(`/analyze/${conn.id}`)}
              className="bg-white rounded-card shadow-card p-5 text-left hover:shadow-card-hover transition-all hover:scale-[1.02] group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{DB_ICONS[conn.db_type] || '📦'}</span>
                  <div>
                    <h3 className="font-semibold text-text-primary group-hover:text-accent-600 transition-colors">
                      {conn.name}
                    </h3>
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mt-1">
                      {conn.db_type}
                    </span>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-accent-600 group-hover:translate-x-1 transition-all" />
              </div>

              {conn.ai_summary && (
                <p className="text-sm text-text-secondary mt-4 line-clamp-2">{conn.ai_summary}</p>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm text-accent-600">
                <SparklesIcon className="w-4 h-4" />
                {conn.schema_analysis ? 'Continue analysis' : 'Start analysis'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
