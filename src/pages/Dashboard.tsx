import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bot, Coins, Plus, LogOut, Settings, Bell } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bots, setBots] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBots();
      checkAdminStatus();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setProfile(data);
    }
  };

  const fetchBots = async () => {
    const { data, error } = await supabase
      .from("bots")
      .select("*")
      .eq("user_id", user?.id);

    if (error) {
      console.error("Error fetching bots:", error);
    } else {
      setBots(data || []);
    }
  };

  const checkAdminStatus = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .eq("role", "admin")
      .single();

    if (!error && data) {
      setIsAdmin(true);
    }
  };

  const handleClaimDaily = async () => {
    if (!profile) return;

    const lastClaim = profile.last_claim_at ? new Date(profile.last_claim_at) : null;
    const now = new Date();

    if (lastClaim && now.getTime() - lastClaim.getTime() < 24 * 60 * 60 * 1000) {
      toast.error("You can only claim once per day!");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        gzp_balance: Number(profile.gzp_balance) + 10,
        last_claim_at: now.toISOString(),
      })
      .eq("user_id", user?.id);

    if (error) {
      toast.error("Failed to claim daily reward");
    } else {
      toast.success("Claimed 10 GZP!");
      fetchProfile();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user || !profile) {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">GZP Bot Manager</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/notifications")}>
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate("/admin")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                GZP Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-4">
                {Number(profile.gzp_balance).toFixed(2)}
              </div>
              <Button onClick={handleClaimDaily} className="w-full">
                Claim Daily 10 GZP
              </Button>
            </CardContent>
          </Card>

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
              <p className="text-sm text-muted-foreground">Email: {profile.email}</p>
              {profile.chat_id && (
                <p className="text-sm text-muted-foreground">Chat ID: {profile.chat_id}</p>
              )}
              {isAdmin && (
                <div className="mt-2 px-3 py-1 bg-primary/20 border border-primary rounded-md inline-block">
                  <p className="text-xs font-semibold text-primary">Admin</p>
                </div>
              )}
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
                      <CardDescription>{bot.channel_username}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-4">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            bot.is_active ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {bot.is_active ? "Active" : "Inactive"}
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
    </div>
  );
};

export default Dashboard;
