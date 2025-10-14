import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
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

interface UserEconomy {
  chatId: string;
  balance: number;
  bank: number;
  inventory: Record<string, number>;
  job?: string;
  lastRob?: string;
  lastCrime?: string;
  lastWork?: string;
}

// In-memory economy data (in production, use Supabase)
const economyData = new Map<string, UserEconomy>();

const getEconomy = (chatId: string): UserEconomy => {
  if (!economyData.has(chatId)) {
    economyData.set(chatId, {
      chatId,
      balance: 1000,
      bank: 0,
      inventory: {},
    });
  }
  return economyData.get(chatId)!;
};

const sendMessage = async (botToken: string, chatId: number, text: string, options: any = {}) => {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...options }),
  });
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

const handleEconomyCommand = async (
  botToken: string,
  chatId: number,
  userId: number,
  command: string,
  args: string[]
) => {
  const economy = getEconomy(userId.toString());
  const now = Date.now();

  switch (command) {
    case "balance":
    case "bal":
      await sendMessage(botToken, chatId, 
        `💰 Your Balance:\n\n` +
        `Wallet: $${economy.balance.toLocaleString()}\n` +
        `Bank: $${economy.bank.toLocaleString()}\n` +
        `Total: $${(economy.balance + economy.bank).toLocaleString()}`
      );
      break;

    case "daily":
      const dailyAmount = 500;
      economy.balance += dailyAmount;
      await sendMessage(botToken, chatId, 
        `🎁 Daily reward claimed!\n\n+$${dailyAmount.toLocaleString()}\n\nCome back tomorrow for more!`
      );
      break;

    case "deposit":
    case "dep":
      const depAmount = args[0] === "all" ? economy.balance : parseInt(args[0]) || 0;
      if (depAmount > economy.balance) {
        await sendMessage(botToken, chatId, "❌ Insufficient balance!");
      } else if (depAmount <= 0) {
        await sendMessage(botToken, chatId, "❌ Invalid amount!");
      } else {
        economy.balance -= depAmount;
        economy.bank += depAmount;
        await sendMessage(botToken, chatId, 
          `🏦 Deposited $${depAmount.toLocaleString()}\n\n` +
          `New bank balance: $${economy.bank.toLocaleString()}`
        );
      }
      break;

    case "withdraw":
    case "with":
      const withAmount = args[0] === "all" ? economy.bank : parseInt(args[0]) || 0;
      if (withAmount > economy.bank) {
        await sendMessage(botToken, chatId, "❌ Insufficient bank balance!");
      } else if (withAmount <= 0) {
        await sendMessage(botToken, chatId, "❌ Invalid amount!");
      } else {
        economy.bank -= withAmount;
        economy.balance += withAmount;
        await sendMessage(botToken, chatId, 
          `💸 Withdrew $${withAmount.toLocaleString()}\n\n` +
          `New wallet balance: $${economy.balance.toLocaleString()}`
        );
      }
      break;

    case "work":
      if (economy.lastWork && now - parseInt(economy.lastWork) < 3600000) {
        const timeLeft = Math.ceil((3600000 - (now - parseInt(economy.lastWork))) / 60000);
        await sendMessage(botToken, chatId, `⏳ You're tired! Come back in ${timeLeft} minutes.`);
      } else {
        const workAmount = Math.floor(Math.random() * 300) + 100;
        economy.balance += workAmount;
        economy.lastWork = now.toString();
        await sendMessage(botToken, chatId, 
          `💼 You worked hard and earned $${workAmount.toLocaleString()}!`
        );
      }
      break;

    case "rob":
      if (economy.lastRob && now - parseInt(economy.lastRob) < 7200000) {
        const timeLeft = Math.ceil((7200000 - (now - parseInt(economy.lastRob))) / 60000);
        await sendMessage(botToken, chatId, `⏳ Police are looking for you! Wait ${timeLeft} minutes.`);
      } else {
        const success = Math.random() > 0.5;
        const amount = Math.floor(Math.random() * 500) + 200;
        economy.lastRob = now.toString();
        
        if (success) {
          economy.balance += amount;
          await sendMessage(botToken, chatId, 
            `🎭 Robbery successful! You stole $${amount.toLocaleString()}!`
          );
        } else {
          const fine = Math.floor(amount * 1.5);
          economy.balance = Math.max(0, economy.balance - fine);
          await sendMessage(botToken, chatId, 
            `🚔 You got caught! Lost $${fine.toLocaleString()} in fines!`
          );
        }
      }
      break;

    case "crime":
      if (economy.lastCrime && now - parseInt(economy.lastCrime) < 3600000) {
        const timeLeft = Math.ceil((3600000 - (now - parseInt(economy.lastCrime))) / 60000);
        await sendMessage(botToken, chatId, `⏳ Lay low for ${timeLeft} more minutes!`);
      } else {
        const crimes = [
          { name: "pickpocketing", min: 50, max: 200 },
          { name: "shoplifting", min: 100, max: 300 },
          { name: "car theft", min: 500, max: 1000 },
        ];
        const crime = crimes[Math.floor(Math.random() * crimes.length)];
        const success = Math.random() > 0.4;
        const amount = Math.floor(Math.random() * (crime.max - crime.min)) + crime.min;
        economy.lastCrime = now.toString();

        if (success) {
          economy.balance += amount;
          await sendMessage(botToken, chatId, 
            `🦹 ${crime.name} successful! Earned $${amount.toLocaleString()}!`
          );
        } else {
          const fine = Math.floor(amount * 2);
          economy.balance = Math.max(0, economy.balance - fine);
          await sendMessage(botToken, chatId, 
            `👮 Caught during ${crime.name}! Fined $${fine.toLocaleString()}!`
          );
        }
      }
      break;

    case "bet":
    case "gamble":
      const betAmount = parseInt(args[0]) || 0;
      if (betAmount > economy.balance) {
        await sendMessage(botToken, chatId, "❌ Insufficient balance!");
      } else if (betAmount < 50) {
        await sendMessage(botToken, chatId, "❌ Minimum bet is $50!");
      } else {
        const win = Math.random() > 0.5;
        if (win) {
          economy.balance += betAmount;
          await sendMessage(botToken, chatId, 
            `🎰 You won! +$${betAmount.toLocaleString()}\n\n` +
            `New balance: $${economy.balance.toLocaleString()}`
          );
        } else {
          economy.balance -= betAmount;
          await sendMessage(botToken, chatId, 
            `💸 You lost! -$${betAmount.toLocaleString()}\n\n` +
            `New balance: $${economy.balance.toLocaleString()}`
          );
        }
      }
      break;

    case "shop":
      const items = [
        { name: "🍕 Pizza", price: 50, id: "pizza" },
        { name: "🍔 Burger", price: 75, id: "burger" },
        { name: "🎮 Gaming Console", price: 500, id: "console" },
        { name: "💻 Laptop", price: 2000, id: "laptop" },
        { name: "🚗 Car", price: 15000, id: "car" },
        { name: "🏠 House", price: 100000, id: "house" },
      ];
      
      let shopText = "🛍️ *SHOP*\n\nAvailable items:\n\n";
      items.forEach((item, i) => {
        shopText += `${i + 1}. ${item.name} - $${item.price.toLocaleString()}\n`;
      });
      shopText += `\nUse /buy <number> to purchase!`;
      
      await sendMessage(botToken, chatId, shopText);
      break;

    case "buy":
      const items2 = [
        { name: "🍕 Pizza", price: 50, id: "pizza" },
        { name: "🍔 Burger", price: 75, id: "burger" },
        { name: "🎮 Gaming Console", price: 500, id: "console" },
        { name: "💻 Laptop", price: 2000, id: "laptop" },
        { name: "🚗 Car", price: 15000, id: "car" },
        { name: "🏠 House", price: 100000, id: "house" },
      ];
      
      const itemIndex = parseInt(args[0]) - 1;
      if (itemIndex < 0 || itemIndex >= items2.length) {
        await sendMessage(botToken, chatId, "❌ Invalid item number!");
      } else {
        const item = items2[itemIndex];
        if (economy.balance < item.price) {
          await sendMessage(botToken, chatId, "❌ Insufficient balance!");
        } else {
          economy.balance -= item.price;
          economy.inventory[item.id] = (economy.inventory[item.id] || 0) + 1;
          await sendMessage(botToken, chatId, 
            `✅ Purchased ${item.name} for $${item.price.toLocaleString()}!\n\n` +
            `New balance: $${economy.balance.toLocaleString()}`
          );
        }
      }
      break;

    case "inventory":
    case "inv":
      if (Object.keys(economy.inventory).length === 0) {
        await sendMessage(botToken, chatId, "📦 Your inventory is empty!");
      } else {
        let invText = "📦 *YOUR INVENTORY*\n\n";
        const itemNames: Record<string, string> = {
          pizza: "🍕 Pizza",
          burger: "🍔 Burger",
          console: "🎮 Gaming Console",
          laptop: "💻 Laptop",
          car: "🚗 Car",
          house: "🏠 House",
        };
        
        for (const [id, count] of Object.entries(economy.inventory)) {
          invText += `${itemNames[id] || id}: ${count}\n`;
        }
        
        await sendMessage(botToken, chatId, invText);
      }
      break;

    case "leaderboard":
    case "lb":
      const users = Array.from(economyData.values())
        .sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank))
        .slice(0, 10);
      
      let lbText = "🏆 *LEADERBOARD*\n\n";
      users.forEach((user, i) => {
        const total = user.balance + user.bank;
        lbText += `${i + 1}. User ${user.chatId.slice(-4)} - $${total.toLocaleString()}\n`;
      });
      
      await sendMessage(botToken, chatId, lbText);
      break;

    default:
      await sendMessage(botToken, chatId, "❌ Unknown economy command!");
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const botId = url.searchParams.get("bot_id");

    if (!botId) {
      return new Response(JSON.stringify({ error: "Missing bot_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bot } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId)
      .eq("is_active", true)
      .single();

    if (!bot) {
      return new Response(JSON.stringify({ error: "Bot not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: TelegramUpdate = await req.json();
    console.log("Received update:", JSON.stringify(update));

    if (update.message) {
      const { chat, from, text } = update.message;
      const chatId = chat.id;
      const userId = from.id;

      // Check channel membership
      if (bot.channel_username) {
        const isMember = await verifyChannelMembership(bot.telegram_token, userId, bot.channel_username);
        
        if (!isMember && text !== "/start") {
          await sendMessage(
            bot.telegram_token,
            chatId,
            `⚠️ You must join our channel to use this bot!\n\nChannel: ${bot.channel_username}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "Join Channel", url: `https://t.me/${bot.channel_username.replace("@", "")}` }],
                  [{ text: "✅ I Joined", callback_data: "verify_membership" }],
                ],
              },
            }
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Handle commands
      if (text?.startsWith("/")) {
        const [command, ...args] = text.slice(1).toLowerCase().split(" ");

        if (command === "start") {
          let welcomeText = bot.welcome_message || "Welcome to our bot! 🎉";
          welcomeText += "\n\n📋 *Available Commands:*\n\n";
          welcomeText += "*Economy:*\n";
          welcomeText += "/balance - Check your balance\n";
          welcomeText += "/daily - Claim daily reward\n";
          welcomeText += "/work - Work for money\n";
          welcomeText += "/rob - Rob someone\n";
          welcomeText += "/crime - Commit a crime\n";
          welcomeText += "/bet <amount> - Gamble money\n";
          welcomeText += "/shop - View shop items\n";
          welcomeText += "/buy <number> - Buy item\n";
          welcomeText += "/inventory - View your items\n";
          welcomeText += "/deposit <amount> - Deposit to bank\n";
          welcomeText += "/withdraw <amount> - Withdraw from bank\n";
          welcomeText += "/leaderboard - Top users\n\n";
          welcomeText += "*Other:*\n";
          welcomeText += "/help - Show this message";

          const options: any = { parse_mode: "Markdown" };
          if (bot.bot_image_url) {
            await fetch(`https://api.telegram.org/bot${bot.telegram_token}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                photo: bot.bot_image_url,
                caption: welcomeText,
                parse_mode: "Markdown",
              }),
            });
          } else {
            await sendMessage(bot.telegram_token, chatId, welcomeText, options);
          }
        } else if (command === "help") {
          await sendMessage(
            bot.telegram_token,
            chatId,
            "Use /start to see all available commands!"
          );
        } else {
          // Handle economy commands
          await handleEconomyCommand(bot.telegram_token, chatId, userId, command, args);
        }
      }
    } else if (update.callback_query) {
      const { id, from, message, data } = update.callback_query;
      
      if (data === "verify_membership" && bot.channel_username) {
        const isMember = await verifyChannelMembership(bot.telegram_token, from.id, bot.channel_username);
        
        if (isMember) {
          await fetch(`https://api.telegram.org/bot${bot.telegram_token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: id,
              text: "✅ Verified! You can now use the bot.",
              show_alert: true,
            }),
          });
          
          await sendMessage(
            bot.telegram_token,
            message!.chat.id,
            "✅ Membership verified! Use /start to see available commands."
          );
        } else {
          await fetch(`https://api.telegram.org/bot${bot.telegram_token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: id,
              text: "❌ You haven't joined the channel yet!",
              show_alert: true,
            }),
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
