import axios, { type AxiosRequestConfig } from "axios"
import { QueryClient } from "@tanstack/react-query"

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

// Unwrap data and surface backend error messages
axiosInstance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.message || err.message || "Request failed"
    return Promise.reject(new Error(message))
  },
)

// Typed wrappers — the second generic makes Axios return T directly (not AxiosResponse<T>)
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<T, T>(url, config),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.post<T, T>(url, data, config),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.patch<T, T>(url, data, config),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete<T, T>(url, config),
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})
