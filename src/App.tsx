import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { SessionTimeoutWarning } from "@/components/auth/SessionTimeoutWarning";
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import Labs from "./pages/Labs";
import LabProfile from "./pages/LabProfile";
import PreferredLabs from "./pages/PreferredLabs";
import LabAdmin from "./pages/LabAdmin";
import NewOrder from "./pages/NewOrder";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import ProfileCompletion from "./pages/ProfileCompletion";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import Install from "./pages/Install";
import NotificationHistory from "./pages/NotificationHistory";
import OrderTracking from "./pages/OrderTracking";
import LabWorkflowManagement from "./pages/LabWorkflowManagement";
import DesignApprovalWorkflow from "./pages/DesignApprovalWorkflow";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useServiceWorkerUpdate();
  
  return (
    <>
      <SessionTimeoutWarning />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/labs" element={<Labs />} />
        <Route path="/labs/:labId" element={<LabProfile />} />
        <Route path="/preferred-labs" element={<PreferredLabs />} />
        <Route path="/lab-admin" element={<LabAdmin />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile-completion" element={<ProfileCompletion />} />
        <Route path="/new-order" element={<NewOrder />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/order-tracking" element={<OrderTracking />} />
        <Route path="/lab-workflow" element={<LabWorkflowManagement />} />
        <Route path="/design-approval" element={<DesignApprovalWorkflow />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/install" element={<Install />} />
        <Route path="/notifications" element={<NotificationHistory />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
