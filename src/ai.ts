import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { SupportedLanguage } from "./types.js";

export interface AnswerInput {
  language: SupportedLanguage;
  userQuestion: string;
  contextBlocks: string[];
  history: Array<{ role: "user" | "assistant" | "staff" | "system"; content: string }>;
}

export class OpenAIService {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly chatModel: string,
    baseURL?: string
  ) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async answer(input: AnswerInput): Promise<{ answer: string; needsStaff: boolean }> {
    const languageInstruction = {
      zh: "Reply in Simplified Chinese.",
      ja: "Reply in Japanese.",
      en: "Reply in English."
    }[input.language];

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: [
          "You are PHOENIX Esports Cafe's Discord support bot.",
          "Answer politely, briefly, and practically like a store customer support agent.",
          languageInstruction,
          "Use only the provided knowledge base context.",
          "If the context does not contain enough information to answer, output exactly: NEEDS_STAFF",
          "Do not invent prices, availability, policies, reservations, or store-specific details."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          "Knowledge base context:",
          input.contextBlocks.join("\n\n---\n\n"),
          "",
          "Recent conversation:",
          input.history
            .slice(-8)
            .map((message) => `${message.role}: ${message.content}`)
            .join("\n"),
          "",
          `Customer question: ${input.userQuestion}`
        ].join("\n")
      }
    ];

    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      messages,
      temperature: 0.2
    });

    const answer = response.choices[0]?.message.content?.trim() ?? "";
    const needsStaff = !answer || answer.includes("NEEDS_STAFF");
    return { answer, needsStaff };
  }
}
