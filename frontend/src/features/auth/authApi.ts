import { api } from "../../lib/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  profileUrl?: string;
  work?: string;
  intro?: string;
  location?: { city?: string; country?: string };
  friendsCount?: number;
  createdAt?: string;
}

export interface AuthPayload {
  message: string;
  token: string;
  user: AuthUser;
}

export interface LoginBody {
  email: string;
  password: string;
}
export interface RegisterBody {
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "other" | "";
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
}

export const loginRequest = async (body: LoginBody) => {
  const { data } = await api.post<AuthPayload>("/auth/login", body);
  return data;
};

export const registerRequest = async (body: RegisterBody) => {
  const { data } = await api.post<AuthPayload>("/auth/register", body);
  return data;
};

/** Every field PATCH /api/auth/user accepts. All optional. */
export interface ProfilePatch {
  name?: string;
  email?: string;
  phone?: string;
  intro?: string;
  work?: string;
  avatarUrl?: string;
  profileUrl?: string;
  location?: { city?: string; country?: string };
}

export const updateProfileRequest = async (patch: ProfilePatch) => {
  const { data } = await api.patch<{ message: string; user: AuthUser }>(
    "/auth/user",
    patch,
  );
  return data.user;
};

/**
 * Deactivates the account. The row stays in the database with status
 * "inactive"; it is not removed.
 */
export const deactivateAccountRequest = async (password: string) => {
  const { data } = await api.delete<{ message: string }>("/auth/user", {
    data: { password },
  });
  return data.message;
};

export const fetchUserById = async (id: string) => {
  const { data } = await api.get<{ user: AuthUser }>(`/auth/user/${id}`);
  return data.user;
};

export const fetchCurrentUser = async () => {
  const { data } = await api.get<{ user: AuthUser }>("/auth/user");
  return data.user;
};
