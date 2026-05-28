import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { SupportedLanguage, Ticket, TicketStatus } from "./types.js";

export class AppDatabase {
  private readonly db: Database.Database;

  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  close() {
    this.db.close();
  }

  createTicket(input: {
    threadId: string;
    userId: string;
    language?: SupportedLanguage | null;
  }): Ticket {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `insert into tickets (thread_id, user_id, language, status, created_at, updated_at)
         values (?, ?, ?, 'ai', ?, ?)`
      )
      .run(input.threadId, input.userId, input.language ?? null, now, now);

    return this.getTicketById(Number(result.lastInsertRowid))!;
  }

  getTicketById(id: number): Ticket | null {
    return mapTicket(
      this.db.prepare("select * from tickets where id = ?").get(id)
    );
  }

  getTicketByThread(threadId: string): Ticket | null {
    return mapTicket(
      this.db.prepare("select * from tickets where thread_id = ?").get(threadId)
    );
  }

  getOpenTicketForUser(userId: string): Ticket | null {
    return mapTicket(
      this.db
        .prepare(
          `select * from tickets
           where user_id = ? and status != 'closed'
           order by created_at desc
           limit 1`
        )
        .get(userId)
    );
  }

  updateTicketLanguage(id: number, language: SupportedLanguage) {
    this.db
      .prepare("update tickets set language = ?, updated_at = ? where id = ?")
      .run(language, new Date().toISOString(), id);
  }

  updateTicketStatus(id: number, status: TicketStatus, claimedBy?: string | null) {
    const now = new Date().toISOString();
    const closedAt = status === "closed" ? now : null;
    this.db
      .prepare(
        `update tickets
         set status = ?, claimed_by = coalesce(?, claimed_by), updated_at = ?, closed_at = coalesce(?, closed_at)
         where id = ?`
      )
      .run(status, claimedBy ?? null, now, closedAt, id);
  }

  addMessage(input: {
    ticketId: number;
    authorId: string;
    role: "user" | "assistant" | "staff" | "system";
    content: string;
  }) {
    const now = new Date().toISOString();
    const transaction = this.db.transaction(() => {
      this.db
        .prepare(
          `insert into messages (ticket_id, author_id, role, content, created_at)
           values (?, ?, ?, ?, ?)`
        )
        .run(
          input.ticketId,
          input.authorId,
          input.role,
          input.content,
          now
        );

      this.db
        .prepare("update tickets set updated_at = ? where id = ?")
        .run(now, input.ticketId);
    });

    transaction();
  }

  listInactiveOpenTickets(cutoffIso: string): Ticket[] {
    return this.db
      .prepare(
        `select * from tickets
         where status != 'closed' and updated_at < ?
         order by updated_at asc`
      )
      .all(cutoffIso)
      .map(mapTicket)
      .filter((ticket): ticket is Ticket => ticket !== null);
  }

  listRecentMessages(ticketId: number, limit = 12) {
    return this.db
      .prepare(
        `select author_id as authorId, role, content, created_at as createdAt
         from messages
         where ticket_id = ?
         order by created_at desc
         limit ?`
      )
      .all(ticketId, limit)
      .reverse() as Array<{
      authorId: string;
      role: "user" | "assistant" | "staff" | "system";
      content: string;
      createdAt: string;
    }>;
  }

  getEmbedding(contentHash: string, model: string): number[] | null {
    const row = this.db
      .prepare(
        "select embedding_json from embeddings where content_hash = ? and model = ?"
      )
      .get(contentHash, model) as { embedding_json: string } | undefined;
    return row ? (JSON.parse(row.embedding_json) as number[]) : null;
  }

  saveEmbedding(contentHash: string, model: string, embedding: number[]) {
    this.db
      .prepare(
        `insert into embeddings (content_hash, model, embedding_json, created_at)
         values (?, ?, ?, ?)
         on conflict(content_hash) do update set
           model = excluded.model,
           embedding_json = excluded.embedding_json`
      )
      .run(contentHash, model, JSON.stringify(embedding), new Date().toISOString());
  }

  private migrate() {
    this.db.exec(`
      create table if not exists tickets (
        id integer primary key autoincrement,
        thread_id text not null unique,
        user_id text not null,
        language text,
        status text not null check (status in ('ai', 'human', 'closed')),
        claimed_by text,
        created_at text not null,
        updated_at text not null,
        closed_at text
      );

      create table if not exists messages (
        id integer primary key autoincrement,
        ticket_id integer not null references tickets(id),
        author_id text not null,
        role text not null check (role in ('user', 'assistant', 'staff', 'system')),
        content text not null,
        created_at text not null
      );

      create table if not exists embeddings (
        content_hash text primary key,
        model text not null,
        embedding_json text not null,
        created_at text not null
      );

      create index if not exists idx_tickets_thread_id on tickets(thread_id);
      create index if not exists idx_tickets_user_id on tickets(user_id);
      create index if not exists idx_messages_ticket_id on messages(ticket_id);
    `);
  }
}

function mapTicket(row: unknown): Ticket | null {
  if (!row) return null;
  const value = row as {
    id: number;
    thread_id: string;
    user_id: string;
    language: SupportedLanguage | null;
    status: TicketStatus;
    claimed_by: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
  };
  return {
    id: value.id,
    threadId: value.thread_id,
    userId: value.user_id,
    language: value.language,
    status: value.status,
    claimedBy: value.claimed_by,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    closedAt: value.closed_at
  };
}
