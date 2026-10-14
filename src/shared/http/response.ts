export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const response = {
  error(code: string, message: string, details?: unknown): ErrorResponseBody {
    return {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
      success: false,
    };
  },

  success<T>(data: T, message?: string): SuccessResponse<T> {
    return { data, ...(message ? { message } : {}), success: true };
  },
};
