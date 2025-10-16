import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateBot from "./pages/CreateBot";
import BotManagement from "./pages/BotManagement";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import BotControl from "./pages/BotControl";
import Upgrade from "./pages/Upgrade";
import AdminCommands from "./pages/AdminCommands";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-bot" element={<CreateBot />} />
            <Route path="/bot/:botId" element={<BotManagement />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/bot-control" element={<BotControl />} />
            <Route path="/admin/commands" element={<AdminCommands />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
