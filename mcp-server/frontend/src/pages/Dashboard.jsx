import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ServerStackIcon,
  BoltIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getDashboardStats, getCapabilities } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [liveCapabilities, setLiveCapabilities] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, capsRes] = await Promise.all([
        getDashboardStats(),
        getCapabilities({ is_live: true }),
      ]);
      setStats(statsRes.data);
      setLiveCapabilities(capsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const claudeConfig = `{
  "mcpServers": {
    "mcp-generator": {
      "url": "${stats?.mcp_endpoint || 'http://localhost:8000/mcp'}"
    }
  }
}`;

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
        <h1 className="text-2xl font-bold text-text-primary">MCP Server Generator</h1>
        <p className="text-text-secondary mt-1">Your AI-powered database integration hub</p>
      </div>

      {/* MCP Server Endpoint Card */}
      <div className="bg-white rounded-card shadow-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">MCP Server Endpoint</h2>
            <p className="text-sm text-text-secondary mt-1">Add this URL to your Claude Desktop configuration</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              stats?.mcp_server_status === 'running'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                stats?.mcp_server_status === 'running' ? 'bg-green-500 pulse' : 'bg-red-500'
              }`}></span>
              {stats?.mcp_server_status === 'running' ? 'Running' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm text-text-primary">
            {stats?.mcp_endpoint}
          </div>
          <button
            onClick={() => copyToClipboard(stats?.mcp_endpoint)}
            className="flex items-center gap-2 px-4 py-3 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Quick Setup Guide */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <button
          onClick={() => setShowSetup(!showSetup)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-text-primary">Quick Setup Guide</span>
          {showSetup ? (
            <ChevronUpIcon className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-text-secondary" />
          )}
        </button>
        {showSetup && (
          <div className="px-4 pb-4">
            <p className="text-sm text-text-secondary mb-3">
              Add this to your Claude Desktop configuration file:
            </p>
            <div className="relative">
              <pre className="bg-code text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
                {claudeConfig}
              </pre>
              <button
                onClick={() => copyToClipboard(claudeConfig)}
                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                <ClipboardDocumentIcon className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-100 rounded-lg">
              <ServerStackIcon className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.total_connections || 0}</p>
              <p className="text-sm text-text-secondary">Connections</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <SignalIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.live_capabilities || 0}</p>
              <p className="text-sm text-text-secondary">Live Capabilities</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <BoltIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.total_capabilities || 0}</p>
              <p className="text-sm text-text-secondary">Total Capabilities</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Capabilities */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Live Capabilities</h2>
        {liveCapabilities.length === 0 ? (
          <div className="bg-white rounded-card shadow-card p-8 text-center">
            <BoltIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-text-secondary mb-4">No live capabilities yet</p>
            <Link
              to="/capabilities/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              Create your first capability
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {liveCapabilities.map((cap) => (
              <Link
                key={cap.id}
                to={`/capabilities/${cap.id}/edit`}
                className="bg-white rounded-card shadow-card p-4 hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <code className="text-sm font-medium text-accent-700 bg-accent-50 px-2 py-0.5 rounded">
                      {cap.name}
                    </code>
                    <p className="text-sm text-text-secondary mt-2 line-clamp-2">{cap.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse"></span>
                    Live
                  </span>
                </div>
                {cap.connection_name && (
                  <p className="text-xs text-text-secondary mt-3 pt-3 border-t border-gray-100">
                    {cap.connection_name}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
