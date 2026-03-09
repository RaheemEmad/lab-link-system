import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportTicketForm } from "@/components/support/SupportTicketForm";
import { SupportTicketsList } from "@/components/support/SupportTicketsList";
import { PlusCircle, List, BookOpen, Mail, Phone } from "lucide-react";

const SupportCenter = () => {
  const [activeTab, setActiveTab] = useState("new");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <LandingNav />
        <main className="flex-1 container max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Support Center</h1>
          <p className="text-muted-foreground mb-6">Get help with your LabLink account</p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="new" className="gap-1.5">
                <PlusCircle className="h-4 w-4" /> New Ticket
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-1.5">
                <List className="h-4 w-4" /> My Tickets
              </TabsTrigger>
              <TabsTrigger value="faq" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> FAQ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new">
              <Card>
                <CardHeader>
                  <CardTitle>Submit a Support Ticket</CardTitle>
                  <CardDescription>Describe your issue and we'll get back to you</CardDescription>
                </CardHeader>
                <CardContent>
                  <SupportTicketForm onSuccess={() => setActiveTab("tickets")} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tickets">
              <SupportTicketsList />
            </TabsContent>

            <TabsContent value="faq" className="space-y-4">
              {[
                { q: "How do I create my first order?", a: "Navigate to Dashboard → New Order. Fill in the restoration type, teeth selection, shade, and any special instructions. You can attach files and photos." },
                { q: "How does the marketplace work?", a: "When you create an order without selecting a specific lab, it goes to the marketplace where labs can apply. You choose which lab to assign." },
                { q: "How do I set up my lab profile?", a: "Go to Lab Admin → Profile. Add your specializations, pricing, portfolio items, and availability schedule." },
                { q: "Can I export my invoices?", a: "Yes, navigate to any invoice and use the export button. You can download individual invoices or generate monthly statements." },
                { q: "How do I enable push notifications?", a: "Go to Profile → Notifications section and enable push notifications. You'll need to allow browser notifications when prompted." },
              ].map((faq) => (
                <Card key={faq.q}>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-1">{faq.q}</p>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Still need help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-primary" />
                    <a href="mailto:raheem.amer.swe@gmail.com" className="text-sm text-primary hover:underline">
                      raheem.amer.swe@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-primary" />
                    <a href="tel:+201018385093" className="text-sm text-primary hover:underline">
                      +201018385093
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
};

export default SupportCenter;
