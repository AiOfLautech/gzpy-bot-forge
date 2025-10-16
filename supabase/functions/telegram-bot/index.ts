import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string; title?: string };
    from: { id: number; username?: string; first_name: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string; first_name: string };
    message: { chat: { id: number } };
    data: string;
  };
}

const SHOP_ITEMS: Record<string, { name: string; price: number; description: string }> = {
  lockpick: { name: "🔓 Lockpick", price: 5000, description: "Increases crime success rate" },
  gun: { name: "🔫 Gun", price: 25000, description: "Required for robbery" },
  car: { name: "🚗 Car", price: 100000, description: "Faster getaway, better crime success" },
  mansion: { name: "🏰 Mansion", price: 1000000, description: "+10% all earnings" },
  yacht: { name: "🛥️ Yacht", price: 5000000, description: "+20% all earnings" },
  jet: { name: "✈️ Private Jet", price: 25000000, description: "+50% all earnings" },
};

const JOBS: Record<string, { name: string; salary: number }> = {
  none: { name: "Unemployed", salary: 0 },
  janitor: { name: "🧹 Janitor", salary: 200 },
  cashier: { name: "💵 Cashier", salary: 500 },
  teacher: { name: "👨‍🏫 Teacher", salary: 1000 },
  engineer: { name: "👷 Engineer", salary: 2500 },
  doctor: { name: "👨‍⚕️ Doctor", salary: 5000 },
  lawyer: { name: "⚖️ Lawyer", salary: 10000 },
  ceo: { name: "💼 CEO", salary: 25000 },
};

const CRIMES = [
  { name: "🏪 Rob a Store", minReward: 1000, maxReward: 5000, successRate: 0.6, requiredItem: null },
  { name: "🏦 Rob a Bank", minReward: 10000, maxReward: 50000, successRate: 0.3, requiredItem: "gun" },
  { name: "💎 Steal Jewelry", minReward: 5000, maxReward: 25000, successRate: 0.4, requiredItem: "lockpick" },
  { name: "🚗 Grand Theft Auto", minReward: 15000, maxReward: 75000, successRate: 0.2, requiredItem: "car" },
];

const DEV_CHAT_IDS = new Set<number>();

const sendMessage = async (botToken: string, chatId: number, text: string, options: any = {}) => {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...options }),
  });
};

const sendAnimation = async (botToken: string, chatId: number, animationUrl: string, caption: string) => {
  const url = `https://api.telegram.org/bot${botToken}/sendAnimation`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, animation: animationUrl, caption, parse_mode: "HTML" }),
  });
};

const createInlineKeyboard = (buttons: { text: string; url?: string; callback_data?: string }[][]) => ({
  inline_keyboard: buttons,
});

const createProgressBar = (current: number, max: number, length: number = 10) => {
  const filled = Math.floor((current / max) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
};

const verifyChannelMembership = async (botToken: string, chatId: number, channelUsername: string): Promise<boolean> => {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember`;
    const response = await fetch(`${url}?chat_id=@${channelUsername.replace("@", "")}&user_id=${chatId}`);
    const data = await response.json();
    return data.ok && ["member", "administrator", "creator"].includes(data.result.status);
  } catch {
    return false;
  }
};

const getUserEconomy = async (supabase: any, botId: string, userId: string) => {
  const { data } = await supabase
    .from("user_economy")
    .select("*")
    .eq("bot_id", botId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    const { data: newUser } = await supabase
      .from("user_economy")
      .insert({ bot_id: botId, user_id: userId, balance: 1000, bank: 0, xp: 0, level: 1, inventory: {} })
      .select()
      .single();
    return newUser;
  }
  return data;
};

const updateUserEconomy = async (supabase: any, botId: string, userId: string, updates: any) => {
  await supabase.from("user_economy").update(updates).eq("bot_id", botId).eq("user_id", userId);
};

const handleCommands = async (supabase: any, botToken: string, botId: string, chatId: number, userId: string, username: string, command: string, args: string[], isGroup: boolean) => {
  const user = await getUserEconomy(supabase, botId, userId);
  const now = Date.now();

  // ECONOMY COMMANDS
  switch (command) {
    case "balance":
    case "bal":
      const balanceBar = createProgressBar(user.balance, 100000);
      await sendMessage(botToken, chatId, 
        `💰 <b>${username}'s Balance</b>\n\n` +
        `💵 Wallet: $${user.balance.toLocaleString()}\n` +
        `🏦 Bank: $${user.bank.toLocaleString()}\n` +
        `💎 Net Worth: $${(user.balance + user.bank).toLocaleString()}\n\n` +
        `⭐ Level: ${user.level}\n` +
        `✨ XP: ${user.xp}/${user.level * 100}\n` +
        `${createProgressBar(user.xp, user.level * 100, 15)}\n\n` +
        `💼 Job: ${JOBS[user.job || 'none'].name}`,
        { reply_markup: createInlineKeyboard([[
          { text: "💸 Deposit", callback_data: `deposit_${userId}` },
          { text: "💰 Withdraw", callback_data: `withdraw_${userId}` }
        ]])}
      );
      break;

    case "daily":
      const lastDaily = user.last_daily ? new Date(user.last_daily).getTime() : 0;
      if (now - lastDaily < 86400000) {
        const timeLeft = 86400000 - (now - lastDaily);
        const hours = Math.floor(timeLeft / 3600000);
        await sendMessage(botToken, chatId, `⏰ Daily reward available in ${hours}h`);
      } else {
        const reward = 1000 + (user.level * 200);
        await updateUserEconomy(supabase, botId, userId, { balance: user.balance + reward, last_daily: new Date().toISOString() });
        await sendMessage(botToken, chatId, 
          `🎁 <b>Daily Reward Claimed!</b>\n\n` +
          `💰 +$${reward.toLocaleString()}\n` +
          `🔥 Streak: Day 1\n\n` +
          `Come back tomorrow for more!`
        );
      }
      break;

    case "work":
      const lastWork = user.last_work ? new Date(user.last_work).getTime() : 0;
      if (now - lastWork < 3600000) {
        await sendMessage(botToken, chatId, `⏳ You're tired! Rest for ${Math.ceil((3600000 - (now - lastWork)) / 60000)} minutes`);
      } else {
        const baseEarnings = Math.floor(Math.random() * 500) + 200;
        const jobBonus = JOBS[user.job || 'none'].salary;
        const total = baseEarnings + jobBonus + (user.level * 50);
        await updateUserEconomy(supabase, botId, userId, { 
          balance: user.balance + total, 
          last_work: new Date().toISOString(), 
          xp: user.xp + 10 
        });
        await sendMessage(botToken, chatId, 
          `💼 <b>Work Complete!</b>\n\n` +
          `💵 Base Pay: $${baseEarnings.toLocaleString()}\n` +
          `💼 Job Bonus: $${jobBonus.toLocaleString()}\n` +
          `⭐ Level Bonus: $${(user.level * 50).toLocaleString()}\n\n` +
          `💰 Total Earned: $${total.toLocaleString()}\n` +
          `✨ +10 XP`,
          { reply_markup: createInlineKeyboard([[{ text: "🎮 Play Mini Game", url: `https://t.me/${botId}?start=game_work` }]])}
        );
      }
      break;

    case "deposit":
    case "dep":
      const depAmount = args[0] === "all" ? user.balance : parseInt(args[0]);
      if (!depAmount || depAmount <= 0 || depAmount > user.balance) {
        await sendMessage(botToken, chatId, "❌ Invalid amount! Usage: /deposit <amount> or /deposit all");
      } else {
        await updateUserEconomy(supabase, botId, userId, { balance: user.balance - depAmount, bank: user.bank + depAmount });
        await sendMessage(botToken, chatId, 
          `🏦 <b>Deposit Successful!</b>\n\n` +
          `💰 Deposited: $${depAmount.toLocaleString()}\n` +
          `🏦 Bank Balance: $${(user.bank + depAmount).toLocaleString()}`
        );
      }
      break;

    case "withdraw":
    case "with":
      const withAmount = args[0] === "all" ? user.bank : parseInt(args[0]);
      if (!withAmount || withAmount <= 0 || withAmount > user.bank) {
        await sendMessage(botToken, chatId, "❌ Invalid amount! Usage: /withdraw <amount> or /withdraw all");
      } else {
        await updateUserEconomy(supabase, botId, userId, { balance: user.balance + withAmount, bank: user.bank - withAmount });
        await sendMessage(botToken, chatId, 
          `💵 <b>Withdrawal Successful!</b>\n\n` +
          `💰 Withdrawn: $${withAmount.toLocaleString()}\n` +
          `💵 Wallet: $${(user.balance + withAmount).toLocaleString()}`
        );
      }
      break;

    case "shop":
      let shopText = `🛒 <b>Item Shop</b>\n\n`;
      Object.entries(SHOP_ITEMS).forEach(([key, item]) => {
        const owned = user.inventory[key] || 0;
        shopText += `${item.name}\n💰 Price: $${item.price.toLocaleString()}\n📦 Owned: ${owned}\n💡 ${item.description}\n\n`;
      });
      await sendMessage(botToken, chatId, shopText + `\nUse /buy <item> to purchase`, {
        reply_markup: createInlineKeyboard([
          [{ text: "🔓 Buy Lockpick", callback_data: "buy_lockpick" }],
          [{ text: "🔫 Buy Gun", callback_data: "buy_gun" }],
          [{ text: "🚗 Buy Car", callback_data: "buy_car" }]
        ])
      });
      break;

    case "buy":
      const itemKey = args[0]?.toLowerCase();
      const item = SHOP_ITEMS[itemKey];
      if (!item) {
        await sendMessage(botToken, chatId, "❌ Item not found! Use /shop to see available items");
      } else if (user.balance < item.price) {
        await sendMessage(botToken, chatId, `❌ Not enough money! You need $${item.price.toLocaleString()}`);
      } else {
        const newInventory = { ...user.inventory, [itemKey]: (user.inventory[itemKey] || 0) + 1 };
        await updateUserEconomy(supabase, botId, userId, { 
          balance: user.balance - item.price, 
          inventory: newInventory 
        });
        await sendMessage(botToken, chatId, 
          `✅ <b>Purchase Successful!</b>\n\n` +
          `${item.name} purchased for $${item.price.toLocaleString()}\n` +
          `📦 You now own ${newInventory[itemKey]}`
        );
      }
      break;

    case "crime":
      const lastCrime = user.last_crime ? new Date(user.last_crime).getTime() : 0;
      if (now - lastCrime < 1800000) {
        await sendMessage(botToken, chatId, `⏰ Cooldown! Wait ${Math.ceil((1800000 - (now - lastCrime)) / 60000)} minutes`);
      } else {
        const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
        if (crime.requiredItem && !user.inventory[crime.requiredItem]) {
          await sendMessage(botToken, chatId, 
            `❌ You need ${SHOP_ITEMS[crime.requiredItem].name} to commit this crime!\n` +
            `Use /shop to buy it`
          );
        } else {
          const success = Math.random() < crime.successRate;
          if (success) {
            const reward = Math.floor(Math.random() * (crime.maxReward - crime.minReward)) + crime.minReward;
            await updateUserEconomy(supabase, botId, userId, { 
              balance: user.balance + reward, 
              last_crime: new Date().toISOString(),
              xp: user.xp + 15
            });
            await sendMessage(botToken, chatId, 
              `✅ <b>Crime Success!</b>\n\n` +
              `${crime.name}\n` +
              `💰 Stole: $${reward.toLocaleString()}\n` +
              `✨ +15 XP`
            );
          } else {
            const fine = Math.floor(user.balance * 0.2);
            await updateUserEconomy(supabase, botId, userId, { 
              balance: user.balance - fine, 
              last_crime: new Date().toISOString() 
            });
            await sendMessage(botToken, chatId, 
              `❌ <b>Caught!</b>\n\n` +
              `${crime.name} failed!\n` +
              `💸 Fine: $${fine.toLocaleString()}`
            );
          }
        }
      }
      break;

    case "rob":
      if (!args[0]) {
        await sendMessage(botToken, chatId, "❌ Usage: /rob @username");
      } else if (!user.inventory.gun) {
        await sendMessage(botToken, chatId, "❌ You need a 🔫 Gun to rob! Buy one from /shop");
      } else {
        const lastRob = user.last_rob ? new Date(user.last_rob).getTime() : 0;
        if (now - lastRob < 7200000) {
          await sendMessage(botToken, chatId, `⏰ Cooldown! Wait ${Math.ceil((7200000 - (now - lastRob)) / 60000)} minutes`);
        } else {
          const success = Math.random() < 0.5;
          if (success) {
            const stolen = Math.floor(user.balance * 0.3);
            await updateUserEconomy(supabase, botId, userId, { 
              balance: user.balance + stolen, 
              last_rob: new Date().toISOString(),
              xp: user.xp + 20
            });
            await sendMessage(botToken, chatId, 
              `🔫 <b>Robbery Success!</b>\n\n` +
              `You robbed ${args[0]}\n` +
              `💰 Stolen: $${stolen.toLocaleString()}\n` +
              `✨ +20 XP`
            );
          } else {
            const fine = Math.floor(user.balance * 0.3);
            await updateUserEconomy(supabase, botId, userId, { 
              balance: user.balance - fine, 
              last_rob: new Date().toISOString() 
            });
            await sendMessage(botToken, chatId, `❌ Robbery failed! Fine: $${fine.toLocaleString()}`);
          }
        }
      }
      break;

    case "jobs":
      let jobsText = `💼 <b>Available Jobs</b>\n\n`;
      Object.entries(JOBS).forEach(([key, job]) => {
        if (key !== 'none') {
          jobsText += `${job.name}\n💰 Salary: $${job.salary.toLocaleString()}/work\n\n`;
        }
      });
      await sendMessage(botToken, chatId, jobsText + `Use /apply <job> to apply`, {
        reply_markup: createInlineKeyboard([
          [{ text: "Apply as Janitor", callback_data: "apply_janitor" }],
          [{ text: "Apply as Cashier", callback_data: "apply_cashier" }],
          [{ text: "Apply as Teacher", callback_data: "apply_teacher" }]
        ])
      });
      break;

    case "apply":
      const jobKey = args[0]?.toLowerCase();
      if (JOBS[jobKey]) {
        await updateUserEconomy(supabase, botId, userId, { job: jobKey });
        await sendMessage(botToken, chatId, 
          `✅ <b>Job Application Accepted!</b>\n\n` +
          `${JOBS[jobKey].name}\n` +
          `💰 Salary: $${JOBS[jobKey].salary.toLocaleString()}/work\n\n` +
          `Start working with /work!`
        );
      } else {
        await sendMessage(botToken, chatId, "❌ Invalid job! Use /jobs to see available positions");
      }
      break;

    case "inventory":
    case "inv":
      let invText = `🎒 <b>${username}'s Inventory</b>\n\n`;
      let hasItems = false;
      Object.entries(user.inventory).forEach(([key, count]) => {
        const itemCount = Number(count);
        if (itemCount > 0) {
          hasItems = true;
          invText += `${SHOP_ITEMS[key]?.name || key}: ${itemCount}\n`;
        }
      });
      await sendMessage(botToken, chatId, hasItems ? invText : "🎒 Your inventory is empty! Visit /shop");
      break;

    case "leaderboard":
    case "lb":
      const { data: topUsers } = await supabase
        .from("user_economy")
        .select("*")
        .eq("bot_id", botId)
        .order("balance", { ascending: false })
        .limit(10);
      
      let lbText = `🏆 <b>Top 10 Richest Users</b>\n\n`;
      topUsers?.forEach((u: any, idx: number) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
        lbText += `${medal} User ${u.user_id.slice(0, 8)}...\n💰 $${u.balance.toLocaleString()}\n\n`;
      });
      await sendMessage(botToken, chatId, lbText);
      break;

    case "gamble":
    case "bet":
      const betAmount = parseInt(args[0]);
      if (!betAmount || betAmount <= 0 || betAmount > user.balance) {
        await sendMessage(botToken, chatId, "❌ Invalid bet! Usage: /gamble <amount>");
      } else {
        const win = Math.random() < 0.45;
        const newBalance = win ? user.balance + betAmount : user.balance - betAmount;
        await updateUserEconomy(supabase, botId, userId, { balance: newBalance });
        await sendMessage(botToken, chatId, 
          win 
            ? `🎰 <b>YOU WIN!</b>\n\n💰 +$${betAmount.toLocaleString()}\n💵 New Balance: $${newBalance.toLocaleString()}`
            : `🎰 <b>YOU LOSE!</b>\n\n💸 -$${betAmount.toLocaleString()}\n💵 Balance: $${newBalance.toLocaleString()}`
        );
      }
      break;

    case "slots":
      const slotBet = parseInt(args[0]) || 100;
      if (slotBet > user.balance) {
        await sendMessage(botToken, chatId, "❌ Insufficient balance!");
      } else {
        const symbols = ["🍒", "🍋", "🍊", "🍇", "💎"];
        const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
        const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
        const slot3 = symbols[Math.floor(Math.random() * symbols.length)];
        
        const multiplier = slot1 === slot2 && slot2 === slot3 ? 10 : slot1 === slot2 || slot2 === slot3 ? 2 : 0;
        const winnings = multiplier * slotBet;
        const newBalance = user.balance - slotBet + winnings;
        
        await updateUserEconomy(supabase, botId, userId, { balance: newBalance });
        await sendMessage(botToken, chatId, 
          `🎰 <b>SLOT MACHINE</b>\n\n` +
          `[ ${slot1} | ${slot2} | ${slot3} ]\n\n` +
          (multiplier > 0 
            ? `🎉 WIN! x${multiplier}\n💰 +$${winnings.toLocaleString()}`
            : `❌ Lost $${slotBet.toLocaleString()}`)
        );
      }
      break;

    case "minigames":
      await sendMessage(botToken, chatId, 
        `🎮 <b>Mini Games</b>\n\n` +
        `Play games and earn coins!\n\n` +
        `🚗 Racing Game - Drive and avoid obstacles\n` +
        `🎯 Target Shooter - Hit targets for points\n` +
        `🧩 Puzzle Quest - Solve puzzles\n` +
        `⚔️ Battle Arena - Fight opponents\n` +
        `🏃 Endless Runner - Run and collect coins`,
        { reply_markup: createInlineKeyboard([
          [{ text: "🚗 Play Racing", url: `https://t.me/${botId}?start=game_racing` }],
          [{ text: "🎯 Play Shooter", url: `https://t.me/${botId}?start=game_shooter` }],
          [{ text: "🧩 Play Puzzle", url: `https://t.me/${botId}?start=game_puzzle` }]
        ])}
      );
      break;

    case "rank":
      const xpNeeded = (user.level * 100) - user.xp;
      await sendMessage(botToken, chatId, 
        `⭐ <b>${username}'s Rank</b>\n\n` +
        `Level: ${user.level}\n` +
        `XP: ${user.xp}/${user.level * 100}\n` +
        `${createProgressBar(user.xp, user.level * 100, 20)}\n\n` +
        `💬 Messages: ${user.total_messages || 0}\n` +
        `✨ XP to Next Level: ${xpNeeded}`
      );
      break;

    case "transfer":
    case "pay":
      if (!args[0] || !args[1]) {
        await sendMessage(botToken, chatId, "❌ Usage: /transfer @user <amount>");
      } else {
        const transferAmount = parseInt(args[1]);
        if (transferAmount <= 0 || transferAmount > user.balance) {
          await sendMessage(botToken, chatId, "❌ Invalid amount!");
        } else {
          await updateUserEconomy(supabase, botId, userId, { balance: user.balance - transferAmount });
          await sendMessage(botToken, chatId, 
            `✅ <b>Transfer Successful!</b>\n\n` +
            `💸 Sent $${transferAmount.toLocaleString()} to ${args[0]}`
          );
        }
      }
      break;

    case "help":
      await sendMessage(botToken, chatId, 
        `📋 <b>Command Categories</b>\n\n` +
        `💰 Economy: /balance /daily /work /shop /buy /crime /rob /jobs /apply\n\n` +
        `🎮 Games: /gamble /slots /minigames\n\n` +
        `📊 Stats: /rank /inventory /leaderboard\n\n` +
        `💸 Money: /deposit /withdraw /transfer\n\n` +
        `👥 Group: /welcome /tagall /rules\n\n` +
        `Use /help <category> for detailed commands`,
        { reply_markup: createInlineKeyboard([
          [{ text: "💰 Economy", callback_data: "help_economy" }],
          [{ text: "🎮 Games", callback_data: "help_games" }],
          [{ text: "👥 Admin", callback_data: "help_admin" }]
        ])}
      );
      break;

    default:
      await sendMessage(botToken, chatId, "❌ Unknown command! Use /help to see all commands");
  }
  
  // Track XP from messages in groups
  if (isGroup) {
    const xpGain = Math.floor(Math.random() * 5) + 1;
    const newXP = user.xp + xpGain;
    const newLevel = Math.floor(newXP / 100) + 1;
    
    if (newLevel > user.level) {
      await updateUserEconomy(supabase, botId, userId, { xp: newXP, level: newLevel, total_messages: (user.total_messages || 0) + 1 });
      await sendAnimation(botToken, chatId, "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
        `🎉 <b>LEVEL UP!</b>\n\n${username} reached Level ${newLevel}!\n✨ Keep chatting to level up more!`
      );
    } else {
      await updateUserEconomy(supabase, botId, userId, { xp: newXP, total_messages: (user.total_messages || 0) + 1 });
    }
  }
};

// Register bot commands with Telegram
const registerBotCommands = async (botToken: string) => {
  const commands = [
    { command: "start", description: "Start the bot" },
    { command: "help", description: "Show all commands" },
    { command: "balance", description: "Check your balance" },
    { command: "daily", description: "Claim daily rewards" },
    { command: "work", description: "Work at your job" },
    { command: "deposit", description: "Deposit money to bank" },
    { command: "withdraw", description: "Withdraw from bank" },
    { command: "shop", description: "Browse the shop" },
    { command: "buy", description: "Buy an item" },
    { command: "crime", description: "Commit crimes for money" },
    { command: "rob", description: "Rob other users" },
    { command: "jobs", description: "View available jobs" },
    { command: "apply", description: "Apply for a job" },
    { command: "inventory", description: "View your items" },
    { command: "leaderboard", description: "View richest users" },
    { command: "gamble", description: "Gamble your money" },
    { command: "slots", description: "Play slot machine" },
    { command: "minigames", description: "View all mini-games" },
    { command: "rank", description: "Check your rank and XP" },
    { command: "transfer", description: "Send money to others" },
  ];

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });
    const result = await response.json();
    console.log('Commands registered:', result);
    return result;
  } catch (error) {
    console.error('Error registering commands:', error);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const url = new URL(req.url);
    const botId = url.searchParams.get("bot_id");

    if (!botId) {
      return new Response(JSON.stringify({ error: "Missing bot_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: bot } = await supabase.from("bots").select("*").eq("id", botId).eq("is_active", true).single();
    if (!bot) {
      return new Response(JSON.stringify({ error: "Bot not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const update: TelegramUpdate = await req.json();

    if (update.message) {
      const { chat, from, text } = update.message;
      
      if (bot.channel_username && text !== "/start") {
        const isMember = await verifyChannelMembership(bot.telegram_token, from.id, bot.channel_username);
        if (!isMember) {
          await sendMessage(bot.telegram_token, chat.id, `⚠️ Join ${bot.channel_username} to use this bot!`, {
            reply_markup: { inline_keyboard: [[{ text: "Join Channel", url: `https://t.me/${bot.channel_username.replace("@", "")}` }]] }
          });
          return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      if (text?.startsWith("/")) {
        const [command, ...args] = text.slice(1).toLowerCase().split(" ");
        
        if (command === "start") {
          // Register commands on first start
          await registerBotCommands(bot.telegram_token);
          
          let welcomeText = bot.welcome_message || "Welcome! 🎉";
          welcomeText += "\n\n📋 <b>Commands:</b>\n/balance - Check balance\n/daily - Daily reward\n/work - Work for money\n/help - Show all commands";
          
          if (bot.bot_image_url) {
            await fetch(`https://api.telegram.org/bot${bot.telegram_token}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chat.id, photo: bot.bot_image_url, caption: welcomeText, parse_mode: "HTML" }),
            });
          } else {
            await sendMessage(bot.telegram_token, chat.id, welcomeText);
          }
        } else {
          await handleCommands(supabase, bot.telegram_token, bot.id, chat.id, from.id.toString(), from.first_name, command, args, chat.type !== "private");
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
