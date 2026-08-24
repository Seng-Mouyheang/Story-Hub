import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { ChevronLeft } from "lucide-react";
import { useProfileData } from "../features/profile/useProfileData";
import { useFollowViewedUser } from "../features/profile/useFollowViewedUser";
import { useFollowListModal } from "../features/profile/useFollowListModal";
import { useProfileTabs } from "../features/profile/useProfileTabs";
import ProfileHeader from "../features/profile/ProfileHeader";
import ProfileBioSidebar from "../features/profile/ProfileBioSidebar";
import ProfileTabs from "../features/profile/ProfileTabs";
import FollowListModal from "../features/profile/FollowListModal";
import ProfileImagePreviewModal from "../features/profile/ProfileImagePreviewModal";

export default function Profile() {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams();
  const [imagePreview, setImagePreview] = useState(null);
  const scrollContainerRef = useRef(null);

  const {
    currentUserId,
    viewedUserId,
    isOwnProfile,
    profileData,
    setProfileData,
    isLoadingProfile,
    userData,
  } = useProfileData(routeUserId);

  const {
    isFollowingViewedUser,
    isLoadingFollowStatus,
    isTogglingFollow,
    handleToggleFollowViewedUser,
  } = useFollowViewedUser({ viewedUserId, currentUserId, isOwnProfile });

  const {
    isFollowListOpen,
    activeFollowListType,
    followListItems,
    followListHasMore,
    isLoadingFollowList,
    followListError,
    listActionBusyByUserId,
    openFollowList,
    closeFollowList,
    loadFollowList,
    handleToggleFollowFromList,
  } = useFollowListModal({ viewedUserId, currentUserId, setProfileData });

  const { activeTab, setActiveTab, tabs, tabContent, emptyMessage, isLoadingTabs } =
    useProfileTabs({ isOwnProfile, viewedUserId });

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0 });
    }
  }, [viewedUserId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const showProfileNotFound =
    !isOwnProfile && !isLoadingProfile && !profileData;

  if (showProfileNotFound) {
    return (
      <div className="flex h-screen bg-[#f3f4f6] text-[#111827] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-[#f3f4f6]">
          <Navbar title="User Profile" />
          <main className="flex-1 min-h-0">
            <div className="h-full flex items-center justify-center px-4 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-[#6b7280] tracking-tight">
                Profile not found
              </h1>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="User Profile" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="max-w-6xl mx-auto">
              {!isOwnProfile ? (
                <div className="mb-4 sm:mb-5 hidden sm:flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <h1 className="min-w-0 text-lg sm:text-xl font-semibold text-slate-900 truncate">
                    {userData.name}
                  </h1>
                </div>
              ) : null}

              {!isOwnProfile ? (
                <div className="mb-2 sm:mb-5 sm:hidden -ml-1 -mt-1">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              ) : null}

              <ProfileHeader
                userData={userData}
                profileData={profileData}
                isOwnProfile={isOwnProfile}
                isFollowingViewedUser={isFollowingViewedUser}
                isLoadingFollowStatus={isLoadingFollowStatus}
                isTogglingFollow={isTogglingFollow}
                onToggleFollow={handleToggleFollowViewedUser}
                onOpenImagePreview={setImagePreview}
                onOpenFollowList={openFollowList}
              />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
                <div className="md:col-span-4">
                  <ProfileBioSidebar userData={userData} />
                </div>

                <ProfileTabs
                  tabs={tabs}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isLoadingTabs={isLoadingTabs}
                  tabContent={tabContent}
                  emptyMessage={emptyMessage}
                />
              </div>

              <FollowListModal
                isOpen={isFollowListOpen}
                listType={activeFollowListType}
                items={followListItems}
                hasMore={followListHasMore}
                isLoading={isLoadingFollowList}
                error={followListError}
                busyByUserId={listActionBusyByUserId}
                onClose={closeFollowList}
                onToggleFollow={handleToggleFollowFromList}
                onLoadMore={() =>
                  loadFollowList({ listType: activeFollowListType })
                }
              />
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
      <ProfileImagePreviewModal
        image={imagePreview}
        isOpen={Boolean(imagePreview)}
        onClose={() => setImagePreview(null)}
      />
    </div>
  );
}
