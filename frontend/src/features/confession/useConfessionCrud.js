import { useCallback, useEffect, useState } from "react";

import {
  extractTagsFromContent,
  parseResponse,
  stripTagsFromContent,
} from "./confessionUtils";
import { useOutsideClickCloser } from "./useOutsideClickCloser";

export function useConfessionCrud({
  confessionFeed,
  setConfessionFeed,
  loadConfessions,
  location,
  showError,
  showSuccess,
  dismissToast,
}) {
  const [confession, setConfession] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [visibility, setVisibility] = useState("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingConfessionId, setEditingConfessionId] = useState("");
  const [editConfessionContent, setEditConfessionContent] = useState("");
  const [editConfessionIsAnonymous, setEditConfessionIsAnonymous] =
    useState(true);
  const [editConfessionVisibility, setEditConfessionVisibility] =
    useState("public");
  const [menuConfessionId, setMenuConfessionId] = useState("");
  const [expandedConfessionIds, setExpandedConfessionIds] = useState({});
  const [deleteTargetConfessionId, setDeleteTargetConfessionId] = useState("");
  const [isDeletingConfession, setIsDeletingConfession] = useState(false);

  const handleSubmit = useCallback(async () => {
    dismissToast();

    const cleanedContent = stripTagsFromContent(confession);

    if (cleanedContent.length < 5) {
      showError("Write at least 5 characters before posting.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showError("Please log in again to post a confession.");
      return;
    }

    setIsSubmitting(true);

    try {
      const extractedTags = extractTagsFromContent(confession);

      const response = await fetch("/api/confessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: cleanedContent,
          isAnonymous,
          visibility,
          tags: extractedTags,
        }),
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to post confession.");
      }

      setConfession("");
      showSuccess("Confession posted successfully.");
      await loadConfessions();
    } catch (error) {
      showError(error.message || "Failed to post confession.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    confession,
    dismissToast,
    isAnonymous,
    loadConfessions,
    showError,
    showSuccess,
    visibility,
  ]);

  const handleCancelEditConfession = useCallback(() => {
    setEditingConfessionId("");
    setEditConfessionContent("");
    setEditConfessionIsAnonymous(true);
    setEditConfessionVisibility("public");
  }, []);

  const handleSaveEditedConfession = useCallback(async () => {
    if (!editingConfessionId) {
      return;
    }

    dismissToast();

    const cleanedContent = stripTagsFromContent(editConfessionContent);

    if (cleanedContent.length < 5) {
      showError("Write at least 5 characters before updating.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showError("Please log in again to update a confession.");
      return;
    }

    setIsSubmitting(true);

    try {
      const extractedTags = extractTagsFromContent(editConfessionContent);

      const response = await fetch(`/api/confessions/${editingConfessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: cleanedContent,
          isAnonymous: editConfessionIsAnonymous,
          visibility: editConfessionVisibility,
          tags: extractedTags,
        }),
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to update confession.");
      }

      setEditingConfessionId("");
      setEditConfessionContent("");
      setEditConfessionIsAnonymous(true);
      setEditConfessionVisibility("public");
      setMenuConfessionId("");
      showSuccess("Confession updated successfully.");
      await loadConfessions();
    } catch (error) {
      showError(error.message || "Failed to update confession.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    dismissToast,
    editConfessionContent,
    editConfessionIsAnonymous,
    editConfessionVisibility,
    editingConfessionId,
    loadConfessions,
    showError,
    showSuccess,
  ]);

  const handleToggleConfessionMenu = useCallback((confessionId) => {
    setMenuConfessionId((currentId) =>
      currentId === confessionId ? "" : confessionId,
    );
  }, []);

  const handleToggleExpandedConfession = useCallback((confessionId) => {
    setExpandedConfessionIds((prev) => ({
      ...prev,
      [confessionId]: !prev[confessionId],
    }));
  }, []);

  const handleEditConfession = useCallback(
    (item) => {
      const existingTags = Array.isArray(item?.tags) ? item.tags : [];
      const reconstructedEditContent = [
        item?.content || "",
        existingTags.map((tag) => `#${tag}`).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .replaceAll(/[ \t]{2,}/g, " ")
        .trim();

      setMenuConfessionId("");
      setEditingConfessionId(String(item?._id || item?.id || ""));
      setEditConfessionContent(reconstructedEditContent);
      setEditConfessionIsAnonymous(Boolean(item?.isAnonymous));
      setEditConfessionVisibility(
        item?.visibility === "private" ? "private" : "public",
      );
      dismissToast();
    },
    [dismissToast],
  );

  const handleDeleteConfession = useCallback((confessionId) => {
    setMenuConfessionId("");
    setDeleteTargetConfessionId(confessionId);
  }, []);

  const handleConfirmDeleteConfession = useCallback(async () => {
    if (!deleteTargetConfessionId || isDeletingConfession) {
      return;
    }

    const confessionId = deleteTargetConfessionId;
    const token = localStorage.getItem("token");
    if (!token) {
      showError("Please log in again to delete a confession.");
      return;
    }

    setIsDeletingConfession(true);

    try {
      const response = await fetch(`/api/confessions/${confessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete confession.");
      }

      setConfessionFeed((prev) =>
        prev.filter(
          (item) => String(item?._id || item?.id || "") !== confessionId,
        ),
      );

      if (editingConfessionId === confessionId) {
        handleCancelEditConfession();
      }

      setDeleteTargetConfessionId("");
      showSuccess("Confession deleted successfully.");
    } catch (error) {
      showError(error.message || "Failed to delete confession.");
    } finally {
      setIsDeletingConfession(false);
    }
  }, [
    deleteTargetConfessionId,
    editingConfessionId,
    handleCancelEditConfession,
    isDeletingConfession,
    setConfessionFeed,
    showError,
    showSuccess,
  ]);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(location.search || "");
        const editId =
          params.get("editId") || location.state?.editingConfessionId;
        if (editId) {
          setEditingConfessionId(editId);
          const existing = confessionFeed.find(
            (c) => String(c._id || c.id) === String(editId),
          );
          if (existing) {
            setEditConfessionContent(existing.content || "");
            setEditConfessionIsAnonymous(existing.isAnonymous ?? true);
            setEditConfessionVisibility(existing.visibility || "public");
          } else {
            try {
              const res = await fetch(`/api/confessions/${editId}`);
              const data = await parseResponse(res);
              if (res.ok && data) {
                const item = data;
                setEditConfessionContent(item.content || "");
                setEditConfessionIsAnonymous(item.isAnonymous ?? true);
                setEditConfessionVisibility(item.visibility || "public");
              }
            } catch (err) {
              console.error("Failed to load confession for editing", err);
            }
          }
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useOutsideClickCloser(
    Boolean(menuConfessionId),
    () => setMenuConfessionId(""),
    "[data-confession-menu]",
  );

  return {
    confession,
    setConfession,
    isAnonymous,
    setIsAnonymous,
    visibility,
    setVisibility,
    isSubmitting,
    handleSubmit,
    editingConfessionId,
    editConfessionContent,
    setEditConfessionContent,
    editConfessionIsAnonymous,
    setEditConfessionIsAnonymous,
    editConfessionVisibility,
    setEditConfessionVisibility,
    handleSaveEditedConfession,
    handleCancelEditConfession,
    menuConfessionId,
    handleToggleConfessionMenu,
    expandedConfessionIds,
    handleToggleExpandedConfession,
    handleEditConfession,
    handleDeleteConfession,
    deleteTargetConfessionId,
    setDeleteTargetConfessionId,
    isDeletingConfession,
    handleConfirmDeleteConfession,
  };
}
