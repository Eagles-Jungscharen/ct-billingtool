import { API_BASE_URL } from '../config/api';
import type { ApiError } from './types';

export class ApiResponseError extends Error {
  readonly apiError: ApiError;
  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiResponseError';
    this.apiError = apiError;
  }
}

export const authFetch = async <T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // keep statusText
    }
    throw new ApiResponseError({ status: response.status, message });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};
