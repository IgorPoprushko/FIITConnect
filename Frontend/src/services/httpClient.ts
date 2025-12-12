import { api } from 'boot/axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from 'src/stores/auth';

// Shared axios instance with auth token injection
class HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = api;
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const auth = useAuthStore();
      if (auth.token && config.headers) {
        config.headers.Authorization = `Bearer ${auth.token}`;
      }
      return config;
    });
  }

  get instance(): AxiosInstance {
    return this.client;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }
}

export const httpClient = new HttpClient();
