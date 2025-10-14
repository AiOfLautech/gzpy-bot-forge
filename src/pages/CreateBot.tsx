import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Bot } from "lucide-react";
import { User } from "@supabase/supabase-js";

const CreateBot = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    telegramToken: "",
    channelUsername: "",
    botImageUrl: "",
    welcomeMessage: "Welcome! Please join our channel to continue.",
    chatId: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        fetchProfile(user.id);
      }
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) return;

    if (Number(profile.gzp_balance) < 10) {
      toast.error("Insufficient GZP balance! You need 10 GZP to create a bot.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: botError } = await supabase.from("bots").insert({
        user_id: user.id,
        name: formData.name,
        telegram_token: formData.telegramToken,
        channel_username: formData.channelUsername,
        bot_image_url: formData.botImageUrl,
        welcome_message: formData.welcomeMessage,
        chat_id: formData.chatId,
      });

      if (botError) throw botError;

      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ gzp_balance: Number(profile.gzp_balance) - 10 })
        .eq("user_id", user.id);

      if (balanceError) throw balanceError;

      toast.success("Bot created successfully! 10 GZP deducted.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl">Create New Bot</CardTitle>
            </div>
            <CardDescription>Cost: 10 GZP | Your balance: {profile ? Number(profile.gzp_balance).toFixed(2) : 0} GZP</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Bot"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Telegram Bot Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={formData.telegramToken}
                  onChange={(e) => setFormData({ ...formData, telegramToken: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Get your bot token from @BotFather on Telegram
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Channel Username</Label>
                <Input
                  id="channel"
                  placeholder="@mychannel"
                  value={formData.channelUsername}
                  onChange={(e) => setFormData({ ...formData, channelUsername: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Bot Image URL (Optional)</Label>
                <Input
                  id="image"
                  placeholder="https://example.com/bot-image.jpg"
                  value={formData.botImageUrl}
                  onChange={(e) => setFormData({ ...formData, botImageUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome">Welcome Message</Label>
                <Textarea
                  id="welcome"
                  placeholder="Welcome! Please join our channel to continue."
                  value={formData.welcomeMessage}
                  onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatId">Your Chat ID (Optional)</Label>
                <Input
                  id="chatId"
                  placeholder="123456789"
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  For receiving broadcast notifications
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Bot (10 GZP)"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateBot;
