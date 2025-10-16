import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBotSchema, insertUserEconomySchema, insertBotStatsSchema } from "@shared/schema";

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

            case "work":
              const lastWork = user.lastWork ? new Date(user.lastWork).getTime() : 0;
              if (now - lastWork < 3600000) {
                const minutesLeft = Math.ceil((3600000 - (now - lastWork)) / 60000);
                await sendMessage(`⏳ <b>You're Tired!</b>\n\nRest for ${minutesLeft} minutes before working again.`);
              } else {
                const baseEarnings = Math.floor(Math.random() * 500) + 200;
                const jobBonus = JOBS[user.job || 'none'].salary;
                const levelBonus = (user.level || 1) * 50;
                const total = baseEarnings + jobBonus + levelBonus;
                const newBalance = parseFloat(user.balance || "0") + total;
                
                await storage.updateUserEconomy(botId, userId, { 
                  balance: newBalance.toString(), 
                  lastWork: new Date().toISOString(),
                  xp: (user.xp || 0) + 10
                });
                
                await sendMessage(
                  `💼 <b>Work Complete!</b>\n\n` +
                  `💵 Base Pay: ${formatMoney(baseEarnings)}\n` +
                  `💼 Job Bonus: ${formatMoney(jobBonus)}\n` +
                  `⭐ Level Bonus: ${formatMoney(levelBonus)}\n\n` +
                  `💰 Total Earned: ${formatMoney(total)}\n` +
                  `✨ +10 XP`
                );
              }
              break;

            case "deposit":
            case "dep":
              const depAmount = args[0] === "all" ? parseFloat(user.balance || "0") : parseFloat(args[0]);
              const userBalance = parseFloat(user.balance || "0");
              
              if (!depAmount || depAmount <= 0 || depAmount > userBalance) {
                await sendMessage("❌ <b>Invalid Amount!</b>\n\nUsage: /deposit <amount> or /deposit all");
              } else {
                const newBank = parseFloat(user.bank || "0") + depAmount;
                await storage.updateUserEconomy(botId, userId, { 
                  balance: (userBalance - depAmount).toString(), 
                  bank: newBank.toString() 
                });
                await sendMessage(
                  `🏦 <b>Deposit Successful!</b>\n\n` +
                  `💰 Deposited: ${formatMoney(depAmount)}\n` +
                  `🏦 Bank Balance: ${formatMoney(newBank)}`
                );
              }
              break;

            case "withdraw":
            case "with":
              const withAmount = args[0] === "all" ? parseFloat(user.bank || "0") : parseFloat(args[0]);
              const userBank = parseFloat(user.bank || "0");
              
              if (!withAmount || withAmount <= 0 || withAmount > userBank) {
                await sendMessage("❌ <b>Invalid Amount!</b>\n\nUsage: /withdraw <amount> or /withdraw all");
              } else {
                const newBalance = parseFloat(user.balance || "0") + withAmount;
                await storage.updateUserEconomy(botId, userId, { 
                  balance: newBalance.toString(), 
                  bank: (userBank - withAmount).toString() 
                });
                await sendMessage(
                  `💵 <b>Withdrawal Successful!</b>\n\n` +
                  `💰 Withdrawn: ${formatMoney(withAmount)}\n` +
                  `💵 Wallet: ${formatMoney(newBalance)}`
                );
              }
              break;

            case "shop":
              let shopText = `🛒 <b>Item Shop</b>\n\n`;
              const inventory = (user.inventory as Record<string, number>) || {};
              Object.entries(SHOP_ITEMS).forEach(([key, item]) => {
                const owned = inventory[key] || 0;
                shopText += `${item.name}\n💰 ${formatMoney(item.price)}\n📦 Owned: ${owned}\n💡 ${item.description}\n\n`;
              });
              await sendMessage(shopText + `\nUse /buy <item> to purchase`);
              break;

            case "buy":
              const itemKey = args[0]?.toLowerCase();
              const item = SHOP_ITEMS[itemKey];
              const currentBalance = parseFloat(user.balance || "0");
              
              if (!item) {
                await sendMessage("❌ <b>Item Not Found!</b>\n\nUse /shop to see available items");
              } else if (currentBalance < item.price) {
                await sendMessage(`❌ <b>Not Enough Money!</b>\n\nYou need ${formatMoney(item.price)}`);
              } else {
                const currentInventory = (user.inventory as Record<string, number>) || {};
                const newInventory = { ...currentInventory, [itemKey]: (currentInventory[itemKey] || 0) + 1 };
                await storage.updateUserEconomy(botId, userId, { 
                  balance: (currentBalance - item.price).toString(), 
                  inventory: newInventory 
                });
                await sendMessage(
                  `✅ <b>Purchase Successful!</b>\n\n` +
                  `${item.name} purchased for ${formatMoney(item.price)}\n` +
                  `📦 You now own ${newInventory[itemKey]}`
                );
              }
              break;

            case "inventory":
            case "inv":
              let invText = `🎒 <b>${username}'s Inventory</b>\n\n`;
              const userInventory = (user.inventory as Record<string, number>) || {};
              let hasItems = false;
              Object.entries(userInventory).forEach(([key, count]) => {
                if (count > 0) {
                  hasItems = true;
                  const itemName = SHOP_ITEMS[key]?.name || key;
                  invText += `${itemName}: ${count}\n`;
                }
              });
              await sendMessage(hasItems ? invText : "🎒 <b>Empty Inventory!</b>\n\nVisit /shop to buy items");
              break;

            case "crime":
              const lastCrime = user.lastCrime ? new Date(user.lastCrime).getTime() : 0;
              if (now - lastCrime < 1800000) {
                const minsLeft = Math.ceil((1800000 - (now - lastCrime)) / 60000);
                await sendMessage(`⏰ <b>Cooldown!</b>\n\nWait ${minsLeft} minutes before committing another crime`);
              } else {
                const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
                const userInv = (user.inventory as Record<string, number>) || {};
                
                if (crime.requiredItem && !userInv[crime.requiredItem]) {
                  await sendMessage(
                    `❌ <b>Missing Item!</b>\n\n` +
                    `You need ${SHOP_ITEMS[crime.requiredItem].name} for this crime!\n` +
                    `Use /shop to buy it`
                  );
                } else {
                  const success = Math.random() < crime.successRate;
                  const crimeBalance = parseFloat(user.balance || "0");
                  
                  if (success) {
                    const reward = Math.floor(Math.random() * (crime.maxReward - crime.minReward)) + crime.minReward;
                    await storage.updateUserEconomy(botId, userId, { 
                      balance: (crimeBalance + reward).toString(), 
                      lastCrime: new Date().toISOString(),
                      xp: (user.xp || 0) + 15
                    });
                    await sendMessage(
                      `✅ <b>Crime Success!</b>\n\n` +
                      `${crime.name}\n` +
                      `💰 Stole: ${formatMoney(reward)}\n` +
                      `✨ +15 XP`
                    );
                  } else {
                    const fine = Math.floor(crimeBalance * crime.fine);
                    await storage.updateUserEconomy(botId, userId, { 
                      balance: (crimeBalance - fine).toString(), 
                      lastCrime: new Date().toISOString() 
                    });
                    await sendMessage(
                      `❌ <b>Caught!</b>\n\n` +
                      `${crime.name} failed!\n` +
                      `💸 Fine: ${formatMoney(fine)}`
                    );
                  }
                }
              }
              break;

            case "rob":
              if (!args[0]) {
                await sendMessage("❌ <b>Invalid Usage!</b>\n\nUsage: /rob @username");
              } else {
                const robInventory = (user.inventory as Record<string, number>) || {};
                if (!robInventory.gun) {
                  await sendMessage("❌ <b>No Gun!</b>\n\nYou need a 🔫 Gun to rob! Buy one from /shop");
                } else {
                  const lastRob = user.lastRob ? new Date(user.lastRob).getTime() : 0;
                  if (now - lastRob < 7200000) {
                    const hoursLeft = Math.ceil((7200000 - (now - lastRob)) / 3600000);
                    await sendMessage(`⏰ <b>Cooldown!</b>\n\nWait ${hoursLeft}h before robbing again`);
                  } else {
                    const success = Math.random() < 0.5;
                    const robBalance = parseFloat(user.balance || "0");
                    
                    if (success) {
                      const stolen = Math.floor(robBalance * 0.3);
                      await storage.updateUserEconomy(botId, userId, { 
                        balance: (robBalance + stolen).toString(), 
                        lastRob: new Date().toISOString(),
                        xp: (user.xp || 0) + 20
                      });
                      await sendMessage(
                        `🔫 <b>Robbery Success!</b>\n\n` +
                        `You robbed ${args[0]}\n` +
                        `💰 Stolen: ${formatMoney(stolen)}\n` +
                        `✨ +20 XP`
                      );
                    } else {
                      const fine = Math.floor(robBalance * 0.3);
                      await storage.updateUserEconomy(botId, userId, { 
                        balance: (robBalance - fine).toString(), 
                        lastRob: new Date().toISOString() 
                      });
                      await sendMessage(`❌ <b>Robbery Failed!</b>\n\n💸 Fine: ${formatMoney(fine)}`);
                    }
                  }
                }
              }
              break;

            case "jobs":
              let jobsText = `💼 <b>Available Jobs</b>\n\n`;
              Object.entries(JOBS).forEach(([key, job]) => {
                if (key !== 'none') {
                  jobsText += `${job.name}\n💰 Salary: ${formatMoney(job.salary)}/work\n📊 Level: ${job.requirement}\n\n`;
                }
              });
              await sendMessage(jobsText + `Use /apply <job> to apply`);
              break;

            case "apply":
              const jobKey = args[0]?.toLowerCase();
              const job = JOBS[jobKey];
              
              if (!job || jobKey === 'none') {
                await sendMessage("❌ <b>Invalid Job!</b>\n\nUse /jobs to see available positions");
              } else if ((user.level || 1) < job.requirement) {
                await sendMessage(`❌ <b>Level Too Low!</b>\n\nYou need level ${job.requirement} for this job`);
              } else {
                await storage.updateUserEconomy(botId, userId, { job: jobKey });
                await sendMessage(
                  `✅ <b>Application Accepted!</b>\n\n` +
                  `${job.name}\n` +
                  `💰 Salary: ${formatMoney(job.salary)}/work\n\n` +
                  `Start working with /work!`
                );
              }
              break;

            case "leaderboard":
            case "lb":
              const topUsers = await storage.getTopUsersByBalance(botId, 10);
              let lbText = `🏆 <b>Top 10 Richest Users</b>\n\n`;
              topUsers.forEach((u, idx) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
                lbText += `${medal} User ${u.userId.slice(0, 8)}...\n💰 ${formatMoney(parseFloat(u.balance || "0"))}\n\n`;
              });
              await sendMessage(lbText);
              break;

            case "gamble":
            case "bet":
              const betAmount = parseFloat(args[0]);
              const gambleBalance = parseFloat(user.balance || "0");
              
              if (!betAmount || betAmount <= 0 || betAmount > gambleBalance) {
                await sendMessage("❌ <b>Invalid Bet!</b>\n\nUsage: /gamble <amount>");
              } else {
                const win = Math.random() < 0.45;
                const newBalance = win ? gambleBalance + betAmount : gambleBalance - betAmount;
                await storage.updateUserEconomy(botId, userId, { balance: newBalance.toString() });
                await sendMessage(
                  win 
                    ? `🎰 <b>YOU WIN!</b>\n\n💰 +${formatMoney(betAmount)}\n💵 Balance: ${formatMoney(newBalance)}`
                    : `🎰 <b>YOU LOSE!</b>\n\n💸 -${formatMoney(betAmount)}\n💵 Balance: ${formatMoney(newBalance)}`
                );
              }
              break;

            case "slots":
              const slotBet = parseFloat(args[0]) || 100;
              const slotsBalance = parseFloat(user.balance || "0");
              
              if (slotBet > slotsBalance) {
                await sendMessage("❌ <b>Insufficient Balance!</b>");
              } else {
                const symbols = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"];
                const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
                const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
                const slot3 = symbols[Math.floor(Math.random() * symbols.length)];
                
                const multiplier = slot1 === slot2 && slot2 === slot3 ? 10 : slot1 === slot2 || slot2 === slot3 ? 2 : 0;
                const winnings = multiplier * slotBet;
                const newBalance = slotsBalance - slotBet + winnings;
                
                await storage.updateUserEconomy(botId, userId, { balance: newBalance.toString() });
                await sendMessage(
                  `🎰 <b>SLOT MACHINE</b>\n\n` +
                  `[ ${slot1} | ${slot2} | ${slot3} ]\n\n` +
                  (multiplier > 0 
                    ? `🎉 WIN! x${multiplier}\n💰 +${formatMoney(winnings)}`
                    : `❌ Lost ${formatMoney(slotBet)}`)
                );
              }
              break;

            case "rank":
              const rankXP = user.xp || 0;
              const rankLevel = user.level || 1;
              const xpNeededRank = (rankLevel * 100) - rankXP;
              await sendMessage(
                `⭐ <b>${username}'s Rank</b>\n\n` +
                `Level: ${rankLevel}\n` +
                `XP: ${rankXP}/${rankLevel * 100}\n` +
                `${createProgressBar(rankXP, rankLevel * 100, 20)}\n\n` +
                `💬 Messages: ${user.totalMessages || 0}\n` +
                `✨ XP to Next Level: ${xpNeededRank}`
              );
              break;

            case "transfer":
            case "pay":
              if (!args[0] || !args[1]) {
                await sendMessage("❌ <b>Invalid Usage!</b>\n\nUsage: /transfer @user <amount>");
              } else {
                const transferAmount = parseFloat(args[1]);
                const transferBalance = parseFloat(user.balance || "0");
                
                if (transferAmount <= 0 || transferAmount > transferBalance) {
                  await sendMessage("❌ <b>Invalid Amount!</b>");
                } else {
                  await storage.updateUserEconomy(botId, userId, { balance: (transferBalance - transferAmount).toString() });
                  await sendMessage(
                    `✅ <b>Transfer Successful!</b>\n\n` +
                    `💸 Sent ${formatMoney(transferAmount)} to ${args[0]}`
                  );
                }
              }
              break;

            case "minigames":
              await sendMessage(
                `🎮 <b>Mini Games</b>\n\n` +
                `Play games and earn coins!\n\n` +
                `🚗 Racing - Drive and avoid obstacles\n` +
                `🎯 Shooter - Hit targets for points\n` +
                `🧩 Puzzle - Solve puzzles\n` +
                `⚔️ Battle - Fight opponents\n` +
                `🏃 Runner - Collect coins`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "🚗 Play Racing", url: `https://${process.env.REPL_SLUG}.replit.app/game/racing?userId=${userId}&botId=${botId}` }],
                      [{ text: "🎯 Play Shooter", url: `https://${process.env.REPL_SLUG}.replit.app/game/shooter?userId=${userId}&botId=${botId}` }]
                    ]
                  }
                }
              );
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
                `/leaderboard - Top users\n` +
                `/transfer - Send money`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "🎮 Play Mini Games", url: `https://${process.env.REPL_SLUG}.replit.app/game/racing?userId=${userId}&botId=${botId}` }]
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

      // Handle callback queries (inline button clicks)
      if (update.callback_query) {
        const { from, message, data } = update.callback_query;
        const chatId = message.chat.id;
        const userId = from.id.toString();
        
        // Get user economy
        let user = await storage.getUserEconomy(botId, userId);
        if (!user) {
          user = await storage.createUserEconomy({ botId, userId, balance: "1000", bank: "0" });
        }

        const sendMessage = async (text: string, extra: any = {}) => {
          await fetch(`https://api.telegram.org/bot${bot.telegramToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
          });
        };

        // Answer callback query
        await fetch(`https://api.telegram.org/bot${bot.telegramToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: update.callback_query.id }),
        });

        // Handle button actions
        if (data === "deposit_prompt") {
          await sendMessage("💸 <b>Deposit Money</b>\n\nHow much would you like to deposit?\n\nUsage: /deposit <amount> or /deposit all");
        } else if (data === "withdraw_prompt") {
          await sendMessage("💰 <b>Withdraw Money</b>\n\nHow much would you like to withdraw?\n\nUsage: /withdraw <amount> or /withdraw all");
        } else if (data.startsWith("buy_")) {
          const itemKey = data.replace("buy_", "");
          const item = SHOP_ITEMS[itemKey];
          const balance = parseFloat(user.balance || "0");
          
          if (!item) {
            await sendMessage("❌ Item not found!");
          } else if (balance < item.price) {
            await sendMessage(`❌ Not enough money! You need ${formatMoney(item.price)}`);
          } else {
            const inventory = (user.inventory as Record<string, number>) || {};
            const newInventory = { ...inventory, [itemKey]: (inventory[itemKey] || 0) + 1 };
            await storage.updateUserEconomy(botId, userId, { 
              balance: (balance - item.price).toString(), 
              inventory: newInventory 
            });
            await sendMessage(
              `✅ <b>Purchase Successful!</b>\n\n` +
              `${item.name} purchased for ${formatMoney(item.price)}\n` +
              `📦 You now own ${newInventory[itemKey]}`
            );
          }
        } else if (data.startsWith("apply_")) {
          const jobKey = data.replace("apply_", "");
          const job = JOBS[jobKey];
          
          if (job && (user.level || 1) >= job.requirement) {
            await storage.updateUserEconomy(botId, userId, { job: jobKey });
            await sendMessage(
              `✅ <b>Job Application Accepted!</b>\n\n` +
              `${job.name}\n` +
              `💰 Salary: ${formatMoney(job.salary)}/work\n\n` +
              `Start earning with /work!`
            );
          } else if (job) {
            await sendMessage(`❌ You need level ${job.requirement} for this job!`);
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
