-- Create commands table
CREATE TABLE IF NOT EXISTS public.commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  script_sample TEXT,
  linked_commands TEXT[], -- Array of command names this command is related to
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;

-- Policies for commands
CREATE POLICY "Users can view commands for their bots"
  ON public.commands FOR SELECT
  TO authenticated
  USING (bot_id IN (SELECT id FROM bots WHERE user_id = auth.uid()));

CREATE POLICY "Users can create commands for their bots"
  ON public.commands FOR INSERT
  TO authenticated
  WITH CHECK (bot_id IN (SELECT id FROM bots WHERE user_id = auth.uid()));

CREATE POLICY "Users can update commands for their bots"
  ON public.commands FOR UPDATE
  TO authenticated
  USING (bot_id IN (SELECT id FROM bots WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete commands for their bots"
  ON public.commands FOR DELETE
  TO authenticated
  USING (bot_id IN (SELECT id FROM bots WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all commands"
  ON public.commands FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_commands_updated_at
  BEFORE UPDATE ON public.commands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default commands
INSERT INTO public.commands (name, description, category, script_sample, linked_commands) VALUES
  ('balance', 'Check wallet and bank balance', 'Economy', 
   'async function balance(ctx) {
  const user = await getUser(ctx.from.id);
  ctx.reply(`💰 Balance: $${user.balance}\n🏦 Bank: $${user.bank}`);
}', 
   ARRAY['deposit', 'withdraw']),
  
  ('daily', 'Claim daily rewards', 'Economy',
   'async function daily(ctx) {
  const amount = 1000;
  await updateBalance(ctx.from.id, amount);
  ctx.reply(`✅ Claimed $${amount} daily reward!`);
}',
   ARRAY['balance', 'weekly']),
  
  ('work', 'Work at your job to earn money', 'Economy',
   'async function work(ctx) {
  const earnings = Math.floor(Math.random() * 500) + 100;
  await updateBalance(ctx.from.id, earnings);
  ctx.reply(`💼 You worked and earned $${earnings}!`);
}',
   ARRAY['job', 'balance']),
  
  ('shop', 'Browse items in the shop', 'Economy',
   'async function shop(ctx) {
  const items = await getShopItems();
  ctx.reply("🛍️ Shop:\n" + items.map(i => `${i.name} - $${i.price}`).join("\n"));
}',
   ARRAY['buy', 'inventory']),
  
  ('crime', 'Commit crimes for money (risky)', 'Economy',
   'async function crime(ctx) {
  const success = Math.random() > 0.5;
  if (success) {
    const amount = Math.floor(Math.random() * 1000);
    await updateBalance(ctx.from.id, amount);
    ctx.reply(`🎭 Crime succeeded! Earned $${amount}`);
  } else {
    ctx.reply("🚓 You were caught! Lost your earnings.");
  }
}',
   ARRAY['rob', 'balance']),
  
  ('rob', 'Rob other users for their money', 'Economy',
   'async function rob(ctx, target) {
  const targetUser = await getUser(target);
  const amount = Math.floor(targetUser.balance * 0.2);
  await transferMoney(target, ctx.from.id, amount);
  ctx.reply(`💰 Robbed $${amount} from ${target}!`);
}',
   ARRAY['crime', 'balance']),
  
  ('gamble', 'Gamble your money (high risk)', 'Games',
   'async function gamble(ctx, amount) {
  const won = Math.random() > 0.5;
  if (won) {
    await updateBalance(ctx.from.id, amount);
    ctx.reply(`🎰 You won $${amount}!`);
  } else {
    await updateBalance(ctx.from.id, -amount);
    ctx.reply(`😢 You lost $${amount}`);
  }
}',
   ARRAY['slots', 'coinflip']),
  
  ('slots', 'Play the slot machine', 'Games',
   'async function slots(ctx, bet) {
  const symbols = ["🍒", "🍋", "🍊", "7️⃣"];
  const result = [random(symbols), random(symbols), random(symbols)];
  const won = result[0] === result[1] && result[1] === result[2];
  ctx.reply(`🎰 ${result.join(" | ")}\n${won ? "Won $" + (bet * 10) : "Lost $" + bet}`);
}',
   ARRAY['gamble', 'balance']),
  
  ('leaderboard', 'View the richest users', 'Info',
   'async function leaderboard(ctx) {
  const top = await getTopUsers(10);
  const list = top.map((u, i) => `${i+1}. ${u.name}: $${u.balance}`).join("\n");
  ctx.reply(`🏆 Top 10:\n${list}`);
}',
   ARRAY['balance', 'rank']),
  
  ('help', 'Show all available commands', 'Info',
   'async function help(ctx) {
  const commands = await getAllCommands();
  const grouped = groupByCategory(commands);
  ctx.reply("📚 Commands:\n" + formatCommands(grouped));
}',
   ARRAY['info', 'support']),
  
  ('deposit', 'Deposit money to your bank', 'Economy',
   'async function deposit(ctx, amount) {
  await transferToBank(ctx.from.id, amount);
  ctx.reply(`🏦 Deposited $${amount} to bank!`);
}',
   ARRAY['balance', 'withdraw']),
  
  ('withdraw', 'Withdraw money from bank', 'Economy',
   'async function withdraw(ctx, amount) {
  await transferFromBank(ctx.from.id, amount);
  ctx.reply(`💵 Withdrew $${amount} from bank!`);
}',
   ARRAY['balance', 'deposit']),
  
  ('inventory', 'View your inventory items', 'Economy',
   'async function inventory(ctx) {
  const items = await getUserInventory(ctx.from.id);
  ctx.reply("🎒 Inventory:\n" + items.map(i => `${i.name} x${i.quantity}`).join("\n"));
}',
   ARRAY['shop', 'use']),
  
  ('buy', 'Buy an item from the shop', 'Economy',
   'async function buy(ctx, itemName) {
  const item = await getShopItem(itemName);
  await purchaseItem(ctx.from.id, item);
  ctx.reply(`✅ Bought ${item.name} for $${item.price}!`);
}',
   ARRAY['shop', 'inventory']),
  
  ('coinflip', 'Flip a coin and bet on the outcome', 'Games',
   'async function coinflip(ctx, bet, choice) {
  const result = Math.random() > 0.5 ? "heads" : "tails";
  const won = result === choice;
  await updateBalance(ctx.from.id, won ? bet : -bet);
  ctx.reply(`🪙 ${result.toUpperCase()}! ${won ? "You won!" : "You lost!"}`);
}',
   ARRAY['gamble', 'balance']);