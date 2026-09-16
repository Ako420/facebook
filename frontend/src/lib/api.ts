import axios from "axios";
import type { AxiosError } from "axios";

const TOKEN_KEY = "fb.token";

/** The JWT lives in localStorage so a refresh keeps you signed in for the 7d it lasts. */
export const readToken = (): string | null => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const writeToken = (token: string | null) => {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    
  }
};

export const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


export type FieldErrors = Record<string, string>;

export interface ApiFailure {
  message: string;
  errors: FieldErrors;
  status: number;
}

interface ErrorBody {
  message?: string;
  errors?: FieldErrors;
}

export function toApiFailure(error: unknown): ApiFailure {
  const axiosError = error as AxiosError<ErrorBody>;

  if (axiosError?.response) {
    const { status, data } = axiosError.response;
    const message = data?.message || "Something went wrong. Please try again.";
    const errors = { ...(data?.errors ?? {}) };

    if (status === 409 && !data?.errors && /email/i.test(message)) {
      errors.email = message;
    }

    return { message, errors, status };
  }

  if (axiosError?.request) {
    return {
      message: "Can't reach the server. Make sure the backend is running.",
      errors: {},
      status: 0,
    };
  }

  return { message: "Something went wrong. Please try again.", errors: {}, status: 0 };
}
