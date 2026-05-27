export type SupportedLanguage = "zh" | "ja" | "en";
export type TicketStatus = "ai" | "human" | "closed";

export interface Ticket {
  id: number;
  threadId: string;
  userId: string;
  language: SupportedLanguage | null;
  status: TicketStatus;
  claimedBy: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface KnowledgeDocument {
  id: string;
  language: SupportedLanguage;
  title: string;
  tags: string[];
  store: string | null;
  updatedAt: string | null;
  filePath: string;
  body: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  language: SupportedLanguage;
  title: string;
  tags: string[];
  store: string | null;
  content: string;
  contentHash: string;
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
}
