import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export class _ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "/api",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshResponse = await this.client.post("/auth/refresh", {});

            if (refreshResponse.data.success) {
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("user");
              window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.data) {
          return Promise.reject(error.response.data);
        }
        return Promise.reject({
          success: false,
          error: error.message || "An unexpected error occurred",
        });
      }
    );
  }

  private handleResponse<T>(
    response: AxiosResponse<ApiResponse<T>>
  ): ApiResponse<T> {
    return response.data;
  }

  private handleError(error: unknown): ErrorResponse {
    if (
      typeof error === "object" &&
      error !== null &&
      "success" in error &&
      "error" in error
    ) {
      return error as ErrorResponse;
    }
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig & { requireAuth?: boolean }
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post<T>(
    url: string,
    data?: object,
    config?: AxiosRequestConfig & { requireAuth?: boolean }
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(
        url,
        data,
        config
      );
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put<T>(
    url: string,
    data?: object,
    config?: AxiosRequestConfig & { requireAuth?: boolean }
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async patch<T>(
    url: string,
    data?: object,
    config?: AxiosRequestConfig & { requireAuth?: boolean }
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<ApiResponse<T>>(
        url,
        data,
        config
      );
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig & { requireAuth?: boolean }
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(progress);
          }
        },
      });
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

const ApiClient = new _ApiClient();
export default ApiClient;
