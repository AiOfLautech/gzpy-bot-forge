import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Telegraf, Markup } from "telegraf";
import { insertBotSchema, insertUserEconomySchema, insertBotStatsSchema } from "@shared/schema";

const botInstances = new Map<string, Telegraf>();

// Shop items, jobs, crimes data
const SHOP_ITEMS: Record<string, { name: string; price: number; description: string; category: string }> = {
  lockpick: { name: "🔓 Lockpick", price: 5000, description: "Increases crime success rate by 10%", category: "tools" },
  gun: { name: "🔫 Gun", price: 25000, description: "Required for robbery and heists", category: "weapons" },
  knife: { name: "🔪 Knife", price: 10000, description: "Increases mugging success", category: "weapons" },
  car: { name: "🚗 Car", price: 100000, description: "Faster getaway, +15% crime success", category: "vehicles" },
  laptop: { name: "💻 Laptop", price: 50000, description: "Required for hacking", category: "tools" },
  phone: { name: "📱 Phone", price: 15000, description: "Call backup during crimes", category: "tools" },
  mansion: { name: "🏰 Mansion", price: 1000000, description: "+10% all earnings", category: "property" },
  yacht: { name: "🛥️ Yacht", price: 5000000, description: "+20% all earnings", category: "property" },
  jet: { name: "✈️ Private Jet", price: 25000000, description: "+50% all earnings", category: "property" },
  island: { name: "🏝️ Private Island", price: 100000000, description: "+100% all earnings", category: "property" },
};

const JOBS: Record<string, { name: string; salary: number; requirement: number }> = {
  none: { name: "Unemployed", salary: 0, requirement: 0 },
  janitor: { name: "🧹 Janitor", salary: 200, requirement: 1 },
  cashier: { name: "💵 Cashier", salary: 500, requirement: 3 },
  waiter: { name: "🍽️ Waiter", salary: 750, requirement: 5 },
  teacher: { name: "👨‍🏫 Teacher", salary: 1000, requirement: 8 },
  mechanic: { name: "🔧 Mechanic", salary: 1500, requirement: 10 },
  engineer: { name: "👷 Engineer", salary: 2500, requirement: 15 },
  doctor: { name: "👨‍⚕️ Doctor", salary: 5000, requirement: 20 },
  lawyer: { name: "⚖️ Lawyer", salary: 10000, requirement: 30 },
  pilot: { name: "✈️ Pilot", salary: 15000, requirement: 40 },
  ceo: { name: "💼 CEO", salary: 25000, requirement: 50 },
};

const CRIMES = [
  { name: "🏪 Rob a Store", minReward: 1000, maxReward: 5000, successRate: 0.6, requiredItem: null, fine: 0.15 },
  { name: "🏦 Rob a Bank", minReward: 10000, maxReward: 50000, successRate: 0.3, requiredItem: "gun", fine: 0.25 },
  { name: "💎 Steal Jewelry", minReward: 5000, maxReward: 25000, successRate: 0.4, requiredItem: "lockpick", fine: 0.20 },
  { name: "🚗 Grand Theft Auto", minReward: 15000, maxReward: 75000, successRate: 0.2, requiredItem: "car", fine: 0.30 },
  { name: "💻 Hack Database", minReward: 20000, maxReward: 100000, successRate: 0.25, requiredItem: "laptop", fine: 0.35 },
  { name: "🏛️ Museum Heist", minReward: 50000, maxReward: 250000, successRate: 0.15, requiredItem: "lockpick", fine: 0.40 },
];

const createProgressBar = (current: number, max: number, length: number = 10) => {
  const filled = Math.floor((current / max) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
};

const formatMoney = (amount: number) => `$${amount.toLocaleString()}`;

export function registerRoutes(app: Express): Server {
  // API Routes
  
  // Get all bots for a user
  app.get("/api/bots", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const bots = await storage.getBotsByUserId(userId);
      res.json(bots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get bot with stats
  app.get("/api/bots/:id/stats", async (req, res) => {
    try {
      const botId = req.params.id;
      const bot = await storage.getBotById(botId);
      
      if (!bot) {
        return res.status(404).json({ error: "Bot not found" });
      }

      let stats = await storage.getBotStats(botId);
      if (!stats) {
        stats = await storage.createBotStats({ botId, botUsername: bot.name });
      }

      // Fetch bot info from Telegram API
      let directLink = "";
      try {
        const response = await fetch(`https://api.telegram.org/bot${bot.telegramToken}/getMe`);
        const data = await response.json();
        if (data.ok && data.result.username) {
          directLink = `https://t.me/${data.result.username}`;
          if (stats.botUsername !== data.result.username) {
            await storage.updateBotStats(botId, { botUsername: data.result.username });
            stats.botUsername = data.result.username;
          }
        }
      } catch (err) {
        console.error("Failed to fetch bot username:", err);
      }

      res.json({
        ...bot,
        stats,
        directLink,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create bot
  app.post("/api/bots", async (req, res) => {
    try {
      const data = insertBotSchema.parse(req.body);
      const bot = await storage.createBot(data);
      await storage.createBotStats({ botId: bot.id });
      res.json(bot);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update bot
  app.patch("/api/bots/:id", async (req, res) => {
    try {
      const botId = req.params.id;
      await storage.updateBot(botId, req.body);
      const bot = await storage.getBotById(botId);
      res.json(bot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete bot
  app.delete("/api/bots/:id", async (req, res) => {
    try {
      const botId = req.params.id;
      await storage.deleteBot(botId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Telegram Webhook Handler
  app.post("/api/telegram/webhook/:botId", async (req, res) => {
    try {
      const botId = req.params.botId;
      const bot = await storage.getBotById(botId);

      if (!bot || !bot.isActive) {
        return res.status(404).json({ error: "Bot not found or inactive" });
      }

      const update = req.body;
      
      if (update.message) {
        const { chat, from, text } = update.message;
        const chatId = chat.id;
        const userId = from.id.toString();
        const username = from.first_name;

        // Channel membership verification
        if (bot.channelUsername && text !== "/start") {
          try {
            const memberCheck = await fetch(`https://api.telegram.org/bot${bot.telegramToken}/getChatMember?chat_id=@${bot.channelUsername.replace("@", "")}&user_id=${from.id}`);
            const memberData = await memberCheck.json();
            const isMember = memberData.ok && ["member", "administrator", "creator"].includes(memberData.result.status);
            
            if (!isMember) {
              await fetch(`https://api.telegram.org/bot${bot.telegramToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `⚠️ <b>Join Required!</b>\n\nPlease join ${bot.channelUsername} to use this bot.`,
                  parse_mode: "HTML",
                  reply_markup: {
                    inline_keyboard: [[{ text: "Join Channel ✨", url: `https://t.me/${bot.channelUsername.replace("@", "")}` }]]
                  }
                }),
              });
              return res.json({ ok: true });
            }
          } catch (err) {
            console.error("Channel verification error:", err);
          }
        }

        // Handle commands
        if (text?.startsWith("/")) {
          const [command, ...args] = text.slice(1).toLowerCase().split(" ");
          
          // Get or create user economy
          let user = await storage.getUserEconomy(botId, userId);
          if (!user) {
            user = await storage.createUserEconomy({ botId, userId, balance: "1000", bank: "0" });
          }

          const now = Date.now();
          const sendMessage = async (text: string, extra: any = {}) => {
            await fetch(`https://api.telegram.org/bot${bot.telegramToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
            });
          };

          // Command handlers
          switch (command) {
            case "start":
              let welcomeMsg = bot.welcomeMessage || "🎉 <b>Welcome to the Bot!</b>";
              welcomeMsg += "\n\n💰 Starting balance: $1,000\n\n📋 <b>Quick Commands:</b>\n/balance - Check your money\n/daily - Daily reward\n/work - Work for money\n/help - All commands";
              
              if (bot.botImageUrl) {
                await fetch(`https://api.telegram.org/bot${bot.telegramToken}/sendPhoto`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chat_id: chatId, photo: bot.botImageUrl, caption: welcomeMsg, parse_mode: "HTML" }),
                });
              } else {
                await sendMessage(welcomeMsg);
              }
              break;

            case "balance":
            case "bal":
              const balance = parseFloat(user.balance || "0");
              const bank = parseFloat(user.bank || "0");
              const netWorth = balance + bank;
              const level = user.level || 1;
              const xp = user.xp || 0;
              const xpNeeded = level * 100;
              
              await sendMessage(
                `💰 <b>${username}'s Balance</b>\n\n` +
                `💵 Wallet: ${formatMoney(balance)}\n` +
                `🏦 Bank: ${formatMoney(bank)}\n` +
                `💎 Net Worth: ${formatMoney(netWorth)}\n\n` +
                `⭐ Level ${level}\n` +
                `✨ XP: ${xp}/${xpNeeded}\n` +
                `${createProgressBar(xp, xpNeeded, 15)}\n\n` +
                `💼 Job: ${JOBS[user.job || 'none'].name}`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: "💸 Deposit", callback_data: `deposit_prompt` },
                        { text: "💰 Withdraw", callback_data: `withdraw_prompt` }
                      ]
                    ]
                  }
                }
              );
              break;

            case "daily":
              const lastDaily = user.lastDaily ? new Date(user.lastDaily).getTime() : 0;
              if (now - lastDaily < 86400000) {
                const timeLeft = Math.ceil((86400000 - (now - lastDaily)) / 3600000);
                await sendMessage(`⏰ <b>Daily Reward</b>\n\nAvailable in ${timeLeft}h`);
              } else {
                const reward = 1000 + ((user.level || 1) * 200);
                const newBalance = parseFloat(user.balance || "0") + reward;
                await storage.updateUserEconomy(botId, userId, { 
                  balance: newBalance.toString(), 
                  lastDaily: new Date().toISOString() 
                });
                await sendMessage(
                  `🎁 <b>Daily Reward Claimed!</b>\n\n` +
                  `💰 +${formatMoney(reward)}\n` +
                  `💵 New Balance: ${formatMoney(newBalance)}\n\n` +
                  `Come back in 24h for more!`
                );
              }
              break;

            case "help":
              await sendMessage(
                `📋 <b>Bot Commands</b>\n\n` +
                `💰 <b>Economy</b>\n` +
                `/balance - Check balance\n` +
                `/daily - Daily reward (24h)\n` +
                `/work - Work at your job\n` +
                `/deposit - Bank deposit\n` +
                `/withdraw - Bank withdrawal\n\n` +
                `🛒 <b>Shopping</b>\n` +
                `/shop - Browse items\n` +
                `/buy - Purchase item\n` +
                `/inventory - Your items\n\n` +
                `💼 <b>Jobs & Crime</b>\n` +
                `/jobs - View jobs\n` +
                `/apply - Apply for job\n` +
                `/crime - Commit crime\n` +
                `/rob - Rob users\n\n` +
                `🎮 <b>Games</b>\n` +
                `/gamble - Bet money\n` +
                `/slots - Slot machine\n` +
                `/minigames - Play games\n\n` +
                `📊 <b>Stats</b>\n` +
                `/rank - Your rank\n` +
                `/leaderboard - Top users`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "🎮 Play Mini Games", url: `https://t.me/${botId}?start=games` }]
                    ]
                  }
                }
              );
              break;

            default:
              await sendMessage("❌ Unknown command! Use /help to see all commands");
          }

          // Track command usage
          const stats = await storage.getBotStats(botId);
          if (stats) {
            await storage.updateBotStats(botId, { 
              totalCommands: (stats.totalCommands || 0) + 1 
            });
          }
        } else if (chat.type !== "private") {
          // XP from group messages
          let user = await storage.getUserEconomy(botId, userId);
          if (user) {
            const xpGain = Math.floor(Math.random() * 5) + 1;
            const newXP = (user.xp || 0) + xpGain;
            const currentLevel = user.level || 1;
            const newLevel = Math.floor(newXP / 100) + 1;
            
            if (newLevel > currentLevel) {
              await storage.updateUserEconomy(botId, userId, { 
                xp: newXP, 
                level: newLevel,
                totalMessages: (user.totalMessages || 0) + 1 
              });
              
              await fetch(`https://api.telegram.org/bot${bot.telegramToken}/sendAnimation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  animation: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
                  caption: `🎉 <b>LEVEL UP!</b>\n\n${username} reached Level ${newLevel}!\n✨ Keep chatting to level up!`,
                  parse_mode: "HTML"
                }),
              });
            } else {
              await storage.updateUserEconomy(botId, userId, { 
                xp: newXP,
                totalMessages: (user.totalMessages || 0) + 1 
              });
            }
          }
        }
      }

      res.json({ ok: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mini Games Routes
  app.get("/api/minigames/:gameType/session", async (req, res) => {
    try {
      const { gameType } = req.params;
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const session = await storage.getGameSession(userId as string, gameType);
      res.json(session || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
