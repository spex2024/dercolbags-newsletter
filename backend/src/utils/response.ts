export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function successResponse<T>(data: T, message = "Success"): ApiResponse<T> {
  return { success: true, message, data };
}

export function errorResponse(message: string, errors: string[] = []): ApiResponse<never> {
  return { success: false, message, errors };
}

export function paginatedResponse<T>(items: T[], pagination: PaginationMeta, message = "Success") {
  return {
    success: true,
    message,
    data: { items, pagination },
  };
}
