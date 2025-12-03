const BASE_URL = '/api';

async function fetchApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Dashboard API
export const dashboardApi = {
  getStats: () => fetchApi('/dashboard/stats'),
  getCalendar: (startDate, endDate, userId = null) => {
    let url = `/dashboard/calendar?start_date=${startDate}&end_date=${endDate}`;
    if (userId) url += `&user_id=${userId}`;
    return fetchApi(url);
  },
  getPending: (limit = 10) => fetchApi(`/dashboard/pending?limit=${limit}`),
};

// Users API
export const usersApi = {
  getAll: (isActive = null) => {
    let url = '/users';
    if (isActive !== null) url += `?is_active=${isActive}`;
    return fetchApi(url);
  },
  get: (id, year = null) => {
    let url = `/users/${id}`;
    if (year) url += `?year=${year}`;
    return fetchApi(url);
  },
  create: (data) => fetchApi('/users', { method: 'POST', body: data }),
  update: (id, data) => fetchApi(`/users/${id}`, { method: 'PUT', body: data }),
  delete: (id) => fetchApi(`/users/${id}`, { method: 'DELETE' }),
};

// Holiday Types API
export const holidayTypesApi = {
  getAll: (isActive = null) => {
    let url = '/holiday-types';
    if (isActive !== null) url += `?is_active=${isActive}`;
    return fetchApi(url);
  },
  get: (id) => fetchApi(`/holiday-types/${id}`),
  create: (data) => fetchApi('/holiday-types', { method: 'POST', body: data }),
  update: (id, data) => fetchApi(`/holiday-types/${id}`, { method: 'PUT', body: data }),
  delete: (id) => fetchApi(`/holiday-types/${id}`, { method: 'DELETE' }),
};

// Holiday Requests API
export const requestsApi = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.userId) params.append('user_id', filters.userId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    const query = params.toString();
    return fetchApi(`/requests${query ? `?${query}` : ''}`);
  },
  get: (id) => fetchApi(`/requests/${id}`),
  create: (data) => fetchApi('/requests', { method: 'POST', body: data }),
  update: (id, data) => fetchApi(`/requests/${id}`, { method: 'PUT', body: data }),
  delete: (id) => fetchApi(`/requests/${id}`, { method: 'DELETE' }),
  approve: (id, approverId) => fetchApi(`/requests/${id}/approve?approver_id=${approverId}`, { method: 'POST' }),
  reject: (id, approverId) => fetchApi(`/requests/${id}/reject?approver_id=${approverId}`, { method: 'POST' }),
};
