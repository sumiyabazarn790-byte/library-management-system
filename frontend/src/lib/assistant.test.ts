type AssistantModule = typeof import("./assistant");

let assistant: AssistantModule;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  assistant = await import("./assistant");
});

describe("assistant intent detection", () => {
  it("detects loan overview questions", () => {
    expect(assistant.detectAssistantIntent("minii loans")).toEqual({
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
    expect(assistant.detectAssistantIntent("санал болго science fiction")).toEqual({
      kind: "recommend",
      query: "science fiction",
    });
  });

  it("treats short catalog queries as search requests", () => {
    expect(assistant.detectAssistantIntent("Sapiens")).toEqual({
      kind: "search",
      query: "Sapiens",
    });
  });
});

describe("assistant capability copy", () => {
  it("detects Monglish prompts as Mongolian", () => {
    expect(assistant.detectAssistantLanguage("Hairiin nom bgaa yu")).toBe("mn");
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
              "• The Alchemist's Codex — Iris Vale (Rare Archives, 3/3 available)",
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
              "• The Alchemist's Codex — Iris Vale (Rare Archives, 3/3 available)",
              "• The Glass Laboratory — Mara Ellin (Science, 2/2 available)",
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
});
