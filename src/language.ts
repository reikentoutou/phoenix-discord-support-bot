import type { SupportedLanguage } from "./types.js";

const zhPattern = /[\u3400-\u9fff]/;
const jaPattern = /[\u3040-\u30ff]/;
const latinPattern = /[A-Za-z]/;

export function detectLanguage(text: string): SupportedLanguage {
  const compact = text.trim();
  if (!compact) return "en";

  const jaCount = countMatches(compact, jaPattern);
  const zhCount = countMatches(compact, zhPattern);
  const latinCount = countMatches(compact, latinPattern);

  if (jaCount > 0) return "ja";
  if (zhCount > 0) return "zh";
  if (latinCount > 0) return "en";
  return "en";
}

function countMatches(text: string, pattern: RegExp): number {
  let count = 0;
  for (const char of text) {
    if (pattern.test(char)) count += 1;
  }
  return count;
}

export function languageName(language: SupportedLanguage): string {
  switch (language) {
    case "zh":
      return "中文";
    case "ja":
      return "日本語";
    case "en":
      return "English";
  }
}

export function needsStaffMessage(language: SupportedLanguage): string {
  switch (language) {
    case "zh":
      return "这个问题我目前不清楚。请问是否需要转人工？";
    case "ja":
      return "この内容は現在はっきり分かりません。スタッフ対応に切り替えますか？";
    case "en":
      return "I am not sure about this based on the current knowledge base. Would you like to contact staff?";
  }
}

export function supportWelcomeMessage(language: SupportedLanguage): string {
  switch (language) {
    case "zh":
      return "您好，请直接输入你的问题。机器人会先根据知识库回答；解决不了可以点「转人工」。";
    case "ja":
      return "ご質問をそのまま入力してください。Botが知識ベースをもとに回答します。解決できない場合は「スタッフへ連絡」を押してください。";
    case "en":
      return "Please type your question. The bot will answer from the knowledge base first. If needed, use Contact staff.";
  }
}

export function handoffConfirmedMessage(language: SupportedLanguage): string {
  switch (language) {
    case "zh":
      return "已通知员工。";
    case "ja":
      return "スタッフに通知しました。";
    case "en":
      return "Staff has been notified.";
  }
}

export function ticketClosedMessage(language: SupportedLanguage): string {
  switch (language) {
    case "zh":
      return "已关闭。";
    case "ja":
      return "クローズしました。";
    case "en":
      return "Ticket closed.";
  }
}

export function existingTicketMessage(language: SupportedLanguage, url: string): string {
  switch (language) {
    case "zh":
      return `你已经有一个未关闭的咨询：${url}`;
    case "ja":
      return `未クローズの相談があります：${url}`;
    case "en":
      return `You already have an open ticket: ${url}`;
  }
}

export function cooldownMessage(language: SupportedLanguage, seconds: number): string {
  switch (language) {
    case "zh":
      return `请稍等 ${seconds} 秒后再发送。`;
    case "ja":
      return `${seconds}秒待ってから再度送信してください。`;
    case "en":
      return `Please wait ${seconds} seconds before sending another message.`;
  }
}

export function autoCloseMessage(language: SupportedLanguage): string {
  switch (language) {
    case "zh":
      return "由于长时间没有新消息，此咨询已自动关闭。如需继续咨询，请重新点击入口按钮。";
    case "ja":
      return "長時間新しいメッセージがなかったため、この相談は自動的にクローズされました。続けて相談する場合は、入口ボタンから再度開始してください。";
    case "en":
      return "This ticket was automatically closed because there were no new messages for a while. Please start a new ticket if you need more help.";
  }
}
