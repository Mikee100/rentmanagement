import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Wrench, 
  TrendingUp, 
  ClipboardList, 
  Library, 
  UserCircle, 
  History, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
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
      if (mobile) setIsCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/apartments', label: 'Apartments', icon: Building2 },
    { path: '/tenants', label: 'Tenants', icon: Users },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/maintenance', label: 'Maintenance', icon: Wrench },
    { path: '/expenses', label: 'Expenses', icon: TrendingUp },
    { path: '/reports', label: 'Reports', icon: ClipboardList },
    ...(isAdmin() ? [
      { path: '/equity-bank-test', label: 'Bank Integration', icon: Library }
    ] : []),
    ...(isSuperadmin() ? [
      { path: '/users', label: 'User Controls', icon: UserCircle },
      { path: '/activity-logs', label: 'Audit Logs', icon: History },
      { path: '/paybill-config', label: 'System Setup', icon: Settings }
    ] : []),
  ];

  return (
    <div className="layout-root">
      <AnimatePresence>
        {isMobile && !isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sidebar-overlay-modern"
            onClick={() => setIsCollapsed(true)}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          width: isCollapsed ? (isMobile ? 0 : 80) : 260,
          x: isMobile && isCollapsed ? -260 : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sidebar-modern glass"
      >
        <div className="sidebar-header-modern">
          <div className="logo-container">
            <Building2 size={24} className="logo-icon" />
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="logo-text"
              >
                RentElite
              </motion.span>
            )}
          </div>
          <button className="collapse-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="nav-container-modern">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link-modern ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <div className="icon-wrapper">
                  <Icon size={20} />
                </div>
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="label-text"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="active-indicator"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer-modern">
          <button className="logout-button-modern" onClick={handleLogout}>
            <div className="icon-wrapper">
              <LogOut size={20} />
            </div>
            {!isCollapsed && <span className="label-text">Log Out</span>}
          </button>
        </div>
      </motion.aside>

      <main className="main-viewport">
        {isMobile && (
          <header className="mobile-header-modern glass">
            <button className="menu-btn" onClick={() => setIsCollapsed(false)}>
              <Menu size={24} />
            </button>
            <span className="mobile-logo">RentElite</span>
            <div className="user-initials">{user?.name?.[0] || 'U'}</div>
          </header>
        )}
        <div className="content-scroll-area">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;


