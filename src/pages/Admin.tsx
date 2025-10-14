import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Send, Coins, Users, Bot } from "lucide-react";
import { User } from "@supabase/supabase-js";

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allBots, setAllBots] = useState<any[]>([]);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [stats, setStats] = useState({ totalUsers: 0, totalBots: 0, totalGzp: 0 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        checkAdmin(user.id);
      }
    });
  }, [navigate]);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (data) {
      setIsAdmin(true);
      fetchAllData();
    } else {
      toast.error("Access denied. Admin only.");
      navigate("/dashboard");
    }
  };

  const fetchAllData = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: bots } = await supabase.from("bots").select("*");

    if (profiles) {
      setAllUsers(profiles);
      const totalGzp = profiles.reduce((sum, p) => sum + Number(p.gzp_balance), 0);
      setStats({
        totalUsers: profiles.length,
        totalBots: bots?.length || 0,
        totalGzp,
      });
    }

    if (bots) {
      setAllBots(bots);
    }
  };

  const handleTransferCoins = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", transferEmail)
      .single();

    if (!targetProfile) {
      toast.error("User not found");
      return;
    }

    const amount = Number(transferAmount);
    const { error } = await supabase
      .from("profiles")
      .update({ gzp_balance: Number(targetProfile.gzp_balance) + amount })
      .eq("email", transferEmail);

    if (error) {
      toast.error("Transfer failed");
    } else {
      await supabase.from("transactions").insert({
        from_user_id: user?.id,
        to_user_id: targetProfile.user_id,
        amount,
        type: "admin_transfer",
        description: "Admin transfer",
      });

      toast.success(`Transferred ${amount} GZP to ${transferEmail}`);
      setTransferEmail("");
      setTransferAmount("");
      fetchAllData();
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    const notifications = allUsers.map((profile) => ({
      user_id: profile.user_id,
      title: notificationTitle,
      message: notificationMessage,
    }));

    const { error } = await supabase.from("notifications").insert(notifications);

    if (error) {
      toast.error("Failed to send notifications");
    } else {
      toast.success(`Sent notification to ${allUsers.length} users`);
      setNotificationTitle("");
      setNotificationMessage("");
    }
  };

  if (!isAdmin) {
    return null;
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

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Admin Panel</h1>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-accent" />
                Total Bots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent">{stats.totalBots}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Total GZP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{stats.totalGzp.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transfer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transfer">Transfer Coins</TabsTrigger>
            <TabsTrigger value="notifications">Send Notification</TabsTrigger>
            <TabsTrigger value="users">Manage Users</TabsTrigger>
          </TabsList>

          <TabsContent value="transfer">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Transfer GZP Coins</CardTitle>
                <CardDescription>Transfer coins to any user</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransferCoins} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">User Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="100"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Coins className="h-4 w-4 mr-2" />
                    Transfer Coins
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Send Notification</CardTitle>
                <CardDescription>Send a notification to all users</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendNotification} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Important Update"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Your notification message..."
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Send to All Users
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allUsers.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/50"
                    >
                      <div>
                        <p className="font-semibold">{profile.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Balance: {Number(profile.gzp_balance).toFixed(2)} GZP
                        </p>
                        {profile.chat_id && (
                          <p className="text-sm text-muted-foreground">Chat ID: {profile.chat_id}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
