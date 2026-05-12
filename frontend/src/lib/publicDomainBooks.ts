import type { Book } from "@/types/library";
import { fallbackBooks } from "@/lib/fallbackBooks";

type PublicDomainBookRecord = {
  ebookId: string;
  readerUrl: string;
};

const PUBLIC_DOMAIN_BOOKS: Record<string, PublicDomainBookRecord> = {
  "jane austen::pride and prejudice": {
    ebookId: "1342",
    readerUrl: "https://www.gutenberg.org/ebooks/1342",
  },
  "mary shelley::frankenstein": {
    ebookId: "84",
    readerUrl: "https://www.gutenberg.org/ebooks/84",
  },
  "frances hodgson burnett::the secret garden": {
    ebookId: "113",
    readerUrl: "https://www.gutenberg.org/ebooks/113",
  },
  "arthur conan doyle::the adventures of sherlock holmes": {
    ebookId: "1661",
    readerUrl: "https://www.gutenberg.org/ebooks/1661",
  },
  "l. frank baum::the wonderful wizard of oz": {
    ebookId: "55",
    readerUrl: "https://www.gutenberg.org/ebooks/55",
  },
  "frances hodgson burnett::a little princess": {
    ebookId: "146",
    readerUrl: "https://www.gutenberg.org/ebooks/146",
  },
};

const toPublicDomainBookKey = (book: Pick<Book, "title" | "author">) =>
  `${book.author.trim().toLowerCase()}::${book.title.trim().toLowerCase()}`;

export const getPublicDomainBookRecord = (book: Pick<Book, "title" | "author">) =>
  PUBLIC_DOMAIN_BOOKS[toPublicDomainBookKey(book)] ?? null;

export const hasPublicDomainSource = (book: Pick<Book, "title" | "author">) =>
  Boolean(getPublicDomainBookRecord(book));

export const getPublicDomainReaderUrl = (book: Pick<Book, "title" | "author">) =>
  getPublicDomainBookRecord(book)?.readerUrl ?? null;

export const getPublicDomainTextCandidates = (book: Pick<Book, "title" | "author">) => {
  const ebookId = getPublicDomainBookRecord(book)?.ebookId;

  if (!ebookId) {
    return [];
  }

  return [
    `https://www.gutenberg.org/cache/epub/${ebookId}/pg${ebookId}.txt`,
    `https://www.gutenberg.org/cache/epub/${ebookId}/pg${ebookId}-0.txt`,
    `https://www.gutenberg.org/files/${ebookId}/${ebookId}-0.txt`,
    `https://www.gutenberg.org/files/${ebookId}/${ebookId}.txt`,
  ];
};

export const getPublicDomainDownloadCandidates = (book: Pick<Book, "title" | "author">) =>
  getPublicDomainTextCandidates(book);

export const getPublicDomainFallbackSections = (book: Pick<Book, "title" | "author">) => {
  const normalizedTitle = book.title.trim().toLowerCase();
  const normalizedAuthor = book.author.trim().toLowerCase();

  const fallbackBook =
    fallbackBooks.find(
      (candidate) =>
        candidate.title.trim().toLowerCase() === normalizedTitle &&
        candidate.author.trim().toLowerCase() === normalizedAuthor,
    ) ?? null;

  return fallbackBook?.reading_content?.filter((section) => section.trim().length > 0) ?? null;
};

export const getPublicDomainTextApiPath = (
  book: Pick<Book, "title" | "author">,
  options: {
    language?: "original" | "mn";
  } = {},
) => {
  const searchParams = new URLSearchParams({
    title: book.title,
    author: book.author,
  });

  if (options.language && options.language !== "original") {
    searchParams.set("language", options.language);
  }

  return `/api/public-domain-text?${searchParams.toString()}`;
};

export const getPublicDomainDownloadApiPath = (book: Pick<Book, "id">) =>
  `/api/book-download?bookId=${encodeURIComponent(book.id)}`;
