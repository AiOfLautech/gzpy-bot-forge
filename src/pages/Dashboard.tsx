import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, session } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bot, Coins, Plus } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get or create user session
    let currentUser = session.getUser();
    if (!currentUser) {
      // Create a demo user ID for first time users
      const demoUserId = `user_${Date.now()}`;
      session.setUser(demoUserId, "demo@example.com");
      currentUser = session.getUser();
    }
    
    setUser(currentUser);
    if (currentUser) {
      fetchBots(currentUser.id);
    }
  }, []);

  const fetchBots = async (userId: string) => {
    try {
      setLoading(true);
      const data = await api.getBots(userId);
      setBots(data || []);
    } catch (error) {
      console.error("Error fetching bots:", error);
      toast.error("Failed to fetch bots");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-accent" />
              Your Bots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-accent mb-4">{bots.length}</div>
            <Button onClick={() => navigate("/create-bot")} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Bot
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">User ID: {user?.id}</p>
            <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate("/create-bot")} className="w-full" variant="outline">
              Create Bot
            </Button>
            <Button onClick={() => navigate("/bot-management")} className="w-full" variant="outline">
              Manage Bots
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Your Bots</CardTitle>
          <CardDescription>Manage all your Telegram bots</CardDescription>
        </CardHeader>
        <CardContent>
          {bots.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">You haven't created any bots yet</p>
              <Button onClick={() => navigate("/create-bot")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Bot
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bots.map((bot) => (
                <Card key={bot.id} className="border-border bg-secondary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{bot.name}</CardTitle>
                    <CardDescription>{bot.channelUsername}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          bot.isActive ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {bot.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <Button
                      onClick={() => navigate(`/bot/${bot.id}`)}
                      variant="outline"
                      className="w-full"
                    >
                      Manage
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
