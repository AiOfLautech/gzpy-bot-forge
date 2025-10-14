import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot, Zap, Users, Coins, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

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
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")}>Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-block mb-6">
            <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow-primary">
              <Bot className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Create Powerful
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Telegram Bots</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Build and manage Telegram bots with advanced economy features, user verification, and automated commands. All powered by GZP coins.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow-primary">
              Start Building
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Learn More
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
            <div className="p-3 bg-primary/20 rounded-lg w-fit mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Easy Setup</h3>
            <p className="text-muted-foreground">
              Create bots in minutes with our intuitive interface. Just 10 GZP per bot and get started instantly.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
            <div className="p-3 bg-accent/20 rounded-lg w-fit mb-4">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Channel Verification</h3>
            <p className="text-muted-foreground">
              Automatically verify users have joined your channel before they can use your bot.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
            <div className="p-3 bg-primary/20 rounded-lg w-fit mb-4">
              <Coins className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Economy System</h3>
            <p className="text-muted-foreground">
              Built-in economy with shop, betting, investing, and more. Hundreds of commands ready to use.
            </p>
          </div>
        </div>

        <div className="mt-20 text-center">
          <div className="inline-block p-6 rounded-2xl border border-primary/30 bg-primary/5">
            <p className="text-lg text-muted-foreground mb-4">Ready to get started?</p>
            <div className="flex items-center gap-2 justify-center text-primary font-semibold text-xl">
              <Zap className="h-5 w-5" />
              <span>Get 10 GZP free on signup!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
