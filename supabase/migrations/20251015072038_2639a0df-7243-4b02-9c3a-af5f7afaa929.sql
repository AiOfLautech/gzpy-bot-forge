-- Add user economy and stats tracking tables
CREATE TABLE IF NOT EXISTS public.user_economy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 1000,
  bank NUMERIC DEFAULT 0,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  inventory JSONB DEFAULT '{}',
  job TEXT,
  last_work TIMESTAMP WITH TIME ZONE,
  last_rob TIMESTAMP WITH TIME ZONE,
  last_crime TIMESTAMP WITH TIME ZONE,
  last_daily TIMESTAMP WITH TIME ZONE,
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add bot stats table
CREATE TABLE IF NOT EXISTS public.bot_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE UNIQUE,
  total_users INTEGER DEFAULT 0,
  total_groups INTEGER DEFAULT 0,
  total_channels INTEGER DEFAULT 0,
  total_commands INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free',
  bot_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add mini games sessions table
CREATE TABLE IF NOT EXISTS public.mini_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  session_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 hour')
);

-- Enable RLS
ALTER TABLE public.user_economy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_game_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_economy (public access for bot operations)
CREATE POLICY "Public can manage user economy" ON public.user_economy FOR ALL USING (true);

-- RLS policies for bot_stats
CREATE POLICY "Bot owners can view their bot stats" ON public.bot_stats FOR SELECT USING (
  bot_id IN (SELECT id FROM public.bots WHERE user_id = auth.uid())
);
CREATE POLICY "Public can update bot stats" ON public.bot_stats FOR ALL USING (true);

-- RLS policies for mini_game_sessions (public access)
CREATE POLICY "Public can manage game sessions" ON public.mini_game_sessions FOR ALL USING (true);

-- Update trigger for user_economy
CREATE TRIGGER update_user_economy_updated_at
  BEFORE UPDATE ON public.user_economy
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for bot_stats
CREATE TRIGGER update_bot_stats_updated_at
  BEFORE UPDATE ON public.bot_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();