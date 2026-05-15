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
  "charlotte bronte::jane eyre": {
    ebookId: "1260",
    readerUrl: "https://books.google.com/books?q=Jane+Eyre+Charlotte+Bronte&as_brr=1",
  },
  "herman melville::moby-dick": {
    ebookId: "2701",
    readerUrl: "https://books.google.com/books?q=Moby-Dick+Herman+Melville&as_brr=1",
  },
  "h. g. wells::the time machine": {
    ebookId: "35",
    readerUrl: "https://books.google.com/books?q=The+Time+Machine+H.+G.+Wells&as_brr=1",
  },
  "h. g. wells::the war of the worlds": {
    ebookId: "36",
    readerUrl: "https://books.google.com/books?q=The+War+of+the+Worlds+H.+G.+Wells&as_brr=1",
  },
  "lewis carroll::alice's adventures in wonderland": {
    ebookId: "11",
    readerUrl: "https://books.google.com/books?q=Alice%27s+Adventures+in+Wonderland+Lewis+Carroll&as_brr=1",
  },
  "robert louis stevenson::treasure island": {
    ebookId: "120",
    readerUrl: "https://books.google.com/books?q=Treasure+Island+Robert+Louis+Stevenson&as_brr=1",
  },
  "oscar wilde::the picture of dorian gray": {
    ebookId: "174",
    readerUrl: "https://books.google.com/books?q=The+Picture+of+Dorian+Gray+Oscar+Wilde&as_brr=1",
  },
  "plato::the republic": {
    ebookId: "1497",
    readerUrl: "https://books.google.com/books?q=The+Republic+Plato&as_brr=1",
  },
  "niccolo machiavelli::the prince": {
    ebookId: "1232",
    readerUrl: "https://books.google.com/books?q=The+Prince+Niccolo+Machiavelli&as_brr=1",
  },
  "walt whitman::leaves of grass": {
    ebookId: "1322",
    readerUrl: "https://books.google.com/books?q=Leaves+of+Grass+Walt+Whitman&as_brr=1",
  },
  "rudyard kipling::the jungle book": {
    ebookId: "236",
    readerUrl: "https://books.google.com/books?q=The+Jungle+Book+Rudyard+Kipling&as_brr=1",
  },
  "bram stoker::dracula": {
    ebookId: "345",
    readerUrl: "https://books.google.com/books?q=Dracula+Bram+Stoker&as_brr=1",
  },
  "jane austen::sense and sensibility": {
    ebookId: "161",
    readerUrl: "https://www.gutenberg.org/ebooks/161",
  },
  "jane austen::emma": {
    ebookId: "158",
    readerUrl: "https://www.gutenberg.org/ebooks/158",
  },
  "jane austen::persuasion": {
    ebookId: "105",
    readerUrl: "https://www.gutenberg.org/ebooks/105",
  },
  "charles dickens::great expectations": {
    ebookId: "1400",
    readerUrl: "https://www.gutenberg.org/ebooks/1400",
  },
  "charles dickens::a tale of two cities": {
    ebookId: "98",
    readerUrl: "https://www.gutenberg.org/ebooks/98",
  },
  "charles dickens::oliver twist": {
    ebookId: "730",
    readerUrl: "https://www.gutenberg.org/ebooks/730",
  },
  "emily bronte::wuthering heights": {
    ebookId: "768",
    readerUrl: "https://www.gutenberg.org/ebooks/768",
  },
  "louisa may alcott::little women": {
    ebookId: "514",
    readerUrl: "https://www.gutenberg.org/ebooks/514",
  },
  "l. m. montgomery::anne of green gables": {
    ebookId: "45",
    readerUrl: "https://www.gutenberg.org/ebooks/45",
  },
  "kenneth grahame::the wind in the willows": {
    ebookId: "289",
    readerUrl: "https://www.gutenberg.org/ebooks/289",
  },
  "j. m. barrie::peter pan": {
    ebookId: "16",
    readerUrl: "https://www.gutenberg.org/ebooks/16",
  },
  "jack london::the call of the wild": {
    ebookId: "215",
    readerUrl: "https://www.gutenberg.org/ebooks/215",
  },
  "jack london::white fang": {
    ebookId: "910",
    readerUrl: "https://www.gutenberg.org/ebooks/910",
  },
  "jules verne::around the world in eighty days": {
    ebookId: "103",
    readerUrl: "https://www.gutenberg.org/ebooks/103",
  },
  "jules verne::twenty thousand leagues under the seas": {
    ebookId: "164",
    readerUrl: "https://www.gutenberg.org/ebooks/164",
  },
  "edwin a. abbott::flatland": {
    ebookId: "201",
    readerUrl: "https://www.gutenberg.org/ebooks/201",
  },
  "robert louis stevenson::the strange case of dr. jekyll and mr. hyde": {
    ebookId: "43",
    readerUrl: "https://www.gutenberg.org/ebooks/43",
  },
  "arthur conan doyle::the hound of the baskervilles": {
    ebookId: "2852",
    readerUrl: "https://www.gutenberg.org/ebooks/2852",
  },
  "arthur conan doyle::the memoirs of sherlock holmes": {
    ebookId: "834",
    readerUrl: "https://www.gutenberg.org/ebooks/834",
  },
  "wilkie collins::the moonstone": {
    ebookId: "155",
    readerUrl: "https://www.gutenberg.org/ebooks/155",
  },
  "wilkie collins::the woman in white": {
    ebookId: "583",
    readerUrl: "https://www.gutenberg.org/ebooks/583",
  },
  "henry james::the turn of the screw": {
    ebookId: "209",
    readerUrl: "https://www.gutenberg.org/ebooks/209",
  },
  "kate chopin::the awakening": {
    ebookId: "160",
    readerUrl: "https://www.gutenberg.org/ebooks/160",
  },
  "charlotte perkins gilman::the yellow wallpaper": {
    ebookId: "1952",
    readerUrl: "https://www.gutenberg.org/ebooks/1952",
  },
  "fyodor dostoyevsky::crime and punishment": {
    ebookId: "2554",
    readerUrl: "https://www.gutenberg.org/ebooks/2554",
  },
  "leo tolstoy::war and peace": {
    ebookId: "2600",
    readerUrl: "https://www.gutenberg.org/ebooks/2600",
  },
  "leo tolstoy::anna karenina": {
    ebookId: "1399",
    readerUrl: "https://www.gutenberg.org/ebooks/1399",
  },
  "homer::the odyssey": {
    ebookId: "1727",
    readerUrl: "https://www.gutenberg.org/ebooks/1727",
  },
  "sun tzu::the art of war": {
    ebookId: "132",
    readerUrl: "https://www.gutenberg.org/ebooks/132",
  },
  "marcus aurelius::meditations": {
    ebookId: "2680",
    readerUrl: "https://www.gutenberg.org/ebooks/2680",
  },
  "henry david thoreau::walden": {
    ebookId: "205",
    readerUrl: "https://www.gutenberg.org/ebooks/205",
  },
  "w. e. b. du bois::the souls of black folk": {
    ebookId: "408",
    readerUrl: "https://www.gutenberg.org/ebooks/408",
  },
  "frederick douglass::narrative of the life of frederick douglass": {
    ebookId: "23",
    readerUrl: "https://www.gutenberg.org/ebooks/23",
  },
  "harriet jacobs::incidents in the life of a slave girl": {
    ebookId: "11030",
    readerUrl: "https://www.gutenberg.org/ebooks/11030",
  },
  "oscar wilde::the importance of being earnest": {
    ebookId: "844",
    readerUrl: "https://www.gutenberg.org/ebooks/844",
  },
  "jacob grimm and wilhelm grimm::grimms' fairy tales": {
    ebookId: "2591",
    readerUrl: "https://www.gutenberg.org/ebooks/2591",
  },
  "hans christian andersen::andersen's fairy tales": {
    ebookId: "1597",
    readerUrl: "https://www.gutenberg.org/ebooks/1597",
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
