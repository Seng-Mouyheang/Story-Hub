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

export async function getProfileByUserId(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const response = await fetch(`/api/profile/${userId}`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to load profile");
}

export async function updateProfile({
  displayName,
  bio,
  profilePicture,
  coverImage,
}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("You need to log in again before saving your profile.");
  }

  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      displayName,
      bio,
      profilePicture,
      coverImage,
    }),
  });

  return parseJsonResponse(response, "Failed to save profile");
}
