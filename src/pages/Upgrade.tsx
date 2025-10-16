import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Zap, Crown, Rocket } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: 0,
    icon: Zap,
    features: [
      "1 Bot",
      "Basic Commands",
      "100 Users per bot",
      "Community Support",
    ],
  },
  {
    name: "Pro",
    price: 500,
    icon: Crown,
    features: [
      "5 Bots",
      "All Commands + Custom",
      "1,000 Users per bot",
      "Priority Support",
      "Advanced Analytics",
      "Custom Branding",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 2000,
    icon: Rocket,
    features: [
      "Unlimited Bots",
      "All Pro Features",
      "Unlimited Users",
      "Dedicated Support",
      "Custom Development",
      "API Access",
      "White Label",
    ],
  },
];

export default function Upgrade() {
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(data);
    }
  };

  const handleUpgrade = async (planPrice: number, planName: string) => {
    if (!profile) return;

    if (Number(profile.gzp_balance) < planPrice) {
      toast({
        title: "Insufficient GZP",
        description: `You need ${planPrice} GZP to upgrade to ${planName}`,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ gzp_balance: Number(profile.gzp_balance) - planPrice })
      .eq("user_id", profile.user_id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to upgrade plan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: `Upgraded to ${planName} plan`,
      });
      fetchProfile();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Upgrade Your Plan</h1>
        <p className="text-muted-foreground text-lg">
          Choose the perfect plan for your needs
        </p>
        {profile && (
          <div className="mt-4 text-xl font-semibold text-primary">
            Your Balance: {Number(profile.gzp_balance).toFixed(0)} GZP
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.popular
                ? "border-primary shadow-glow-primary scale-105"
                : "border-border"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-sm font-semibold rounded-full">
                Most Popular
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-start mb-4">
                <plan.icon className={`h-8 w-8 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>
                <div className="text-3xl font-bold text-foreground mt-2">
                  {plan.price === 0 ? "Free" : `${plan.price} GZP`}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleUpgrade(plan.price, plan.name)}
                disabled={plan.price === 0}
              >
                {plan.price === 0 ? "Current Plan" : "Upgrade Now"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
