import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Power, RefreshCw, BarChart3 } from "lucide-react";

export default function BotControl() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role === "admin")) {
      navigate("/dashboard");
      return;
    }

    fetchBots();
  };

  const fetchBots = async () => {
    const { data } = await supabase.from("bots").select("*");
    setBots(data || []);
    setLoading(false);
  };

  const toggleBot = async (botId: string, currentStatus: boolean) => {
    await supabase.from("bots").update({ is_active: !currentStatus }).eq("id", botId);
    toast({ title: `Bot ${!currentStatus ? "activated" : "deactivated"}` });
    fetchBots();
  };

  const restartAllBots = async () => {
    await supabase.from("bots").update({ is_active: true }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "All bots restarted successfully!" });
    fetchBots();
  };

  const stopAllBots = async () => {
    await supabase.from("bots").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "All bots stopped!" });
    fetchBots();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Bot Control Panel</h1>
          <div className="flex gap-4">
            <Button onClick={restartAllBots} className="flex gap-2">
              <RefreshCw className="w-4 h-4" /> Restart All
            </Button>
            <Button onClick={stopAllBots} variant="destructive" className="flex gap-2">
              <Power className="w-4 h-4" /> Stop All
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {bots.map((bot) => (
            <Card key={bot.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{bot.name}</span>
                  <Button
                    onClick={() => toggleBot(bot.id, bot.is_active)}
                    variant={bot.is_active ? "destructive" : "default"}
                  >
                    {bot.is_active ? "Stop" : "Start"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Status: {bot.is_active ? "🟢 Active" : "🔴 Inactive"}</p>
                <p>Channel: {bot.channel_username}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
