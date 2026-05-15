import { beforeEach, describe, expect, it } from "vitest";
import type { Book } from "@/types/library";
import {
  getReadingProgressEntries,
  getReadingProgressForBook,
  removeReadingProgress,
  upsertReadingProgress,
} from "./readingProgress";

const makeBook = (id: string, title: string): Book => ({
  id,
  title,
  author: "Test Author",
  genre: "Classics",
  language: "en",
  description: "Readable test title.",
  cover_url: null,
  total_copies: 1,
  available_copies: 1,
  is_public_readable: true,
  reading_content: ["This is a long enough reader section for the test book to count as readable."],
});

describe("readingProgress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and returns progress per user and book", () => {
    const book = makeBook("book-1", "First Book");

    upsertReadingProgress("user-1", {
      book,
      pageIndex: 4,
      totalPages: 20,
      progressPercent: 25,
      readerTextMode: "mn",
      displayLanguage: "mn",
      updatedAt: "2026-05-15T01:00:00.000Z",
      completed: false,
    });

    expect(getReadingProgressForBook("user-1", "book-1")).toEqual(
      expect.objectContaining({
        book,
        pageIndex: 4,
        progressPercent: 25,
        readerTextMode: "mn",
      }),
    );
    expect(getReadingProgressForBook("user-2", "book-1")).toBeNull();
  });

  it("sorts newest entries first and replaces existing book progress", () => {
    const firstBook = makeBook("book-1", "First Book");
    const secondBook = makeBook("book-2", "Second Book");

    upsertReadingProgress("user-1", {
      book: firstBook,
      pageIndex: 1,
      totalPages: 10,
      progressPercent: 20,
      readerTextMode: "original",
      displayLanguage: "en",
      updatedAt: "2026-05-15T01:00:00.000Z",
      completed: false,
    });
    upsertReadingProgress("user-1", {
      book: secondBook,
      pageIndex: 2,
      totalPages: 10,
      progressPercent: 30,
      readerTextMode: "mn",
      displayLanguage: "mn",
      updatedAt: "2026-05-15T02:00:00.000Z",
      completed: false,
    });
    upsertReadingProgress("user-1", {
      book: firstBook,
      pageIndex: 5,
      totalPages: 10,
      progressPercent: 60,
      readerTextMode: "mn",
      displayLanguage: "mn",
      updatedAt: "2026-05-15T03:00:00.000Z",
      completed: false,
    });

    const entries = getReadingProgressEntries("user-1");
    expect(entries.map((entry) => entry.book.id)).toEqual(["book-1", "book-2"]);
    expect(entries[0]).toEqual(expect.objectContaining({ pageIndex: 5, progressPercent: 60 }));
  });

  it("removes progress for one book", () => {
    const book = makeBook("book-1", "First Book");

    upsertReadingProgress("user-1", {
      book,
      pageIndex: 1,
      totalPages: 10,
      progressPercent: 20,
      readerTextMode: "original",
      displayLanguage: "en",
      updatedAt: "2026-05-15T01:00:00.000Z",
      completed: false,
    });

    removeReadingProgress("user-1", "book-1");
    expect(getReadingProgressEntries("user-1")).toEqual([]);
  });
});
