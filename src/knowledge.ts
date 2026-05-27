import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type {
  KnowledgeChunk,
  KnowledgeDocument,
  SearchResult,
  SupportedLanguage
} from "./types.js";

const languages: SupportedLanguage[] = ["zh", "ja", "en"];

const frontmatterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) => {
      if (!value) return [];
      return Array.isArray(value)
        ? value
        : value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
    }),
  store: z.string().optional().nullable(),
  updated_at: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      return value instanceof Date ? value.toISOString().slice(0, 10) : value;
    })
});

export class KnowledgeBase {
  private chunks: KnowledgeChunk[] = [];

  constructor(private readonly rootDir: string) {}

  load() {
    const docs = loadDocuments(this.rootDir);
    warnMissingTranslations(docs);
    this.chunks = docs.flatMap(chunkDocument);
    console.log(
      `Loaded ${docs.length} knowledge documents and ${this.chunks.length} chunks.`
    );
  }

  search(
    query: string,
    language: SupportedLanguage,
    options: { limit: number; minScore: number }
  ): SearchResult[] {
    const candidates = this.chunks.filter((chunk) => chunk.language === language);
    if (candidates.length === 0) return [];

    return candidates
      .map((chunk) => ({
        chunk,
        score: lexicalScore(query, chunk)
      }))
      .filter((result) => result.score >= options.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit);
  }
}

export function loadDocuments(rootDir: string): KnowledgeDocument[] {
  const docs: KnowledgeDocument[] = [];

  for (const language of languages) {
    const languageDir = path.join(rootDir, language);
    if (!fs.existsSync(languageDir)) continue;

    const files = fs
      .readdirSync(languageDir)
      .filter((file) => file.endsWith(".md"))
      .sort();

    for (const file of files) {
      const filePath = path.join(languageDir, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = matter(raw);
      const frontmatter = frontmatterSchema.parse(parsed.data);

      docs.push({
        id: frontmatter.id,
        language,
        title: frontmatter.title,
        tags: frontmatter.tags,
        store: frontmatter.store ?? null,
        updatedAt: frontmatter.updated_at ?? null,
        filePath,
        body: parsed.content.trim()
      });
    }
  }

  return docs;
}

export function chunkDocument(document: KnowledgeDocument): KnowledgeChunk[] {
  const sections = splitMarkdown(document.body);
  return sections.map((section, index) => {
    const content = [
      `Title: ${document.title}`,
      document.tags.length ? `Tags: ${document.tags.join(", ")}` : "",
      document.store ? `Store: ${document.store}` : "",
      section
    ]
      .filter(Boolean)
      .join("\n");

    const contentHash = hashContent(
      `${document.language}:${document.id}:${index}:${content}`
    );
    return {
      id: `${document.language}:${document.id}:${index}`,
      documentId: document.id,
      language: document.language,
      title: document.title,
      tags: document.tags,
      store: document.store,
      content,
      contentHash
    };
  });
}

export function formatContext(result: SearchResult): string {
  return [
    `[${result.chunk.title} | score ${result.score.toFixed(3)}]`,
    result.chunk.content
  ].join("\n");
}

function splitMarkdown(markdown: string): string[] {
  const byHeading = markdown
    .split(/\n(?=#{1,3}\s)/g)
    .map((section) => section.trim())
    .filter(Boolean);

  const sections = byHeading.length > 0 ? byHeading : [markdown];
  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= 1200) {
      chunks.push(section);
      continue;
    }

    const paragraphs = section.split(/\n{2,}/g);
    let current = "";
    for (const paragraph of paragraphs) {
      if (`${current}\n\n${paragraph}`.length > 1200 && current) {
        chunks.push(current.trim());
        current = paragraph;
      } else {
        current = current ? `${current}\n\n${paragraph}` : paragraph;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks;
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function lexicalScore(query: string, chunk: KnowledgeChunk): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const haystack = `${chunk.title}\n${chunk.tags.join(" ")}\n${chunk.content}`.toLowerCase();
  let hits = 0;
  let weightedHits = 0;

  for (const token of queryTokens) {
    if (!token) continue;
    if (haystack.includes(token)) {
      hits += 1;
      weightedHits += Math.min(token.length, 8) / 8;
    }
  }

  const coverage = hits / queryTokens.length;
  const weighted = weightedHits / queryTokens.length;
  return Math.min(1, coverage * 0.7 + weighted * 0.3);
}

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const latinWords = lower.match(/[a-z0-9]+/g) ?? [];
  const cjkChars = lower.match(/[\u3400-\u9fff\u3040-\u30ff]/g) ?? [];
  const cjkBigrams: string[] = [];

  for (let index = 0; index < cjkChars.length - 1; index += 1) {
    cjkBigrams.push(`${cjkChars[index]}${cjkChars[index + 1]}`);
  }

  return [...new Set([...latinWords, ...cjkChars, ...cjkBigrams])].filter(
    (token) => token.length > 1 || /[\u3400-\u9fff\u3040-\u30ff]/.test(token)
  );
}

function warnMissingTranslations(docs: KnowledgeDocument[]) {
  const byId = new Map<string, Set<SupportedLanguage>>();
  for (const doc of docs) {
    if (!byId.has(doc.id)) byId.set(doc.id, new Set());
    byId.get(doc.id)!.add(doc.language);
  }

  for (const [id, present] of byId.entries()) {
    const missing = languages.filter((language) => !present.has(language));
    if (missing.length > 0) {
      console.warn(
        `Knowledge document "${id}" is missing translations: ${missing.join(", ")}`
      );
    }
  }
}
