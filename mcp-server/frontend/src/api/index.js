import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Connections
export const getConnections = () => api.get('/connections');
export const getConnection = (id) => api.get(`/connections/${id}`);
export const createConnection = (data) => api.post('/connections', data);
export const updateConnection = (id, data) => api.put(`/connections/${id}`, data);
export const deleteConnection = (id) => api.delete(`/connections/${id}`);
export const testConnection = (id) => api.post(`/connections/${id}/test`);
export const analyzeConnection = (id) => api.post(`/connections/${id}/analyze`);
export const getConnectionPlaceholder = (dbType) => api.get(`/connections/placeholders/${dbType}`);

// Analysis/Chat
export const getConversation = (connectionId) => api.get(`/analyze/${connectionId}/conversation`);
export const initAnalysis = (connectionId) => api.post(`/analyze/${connectionId}/init`);
export const sendMessage = (connectionId, message) => api.post(`/analyze/${connectionId}/chat`, { message });
export const generateReport = (connectionId) => api.post(`/analyze/${connectionId}/generate-report`, { include_suggestions: true });
export const clearConversation = (connectionId) => api.delete(`/analyze/${connectionId}/conversation`);

// Capabilities
export const getCapabilities = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.connection_id) queryParams.append('connection_id', params.connection_id);
  if (params.is_live !== undefined) queryParams.append('is_live', params.is_live);
  const queryString = queryParams.toString();
  return api.get(`/capabilities${queryString ? `?${queryString}` : ''}`);
};
export const getCapability = (id) => api.get(`/capabilities/${id}`);
export const createCapability = (data) => api.post('/capabilities', data);
export const updateCapability = (id, data) => api.put(`/capabilities/${id}`, data);
export const deleteCapability = (id) => api.delete(`/capabilities/${id}`);
export const testCapability = (id, parameters = {}) => api.post(`/capabilities/${id}/test`, { parameters });
export const toggleCapabilityLive = (id) => api.post(`/capabilities/${id}/toggle-live`);
export const bulkCreateCapabilities = (capabilities) => api.post('/capabilities/bulk', capabilities);
export const extractParameters = (sqlTemplate) => api.get('/capabilities/extract-parameters', { params: { sql_template: sqlTemplate } });
export const generateSQL = (data) => api.post('/capabilities/generate-sql', data);

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);
export const testApiKey = () => api.post('/settings/test-api-key');

export default api;
