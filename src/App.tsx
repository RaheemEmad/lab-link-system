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
import { lazy, Suspense } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

// Eager load critical pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";

// Lazy load all other pages for better performance
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Labs = lazy(() => import("./pages/Labs"));
const LabProfile = lazy(() => import("./pages/LabProfile"));
const PreferredLabs = lazy(() => import("./pages/PreferredLabs"));
const LabAdmin = lazy(() => import("./pages/LabAdmin"));
const NewOrder = lazy(() => import("./pages/NewOrder"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileCompletion = lazy(() => import("./pages/ProfileCompletion"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const About = lazy(() => import("./pages/About"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const Install = lazy(() => import("./pages/Install"));
const NotificationHistory = lazy(() => import("./pages/NotificationHistory"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const LabWorkflowManagement = lazy(() => import("./pages/LabWorkflowManagement"));
const LabOrderDetail = lazy(() => import("./pages/LabOrderDetail"));
const DesignApprovalWorkflow = lazy(() => import("./pages/DesignApprovalWorkflow"));
const EditOrder = lazy(() => import("./pages/EditOrder"));
const OrdersMarketplace = lazy(() => import("./pages/OrdersMarketplace"));
const LabRequestsManagement = lazy(() => import("./pages/LabRequestsManagement"));
const LogisticsDashboard = lazy(() => import("./pages/LogisticsDashboard"));
const TrackOrders = lazy(() => import("./pages/TrackOrders"));
const Achievements = lazy(() => import("./pages/Achievements"));
const DoctorAchievements = lazy(() => import("./pages/DoctorAchievements"));
const LabAchievements = lazy(() => import("./pages/LabAchievements"));
const StyleGuide = lazy(() => import("./pages/StyleGuide"));
const AutosaveDemo = lazy(() => import("./pages/AutosaveDemo"));
const DraftsManager = lazy(() => import("./pages/DraftsManager"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ChatHistory = lazy(() => import("./pages/ChatHistory"));
const FeedbackRoom = lazy(() => import("./pages/FeedbackRoom"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient with better caching and stale time settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

const AppContent = () => {
  useServiceWorkerUpdate();
  const location = useLocation();
  usePageTitle();
  
  return (
    <>
      <HelpButton />
      <SessionTimeoutWarning />
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingScreen />}>
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
            <Route path="/feedback-room" element={<PageTransition><FeedbackRoom /></PageTransition>} />
            <Route path="/feedback-room/:orderId" element={<PageTransition><FeedbackRoom /></PageTransition>} />
            <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
            <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </Suspense>
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
