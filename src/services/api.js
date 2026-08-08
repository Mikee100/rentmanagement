import axios from 'axios';
import { isFeatureEnabled } from '../config/features';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const disabledFeatureError = (featureName) => {
  const error = new Error(`${featureName} feature is currently disabled`);
  error.code = 'FEATURE_DISABLED';
  return Promise.reject(error);
};

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on login page or if it's an auth endpoint
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      const isLoginPage = window.location.pathname === '/login';
      
      if (!isAuthEndpoint && !isLoginPage) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Apartments API (Buildings)
export const apartmentsAPI = {
  getAll: () => api.get('/apartments'),
  getById: (id) => api.get(`/apartments/${id}`),
  create: (data) => api.post('/apartments', data),
  update: (id, data) => api.put(`/apartments/${id}`, data),
  delete: (id) => api.delete(`/apartments/${id}`),
  applyGlobalRent: (id, rentAmount) => api.post(`/apartments/${id}/apply-global-rent`, { rentAmount }),
};

// Houses API (Units)
export const housesAPI = {
  getAll: (apartmentId) => {
    const url = apartmentId ? `/houses?apartment=${apartmentId}` : '/houses';
    return api.get(url);
  },
  getById: (id) => api.get(`/houses/${id}`),
  getByApartment: (apartmentId) => api.get(`/houses/apartment/${apartmentId}`),
  create: (data) => api.post('/houses', data),
  update: (id, data) => api.put(`/houses/${id}`, data),
  delete: (id) => api.delete(`/houses/${id}`),
  assignTenant: (id, tenantId) => api.post(`/houses/${id}/assign-tenant`, { tenantId }),
  removeTenant: (id) => api.post(`/houses/${id}/remove-tenant`),
  getOccupancyAnalytics: () => api.get('/houses/analytics/occupancy'),
};

// Tenants API
export const tenantsAPI = {
  getAll: (apartmentId) => {
    const params = apartmentId ? `?apartment=${apartmentId}` : '';
    return api.get(`/tenants${params}`);
  },
  getById: (id) => api.get(`/tenants/${id}`),
  create: (data) => api.post('/tenants', data),
  update: (id, data) => api.put(`/tenants/${id}`, data),
  delete: (id) => api.delete(`/tenants/${id}`),
  addDocument: (id, data) => api.post(`/tenants/${id}/documents`, data),
  deleteDocument: (id, docId) => api.delete(`/tenants/${id}/documents/${docId}`),
  addCommunication: (id, data) => api.post(`/tenants/${id}/communication`, data),
};

// Payments API
export const paymentsAPI = {
  getAll: (config = {}) => api.get('/payments', config),
  getById: (id) => api.get(`/payments/${id}`),
  getByTenant: (tenantId) => api.get(`/payments/tenant/${tenantId}`),
  getByHouse: (houseId) => api.get(`/payments/house/${houseId}`),
  getByApartment: (apartmentId) => api.get(`/payments/apartment/${apartmentId}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  generateMonthlyRent: (data) => api.post('/payments/generate-monthly-rent', data),
  checkOverdue: (data) => api.post('/payments/check-overdue', data),
  receivePayment: (data) => api.post('/payments/receive', data),
  receivePaybillPayment: (data) => api.post('/payments/paybill', data),
  searchHouse: (houseNumber) => api.get(`/payments/search/house/${houseNumber}`),
  getRevenueTrend: (months = 6) => api.get(`/payments/analytics/revenue-trend?months=${months}`),
  getPaymentStatus: (months = 6) => api.get(`/payments/analytics/payment-status?months=${months}`),
  batchMarkPaid: (data) => api.post('/payments/batch-mark-paid', data),
};
// System Config API
export const configAPI = {
  get: () => api.get('/config'),
  update: (data) => api.put('/config', data),
  getPaybillInfo: () => api.get('/config/paybill'),
};

// M-Pesa API
export const mpesaAPI = {
  initiateSTKPush: (data) => api.post('/mpesa/stk-push', data),
  queryStatus: (checkoutRequestID) => api.get(`/mpesa/status/${checkoutRequestID}`),
};

// Equity Bank API
export const equityBankAPI = {
  verifyAccount: (accountNumber) =>
    isFeatureEnabled('equityBank')
      ? api.get(`/equity-bank/verify-account/${accountNumber}`)
      : disabledFeatureError('equityBank'),
  manualPayment: (data) =>
    isFeatureEnabled('equityBank')
      ? api.post('/equity-bank/manual-payment', data)
      : disabledFeatureError('equityBank'),
};

// Maintenance Requests API
export const maintenanceAPI = {
  getAll: (params) => {
    if (!isFeatureEnabled('maintenance')) return disabledFeatureError('maintenance');
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/maintenance${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => (isFeatureEnabled('maintenance') ? api.get(`/maintenance/${id}`) : disabledFeatureError('maintenance')),
  create: (data) => (isFeatureEnabled('maintenance') ? api.post('/maintenance', data) : disabledFeatureError('maintenance')),
  update: (id, data) => (isFeatureEnabled('maintenance') ? api.put(`/maintenance/${id}`, data) : disabledFeatureError('maintenance')),
  delete: (id) => (isFeatureEnabled('maintenance') ? api.delete(`/maintenance/${id}`) : disabledFeatureError('maintenance')),
};

// Expenses API
export const expensesAPI = {
  getAll: (params) => {
    if (!isFeatureEnabled('expenses')) return disabledFeatureError('expenses');
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/expenses${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => (isFeatureEnabled('expenses') ? api.get(`/expenses/${id}`) : disabledFeatureError('expenses')),
  getByApartment: (apartmentId) =>
    (isFeatureEnabled('expenses') ? api.get(`/expenses/apartment/${apartmentId}`) : disabledFeatureError('expenses')),
  create: (data) => (isFeatureEnabled('expenses') ? api.post('/expenses', data) : disabledFeatureError('expenses')),
  update: (id, data) => (isFeatureEnabled('expenses') ? api.put(`/expenses/${id}`, data) : disabledFeatureError('expenses')),
  delete: (id) => (isFeatureEnabled('expenses') ? api.delete(`/expenses/${id}`) : disabledFeatureError('expenses')),
  getSummary: (params) => {
    if (!isFeatureEnabled('expenses')) return disabledFeatureError('expenses');
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/expenses/summary/totals${queryString ? `?${queryString}` : ''}`);
  },
};

// Reports API
export const reportsAPI = {
  getIncomeStatement: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/reports/income-statement${queryString ? `?${queryString}` : ''}`);
  },
  getTenantLedger: (tenantId, params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/reports/tenant-ledger/${tenantId}${queryString ? `?${queryString}` : ''}`);
  },
  getOutstandingBalances: (params) => {
    const queryString = new URLSearchParams(params || {}).toString();
    return api.get(`/reports/outstanding-balances${queryString ? `?${queryString}` : ''}`);
  },
  getRevenueByApartment: (params) => {
    const queryString = new URLSearchParams(params || {}).toString();
    return api.get(`/reports/revenue-by-apartment${queryString ? `?${queryString}` : ''}`);
  },
  getRevenueByApartmentMonthly: (params) => {
    const queryString = new URLSearchParams(params || {}).toString();
    return api.get(`/reports/revenue-by-apartment-monthly${queryString ? `?${queryString}` : ''}`);
  },
  getMonthlyApartmentUnits: (params) => {
    const queryString = new URLSearchParams(params || {}).toString();
    return api.get(`/reports/monthly-apartment-units${queryString ? `?${queryString}` : ''}`);
  },
  getApartmentsMonthly: (params) => {
    const queryString = new URLSearchParams(params || {}).toString();
    return api.get(`/reports/apartments-monthly${queryString ? `?${queryString}` : ''}`);
  },
  getApartmentFinancialHistory: (apartmentId) => api.get(`/reports/apartment-financial-history/${apartmentId}`),
};

// Activity Logs API
export const activityLogsAPI = {
  getAll: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/activity-logs${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/activity-logs/${id}`),
  getStatistics: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/activity-logs/statistics${queryString ? `?${queryString}` : ''}`);
  },
  cleanup: (days) => api.delete(`/activity-logs/cleanup?days=${days}`),
};

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getAllUsers: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  logout: () => api.post('/auth/logout'),
};

export default api;
