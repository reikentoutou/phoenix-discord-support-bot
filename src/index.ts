import { loadConfig } from "./config.js";
import { OpenAIService } from "./ai.js";
import { AppDatabase } from "./db.js";
import { KnowledgeBase } from "./knowledge.js";
import { DiscordSupportBot } from "./discordBot.js";

const config = loadConfig();
const db = new AppDatabase(config.SQLITE_PATH);
const ai = new OpenAIService(
  config.OPENAI_API_KEY,
  config.OPENAI_MODEL,
  config.OPENAI_BASE_URL
);
const knowledge = new KnowledgeBase(config.KNOWLEDGE_DIR);

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});

knowledge.load();
const bot = new DiscordSupportBot(config, db, knowledge, ai);
await bot.start();
