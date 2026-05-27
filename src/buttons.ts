import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

export const ButtonIds = {
  start: "support:start",
  handoff: "support:handoff",
  close: "support:close",
  claimPrefix: "support:claim:"
} as const;

export function entryButtons() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ButtonIds.start)
        .setLabel("开始咨询 / 相談を開始 / Start")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

export function ticketButtons() {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ButtonIds.handoff)
        .setLabel("转人工 / スタッフへ連絡 / Staff")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(ButtonIds.close)
        .setLabel("已解决 / 解決済み / Close")
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
