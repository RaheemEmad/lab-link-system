import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, Shield, Zap, Heart, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-background">
        <div className="container px-4 py-8 sm:py-12 max-w-6xl mx-auto">

        {/* Hero Section */}
...
        </div>
      </div>
      <LandingFooter />
    </div>
  );
};

export default About;
