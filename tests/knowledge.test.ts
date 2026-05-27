import path from "node:path";
import { describe, expect, it } from "vitest";
import { chunkDocument, loadDocuments } from "../src/knowledge.js";

describe("knowledge loading", () => {
  it("loads tri-language sample documents", () => {
    const docs = loadDocuments(path.join(process.cwd(), "knowledge"));
    expect(
      docs.some((doc) => doc.id === "esports-cafe-faq" && doc.language === "zh")
    ).toBe(true);
    expect(
      docs.some((doc) => doc.id === "esports-cafe-faq" && doc.language === "ja")
    ).toBe(true);
    expect(
      docs.some((doc) => doc.id === "esports-cafe-faq" && doc.language === "en")
    ).toBe(true);
  });

  it("chunks documents with stable metadata", () => {
    const doc = loadDocuments(path.join(process.cwd(), "knowledge")).find(
      (item) => item.id === "esports-cafe-faq" && item.language === "en"
    );
    expect(doc).toBeDefined();
    const chunks = chunkDocument(doc!);
    expect(chunks[0]?.documentId).toBe("esports-cafe-faq");
    expect(chunks.some((chunk) => chunk.content.includes("Game FAQ"))).toBe(true);
  });
});
