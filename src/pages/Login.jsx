import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData.email, formData.password);
    if (result.success) {
      toast.success('Welcome back to RentElite!');
      setTimeout(() => navigate('/dashboard', { replace: true }), 150);
    } else {
      toast.error(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container-premium">
      <div className="login-grid">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="login-visual-side"
        >
          <div className="visual-content">
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="floating-logo"
            >
              <Building2 size={64} color="white" strokeWidth={1.5} />
            </motion.div>
            <h1 className="visual-title">Manage your properties with precision.</h1>
            <p className="visual-text">Experience the next generation of rental management with RentElite.</p>
          </div>
          <div className="visual-overlay" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="login-form-side"
        >
          <div className="form-content-wrapper">
            <div className="form-header">
              <h2 className="form-title">Login</h2>
              <p className="form-subtitle">Enter your credentials to access the portal</p>
            </div>

            <form onSubmit={handleSubmit} className="premium-form">
              <div className="input-group-premium">
                <label className="input-label">Email Address</label>
                <div className="input-wrapper-inner">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    required
                    className="premium-input"
                  />
                </div>
              </div>

              <div className="input-group-premium">
                <label className="input-label">Password</label>
                <div className="input-wrapper-inner">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    className="premium-input"
                  />
                  <button
                    type="button"
                    className="visibility-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Authenticating...' : (
                  <>
                    Sign In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <footer className="form-footer-premium">
              <p>© 2026 RentElite Management. All rights reserved.</p>
            </footer>
          </div>
        </motion.div>
      </div>
      {loading && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default Login;

