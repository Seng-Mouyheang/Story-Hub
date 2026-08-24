export const MIN_SEARCH_LENGTH = 2;
const MAX_HISTORY = 10;
// Search history persistence removed: keep history in-memory only

export const historyKey = (entry) => {
  if (!entry || typeof entry !== "object") return "";
  if (entry.kind === "account" && entry.userId)
    return `account:${entry.userId}`;
  if (entry.kind === "query" && entry.query) return `query:${entry.query}`;
  return "";
};

export const normalizeHistoryEntry = (entry) => {
  if (!entry) return null;

  if (typeof entry === "string") {
    const query = entry.trim();
    if (query.length < MIN_SEARCH_LENGTH) return null;
    return { kind: "query", query };
  }

  if (typeof entry !== "object") return null;

  if (entry.kind === "account" && entry.userId) {
    return {
      kind: "account",
      userId: entry.userId,
      username: entry.username || "",
      displayName: entry.displayName || entry.username || "",
      profilePicture: entry.profilePicture || "",
    };
  }

  if (entry.kind === "query" && typeof entry.query === "string") {
    const query = entry.query.trim();
    if (query.length < MIN_SEARCH_LENGTH) return null;
    return { kind: "query", query };
  }

  return null;
};

export const loadSearchHistory = () => {
  // Persistence intentionally disabled: return empty history on mount
  return [];
};

export const saveSearchHistory = () => {
  // no-op: do not persist search history to localStorage
};

export const upsertHistoryEntry = (entry) => {
  const normalized = normalizeHistoryEntry(entry);
  if (!normalized) return loadSearchHistory();

  const history = loadSearchHistory();
  const key = historyKey(normalized);
  const filtered = history.filter((item) => historyKey(item) !== key);
  const updated = [normalized, ...filtered].slice(0, MAX_HISTORY);
  saveSearchHistory(updated);
  return updated;
};

export const addQueryToHistory = (query) => {
  if (!query || query.trim().length < MIN_SEARCH_LENGTH) return;
  const trimmed = query.trim();
  return upsertHistoryEntry({ kind: "query", query: trimmed });
};

export const addAccountToHistory = (account) => {
  if (!account?.userId) return;
  return upsertHistoryEntry({
    kind: "account",
    userId: account.userId,
    username: account.username || "",
    displayName: account.displayName || account.username || "",
    profilePicture: account.profilePicture || "",
  });
};
