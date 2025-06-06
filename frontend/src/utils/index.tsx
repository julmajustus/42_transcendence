import axios from 'axios';

export const customFetch = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// customFetch.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

customFetch.interceptors.request.use((config) => {
  const raw = localStorage.getItem('user');
  if (raw) {
    try {
      const user = JSON.parse(raw) as { authToken: string };
      if (user.authToken) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${user.authToken}`,
        };
      }
    } catch {
      console.warn('Could not parse stored user');
    }
  }
  return config;
},
(error) => Promise.reject(error)
);