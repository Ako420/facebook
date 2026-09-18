import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { readToken, writeToken } from "../../lib/api";
import {
  deactivateAccountRequest,
  fetchCurrentUser,
  loginRequest,
  registerRequest,
  updateProfileRequest,
} from "./authApi";
import type { AuthUser, LoginBody, ProfilePatch, RegisterBody } from "./authApi";

type Status = "loading" | "authenticated" | "guest";

/** How long to keep waiting for a sleeping server before showing the login page. */
const BOOTSTRAP_PATIENCE_MS = 90_000;
const BOOTSTRAP_RETRY_MS = 3_000;

interface AuthValue {
  status: Status;
  user: AuthUser | null;
  login: (body: LoginBody) => Promise<AuthUser>;
  register: (body: RegisterBody) => Promise<AuthUser>;
  updateProfile: (patch: ProfilePatch) => Promise<AuthUser>;
  deactivateAccount: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>(() =>
    readToken() ? "loading" : "guest",
  );

  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (!readToken()) return;

    const deadline = Date.now() + BOOTSTRAP_PATIENCE_MS;

    // No cleanup cancels this: the loop stops on success, on a rejected token,
    // when the session is dropped elsewhere, or at the deadline. Cancelling it
    // would leave nothing running after StrictMode's remount in development.
    const attempt = () => {
      if (!readToken()) return;

      fetchCurrentUser()
        .then((me) => {
          setUser(me);
          setStatus("authenticated");
        })
        .catch((error) => {
          // Only a rejected token means signed out. A rate limit, a server
          // error or a dropped connection must not throw the session away.
          const status = (error as { response?: { status?: number } })?.response?.status;
          const rejected = status === 401 || status === 403;

          if (rejected) writeToken(null);

          // A sleeping backend answers nothing at all for a while. Keep the
          // splash up and keep asking rather than showing the login page to
          // someone who is already signed in.
          if (!rejected && !status && Date.now() < deadline) {
            setTimeout(attempt, BOOTSTRAP_RETRY_MS);
            return;
          }

          setUser(null);
          setStatus("guest");
        });
    };

    attempt();
  }, []);

  const adopt = useCallback((token: string, nextUser: AuthUser) => {
    writeToken(token);
    setUser(nextUser);
    setStatus("authenticated");
    return nextUser;
  }, []);

  const login = useCallback(
    async (body: LoginBody) => {
      const data = await loginRequest(body);
      return adopt(data.token, data.user);
    },
    [adopt],
  );

  const register = useCallback(
    async (body: RegisterBody) => {
      const data = await registerRequest(body);
      return adopt(data.token, data.user);
    },
    [adopt],
  );

  /** Saves the change and keeps the session's copy of the user. */
  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    const updated = await updateProfileRequest(patch);
    setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setUser(null);
    setStatus("guest");
  }, []);

  /** Deactivates server-side, then drops the local session. */
  const deactivateAccount = useCallback(
    async (password: string) => {
      await deactivateAccountRequest(password);
      logout();
    },
    [logout],
  );

  const value = useMemo(
    () => ({ status, user, login, register, updateProfile, deactivateAccount, logout }),
    [status, user, login, register, updateProfile, deactivateAccount, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
