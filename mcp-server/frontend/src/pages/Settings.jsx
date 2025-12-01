import { useState, useEffect } from 'react';
import {
  KeyIcon,
  ServerIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getSettings, updateSettings, testApiKey } from '../api';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(null);

  const [formData, setFormData] = useState({
    anthropic_api_key: '',
    mcp_server_port: 8000,
    mcp_server_base_url: 'http://localhost:8000',
    default_query_timeout: 30,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getSettings();
      setSettings(res.data);
      setFormData({
        anthropic_api_key: '', // Don't load the actual key
        mcp_server_port: res.data.mcp_server_port,
        mcp_server_base_url: res.data.mcp_server_base_url,
        default_query_timeout: res.data.default_query_timeout,
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...formData };
      if (!data.anthropic_api_key) {
        delete data.anthropic_api_key; // Don't send empty key
      }
      await updateSettings(data);
      await loadSettings();
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestApiKey = async () => {
    setTestingKey(true);
    try {
      const res = await testApiKey();
      setApiKeyValid(res.data.valid);
      if (res.data.valid) {
        toast.success('API key is valid');
      } else {
        toast.error(res.data.message || 'API key is invalid');
      }
    } catch (error) {
      setApiKeyValid(false);
      toast.error('Failed to test API key');
    } finally {
      setTestingKey(false);
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
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Configure your MCP server and API keys</p>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-card shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent-100 rounded-lg">
            <KeyIcon className="w-5 h-5 text-accent-600" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">API Keys</h2>
            <p className="text-sm text-text-secondary">Configure your AI provider API keys</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Anthropic API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.anthropic_api_key}
                  onChange={(e) => setFormData({ ...formData, anthropic_api_key: e.target.value })}
                  placeholder={settings?.anthropic_api_key_set ? '••••••••••••••••••••••••' : 'sk-ant-...'}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <button
                onClick={handleTestApiKey}
                disabled={testingKey}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {testingKey ? 'Testing...' : 'Test'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {settings?.anthropic_api_key_set && !formData.anthropic_api_key && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  API key is configured
                </span>
              )}
              {apiKeyValid === true && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  Valid
                </span>
              )}
              {apiKeyValid === false && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <XCircleIcon className="w-4 h-4" />
                  Invalid
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MCP Server Configuration */}
      <div className="bg-white rounded-card shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent-100 rounded-lg">
            <ServerIcon className="w-5 h-5 text-accent-600" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">MCP Server Configuration</h2>
            <p className="text-sm text-text-secondary">Configure the MCP server endpoint</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Server Port
              </label>
              <input
                type="number"
                value={formData.mcp_server_port}
                onChange={(e) =>
                  setFormData({ ...formData, mcp_server_port: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Base URL
              </label>
              <input
                type="text"
                value={formData.mcp_server_base_url}
                onChange={(e) => setFormData({ ...formData, mcp_server_base_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            Override the base URL when the server is behind a proxy or load balancer
          </p>
        </div>
      </div>

      {/* Database Defaults */}
      <div className="bg-white rounded-card shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent-100 rounded-lg">
            <ClockIcon className="w-5 h-5 text-accent-600" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">Database Defaults</h2>
            <p className="text-sm text-text-secondary">Default settings for database connections</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Query Timeout (seconds)
            </label>
            <input
              type="number"
              value={formData.default_query_timeout}
              onChange={(e) =>
                setFormData({ ...formData, default_query_timeout: parseInt(e.target.value) })
              }
              min={1}
              max={300}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
            />
            <p className="text-xs text-text-secondary mt-1">
              Maximum time allowed for query execution (1-300 seconds)
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-card shadow-card p-6 border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-red-700">Danger Zone</h2>
            <p className="text-sm text-red-600">Irreversible actions</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-red-700">Reset all capabilities</p>
              <p className="text-sm text-red-600">Delete all capabilities from all connections</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Are you sure? This will delete ALL capabilities.')) {
                  toast.error('Not implemented yet');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-red-700">Delete all connections</p>
              <p className="text-sm text-red-600">
                Delete all database connections and their capabilities
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure? This will delete ALL connections and capabilities.'
                  )
                ) {
                  toast.error('Not implemented yet');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete All
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
