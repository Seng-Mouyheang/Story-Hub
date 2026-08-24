import { useMemo } from "react";
import { normalizeId } from "./format";

export const getStoredCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
};

export const useCurrentUser = () => {
  const currentUser = useMemo(() => getStoredCurrentUser(), []);

  const currentUserId = useMemo(
    () => normalizeId(currentUser?.id || currentUser?._id || ""),
    [currentUser],
  );

  const currentUsername = currentUser?.username || "You";
  const currentUserProfilePicture = currentUser?.profilePicture || "";

  return {
    currentUser,
    currentUserId,
    currentUsername,
    currentUserProfilePicture,
  };
};
