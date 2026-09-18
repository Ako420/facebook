import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

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

/** Long enough for a host that sleeps between visits to wake up. */
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

export const api = axios.create({
  baseURL: apiUrl || "http://localhost:5000/api",
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

/**
 * Whether the last request got an answer. Nothing is drawn from this; the
 * socket uses it to reconnect the moment the API is reachable again instead
 * of waiting out its backoff.
 */
let reachable = true;
const reachListeners = new Set<(reachable: boolean) => void>();

export const isServerReachable = () => reachable;

export const subscribeServerReach = (listener: (reachable: boolean) => void) => {
  reachListeners.add(listener);
  return () => {
    reachListeners.delete(listener);
  };
};

const requestSettled = (reached: boolean) => {
  if (reached === reachable) return;
  reachable = reached;
  reachListeners.forEach((listener) => listener(reached));
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RetriedRequest extends InternalAxiosRequestConfig {
  retries?: number;
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * A reload of a sleeping backend should not look like a failure. Reads are
 * retried a few times with a growing gap; writes are never repeated, because
 * the server may well have carried the first one out.
 */
api.interceptors.response.use(
  (response) => {
    requestSettled(true);
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetriedRequest | undefined;
    const unreachable = !error.response;
    const worthRetrying =
      Boolean(config) &&
      config?.method?.toLowerCase() === "get" &&
      (unreachable || RETRYABLE_STATUS.has(error.response?.status ?? 0));

    if (!worthRetrying) {
      requestSettled(!unreachable);
      throw error;
    }

    const attempt = (config.retries ?? 0) + 1;
    config.retries = attempt;

    if (attempt > MAX_RETRIES) {
      requestSettled(false);
      throw error;
    }

    requestSettled(false);
    await wait(1_000 * 2 ** (attempt - 1) + Math.random() * 400);

    return api(config);
  },
);


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
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;

    return {
      message: offline
        ? "You're offline. Check your connection and try again."
        : "The server isn't answering yet. It may be waking up — this can take up to a minute.",
      errors: {},
      status: 0,
    };
  }

  return { message: "Something went wrong. Please try again.", errors: {}, status: 0 };
}
