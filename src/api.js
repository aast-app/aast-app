import axios from 'axios';

const api = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'X-CEPT-Request': '1'
  }
});



api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) window.dispatchEvent(new Event('cept-session-expired'));
  return Promise.reject(error);
});

export default api;
