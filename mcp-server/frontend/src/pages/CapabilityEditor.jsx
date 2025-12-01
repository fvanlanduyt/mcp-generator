import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlayIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  getCapability,
  createCapability,
  updateCapability,
  testCapability,
  getConnections,
  generateSQL,
} from '../api';

const PARAMETER_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'float', label: 'Float' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
];

export default function CapabilityEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showTestSection, setShowTestSection] = useState(false);
  const [testParams, setTestParams] = useState({});

  const [formData, setFormData] = useState({
    connection_id: '',
    name: '',
    description: '',
    sql_template: '',
    parameters: [],
    is_live: false,
  });

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    // Auto-detect parameters from SQL template
    const params = extractParameters(formData.sql_template);
    const existingParamNames = formData.parameters.map((p) => p.name);

    // Add new parameters that don't exist
    const newParams = params.filter((p) => !existingParamNames.includes(p));
    if (newParams.length > 0) {
      setFormData((prev) => ({
        ...prev,
        parameters: [
          ...prev.parameters,
          ...newParams.map((name) => ({
            name,
            type: 'string',
            description: '',
            required: true,
            default: null,
          })),
        ],
      }));
    }

    // Remove parameters no longer in template
    const removedParams = existingParamNames.filter((p) => !params.includes(p));
    if (removedParams.length > 0) {
      setFormData((prev) => ({
        ...prev,
        parameters: prev.parameters.filter((p) => !removedParams.includes(p.name)),
      }));
    }
  }, [formData.sql_template]);

  const extractParameters = (sql) => {
    const matches = sql.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
  };

  const loadData = async () => {
    try {
      const connsRes = await getConnections();
      setConnections(connsRes.data);

      if (isEditing) {
        const capRes = await getCapability(id);
        setFormData({
          connection_id: capRes.data.connection_id,
          name: capRes.data.name,
          description: capRes.data.description,
          sql_template: capRes.data.sql_template,
          parameters: capRes.data.parameters || [],
          is_live: capRes.data.is_live,
        });
      } else if (connsRes.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          connection_id: connsRes.data[0].id,
        }));
      }
    } catch (error) {
      toast.error('Failed to load data');
      navigate('/capabilities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (goLive = false) => {
    if (!formData.name.match(/^[a-z_][a-z0-9_]*$/)) {
      toast.error('Name must be lowercase with underscores (e.g., get_users)');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        is_live: goLive,
      };

      if (isEditing) {
        await updateCapability(id, data);
        toast.success('Capability updated');
      } else {
        await createCapability(data);
        toast.success('Capability created');
      }
      navigate('/capabilities');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save capability');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!isEditing) {
      toast.error('Please save the capability first to test it');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testCapability(id, testParams);
      setTestResult(res.data);
      if (res.data.success) {
        toast.success('Test passed');
      } else {
        toast.error(res.data.error || 'Test failed');
      }
    } catch (error) {
      setTestResult({ success: false, error: 'Test failed' });
      toast.error('Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleGenerateSQL = async () => {
    if (!formData.connection_id) {
      toast.error('Please select a connection first');
      return;
    }
    if (!formData.description) {
      toast.error('Please enter a description first');
      return;
    }

    setGenerating(true);
    try {
      const res = await generateSQL({
        connection_id: formData.connection_id,
        name: formData.name || 'new_capability',
        description: formData.description,
      });

      setFormData((prev) => ({
        ...prev,
        sql_template: res.data.sql_template,
        parameters: res.data.parameters,
      }));

      toast.success('SQL generated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate SQL');
    } finally {
      setGenerating(false);
    }
  };

  const updateParameter = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      parameters: prev.parameters.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const removeParameter = (index) => {
    setFormData((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index),
    }));
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
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {isEditing ? 'Edit Capability' : 'New Capability'}
        </h1>
        <p className="text-text-secondary mt-1">
          Define a query capability that AI assistants can use
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-card shadow-card p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Basic Info</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Connection *
              </label>
              <select
                value={formData.connection_id}
                onChange={(e) =>
                  setFormData({ ...formData, connection_id: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                required
              >
                <option value="">Select a connection</option>
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} ({conn.db_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Capability Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase() })}
                placeholder="e.g., get_available_slots"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none font-mono"
                required
              />
              <p className="text-xs text-text-secondary mt-1">
                Lowercase with underscores (snake_case)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this capability does. This is what the AI will see to understand when to use it."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none resize-none"
              required
            />
          </div>
        </div>

        {/* SQL Template */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">SQL Template</h2>
            <button
              type="button"
              onClick={handleGenerateSQL}
              disabled={generating || !formData.connection_id || !formData.description}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <SparklesIcon className="w-4 h-4" />
              {generating ? 'Generating...' : 'AI Generate'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              SQL Query *
            </label>
            <textarea
              value={formData.sql_template}
              onChange={(e) => setFormData({ ...formData, sql_template: e.target.value })}
              placeholder={`SELECT * FROM users WHERE id = {{user_id}}`}
              rows={8}
              className="w-full px-4 py-3 bg-code text-gray-100 border border-gray-700 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none resize-none font-mono text-sm"
              required
            />
            <p className="text-xs text-text-secondary mt-1">
              Use {'{{parameter_name}}'} for parameters that will be provided at runtime
            </p>
          </div>
        </div>

        {/* Parameters */}
        {formData.parameters.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-lg font-semibold text-text-primary">Parameters</h2>

            <div className="space-y-3">
              {formData.parameters.map((param, index) => (
                <div
                  key={param.name}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Name
                      </label>
                      <code className="text-sm text-accent-700 bg-white px-2 py-1 rounded border block">
                        {param.name}
                      </code>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Type
                      </label>
                      <select
                        value={param.type}
                        onChange={(e) => updateParameter(index, 'type', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                      >
                        {PARAMETER_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={param.description}
                        onChange={(e) => updateParameter(index, 'description', e.target.value)}
                        placeholder="What should the AI ask for?"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                        className="rounded text-accent-600 focus:ring-accent-500"
                      />
                      <span className="text-xs text-text-secondary">Required</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeParameter(index)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Section */}
        {isEditing && (
          <div className="pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowTestSection(!showTestSection)}
              className="flex items-center gap-2 text-lg font-semibold text-text-primary"
            >
              {showTestSection ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
              Test Capability
            </button>

            {showTestSection && (
              <div className="mt-4 space-y-4">
                {formData.parameters.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {formData.parameters.map((param) => (
                      <div key={param.name}>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          {param.name}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type={param.type === 'integer' || param.type === 'float' ? 'number' : 'text'}
                          value={testParams[param.name] || ''}
                          onChange={(e) =>
                            setTestParams({ ...testParams, [param.name]: e.target.value })
                          }
                          placeholder={param.description}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-100 text-accent-700 rounded-lg hover:bg-accent-200 transition-colors disabled:opacity-50"
                >
                  <PlayIcon className="w-5 h-5" />
                  {testing ? 'Running...' : 'Run Test'}
                </button>

                {testResult && (
                  <div
                    className={`p-4 rounded-lg ${
                      testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.success ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {testResult.success ? 'Test Passed' : 'Test Failed'}
                      </span>
                      {testResult.success && (
                        <span className="text-sm text-green-600">
                          ({testResult.row_count} rows, {testResult.execution_time_ms}ms)
                        </span>
                      )}
                    </div>
                    {testResult.error && (
                      <p className="text-sm text-red-600">{testResult.error}</p>
                    )}
                    {testResult.data && testResult.data.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-green-200">
                              {Object.keys(testResult.data[0]).map((key) => (
                                <th key={key} className="px-3 py-1 text-left font-medium text-green-700">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {testResult.data.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-b border-green-100">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-3 py-1 text-green-600">
                                    {String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {testResult.data.length > 5 && (
                          <p className="text-xs text-green-600 mt-2">
                            Showing 5 of {testResult.data.length} rows
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate('/capabilities')}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save and Go Live'}
        </button>
      </div>
    </div>
  );
}
