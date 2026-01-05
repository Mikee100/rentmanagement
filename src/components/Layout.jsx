import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isSuperadmin } = useAuth();
  const isAdmin = () => user && (user.role === 'admin' || user.role === 'superadmin');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/apartments', label: 'Apartments', icon: '🏢' },
    { path: '/tenants', label: 'Tenants', icon: '👥' },
    { path: '/payments', label: 'Payments', icon: '💰' },
    { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
    { path: '/expenses', label: 'Expenses', icon: '📈' },
    { path: '/reports', label: 'Reports', icon: '📋' },
    ...(isAdmin() ? [
      { path: '/equity-bank-test', label: 'Equity Bank Test', icon: '🏦' }
    ] : []),
    ...(isSuperadmin() ? [
      { path: '/users', label: 'Users', icon: '👤' },
      { path: '/activity-logs', label: 'Activity Logs', icon: '📝' },
      { path: '/paybill-config', label: 'Paybill Setup', icon: '💳' }
    ] : []),
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="layout">
      {isMobile && (
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      )}
      <div className={`sidebar-overlay ${isMobile && !isCollapsed ? 'active' : ''}`} 
           onClick={() => setIsCollapsed(true)} />
      <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="sidebar-title">
              <h2>Rent Management</h2>
            </div>
          )}
          {isCollapsed && (
            <div className="sidebar-title">
              <h2>RM</h2>
            </div>
          )}
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
        <ul className="nav-menu">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={location.pathname.startsWith(item.path) ? 'active' : ''}
                title={isCollapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Logout */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title={isCollapsed ? "Logout" : ""}>
            <span className="nav-icon">🚪</span>
            {!isCollapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </nav>
      <main className={`main-content ${isCollapsed ? 'expanded' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;

