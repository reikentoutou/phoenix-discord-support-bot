import {
  ChannelType,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  GuildMember,
  Interaction,
  Message,
  Partials,
  PermissionFlagsBits,
  TextChannel,
  ThreadChannel
} from "discord.js";
import type { AppConfig } from "./config.js";
import type { OpenAIService } from "./ai.js";
import { AppDatabase } from "./db.js";
import { ButtonIds, entryButtons, staffClaimButtons, ticketButtons } from "./buttons.js";
import { detectLanguage, languageName, needsStaffMessage } from "./language.js";
import { formatContext, KnowledgeBase } from "./knowledge.js";
import type { SupportedLanguage, Ticket } from "./types.js";

export class DiscordSupportBot {
  readonly client: Client;

  constructor(
    private readonly config: AppConfig,
    private readonly db: AppDatabase,
    private readonly knowledge: KnowledgeBase,
    private readonly ai: OpenAIService
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ],
      partials: [Partials.Channel, Partials.Message]
    });
  }

  async start() {
    this.client.once(Events.ClientReady, (client) => {
      console.log(`Logged in as ${client.user.tag}`);
    });

    this.client.on(Events.InteractionCreate, (interaction) => {
      void this.handleInteraction(interaction);
    });

    this.client.on(Events.MessageCreate, (message) => {
      void this.handleMessage(message);
    });

    await this.client.login(this.config.DISCORD_TOKEN);
  }

  private async handleInteraction(interaction: Interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
        return;
      }

      if (!interaction.isButton()) return;

      if (interaction.customId === ButtonIds.start) {
        await this.handleStart(interaction);
        return;
      }

      if (interaction.customId === ButtonIds.handoff) {
        const ticket = await this.requireThreadTicket(interaction.channelId);
        if (!ticket) {
          await interaction.reply({
            content: "No active ticket found in this thread.",
            ephemeral: true
          });
          return;
        }
        await this.moveToHuman(ticket, interaction.user.id, "Customer requested staff.");
        await interaction.reply({
          content:
            "已转人工 / スタッフに通知しました / Staff has been notified.",
          ephemeral: false
        });
        return;
      }

      if (interaction.customId === ButtonIds.close) {
        const ticket = await this.requireThreadTicket(interaction.channelId);
        if (!ticket) {
          await interaction.reply({
            content: "No active ticket found in this thread.",
            ephemeral: true
          });
          return;
        }
        await interaction.reply({
          content: "Ticket closed. / 已关闭 / クローズしました。",
          ephemeral: false
        });
        await this.closeTicket(ticket, interaction.channel as ThreadChannel | null);
        return;
      }

      if (interaction.customId.startsWith(ButtonIds.claimPrefix)) {
        await this.handleClaim(interaction);
      }
    } catch (error) {
      console.error("Interaction error:", formatError(error));
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "Bot error. Please ask staff to check the bot terminal logs. / エラーが発生しました。Botのログを確認してください。",
          ephemeral: true
        });
      }
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction) {
    switch (interaction.commandName) {
      case "setup-entry":
        await this.ensureAdmin(interaction);
        if (!interaction.channel?.isTextBased() || !("send" in interaction.channel)) {
          await interaction.reply({
            content: "Run this command in a text channel.",
            ephemeral: true
          });
          return;
        }
        await interaction.channel.send({
          content: [
            "**PHOENIX Support / 咨询 / サポート**",
            "点击按钮开始独立咨询。スタッフ対応が必要な場合は ticket 内で切り替えられます。",
            "Click the button to start a private support thread."
          ].join("\n"),
          components: entryButtons()
        });
        await interaction.reply({
          content: "Entry message created.",
          ephemeral: true
        });
        break;

      case "ticket-close": {
        const ticket = await this.requireThreadTicket(interaction.channelId);
        if (!ticket) {
          await interaction.reply({
            content: "This command must be used inside an active ticket thread.",
            ephemeral: true
          });
          return;
        }
        await interaction.reply("Ticket closed. / 已关闭 / クローズしました。");
        await this.closeTicket(ticket, interaction.channel as ThreadChannel | null);
        break;
      }

      case "ticket-status": {
        const ticket = await this.requireThreadTicket(interaction.channelId);
        if (!ticket) {
          await interaction.reply({
            content: "No ticket found in this thread.",
            ephemeral: true
          });
          return;
        }
        await interaction.reply({
          content: [
            `Ticket #${ticket.id}`,
            `Status: ${ticket.status}`,
            `Language: ${ticket.language ? languageName(ticket.language) : "unknown"}`,
            `Claimed by: ${ticket.claimedBy ? `<@${ticket.claimedBy}>` : "none"}`
          ].join("\n"),
          ephemeral: true
        });
        break;
      }
    }
  }

  private async handleStart(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.channel || interaction.channelId !== this.config.DISCORD_ENTRY_CHANNEL_ID) {
      await interaction.reply({
        content: "Please start support from the configured entry channel.",
        ephemeral: true
      });
      return;
    }

    const existing = this.db.getOpenTicketForUser(interaction.user.id);
    if (existing) {
      await interaction.reply({
        content: `You already have an open ticket: https://discord.com/channels/${interaction.guild.id}/${existing.threadId}`,
        ephemeral: true
      });
      return;
    }

    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        content: "Support entry must be in a text channel.",
        ephemeral: true
      });
      return;
    }

    let thread: ThreadChannel;
    try {
      thread = await interaction.channel.threads.create({
        name: `support-${safeName(interaction.user.username)}-${Date.now().toString(36)}`,
        type: ChannelType.PrivateThread,
        invitable: false,
        reason: `Support ticket for ${interaction.user.tag}`
      });
      await thread.members.add(interaction.user.id);
    } catch (error) {
      console.error("Failed to create support thread:", formatError(error));
      await interaction.reply({
        content:
          "无法创建 private thread。请确认 Bot 有「创建私密子区」「管理子区」「在子区内发送消息」权限，并且频道没有达到 thread 限制。",
        ephemeral: true
      });
      return;
    }

    const ticket = this.db.createTicket({
      threadId: thread.id,
      userId: interaction.user.id
    });
    this.db.addMessage({
      ticketId: ticket.id,
      authorId: "system",
      role: "system",
      content: "Ticket created."
    });

    await thread.send({
      content: [
        `<@${interaction.user.id}>`,
        "您好，请直接输入你的问题。机器人会先根据知识库回答，解决不了可以点「转人工」。",
        "ご質問をそのまま入力してください。解決できない場合は「スタッフへ連絡」を押してください。",
        "Please type your question. The bot will answer from the knowledge base first; use Staff if needed."
      ].join("\n"),
      components: ticketButtons()
    });

    await interaction.reply({
      content: `Support ticket created: ${thread.url}`,
      ephemeral: true
    });
  }

  private async handleMessage(message: Message) {
    if (message.author.bot || !message.inGuild() || !message.channel.isThread()) return;

    const ticket = this.db.getTicketByThread(message.channel.id);
    if (!ticket || ticket.status === "closed") return;

    const isTicketOwner = message.author.id === ticket.userId;
    if (ticket.status === "human") {
      this.db.addMessage({
        ticketId: ticket.id,
        authorId: message.author.id,
        role: isTicketOwner ? "user" : "staff",
        content: message.content
      });
      return;
    }

    if (!isTicketOwner) return;

    const language = detectLanguage(message.content);
    if (ticket.language !== language) {
      this.db.updateTicketLanguage(ticket.id, language);
    }

    this.db.addMessage({
      ticketId: ticket.id,
      authorId: message.author.id,
      role: "user",
      content: message.content
    });

    await message.channel.sendTyping();
    const results = await this.knowledge.search(message.content, language, {
      limit: this.config.MAX_CONTEXT_CHUNKS,
      minScore: this.config.MIN_RETRIEVAL_SCORE
    });

    if (results.length === 0) {
      await message.reply({
        content: needsStaffMessage(language),
        components: ticketButtons()
      });
      return;
    }

    const history = this.db.listRecentMessages(ticket.id);
    const answer = await this.ai.answer({
      language,
      userQuestion: message.content,
      contextBlocks: results.map(formatContext),
      history
    });

    if (answer.needsStaff) {
      await message.reply({
        content: needsStaffMessage(language),
        components: ticketButtons()
      });
      return;
    }

    this.db.addMessage({
      ticketId: ticket.id,
      authorId: this.client.user?.id ?? "bot",
      role: "assistant",
      content: answer.answer
    });

    await message.reply({
      content: answer.answer,
      components: ticketButtons()
    });
  }

  private async handleClaim(interaction: ButtonInteraction) {
    if (!interaction.guild) return;

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!hasStaffRole(member, this.config.DISCORD_STAFF_ROLE_ID)) {
      await interaction.reply({
        content: "Only Staff role members can claim tickets.",
        ephemeral: true
      });
      return;
    }

    const threadId = interaction.customId.slice(ButtonIds.claimPrefix.length);
    const ticket = this.db.getTicketByThread(threadId);
    if (!ticket || ticket.status === "closed") {
      await interaction.reply({
        content: "Ticket is no longer active.",
        ephemeral: true
      });
      return;
    }

    const channel = await this.client.channels.fetch(threadId);
    if (channel instanceof ThreadChannel) {
      await channel.members.add(interaction.user.id);
      await channel.send(`<@${interaction.user.id}> has joined this ticket.`);
    }

    this.db.updateTicketStatus(ticket.id, "human", interaction.user.id);
    await interaction.reply({
      content: `Claimed ticket #${ticket.id}.`,
      ephemeral: true
    });
  }

  private async moveToHuman(ticket: Ticket, actorId: string, reason: string) {
    const current = this.db.getTicketById(ticket.id);
    if (!current || current.status === "human" || current.status === "closed") return;

    this.db.updateTicketStatus(ticket.id, "human", null);
    this.db.addMessage({
      ticketId: ticket.id,
      authorId: actorId,
      role: "system",
      content: `Moved to human: ${reason}`
    });

    await this.notifyStaff(ticket, reason);
  }

  private async notifyStaff(ticket: Ticket, reason: string) {
    const staffChannel = await this.client.channels.fetch(
      this.config.DISCORD_STAFF_CHANNEL_ID
    );
    if (!staffChannel?.isTextBased() || !("send" in staffChannel)) {
      console.warn("Configured staff channel is not text based.");
      return;
    }

    const recent = this.db
      .listRecentMessages(ticket.id, 8)
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

    await staffChannel.send({
      content: [
        `<@&${this.config.DISCORD_STAFF_ROLE_ID}> New support handoff`,
        `Ticket: #${ticket.id}`,
        `Customer: <@${ticket.userId}>`,
        `Thread: https://discord.com/channels/${this.config.DISCORD_GUILD_ID}/${ticket.threadId}`,
        `Reason: ${reason}`,
        "Recent messages:",
        codeBlock(recent || "No messages recorded.")
      ].join("\n"),
      components: staffClaimButtons(ticket.threadId)
    });
  }

  private async closeTicket(ticket: Ticket, channel: ThreadChannel | null) {
    this.db.updateTicketStatus(ticket.id, "closed", null);
    this.db.addMessage({
      ticketId: ticket.id,
      authorId: "system",
      role: "system",
      content: "Ticket closed."
    });

    if (channel) {
      await channel.setLocked(true, "Support ticket closed.");
      await channel.setArchived(true, "Support ticket closed.");
    }
  }

  private async requireThreadTicket(channelId: string) {
    return this.db.getTicketByThread(channelId);
  }

  private async ensureAdmin(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: "This command requires Manage Server permission.",
        ephemeral: true
      });
      throw new Error("Missing ManageGuild permission.");
    }
  }
}

function hasStaffRole(member: GuildMember, roleId: string): boolean {
  return (
    member.roles.cache.has(roleId) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

function safeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);
}

function codeBlock(value: string): string {
  const trimmed = value.length > 1500 ? `${value.slice(0, 1500)}...` : value;
  return `\`\`\`\n${trimmed.replaceAll("```", "'''")}\n\`\`\``;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}\n${error.stack ?? ""}`;
  return String(error);
}
