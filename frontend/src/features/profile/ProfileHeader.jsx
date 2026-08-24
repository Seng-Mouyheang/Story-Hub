import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { formatJoinedDate } from "./profileUtils";

export default function ProfileHeader({
  userData,
  profileData,
  isOwnProfile,
  isFollowingViewedUser,
  isLoadingFollowStatus,
  isTogglingFollow,
  onToggleFollow,
  onOpenImagePreview,
  onOpenFollowList,
}) {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 relative shadow-sm">
      <div className="h-36 sm:h-48 bg-linear-to-r from-rose-100 to-amber-50 relative overflow-hidden">
        {userData.coverImage ? (
          <button
            type="button"
            onClick={() =>
              onOpenImagePreview({
                src: userData.coverImage,
                alt: `${userData.name} cover image`,
                title: "Cover photo",
                kind: "cover",
              })
            }
            className="group absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="View cover photo"
          >
            <img
              src={userData.coverImage}
              alt="Cover"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-slate-900/15" />
          </button>
        ) : null}
      </div>
      <div className="px-4 sm:px-8 pb-6 sm:pb-8">
        <div className="relative -mt-12 sm:-mt-16 mb-4">
          {userData.avatar ? (
            <button
              type="button"
              onClick={() =>
                onOpenImagePreview({
                  src: userData.avatar,
                  alt: `${userData.name} profile picture`,
                  title: "Profile picture",
                  kind: "avatar",
                })
              }
              className="group w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-4 border-white overflow-hidden bg-white shadow-xl cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="View profile picture"
            >
              <img
                src={userData.avatar}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                alt="Profile"
              />
            </button>
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-4 border-white overflow-hidden bg-white shadow-xl flex items-center justify-center bg-slate-100 text-slate-300">
              <User className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold truncate text-slate-900">
              {userData.name}
            </h1>
            <p className="text-slate-500 truncate font-medium">
              {userData.handle}
            </p>
          </div>
          {isOwnProfile ? (
            <div className="flex shrink-0 gap-2">
              <Link
                to="/edit-profile"
                className="px-3 sm:px-4 py-2 border border-slate-300 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap hover:bg-slate-100 transition-colors"
              >
                Edit Profile
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleFollow}
              disabled={isLoadingFollowStatus || isTogglingFollow}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                isFollowingViewedUser
                  ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                  : "bg-rose-500 hover:bg-rose-600 text-white"
              } ${
                isLoadingFollowStatus || isTogglingFollow
                  ? "opacity-60 cursor-not-allowed"
                  : ""
              }`}
            >
              {isLoadingFollowStatus
                ? "Loading..."
                : isFollowingViewedUser
                  ? "Following"
                  : "Follow"}
            </button>
          )}
        </div>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {formatJoinedDate(
            profileData?.createdAt ||
              profileData?.created_at ||
              profileData?.joinedAt,
          ) || "Member"}
        </p>

        <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-8 mt-5 border-t border-slate-200 pt-4 sm:pt-6">
          <div className="pl-4 md:pl-0">
            <span className="font-semibold text-slate-900">
              {userData.posts}
            </span>{" "}
            <span className="text-slate-400 text-sm">Posts</span>
          </div>
          <div>
            <button
              type="button"
              onClick={() => onOpenFollowList("followers")}
              className="inline-flex items-center gap-1 text-left"
            >
              <span className="font-semibold text-slate-900 hover:text-rose-600 transition-colors">
                {userData.followers}
              </span>{" "}
              <span className="text-slate-400 text-sm hover:text-slate-600 transition-colors">
                Followers
              </span>
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => onOpenFollowList("following")}
              className="inline-flex items-center gap-1 text-left"
            >
              <span className="font-semibold text-slate-900 hover:text-rose-600 transition-colors">
                {userData.following}
              </span>{" "}
              <span className="text-slate-400 text-sm hover:text-slate-600 transition-colors">
                Following
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
