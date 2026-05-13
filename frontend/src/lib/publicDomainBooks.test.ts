import {
  getPublicDomainFallbackSections,
  getPublicDomainReaderUrl,
  getPublicDomainTextApiPath,
  getPublicDomainTextCandidates,
} from "./publicDomainBooks";

describe("publicDomainBooks helpers", () => {
  it("returns Gutenberg candidates for mapped public-domain books", () => {
    expect(
      getPublicDomainTextCandidates({
        title: "Frankenstein",
        author: "Mary Shelley",
      }),
    ).toHaveLength(4);
  });

  it("returns built-in fallback sections for known public-domain books", () => {
    expect(
      getPublicDomainFallbackSections({
        title: "The Adventures of Sherlock Holmes",
        author: "Arthur Conan Doyle",
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("To Sherlock Holmes she is always the woman."),
      ]),
    );
  });

  it("keeps the external reader link for known books", () => {
    expect(
      getPublicDomainReaderUrl({
        title: "Frankenstein",
        author: "Mary Shelley",
      }),
    ).toBe("https://www.gutenberg.org/ebooks/84");
  });

  it("links Google Books discovery pages for the added free reader shelf", () => {
    expect(
      getPublicDomainReaderUrl({
        title: "Jane Eyre",
        author: "Charlotte Bronte",
      }),
    ).toContain("books.google.com");
  });

  it("returns null fallback sections for unmapped books", () => {
    expect(
      getPublicDomainFallbackSections({
        title: "Unknown Book",
        author: "Unknown Author",
      }),
    ).toBeNull();
  });

  it("adds a Mongolian translation hint only when requested", () => {
    expect(
      getPublicDomainTextApiPath(
        {
          title: "Frankenstein",
          author: "Mary Shelley",
        },
        { language: "mn" },
      ),
    ).toContain("language=mn");

    expect(
      getPublicDomainTextApiPath({
        title: "Frankenstein",
        author: "Mary Shelley",
      }),
    ).not.toContain("language=");
  });
});
