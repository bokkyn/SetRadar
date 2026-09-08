import { dataStore } from "./dataStore.js";
import { signToken } from "./auth.js";
import { User } from "./models/User.js";

export async function registerUser(input) {
  const email = input.email.trim().toLowerCase();
  console.log(`[registerUser] Registering with email: "${email}"`);

  if (input.password.length < 6) {
    console.log(`[registerUser] Password too short for ${email}`);
    const error = new Error("Password must be at least 6 characters.");
    error.status = 400;
    throw error;
  }

  const existing = await User.findOne({ email });
  console.log(
    `[registerUser] Existing user check for "${email}":`,
    existing ? `FOUND (${existing._id})` : "NOT FOUND",
  );
  if (existing) {
    const error = new Error("An account with this email already exists.");
    error.status = 409;
    throw error;
  }

  const user = await dataStore.create("users", { ...input, email });
  console.log(`[registerUser] Created user "${email}" with id ${user.id}`);
  const { password: _password, ...profile } = user;
  return { user: profile, token: signToken(profile) };
}

export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  console.log(`[loginUser] Attempting login for: "${normalizedEmail}"`);
  const users = await dataStore.list(
    "users",
    `?email=${encodeURIComponent(normalizedEmail)}`,
  );
  const user = users[0];
  console.log(
    `[loginUser] Found ${users.length} user(s) for "${normalizedEmail}"`,
  );

  if (!user) {
    const error = new Error(
      "This email and password combination doesn't exist.",
    );
    error.status = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const userModel = await User.findById(user.id);
  if (!userModel) {
    const error = new Error(
      "This email and password combination doesn't exist.",
    );
    error.status = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const isMatch = await userModel.comparePassword(password);
  if (!isMatch) {
    const error = new Error(
      "This email and password combination doesn't exist.",
    );
    error.status = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const { password: _password, ...profile } = user;
  return { user: profile, token: signToken(profile) };
}

export async function listLocations() {
  return dataStore.list("locations");
}

export async function searchLocations(query) {
  const locations = await listLocations();
  const nearby = locations.filter(
    (location) =>
      !location.logistics ||
      location.logistics.distanceKm <= query.radiusKm + 5,
  );
  return [...(nearby.length ? nearby : locations)]
    .sort((a, b) => (b.shootability || 0) - (a.shootability || 0))
    .slice(0, 3);
}
