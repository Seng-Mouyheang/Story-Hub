import { useEffect, useMemo, useRef, useState } from "react";
import {
  getProfileByUserId,
  getUserStats,
  getFollowers,
  getFollowing,
} from "../../api/profile";
import { normalizeId } from "../../lib/format";
import { useCurrentUser } from "../../lib/useCurrentUser";

export function useProfileData(routeUserId) {
  const { currentUser, currentUserId } = useCurrentUser();
  const viewedUserId = normalizeId(routeUserId || currentUserId);
  const isOwnProfile =
    !routeUserId || normalizeId(routeUserId) === normalizeId(currentUserId);

  const [profileData, setProfileData] = useState(null);
  const [profileStats, setProfileStats] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileRefreshToken, setProfileRefreshToken] = useState(0);
  const lastViewedUserIdRef = useRef("");

  useEffect(() => {
    const handleFollowUpdated = (event) => {
      const normalizedViewedUserId = String(viewedUserId || "").trim();
      const followerId = String(event?.detail?.followerId || "").trim();
      const followingId = String(event?.detail?.followingId || "").trim();
      const isFollowing = Boolean(event?.detail?.following);

      if (!normalizedViewedUserId) {
        return;
      }

      setProfileData((previous) => {
        if (!previous) {
          return previous;
        }

        let nextFollowers = Number(previous.followers || 0);
        let nextFollowing = Number(previous.following || 0);

        if (normalizedViewedUserId === followingId) {
          nextFollowers = Math.max(0, nextFollowers + (isFollowing ? 1 : -1));
        }

        if (normalizedViewedUserId === followerId) {
          nextFollowing = Math.max(0, nextFollowing + (isFollowing ? 1 : -1));
        }

        return {
          ...previous,
          followers: nextFollowers,
          following: nextFollowing,
        };
      });

      if (
        normalizedViewedUserId === followerId ||
        normalizedViewedUserId === followingId
      ) {
        setProfileRefreshToken((previous) => previous + 1);
      }
    };

    window.addEventListener("storyhub:follow-updated", handleFollowUpdated);

    return () => {
      window.removeEventListener(
        "storyhub:follow-updated",
        handleFollowUpdated,
      );
    };
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      return;
    }

    let isMounted = true;
    const viewedUserChanged = lastViewedUserIdRef.current !== viewedUserId;
    lastViewedUserIdRef.current = viewedUserId;

    const loadProfile = async () => {
      if (isMounted && viewedUserChanged) {
        setIsLoadingProfile(true);
      }

      try {
        const [payload, statsPayload, followersData, followingData] =
          await Promise.all([
            getProfileByUserId(viewedUserId),
            getUserStats(viewedUserId).catch(() => null),
            getFollowers(viewedUserId, { limit: 1 }).catch(() => null),
            getFollowing(viewedUserId, { limit: 1 }).catch(() => null),
          ]);

        if (isMounted) {
          setProfileData(
            payload
              ? {
                  ...payload,
                  followers: followersData?.totalFollowers ?? payload.followers,
                  following: followingData?.totalFollowing ?? payload.following,
                }
              : payload,
          );
          setProfileStats(statsPayload);
        }
      } catch {
        if (isMounted && viewedUserChanged) {
          setProfileData(null);
          setProfileStats(null);
        }
      } finally {
        if (isMounted && viewedUserChanged) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [profileRefreshToken, viewedUserId]);

  const userData = useMemo(() => {
    const username = currentUser?.username || "StoryHub User";
    const email = currentUser?.email || "";
    const stats = profileStats?.stats || {};
    const externalAuthorFallback = viewedUserId
      ? `Author ${viewedUserId.slice(-4).toUpperCase()}`
      : "Unknown Author";
    const displayName =
      profileData?.displayName ||
      (isOwnProfile ? username : externalAuthorFallback);
    const normalizedHandle =
      profileData?.username ||
      (isOwnProfile
        ? email
          ? email.split("@")[0]
          : displayName.replace(/\s+/g, "").toLowerCase()
        : viewedUserId || displayName.replace(/\s+/g, "").toLowerCase());

    return {
      name: displayName,
      handle: `@${normalizedHandle || "storyhub_user"}`,
      followers: String(profileData?.followers ?? 0),
      following: String(profileData?.following ?? 0),
      posts: String(stats.totalPosts ?? profileData?.posts ?? 0),
      bio:
        profileData?.bio ||
        (isOwnProfile
          ? "Welcome to your StoryHub profile. Start writing and sharing your stories."
          : "This user has not completed their profile yet."),
      genres:
        Array.isArray(profileData?.interest) && profileData.interest.length > 0
          ? profileData.interest
          : ["General"],
      avatar: profileData?.profilePicture || "",
      coverImage: profileData?.coverImage || "",
    };
  }, [currentUser, isOwnProfile, profileData, profileStats, viewedUserId]);

  return {
    currentUserId,
    viewedUserId,
    isOwnProfile,
    profileData,
    setProfileData,
    profileStats,
    isLoadingProfile,
    userData,
  };
}
