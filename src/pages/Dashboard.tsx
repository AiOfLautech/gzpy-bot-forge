import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bot, Coins, Plus } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bots, setBots] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile();
        fetchBots();
      }
    });
  }, []);

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
    const { data } = await supabase
      .from("bots")
      .select("*")
      .eq("user_id", user?.id);
    setBots(data || []);
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

  if (!profile) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
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
  );
};

export default Dashboard;
