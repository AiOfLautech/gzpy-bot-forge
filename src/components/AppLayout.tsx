import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { session } from "@/lib/api";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const currentUser = session.getUser();
    if (!currentUser) {
      navigate("/auth");
    } else {
      setUser(currentUser);
      setProfile({ email: currentUser.email, gzp_balance: 0 });
    }
  }, [navigate]);

  const handleSignOut = async () => {
    session.clearUser();
    navigate("/auth");
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-dark">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              {profile && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{profile.email}</span>
                  <div className="px-2 py-1 bg-primary/20 rounded text-primary font-semibold">
                    {Number(profile.gzp_balance).toFixed(0)} GZP
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
