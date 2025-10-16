import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, User, Crown } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    fetchUsers();
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
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const handleUpgradeUser = async (userId: string, currentBalance: number) => {
    const { error } = await supabase
      .from("profiles")
      .update({ gzp_balance: currentBalance + 100 })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error upgrading user", variant: "destructive" });
    } else {
      toast({ title: "User upgraded with +100 GZP!" });
      fetchUsers();
    }
  };

  const handleDeductBalance = async (userId: string, currentBalance: number) => {
    const newBalance = Math.max(0, currentBalance - 50);
    const { error } = await supabase
      .from("profiles")
      .update({ gzp_balance: newBalance })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error updating balance", variant: "destructive" });
    } else {
      toast({ title: "Deducted 50 GZP" });
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manage Users</h1>
        <div className="text-lg font-semibold">Total Users: {users.length}</div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Balance: {Number(user.gzp_balance).toFixed(2)} GZP
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpgradeUser(user.user_id, Number(user.gzp_balance))}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    +100 GZP
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeductBalance(user.user_id, Number(user.gzp_balance))}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    -50 GZP
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
