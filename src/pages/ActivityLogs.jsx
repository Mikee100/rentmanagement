import { useState, useEffect } from 'react';
import { activityLogsAPI, authAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/export';
import ConfirmModal from '../components/ConfirmModal';
import './ActivityLogs.css';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
    search: '',
    role: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const toast = useToast();

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    fetchStatistics();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page, pagination.limit]);

  const fetchUsers = async () => {
    try {
      const response = await authAPI.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await activityLogsAPI.getAll(params);
      setLogs(response.data.logs);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await activityLogsAPI.getStatistics(params);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
      search: '',
      role: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatFullDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    const icons = {
      login: '🔐',
      logout: '🚪',
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      view: '👁️',
      export: '📤',
      generate: '📄',
      assign: '🔗',
      remove: '➖',
      register: '👤',
      password_reset: '🔑',
      status_change: '🔄',
      unauthorized_access: '⚠️',
      failed_operation: '❌'
    };
    return icons[action] || '📝';
  };

  const getActionColor = (action) => {
    const colors = {
      login: '#22c55e',
      logout: '#ef4444',
      create: '#3b82f6',
      update: '#f59e0b',
      delete: '#ef4444',
      view: '#8b5cf6',
      export: '#06b6d4',
      generate: '#10b981',
      assign: '#6366f1',
      remove: '#f97316',
      register: '#14b8a6',
      password_reset: '#a855f7',
      status_change: '#ec4899',
      unauthorized_access: '#f59e0b',
      failed_operation: '#ef4444'
    };
    return colors[action] || '#6b7280';
  };

  const exportLogs = (format) => {
    const data = logs.map(log => ({
      'Date': formatFullDate(log.createdAt),
      'User': log.user ? `${log.user.firstName} ${log.user.lastName}` : 'N/A',
      'Role': log.user?.role || 'N/A',
      'Action': log.action,
      'Entity Type': log.entityType,
      'Entity Name': log.entityName || 'N/A',
      'Description': log.description,
      'IP Address': log.ipAddress || 'N/A'
    }));

    if (format === 'pdf') {
      const columns = Object.keys(data[0] || {}).map(key => ({
        key,
        label: key
      }));
      exportToPDF(data, columns, 'Activity Logs', 'activity-logs');
    } else if (format === 'excel') {
      exportToExcel(data, 'activity-logs');
    } else if (format === 'csv') {
      exportToCSV(data, 'activity-logs');
    }
  };

  const handleCleanup = async (days) => {
    try {
      await activityLogsAPI.cleanup(days);
      toast.success(`Cleaned up activity logs older than ${days} days`);
      setShowCleanupModal(false);
      fetchLogs();
      fetchStatistics();
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      toast.error('Failed to clean up logs');
    }
  };

  const hasActiveFilters = filters.userId || filters.action || filters.entityType || 
                          filters.startDate || filters.endDate || filters.search || filters.role;

  if (loading && logs.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="activity-logs-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Activity Logs</h1>
          {statistics && (
            <span className="count-badge">
              {statistics.totalLogs.toLocaleString()} total logs
            </span>
          )}
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => setShowCleanupModal(true)} title="Cleanup old logs">
            🗑️
          </button>
          <div className="export-dropdown">
            <button className="btn-primary">
              📥 Export
            </button>
            <div className="export-menu">
              <button onClick={() => exportLogs('pdf')}>📄 PDF</button>
              <button onClick={() => exportLogs('excel')}>📊 Excel</button>
              <button onClick={() => exportLogs('csv')}>📋 CSV</button>
            </div>
          </div>
        </div>
      </div>

      {statistics && (
        <div className="statistics-cards">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Total Logs</h3>
              <p className="stat-value">{statistics.totalLogs.toLocaleString()}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <h3>Top Action</h3>
              <p className="stat-value">
                {statistics.actionsBreakdown[0]?.action || 'N/A'}
              </p>
              <p className="stat-sub">
                {statistics.actionsBreakdown[0]?.count || 0} times
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>Top Entity</h3>
              <p className="stat-value">
                {statistics.entityTypesBreakdown[0]?.entityType || 'N/A'}
              </p>
              <p className="stat-sub">
                {statistics.entityTypesBreakdown[0]?.count || 0} times
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="filters-section">
        <div className="filters-header">
          <h3>Filters</h3>
          {hasActiveFilters && (
            <button className="btn-clear-filters" onClick={clearFilters}>
              Clear All
            </button>
          )}
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Role</label>
            <select
              className="filter-select"
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="caretaker">Caretakers Only</option>
              <option value="superadmin">Superadmins Only</option>
            </select>
          </div>
          <div className="filter-group">
            <label>User</label>
            <select
              className="filter-select"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
            >
              <option value="">All Users</option>
              {users
                .filter(user => !filters.role || user.role === filters.role)
                .map(user => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName} ({user.role})
                  </option>
                ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Action</label>
            <select
              className="filter-select"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="view">View</option>
              <option value="export">Export</option>
              <option value="generate">Generate</option>
              <option value="assign">Assign</option>
              <option value="remove">Remove</option>
              <option value="register">Register</option>
              <option value="password_reset">Password Reset</option>
              <option value="status_change">Status Change</option>
              <option value="unauthorized_access">Unauthorized Access</option>
              <option value="failed_operation">Failed Operation</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Entity Type</label>
            <select
              className="filter-select"
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="tenant">Tenant</option>
              <option value="payment">Payment</option>
              <option value="maintenance">Maintenance</option>
              <option value="expense">Expense</option>
              <option value="user">User</option>
              <option value="config">Config</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              className="filter-input"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              className="filter-input"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="logs-table-container">
        {loading && logs.length > 0 && (
          <div className="loading-overlay">
            <LoadingSpinner />
          </div>
        )}
        <table className="logs-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Description</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  <div className="empty-content">
                    <span className="empty-icon">📋</span>
                    <p>No activity logs found</p>
                    {hasActiveFilters && (
                      <button className="btn-link" onClick={clearFilters}>
                        Clear filters to see all logs
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className={log.metadata?.unauthorized ? 'row-unauthorized' : log.metadata?.failed ? 'row-failed' : ''}>
                  <td>
                    <div className="time-cell">
                      <span className="time-relative">{formatDate(log.createdAt)}</span>
                      <span className="time-full" title={formatFullDate(log.createdAt)}>
                        {formatFullDate(log.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {log.user ? (log.user.firstName?.[0] || 'U') : '?'}
                      </div>
                      <div className="user-info">
                        <span className="user-name">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown'}
                        </span>
                        <span className="user-role">
                          {log.user?.role || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="action-badge"
                      style={{ 
                        backgroundColor: `${getActionColor(log.action)}15`,
                        color: getActionColor(log.action),
                        borderColor: `${getActionColor(log.action)}40`
                      }}
                    >
                      <span className="action-icon">{getActionIcon(log.action)}</span>
                      <span className="action-text">{log.action.replace('_', ' ')}</span>
                      {log.metadata?.unauthorized && (
                        <span className="warning-indicator" title="Unauthorized attempt">⚠️</span>
                      )}
                      {log.metadata?.failed && (
                        <span className="error-indicator" title="Failed operation">❌</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <div className="entity-cell">
                      <span className="entity-type">{log.entityType}</span>
                      {log.entityName && (
                        <span className="entity-name">: {log.entityName}</span>
                      )}
                    </div>
                  </td>
                  <td className="description-cell">
                    <span className="description-text" title={log.description}>
                      {log.description}
                    </span>
                  </td>
                  <td>
                    <span className="ip-address">{log.ipAddress || 'N/A'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
          </div>
          <div className="pagination-controls">
            <button
              className="btn-pagination"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              ← Previous
            </button>
            <div className="page-numbers">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`btn-page ${pagination.page === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="btn-pagination"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              Next →
            </button>
            <select
              className="limit-select"
              value={pagination.limit}
              onChange={(e) => handleLimitChange(parseInt(e.target.value))}
            >
              <option value="25">25/page</option>
              <option value="50">50/page</option>
              <option value="100">100/page</option>
              <option value="200">200/page</option>
            </select>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showCleanupModal}
        onClose={() => setShowCleanupModal(false)}
        onConfirm={() => handleCleanup(90)}
        title="Cleanup Activity Logs"
        message="Are you sure you want to delete activity logs older than 90 days? This action cannot be undone."
      />
    </div>
  );
};

export default ActivityLogs;
