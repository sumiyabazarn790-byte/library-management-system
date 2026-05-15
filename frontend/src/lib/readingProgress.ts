import type { Book } from "@/types/library";

export type ReaderTextMode = "original" | "mn";

export type ReadingProgressEntry = {
  book: Book;
  pageIndex: number;
  totalPages: number;
  progressPercent: number;
  readerTextMode: ReaderTextMode;
  displayLanguage: string;
  updatedAt: string;
  completed: boolean;
};

const STORAGE_PREFIX = "aetheria:reading-progress:";
export const READING_PROGRESS_UPDATED_EVENT = "aetheria:reading-progress-updated";
const MAX_PROGRESS_ENTRIES = 40;

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const readProgressMap = (userId: string): Record<string, ReadingProgressEntry> => {
  if (!userId || !isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, ReadingProgressEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeProgressMap = (userId: string, progressMap: Record<string, ReadingProgressEntry>) => {
  if (!userId || !isBrowser()) {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(progressMap));
  window.dispatchEvent(new CustomEvent(READING_PROGRESS_UPDATED_EVENT));
};

export const getReadingProgressEntries = (userId: string) =>
  Object.values(readProgressMap(userId)).sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

export const getReadingProgressForBook = (userId: string, bookId: string) =>
  readProgressMap(userId)[bookId] ?? null;

export const upsertReadingProgress = (userId: string, entry: ReadingProgressEntry) => {
  if (!userId || !entry.book.id) {
    return;
  }

  const current = readProgressMap(userId);
  const nextEntries = [entry, ...Object.values(current).filter((item) => item.book.id !== entry.book.id)]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, MAX_PROGRESS_ENTRIES);

  writeProgressMap(
    userId,
    Object.fromEntries(nextEntries.map((item) => [item.book.id, item])),
  );
};

export const removeReadingProgress = (userId: string, bookId: string) => {
  const current = readProgressMap(userId);
  if (!current[bookId]) {
    return;
  }

  delete current[bookId];
  writeProgressMap(userId, current);
};
