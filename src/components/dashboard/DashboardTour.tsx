import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DashboardTourProps {
  userRole: string;
}

export function DashboardTour({ userRole }: DashboardTourProps) {
  const [run, setRun] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user?.id) return;

      // Check if user has seen the tour
      const tourKey = `dashboard_tour_seen_${user.id}`;
      const hasSeenTour = localStorage.getItem(tourKey);

      if (!hasSeenTour) {
        // Small delay to let dashboard render
        setTimeout(() => setRun(true), 1000);
      }
    };

    checkTourStatus();
  }, [user]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) && user?.id) {
      localStorage.setItem(`dashboard_tour_seen_${user.id}`, "true");
      setRun(false);
    }
  };

  const doctorSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Welcome to Your Dashboard! 🎉</h3>
          <p>Let's take a quick tour of the key features to help you get started with LabLink.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="stats-cards"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Order Statistics</h3>
          <p>Track your total orders, pending cases, in-progress work, and completed deliveries at a glance.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="new-order-btn"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Create New Order</h3>
          <p>Click here to submit a new lab order. It's quick and guided!</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="notifications-btn"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Stay Updated</h3>
          <p>Check your notifications here for order updates, lab notes, and delivery alerts.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="track-orders-btn"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Track Orders</h3>
          <p>View real-time tracking and delivery status for all your active orders.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="search-filter"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Search & Filter</h3>
          <p>Quickly find orders by patient name, order ID, or filter by status.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="orders-table"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Your Orders</h3>
          <p>All your orders in one place. Click the menu on each row to view history, notes, or update the order.</p>
        </div>
      ),
      placement: "top",
    },
  ];

  const labStaffSteps: Step[] = [
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Welcome to Your Lab Dashboard! 🔬</h3>
          <p>Let's explore the tools you'll use to manage orders and deliver excellence.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="stats-cards"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Order Overview</h3>
          <p>Monitor total incoming orders, pending work, active production, and completed deliveries.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="search-filter"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Find Orders Fast</h3>
          <p>Search by doctor, patient, or order ID. Filter by status to focus on what needs attention.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="orders-table"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Manage Production</h3>
          <p>Update order status, add notes for dentists, and track production workflow from this table.</p>
        </div>
      ),
      placement: "top",
    },
    {
      target: '[data-tour="notifications-btn"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Stay Connected</h3>
          <p>Get notified of new orders, urgent requests, and dentist messages.</p>
        </div>
      ),
      placement: "bottom",
    },
  ];

  const steps = userRole === "doctor" ? doctorSteps : labStaffSteps;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(221 100% 60%)",
          textColor: "hsl(215 20% 24%)",
          backgroundColor: "hsl(0 0% 100%)",
          arrowColor: "hsl(0 0% 100%)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: "hsl(221 100% 60%)",
          borderRadius: 8,
          padding: "8px 16px",
        },
        buttonBack: {
          color: "hsl(215 20% 50%)",
          marginRight: 10,
        },
        buttonSkip: {
          color: "hsl(215 20% 50%)",
        },
      }}
    />
  );
}
