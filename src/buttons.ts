import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import type { SupportedLanguage } from "./types.js";

export const ButtonIds = {
  startPrefix: "support:start:",
  handoff: "support:handoff",
  close: "support:close",
  claimPrefix: "support:claim:"
} as const;

export function entryButtons() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${ButtonIds.startPrefix}zh`)
        .setLabel("中文")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${ButtonIds.startPrefix}ja`)
        .setLabel("日本語")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${ButtonIds.startPrefix}en`)
        .setLabel("English")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

export function ticketButtons(language: SupportedLanguage) {
  const labels = {
    zh: { handoff: "转人工", close: "已解决" },
    ja: { handoff: "スタッフへ連絡", close: "解決済み" },
    en: { handoff: "Contact staff", close: "Close" }
  }[language];

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ButtonIds.handoff)
        .setLabel(labels.handoff)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(ButtonIds.close)
        .setLabel(labels.close)
        .setStyle(ButtonStyle.Success)
    )
  ];
}

export function staffClaimButtons(threadId: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${ButtonIds.claimPrefix}${threadId}`)
        .setLabel("接手 / 対応する / Claim")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}
