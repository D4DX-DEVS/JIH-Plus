import axios from 'axios';

// Check if a JWT token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Validate user token
export const validateUserToken = async () => {
  const token = localStorage.getItem('userToken');
  
  if (!token || isTokenExpired(token)) {
    // Clear invalid token
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    return false;
  }

  try {
    // Test the token with a simple API call
    await axios.get(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return true;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear invalid token
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      return false;
    }
    // For other errors, assume token is still valid
    return true;
  }
};

// Validate admin token
export const validateAdminToken = async () => {
  const token = localStorage.getItem('adminToken');
  
  if (!token || isTokenExpired(token)) {
    // Clear invalid token
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    return false;
  }

  try {
    // Test the token with a simple API call
    await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return true;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear invalid token
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      return false;
    }
    // For other errors, assume token is still valid
    return true;
  }
};

// Get the appropriate authentication token (admin token takes priority)
export const getAuthToken = () => {
  const adminToken = localStorage.getItem('adminToken');
  const userToken = localStorage.getItem('userToken');
  
  // If admin token exists and is not expired, use it
  if (adminToken && !isTokenExpired(adminToken)) {
    return adminToken;
  }
  
  // Otherwise use user token if it exists and is not expired
  if (userToken && !isTokenExpired(userToken)) {
    return userToken;
  }
  
  return null;
};

// Check if current user is admin
export const isAdminUser = () => {
  const adminToken = localStorage.getItem('adminToken');
  return adminToken && !isTokenExpired(adminToken);
};

// Clear all authentication data
export const clearAuthData = () => {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
};
