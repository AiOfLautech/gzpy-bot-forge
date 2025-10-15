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

const sendMessage = async (botToken: string, chatId: number, text: string, options: any = {}) => {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...options }),
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

const handleCommands = async (supabase: any, botToken: string, botId: string, chatId: number, userId: string, command: string, args: string[]) => {
  const user = await getUserEconomy(supabase, botId, userId);
  const now = Date.now();

  switch (command) {
    case "balance":
    case "bal":
      await sendMessage(botToken, chatId, 
        `💰 <b>Balance</b>\n\nWallet: $${user.balance.toLocaleString()}\nBank: $${user.bank.toLocaleString()}\nLevel: ${user.level} (XP: ${user.xp})`
      );
      break;

    case "daily":
      const reward = 500 + (user.level * 100);
      await updateUserEconomy(supabase, botId, userId, { balance: user.balance + reward, last_daily: new Date().toISOString() });
      await sendMessage(botToken, chatId, `🎁 Daily claimed! +$${reward.toLocaleString()}`);
      break;

    case "work":
      const lastWork = user.last_work ? new Date(user.last_work).getTime() : 0;
      if (now - lastWork < 3600000) {
        await sendMessage(botToken, chatId, `⏳ Rest for ${Math.ceil((3600000 - (now - lastWork)) / 60000)}m`);
      } else {
        const earnings = Math.floor(Math.random() * 300) + 100 + (user.level * 50);
        await updateUserEconomy(supabase, botId, userId, { balance: user.balance + earnings, last_work: new Date().toISOString(), xp: user.xp + 5 });
        await sendMessage(botToken, chatId, `💼 Work complete! +$${earnings.toLocaleString()} +5 XP`);
      }
      break;

    default:
      await sendMessage(botToken, chatId, "❌ Unknown command! Use /start to see all commands.");
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
          let welcomeText = bot.welcome_message || "Welcome! 🎉";
          welcomeText += "\n\n📋 <b>Commands:</b>\n/balance - Check balance\n/daily - Daily reward\n/work - Work for money\n/help - Show help";
          
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
          await handleCommands(supabase, bot.telegram_token, bot.id, chat.id, from.id.toString(), command, args);
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
