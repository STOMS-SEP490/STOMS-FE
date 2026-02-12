import axios from 'axios'
import type { AxiosInstance } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const http: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

// Request interceptor example: attach auth token if present
http.interceptors.request.use((config) => {
  // const token = localStorage.getItem('auth_token')
  // if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
  return config
})

export default http
