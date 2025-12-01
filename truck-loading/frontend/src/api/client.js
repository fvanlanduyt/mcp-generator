/**
 * API client for the LNG Truck Loading backend
 */

const API_BASE = '/api';

async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Dashboard API
export const dashboardApi = {
  getStats: () => fetchApi('/dashboard/stats'),
  getTodaySchedule: () => fetchApi('/dashboard/today-schedule'),
  getRecentActivity: (limit = 10) => fetchApi(`/dashboard/recent-activity?limit=${limit}`),
};

// Customers API
export const customersApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set('skip', params.skip);
    if (params.limit) searchParams.set('limit', params.limit);
    if (params.contract_type) searchParams.set('contract_type', params.contract_type);
    const query = searchParams.toString();
    return fetchApi(`/customers${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/customers/${id}`),
  create: (data) => fetchApi('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/customers/${id}`, { method: 'DELETE' }),
};

// Stations API
export const stationsApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set('skip', params.skip);
    if (params.limit) searchParams.set('limit', params.limit);
    if (params.is_active !== undefined) searchParams.set('is_active', params.is_active);
    const query = searchParams.toString();
    return fetchApi(`/stations${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/stations/${id}`),
  create: (data) => fetchApi('/stations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Loading Slots API
export const slotsApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set('skip', params.skip);
    if (params.limit) searchParams.set('limit', params.limit);
    if (params.station_id) searchParams.set('station_id', params.station_id);
    if (params.date_from) searchParams.set('date_from', params.date_from);
    if (params.date_to) searchParams.set('date_to', params.date_to);
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return fetchApi(`/slots${query ? `?${query}` : ''}`);
  },
  getAvailable: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.station_id) searchParams.set('station_id', params.station_id);
    if (params.date) searchParams.set('date', params.date);
    if (params.min_volume) searchParams.set('min_volume', params.min_volume);
    const query = searchParams.toString();
    return fetchApi(`/slots/available${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/slots/${id}`),
  create: (data) => fetchApi('/slots', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/slots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Reservations API
export const reservationsApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set('skip', params.skip);
    if (params.limit) searchParams.set('limit', params.limit);
    if (params.customer_id) searchParams.set('customer_id', params.customer_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.date_from) searchParams.set('date_from', params.date_from);
    if (params.date_to) searchParams.set('date_to', params.date_to);
    if (params.station_id) searchParams.set('station_id', params.station_id);
    if (params.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return fetchApi(`/reservations${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/reservations/${id}`),
  getByCustomer: (customerId, params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set('skip', params.skip);
    if (params.limit) searchParams.set('limit', params.limit);
    const query = searchParams.toString();
    return fetchApi(`/reservations/by-customer/${customerId}${query ? `?${query}` : ''}`);
  },
  create: (data) => fetchApi('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/reservations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
