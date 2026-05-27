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
