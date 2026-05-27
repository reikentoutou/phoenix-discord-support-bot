import "dotenv/config";
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig();

const commands = [
  new SlashCommandBuilder()
    .setName("setup-entry")
    .setDescription("Create the PHOENIX support entry message in this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("ticket-close")
    .setDescription("Close the current support ticket."),
  new SlashCommandBuilder()
    .setName("ticket-status")
    .setDescription("Show the current support ticket status.")
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(
    config.DISCORD_CLIENT_ID,
    config.DISCORD_GUILD_ID
  ),
  { body: commands }
);

console.log(`Registered ${commands.length} guild commands.`);
