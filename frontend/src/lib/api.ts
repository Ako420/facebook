import axios from "axios";
import type { AxiosError } from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl && !import.meta.env.DEV) {
  console.error("VITE_API_URL is not set for this deployment, so every request will fail.");
}
const TOKEN_KEY = "fb.token";

/** The JWT lives in localStorage so a refresh keeps you signed in. */
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
  baseURL: apiUrl || "http://localhost:5000/api",
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
