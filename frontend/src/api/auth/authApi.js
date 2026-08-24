const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseJsonResponse = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
};

export async function login({ email, password }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseJsonResponse(res, "Login failed.");
}

export async function signup({ username, email, password }) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  return parseJsonResponse(res, "Signup failed.");
}

export async function logout() {
  const token = localStorage.getItem("token");

  try {
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Clear local auth state even if the network request fails.
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("rememberLogin");
  }
}

export async function changePassword({ currentPassword, newPassword }) {
  const token = localStorage.getItem("token");
  if (!token)
    throw new Error("You need to log in again before changing your password.");

  const res = await fetch("/api/auth/password", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return parseJsonResponse(res, "Failed to update password");
}

export async function deleteAccount({ currentPassword }) {
  const token = localStorage.getItem("token");
  if (!token)
    throw new Error("You need to log in again before deleting your account.");

  const res = await fetch("/api/auth/account", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ currentPassword }),
  });

  return parseJsonResponse(res, "Failed to delete account");
}
