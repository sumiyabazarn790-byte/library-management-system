type AssistantModule = typeof import("./assistant");

let assistant: AssistantModule;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  assistant = await import("./assistant");
});

describe("assistant intent detection", () => {
  it("detects greetings without searching the catalog", () => {
    expect(assistant.detectAssistantIntent("hi")).toEqual({
      kind: "greeting",
      query: "",
    });
    expect(assistant.detectAssistantIntent("sain uu")).toEqual({
      kind: "greeting",
      query: "",
    });
  });

  it("detects loan overview questions", () => {
    expect(assistant.detectAssistantIntent("minii loans")).toEqual({
      kind: "loans",
      query: "",
    });
  });

  it("detects romanized loan overviews with stretched letters", () => {
    expect(assistant.detectAssistantIntent("miniii zeelsen nomnuud")).toEqual({
      kind: "loans",
      query: "",
    });
  });

  it("extracts borrow targets from English commands", () => {
    expect(assistant.detectAssistantIntent("borrow atomic habits")).toEqual({
      kind: "borrow",
      query: "atomic habits",
    });
  });

  it("extracts recommendation topics from Mongolian commands", () => {
    expect(assistant.detectAssistantIntent("sanal bolgo science fiction")).toEqual({
      kind: "recommend",
      query: "science fiction",
    });
  });

  it("detects readable-book prompts", () => {
    expect(assistant.detectAssistantIntent("show books I can read now")).toEqual({
      kind: "readable",
      query: "",
    });
  });

  it("treats short catalog queries as search requests", () => {
    expect(assistant.detectAssistantIntent("Sapiens")).toEqual({
      kind: "search",
      query: "Sapiens",
    });
  });

  it("keeps short book titles with 'borrowed' in the name as searches", () => {
    expect(assistant.detectAssistantIntent("Borrowed Alphabets")).toEqual({
      kind: "search",
      query: "Borrowed Alphabets",
    });
  });
});

describe("assistant capability copy", () => {
  it("detects Monglish prompts as Mongolian", () => {
    expect(assistant.detectAssistantLanguage("Hairiin nom bgaa yu")).toBe("mn");
  });

  it("detects stretched romanized Mongolian as Mongolian", () => {
    expect(assistant.detectAssistantLanguage("miniii zeelsen nomnuud")).toBe("mn");
  });

  it("keeps the Mongolian capability list readable", () => {
    expect(assistant.buildCapabilitiesReply("mn")).toContain("Ном хайх");
    expect(assistant.buildCapabilitiesReply("mn")).toContain("Монгол/Англи");
  });

  it("keeps the English capability list readable", () => {
    expect(assistant.buildCapabilitiesReply("en")).toContain("Search books");
    expect(assistant.buildCapabilitiesReply("en")).toContain("semantic search");
  });
});

describe("assistant follow-up actions", () => {
  it("reuses the previous single catalog result when the user says borrow", () => {
    expect(
      assistant.inferFollowUpTargetFromHistory({
        text: "borrow",
        intentKind: "borrow",
        history: [
          { role: "user", content: "the alchemist's codex" },
          {
            role: "assistant",
            content: [
              "I found these catalog matches for \"the alchemist's codex\":",
              "\u2022 The Alchemist's Codex \u2014 Iris Vale (Rare Archives, 3/3 available)",
              "If you want one, say \"borrow <title>\" or \"request <title>\".",
            ].join("\n"),
          },
          { role: "user", content: "borrow" },
        ],
      }),
    ).toEqual({
      query: "The Alchemist's Codex",
      options: [],
    });
  });

  it("asks for clarification when the previous catalog response listed multiple books", () => {
    expect(
      assistant.inferFollowUpTargetFromHistory({
        text: "borrow",
        intentKind: "borrow",
        history: [
          { role: "user", content: "alchemy" },
          {
            role: "assistant",
            content: [
              "I found these catalog matches for \"alchemy\":",
              "\u2022 The Alchemist's Codex \u2014 Iris Vale (Rare Archives, 3/3 available)",
              "\u2022 The Glass Laboratory \u2014 Mara Ellin (Science, 2/2 available)",
            ].join("\n"),
          },
          { role: "user", content: "borrow" },
        ],
      }),
    ).toEqual({
      query: "",
      options: ["The Alchemist's Codex", "The Glass Laboratory"],
    });
  });

  it("resolves ordinal follow-ups against the previous catalog list", () => {
    expect(
      assistant.inferFollowUpTargetFromHistory({
        text: "borrow the second one",
        intentKind: "borrow",
        history: [
          { role: "user", content: "alchemy" },
          {
            role: "assistant",
            content: [
              'I found these catalog matches for "alchemy":',
              "\u2022 The Alchemist's Codex \u2014 Iris Vale (Rare Archives, 3/3 available)",
              "\u2022 The Glass Laboratory \u2014 Mara Ellin (Science, 2/2 available)",
              "\u2022 Midnight Atlas \u2014 Nia Sol (Fantasy, 1/1 available)",
            ].join("\n"),
          },
        ],
      }),
    ).toEqual({
      query: "The Glass Laboratory",
      options: [],
    });
  });
});
