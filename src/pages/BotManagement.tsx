import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Copy, ExternalLink, Power, Trash2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

const BotManagement = () => {
  const navigate = useNavigate();
  const { botId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [bot, setBot] = useState<any>(null);
  const [botStats, setBotStats] = useState<any>(null);
  const [botUsername, setBotUsername] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchBot(user.id);
      }
    });
  }, [navigate, botId]);

  const fetchBot = async (userId: string) => {
    const { data, error } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      toast.error("Bot not found");
      navigate("/dashboard");
    } else {
      setBot(data);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      setWebhookUrl(`${supabaseUrl}/functions/v1/telegram-bot?bot_id=${data.id}`);
      
      // Fetch bot username from Telegram
      fetchBotUsername(data.telegram_token);
      
      // Fetch bot stats
      fetchBotStats(data.id);
    }
  };

  const fetchBotUsername = async (token: string) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      if (data.ok) {
        setBotUsername(data.result.username);
      }
    } catch (error) {
      console.error("Failed to fetch bot username:", error);
    }
  };

  const fetchBotStats = async (botId: string) => {
    const { data } = await supabase
      .from("bot_stats")
      .select("*")
      .eq("bot_id", botId)
      .single();
    
    if (data) {
      setBotStats(data);
    } else {
      // Create initial stats
      await supabase.from("bot_stats").insert({
        bot_id: botId,
        total_users: 0,
        total_groups: 0,
        total_channels: 0,
        total_commands: 0,
        plan: "free",
      });
      fetchBotStats(botId);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const setWebhook = async () => {
    if (!bot) return;
    setIsSettingWebhook(true);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${bot.telegram_token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      );
      const data = await response.json();

      if (data.ok) {
        toast.success("Webhook set successfully! Your bot is now active.");
      } else {
        toast.error(`Failed to set webhook: ${data.description}`);
      }
    } catch (error) {
      toast.error("Failed to set webhook");
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const toggleBotStatus = async () => {
    if (!bot) return;

    const { error } = await supabase
      .from("bots")
      .update({ is_active: !bot.is_active })
      .eq("id", bot.id);

    if (error) {
      toast.error("Failed to update bot status");
    } else {
      toast.success(`Bot ${!bot.is_active ? "activated" : "deactivated"}`);
      fetchBot(user!.id);
    }
  };

  const deleteBot = async () => {
    if (!bot) return;
    if (!confirm("Are you sure you want to delete this bot?")) return;

    const { error } = await supabase.from("bots").delete().eq("id", bot.id);

    if (error) {
      toast.error("Failed to delete bot");
    } else {
      toast.success("Bot deleted successfully");
      navigate("/dashboard");
    }
  };

  if (!bot) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{bot.name}</h1>
            <p className="text-muted-foreground">{bot.channel_username}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={bot.is_active ? "destructive" : "default"}
              onClick={toggleBotStatus}
            >
              <Power className="h-4 w-4 mr-2" />
              {bot.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="destructive" onClick={deleteBot}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>📊 Bot Statistics</CardTitle>
                  <CardDescription>Real-time bot metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {botStats && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                        <span className="text-sm font-medium">Total Users</span>
                        <span className="text-2xl font-bold text-primary">{botStats.total_users}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                        <span className="text-sm font-medium">Total Groups</span>
                        <span className="text-2xl font-bold text-accent">{botStats.total_groups}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                        <span className="text-sm font-medium">Total Channels</span>
                        <span className="text-2xl font-bold">{botStats.total_channels}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">Commands Executed</span>
                        <span className="text-2xl font-bold">{botStats.total_commands}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>⚡ Bot Info</CardTitle>
                  <CardDescription>Configuration details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg border border-primary/30">
                      <div className="text-xs text-muted-foreground mb-1">Bot Username</div>
                      <div className="font-mono text-lg font-bold">
                        @{botUsername || "Loading..."}
                      </div>
                      {botUsername && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                          onClick={() => window.open(`https://t.me/${botUsername}`, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Open in Telegram
                        </Button>
                      )}
                    </div>
                    
                    <div className="p-4 bg-secondary/50 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Plan</div>
                      <div className="text-lg font-bold capitalize">
                        {botStats?.plan || "Free"} ✨
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Status</div>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full animate-pulse ${bot.is_active ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="font-semibold">{bot.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/10 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Created</div>
                      <div className="text-sm">
                        {new Date(bot.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="setup">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Deploy Your Bot</CardTitle>
                <CardDescription>Follow these steps to activate your bot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Step 1: Copy Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly className="flex-1" />
                    <Button onClick={() => copyToClipboard(webhookUrl)} variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Step 2: Set Webhook</Label>
                  <Button onClick={setWebhook} disabled={isSettingWebhook} className="w-full">
                    {isSettingWebhook ? "Setting webhook..." : "Activate Bot"}
                  </Button>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Testing Your Bot</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    After setting the webhook, test your bot by:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Search for your bot on Telegram</li>
                    <li>Send /start command</li>
                    <li>Join the required channel</li>
                    <li>Try economy commands like /balance, /daily</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label>Bot Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`https://t.me/${bot.telegram_token.split(":")[0]}`}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      onClick={() =>
                        window.open(`https://t.me/${bot.telegram_token.split(":")[0]}`, "_blank")
                      }
                      variant="outline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Bot Settings</CardTitle>
                <CardDescription>Current bot configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bot Name</Label>
                  <Input value={bot.name} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Channel Username</Label>
                  <Input value={bot.channel_username} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Welcome Message</Label>
                  <Input value={bot.welcome_message || "N/A"} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Bot Image URL</Label>
                  <Input value={bot.bot_image_url || "N/A"} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        bot.is_active ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-sm">{bot.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commands">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Available Commands</CardTitle>
                <CardDescription>All economy and utility commands</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-primary">💰 Economy Commands</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/balance</code>
                        <span className="text-muted-foreground">Check your balance</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/daily</code>
                        <span className="text-muted-foreground">Claim $500 daily</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/work</code>
                        <span className="text-muted-foreground">Work for money ($100-$400)</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/rob</code>
                        <span className="text-muted-foreground">Rob someone (risky)</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/crime</code>
                        <span className="text-muted-foreground">Commit various crimes</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/bet &lt;amount&gt;</code>
                        <span className="text-muted-foreground">Gamble your money</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/shop</code>
                        <span className="text-muted-foreground">View available items</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/buy &lt;number&gt;</code>
                        <span className="text-muted-foreground">Purchase items</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/inventory</code>
                        <span className="text-muted-foreground">View your items</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/deposit &lt;amount&gt;</code>
                        <span className="text-muted-foreground">Deposit to bank</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/withdraw &lt;amount&gt;</code>
                        <span className="text-muted-foreground">Withdraw from bank</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/leaderboard</code>
                        <span className="text-muted-foreground">Top 10 users</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 text-accent">🛠️ Utility Commands</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/start</code>
                        <span className="text-muted-foreground">Start the bot & see commands</span>
                      </div>
                      <div className="flex justify-between p-2 bg-secondary/50 rounded">
                        <code>/help</code>
                        <span className="text-muted-foreground">Get help</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Tip:</strong> More commands coming soon! The bot includes channel
                      verification, inline buttons, and a complete economy system.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BotManagement;
