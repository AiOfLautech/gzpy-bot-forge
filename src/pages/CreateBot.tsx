import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, session } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Bot } from "lucide-react";

const CreateBot = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
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
    const currentUser = session.getUser();
    if (!currentUser) {
      const demoUserId = `user_${Date.now()}`;
      session.setUser(demoUserId, "demo@example.com");
      setUser(session.getUser());
    } else {
      setUser(currentUser);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setIsLoading(true);

    try {
      await api.createBot({
        userId: user.id,
        name: formData.name,
        telegramToken: formData.telegramToken,
        channelUsername: formData.channelUsername,
        botImageUrl: formData.botImageUrl || null,
        welcomeMessage: formData.welcomeMessage,
        chatId: formData.chatId || null,
        isActive: true,
      });

      toast.success("Bot created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create bot");
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
            <CardDescription>Fill in the details to create your Telegram bot</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Bot Name *</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Bot"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegramToken">Telegram Bot Token *</Label>
                <Input
                  id="telegramToken"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={formData.telegramToken}
                  onChange={(e) => setFormData({ ...formData, telegramToken: e.target.value })}
                  required
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  Get your bot token from @BotFather on Telegram
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="channelUsername">Channel Username *</Label>
                <Input
                  id="channelUsername"
                  placeholder="@mychannel"
                  value={formData.channelUsername}
                  onChange={(e) => setFormData({ ...formData, channelUsername: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Users must join this channel to use the bot
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="botImageUrl">Bot Image URL (Optional)</Label>
                <Input
                  id="botImageUrl"
                  placeholder="https://example.com/bot-image.jpg"
                  value={formData.botImageUrl}
                  onChange={(e) => setFormData({ ...formData, botImageUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message *</Label>
                <Textarea
                  id="welcomeMessage"
                  placeholder="Welcome to the bot! Join our channel to get started."
                  value={formData.welcomeMessage}
                  onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                  required
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatId">Admin Chat ID (Optional)</Label>
                <Input
                  id="chatId"
                  placeholder="123456789"
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Your Telegram chat ID for admin notifications
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create Bot"}
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
