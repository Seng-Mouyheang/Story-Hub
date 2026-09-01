import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Toast from "../components/Toast";
import { useToast } from "../lib/useToast";
import { useCurrentUser } from "../lib/useCurrentUser";
import { getMomentsByAuthor } from "../api/moment/momentApi";
import MomentViewer from "../features/moments/MomentViewer";

export default function MomentPermalink() {
  const { authorId, momentId } = useParams();
  const navigate = useNavigate();
  const { currentUserId, currentUsername, currentUserProfilePicture } =
    useCurrentUser();
  const {
    toast,
    isVisible,
    isPaused,
    duration,
    showToast,
    hideToast,
    pauseToast,
    resumeToast,
  } = useToast();

  const [group, setGroup] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    const loadMoment = async () => {
      setStatus("loading");

      try {
        const data = await getMomentsByAuthor(authorId, controller.signal);
        const moments = data?.moments || [];
        if (!moments.some((moment) => moment.id === momentId)) {
          setStatus("not-found");
          return;
        }
        setGroup(data);
        setStatus("ready");
      } catch (error) {
        if (error.name === "AbortError") return;
        setStatus("error");
      }
    };

    loadMoment();

    return () => controller.abort();
  }, [authorId, momentId]);

  const handleClose = useCallback(() => navigate("/"), [navigate]);

  // MomentViewer keeps `group`'s moments in sync locally as they're
  // liked/deleted; mirror a deletion back here so a re-render (e.g. after
  // navigating away and back) doesn't resurrect the removed moment. Since
  // this page only ever has one author in `authorSequence`, deleting the
  // last moment already makes MomentViewer call `onClose` (see
  // `handleClose` below) — no need to duplicate that navigation here.
  //
  // When a sibling moment remains, though, the URL is still pinned to the
  // moment that was just deleted — without updating it, a refresh or a
  // reshare of this exact link would 404 as "expired" even though the
  // author still has other live stories. `newCurrentMomentId` (the moment
  // MomentViewer is now actually showing) lets us repoint the URL at it.
  const handleMomentDeleted = useCallback(
    (deletedMomentId, newCurrentMomentId) => {
      setGroup((current) => {
        if (!current) return current;
        return {
          ...current,
          moments: current.moments.filter(
            (moment) => moment.id !== deletedMomentId,
          ),
        };
      });

      if (newCurrentMomentId) {
        navigate(`/moments/${authorId}/${newCurrentMomentId}`, {
          replace: true,
        });
      }
    },
    [authorId, navigate],
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {status === "loading" && (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-rose-500" />
        </div>
      )}

      {status === "not-found" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-lg font-semibold text-white">
            This story has expired or is no longer available.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Back to Story Hub
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-lg font-semibold text-white">
            Something went wrong loading this story.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Back to Story Hub
          </button>
        </div>
      )}

      {status === "ready" && group && (
        <MomentViewer
          authorSequence={[authorId]}
          initialAuthorId={authorId}
          initialMomentId={momentId}
          momentGroups={[group]}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          currentUserProfilePicture={currentUserProfilePicture}
          notify={showToast}
          onUnauthenticated={(message) =>
            navigate("/login", {
              replace: true,
              state: message ? { message } : undefined,
            })
          }
          onClose={handleClose}
          onMomentDeleted={handleMomentDeleted}
          onAddMore={() => navigate("/")}
        />
      )}

      {toast && isVisible && (
        <Toast
          toast={toast}
          isVisible={isVisible}
          isPaused={isPaused}
          durationMs={duration}
          onClose={hideToast}
          onPause={pauseToast}
          onResume={resumeToast}
        />
      )}
    </div>
  );
}
