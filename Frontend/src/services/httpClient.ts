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
      console.info('[HTTP] Request:', config.method?.toUpperCase(), config.url, {
        params: config.params,
        data: config.data,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        console.info('[HTTP] Response:', response.status, response.config.url, response.data);
        return response;
      },
      (error) => {
        const { response, config } = error;
        console.error('[HTTP] Error:', config?.method?.toUpperCase(), config?.url, {
          status: response?.status,
          data: response?.data,
        });
        return Promise.reject(error);
      }
    );
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
