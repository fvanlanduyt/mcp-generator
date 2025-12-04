import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:18002'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// MCP Server API
export const getServers = () => api.get('/api/servers')
export const getServer = (id) => api.get(`/api/servers/${id}`)
export const getServerStatus = (id) => api.get(`/api/servers/${id}/status`)
export const createServer = (data) => api.post('/api/servers', data)
export const updateServer = (id, data) => api.put(`/api/servers/${id}`, data)
export const deleteServer = (id) => api.delete(`/api/servers/${id}`)
export const syncServer = (id) => api.post(`/api/servers/${id}/sync`)

// Chat API
export const getSessions = () => api.get('/api/sessions')
export const createSession = () => api.post('/api/sessions')
export const getSessionMessages = (sessionId) => api.get(`/api/sessions/${sessionId}/messages`)
export const sendMessage = (message, sessionId) => api.post('/api/chat', { message, session_id: sessionId })

// Functions API
export const getFunctions = () => api.get('/api/functions')
export const searchFunctions = (query) => api.post('/api/functions/search', null, { params: { query } })

export default api
