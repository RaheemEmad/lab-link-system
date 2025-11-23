import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { usePageTitle } from "@/hooks/usePageTitle";
import { SessionTimeoutWarning } from "@/components/auth/SessionTimeoutWarning";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import { HelpButton } from "@/components/layout/HelpButton";
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
import Onboarding from "./pages/Onboarding";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import Install from "./pages/Install";
import NotificationHistory from "./pages/NotificationHistory";
import OrderTracking from "./pages/OrderTracking";
import LabWorkflowManagement from "./pages/LabWorkflowManagement";
import LabOrderDetail from "./pages/LabOrderDetail";
import DesignApprovalWorkflow from "./pages/DesignApprovalWorkflow";
import EditOrder from "./pages/EditOrder";
import OrdersMarketplace from "./pages/OrdersMarketplace";
import LabRequestsManagement from "./pages/LabRequestsManagement";
import LogisticsDashboard from "./pages/LogisticsDashboard";
import TrackOrders from "./pages/TrackOrders";
import Achievements from "./pages/Achievements";
import DoctorAchievements from "./pages/DoctorAchievements";
import LabAchievements from "./pages/LabAchievements";
import StyleGuide from "./pages/StyleGuide";
import AutosaveDemo from "./pages/AutosaveDemo";
import DraftsManager from "./pages/DraftsManager";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import ChatHistory from "./pages/ChatHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useServiceWorkerUpdate();
  const location = useLocation();
  usePageTitle();
  
  return (
    <>
      <HelpButton />
      <SessionTimeoutWarning />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/how-it-works" element={<PageTransition><HowItWorks /></PageTransition>} />
          <Route path="/labs" element={<PageTransition><Labs /></PageTransition>} />
          <Route path="/labs/:labId" element={<PageTransition><LabProfile /></PageTransition>} />
          <Route path="/preferred-labs" element={<PageTransition><PreferredLabs /></PageTransition>} />
          <Route path="/lab-admin" element={<PageTransition><LabAdmin /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
          <Route path="/profile-completion" element={<PageTransition><ProfileCompletion /></PageTransition>} />
          <Route path="/new-order" element={<PageTransition><NewOrder /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/order-tracking" element={<PageTransition><OrderTracking /></PageTransition>} />
          <Route path="/lab-workflow" element={<PageTransition><LabWorkflowManagement /></PageTransition>} />
          <Route path="/lab-order/:orderId" element={<PageTransition><LabOrderDetail /></PageTransition>} />
          <Route path="/design-approval" element={<PageTransition><DesignApprovalWorkflow /></PageTransition>} />
          <Route path="/edit-order/:orderId" element={<PageTransition><EditOrder /></PageTransition>} />
          <Route path="/orders-marketplace" element={<PageTransition><OrdersMarketplace /></PageTransition>} />
          <Route path="/lab-requests" element={<PageTransition><LabRequestsManagement /></PageTransition>} />
          <Route path="/logistics" element={<PageTransition><LogisticsDashboard /></PageTransition>} />
          <Route path="/track-orders" element={<PageTransition><TrackOrders /></PageTransition>} />
          <Route path="/achievements" element={<PageTransition><Achievements /></PageTransition>} />
          <Route path="/doctor-achievements" element={<PageTransition><DoctorAchievements /></PageTransition>} />
          <Route path="/lab-achievements" element={<PageTransition><LabAchievements /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/about" element={<PageTransition><About /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          <Route path="/notifications" element={<PageTransition><NotificationHistory /></PageTransition>} />
          <Route path="/style-guide" element={<PageTransition><StyleGuide /></PageTransition>} />
          <Route path="/autosave-demo" element={<PageTransition><AutosaveDemo /></PageTransition>} />
          <Route path="/drafts" element={<PageTransition><DraftsManager /></PageTransition>} />
          <Route path="/chat-history" element={<PageTransition><ChatHistory /></PageTransition>} />
          <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
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
  </ErrorBoundary>
);

export default App;
