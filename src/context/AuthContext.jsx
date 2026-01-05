import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          setLoading(true);
          const response = await authAPI.getMe();
          if (response.data) {
            setUser(response.data);
            setToken(storedToken);
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          console.error('Error details:', {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            url: error.config?.url
          });
          // Only clear token if it's actually invalid (401), not network errors
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      return { success: true };
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
      return { success: false };
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authAPI.login({ email, password });
      console.log('Login response:', response.data);
      
      const { token: newToken, user: userData } = response.data;
      
      if (!newToken) {
        console.error('No token in response');
        setLoading(false);
        throw new Error('No token received from server');
      }
      
      if (!userData) {
        console.error('No user data in response');
        setLoading(false);
        throw new Error('No user data received from server');
      }
      
      // Set token first
      localStorage.setItem('token', newToken);
      setToken(newToken);
      
      // Then set user - this ensures token is available for any subsequent API calls
      setUser(userData);
      
      // Wait a moment for React to process the state updates
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed. Please try again.'
      };
    }
  };

  const logout = async () => {
    try {
      // Try to log logout on server (don't wait for it)
      authAPI.logout().catch(() => {}); // Ignore errors
    } catch (error) {
      // Ignore errors
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  const isSuperadmin = () => {
    return user?.role === 'superadmin';
  };

  const isCaretaker = () => {
    return user?.role === 'caretaker';
  };

  const canAccessApartment = (apartmentId) => {
    if (isSuperadmin()) return true;
    if (isCaretaker() && user?.apartment) {
      const userApartmentId = user.apartment._id || user.apartment;
      return userApartmentId.toString() === apartmentId.toString();
    }
    return false;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isSuperadmin,
    isCaretaker,
    canAccessApartment,
    fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

