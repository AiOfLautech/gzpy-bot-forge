import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";

const defaultCommands = [
  { name: "balance", description: "Check wallet and bank balance", category: "Economy" },
  { name: "daily", description: "Claim daily rewards", category: "Economy" },
  { name: "work", description: "Work at your job", category: "Economy" },
  { name: "shop", description: "Browse the shop", category: "Economy" },
  { name: "crime", description: "Commit crimes for money", category: "Economy" },
  { name: "rob", description: "Rob other users", category: "Economy" },
  { name: "gamble", description: "Gamble your money", category: "Games" },
  { name: "slots", description: "Play slot machine", category: "Games" },
  { name: "leaderboard", description: "View richest users", category: "Info" },
  { name: "help", description: "Show all commands", category: "Info" },
];

export default function AdminCommands() {
  const [commands, setCommands] = useState(defaultCommands);
  const [newCommand, setNewCommand] = useState({ name: "", description: "", category: "" });
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
    }
  };

  const handleAddCommand = () => {
    if (!newCommand.name || !newCommand.description || !newCommand.category) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    setCommands([...commands, newCommand]);
    setNewCommand({ name: "", description: "", category: "" });
    toast({ title: "Command added successfully!" });
  };

  const handleDeleteCommand = (index: number) => {
    setCommands(commands.filter((_, i) => i !== index));
    toast({ title: "Command deleted" });
  };

  const categories = Array.from(new Set(commands.map(c => c.category)));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Manage Bot Commands</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Command</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Command name"
              value={newCommand.name}
              onChange={(e) => setNewCommand({ ...newCommand, name: e.target.value })}
            />
            <Input
              placeholder="Category"
              value={newCommand.category}
              onChange={(e) => setNewCommand({ ...newCommand, category: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newCommand.description}
              onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
            />
          </div>
          <Button onClick={handleAddCommand} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Command
          </Button>
        </CardContent>
      </Card>

      {categories.map((category) => (
        <Card key={category} className="mb-6">
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commands
                .filter((cmd) => cmd.category === category)
                .map((cmd, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted"
                  >
                    <div>
                      <span className="font-mono font-semibold">/{cmd.name}</span>
                      <p className="text-sm text-muted-foreground">{cmd.description}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCommand(commands.indexOf(cmd))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Total Commands: {commands.length}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
