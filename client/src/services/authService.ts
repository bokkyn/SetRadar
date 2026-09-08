import type { User } from "../app/auth";

const API_URL = "/api/auth";

export interface StoredUser extends User {
  id: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
}

async function request(input: RequestInfo | URL, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error(
      "The local database server is not running. Start the app with npm run dev.",
    );
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string; code?: string } }
      | null;
    const error = new Error(
      payload?.error?.message ||
        (response.status >= 500
          ? "The user database is unavailable."
          : "Authentication request was rejected."),
    );
    if (payload?.error?.code) {
      (error as Error & { code?: string }).code = payload.error.code;
    }
    throw error;
  }
  return response;
}

function normalizeAuthResponse(value: AuthResponse | User): AuthResponse {
  if ("user" in value && value.user) return value;
  return { user: value as User };
}

export async function registerUser(
  user: Omit<User, "role"> & { role: string; password: string },
): Promise<AuthResponse> {
  const email = user.email.trim().toLowerCase();
  if (user.password.length < 6)
    throw new Error("Password must be at least 6 characters.");
  return request(`${API_URL}/register`, {
    method: "POST",
    body: JSON.stringify({ ...user, email, id: `user-${Date.now()}` }),
  }).then(async (response) =>
    normalizeAuthResponse((await response.json()) as AuthResponse | User),
  );
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  return request(`${API_URL}/login`, {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail, password }),
  }).then(async (response) =>
    normalizeAuthResponse((await response.json()) as AuthResponse | User),
  );
}
