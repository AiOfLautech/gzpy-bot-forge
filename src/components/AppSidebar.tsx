import { Bot, Home, Plus, Bell, Settings, Users, Zap, TrendingUp, BarChart3, Power } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const userItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Create Bot", url: "/create-bot", icon: Plus },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Upgrade", url: "/upgrade", icon: TrendingUp },
];

const adminItems = [
  { title: "Admin Panel", url: "/admin", icon: Settings },
  { title: "Bot Control", url: "/bot-control", icon: Power },
  { title: "Manage Commands", url: "/admin/commands", icon: BarChart3 },
  { title: "Manage Users", url: "/admin/users", icon: Users },
];

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary/20 text-primary font-semibold border-l-4 border-primary"
      : "hover:bg-muted/50";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold">GZP Manager</h1>
            </div>
          )}
          {isCollapsed && (
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow-primary mx-auto w-fit">
              <Bot className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
