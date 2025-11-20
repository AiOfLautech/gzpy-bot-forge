import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Code, Link as LinkIcon, Copy, Check } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  script_sample?: string;
  linked_commands?: string[];
  is_active: boolean;
  usage_count: number;
}

export default function AdminCommands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newCommand, setNewCommand] = useState({
    name: "",
    description: "",
    category: "",
    script_sample: "",
    linked_commands: [] as string[],
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoadCommands();
  }, []);

  const checkAdminAndLoadCommands = async () => {
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

    await loadCommands();
  };

  const loadCommands = async () => {
    try {
      const { data, error } = await supabase
        .from("commands")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setCommands(data || []);
    } catch (error) {
      console.error("Error loading commands:", error);
      toast({ title: "Failed to load commands", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCommand = async () => {
    if (!newCommand.name || !newCommand.description || !newCommand.category) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("commands").insert([
        {
          ...newCommand,
          linked_commands: newCommand.linked_commands.length > 0 ? newCommand.linked_commands : null,
        },
      ]);

      if (error) throw error;

      toast({ title: "Command added successfully!" });
      setNewCommand({ name: "", description: "", category: "", script_sample: "", linked_commands: [] });
      setIsDialogOpen(false);
      loadCommands();
    } catch (error) {
      console.error("Error adding command:", error);
      toast({ title: "Failed to add command", variant: "destructive" });
    }
  };

  const handleUpdateCommand = async () => {
    if (!editingCommand) return;

    try {
      const { error } = await supabase
        .from("commands")
        .update({
          name: editingCommand.name,
          description: editingCommand.description,
          category: editingCommand.category,
          script_sample: editingCommand.script_sample,
          linked_commands: editingCommand.linked_commands,
          is_active: editingCommand.is_active,
        })
        .eq("id", editingCommand.id);

      if (error) throw error;

      toast({ title: "Command updated successfully!" });
      setEditingCommand(null);
      loadCommands();
    } catch (error) {
      console.error("Error updating command:", error);
      toast({ title: "Failed to update command", variant: "destructive" });
    }
  };

  const handleDeleteCommand = async (id: string) => {
    try {
      const { error } = await supabase.from("commands").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Command deleted" });
      loadCommands();
    } catch (error) {
      console.error("Error deleting command:", error);
      toast({ title: "Failed to delete command", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sonnerToast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = Array.from(new Set(commands.map(c => c.category)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading commands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Bot Commands</h1>
          <p className="text-muted-foreground">Manage and customize bot commands with script samples</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Command
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Command</DialogTitle>
              <DialogDescription>Create a new bot command with script sample</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Command Name*</Label>
                  <Input
                    id="name"
                    placeholder="e.g., balance"
                    value={newCommand.name}
                    onChange={(e) => setNewCommand({ ...newCommand, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category*</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Economy"
                    value={newCommand.category}
                    onChange={(e) => setNewCommand({ ...newCommand, category: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description*</Label>
                <Input
                  id="description"
                  placeholder="What does this command do?"
                  value={newCommand.description}
                  onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linked">Linked Commands (comma-separated)</Label>
                <Input
                  id="linked"
                  placeholder="e.g., deposit, withdraw"
                  value={newCommand.linked_commands.join(", ")}
                  onChange={(e) => setNewCommand({ 
                    ...newCommand, 
                    linked_commands: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="script">Script Sample</Label>
                <Textarea
                  id="script"
                  placeholder="async function commandName(ctx) {&#10;  // Your code here&#10;}"
                  value={newCommand.script_sample}
                  onChange={(e) => setNewCommand({ ...newCommand, script_sample: e.target.value })}
                  className="font-mono text-sm min-h-[200px]"
                />
              </div>

              <Button onClick={handleAddCommand} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Create Command
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categories.map((category) => {
        const categoryCommands = commands.filter(c => c.category === category);
        
        return (
          <Card key={category} className="mb-6 border-2 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span>{category}</span>
                <Badge variant="secondary">{categoryCommands.length} commands</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {categoryCommands.map((command) => (
                  <div key={command.id} className="p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <code className="text-base sm:text-lg font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                                /{command.name}
                              </code>
                              {!command.is_active && (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                              {command.usage_count > 0 && (
                                <Badge variant="outline">{command.usage_count} uses</Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">{command.description}</p>
                          </div>
                        </div>

                        {command.linked_commands && command.linked_commands.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Related:</span>
                            {command.linked_commands.map((linked, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                /{linked}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {command.script_sample && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-accent" />
                                <span className="text-sm font-medium">Script Sample</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(command.script_sample!, command.id)}
                              >
                                {copiedId === command.id ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <pre className="bg-secondary/50 p-3 rounded-lg overflow-x-auto text-xs sm:text-sm border border-border">
                              <code className="text-foreground">{command.script_sample}</code>
                            </pre>
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCommand(command)}
                              className="flex-1 sm:flex-none"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Command</DialogTitle>
                            </DialogHeader>
                            {editingCommand && editingCommand.id === command.id && (
                              <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Command Name</Label>
                                    <Input
                                      value={editingCommand.name}
                                      onChange={(e) => setEditingCommand({ ...editingCommand, name: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Input
                                      value={editingCommand.category}
                                      onChange={(e) => setEditingCommand({ ...editingCommand, category: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input
                                    value={editingCommand.description}
                                    onChange={(e) => setEditingCommand({ ...editingCommand, description: e.target.value })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Linked Commands</Label>
                                  <Input
                                    value={editingCommand.linked_commands?.join(", ") || ""}
                                    onChange={(e) => setEditingCommand({ 
                                      ...editingCommand, 
                                      linked_commands: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                                    })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Script Sample</Label>
                                  <Textarea
                                    value={editingCommand.script_sample || ""}
                                    onChange={(e) => setEditingCommand({ ...editingCommand, script_sample: e.target.value })}
                                    className="font-mono text-sm min-h-[200px]"
                                  />
                                </div>

                                <Button onClick={handleUpdateCommand} className="w-full">
                                  Update Command
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCommand(command.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {commands.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No commands yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Command
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
