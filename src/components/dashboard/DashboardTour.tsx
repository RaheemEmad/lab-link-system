import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useAuth } from "@/hooks/useAuth";

interface DashboardTourProps {
  userRole: string;
  run: boolean;
  onComplete: () => void;
}

export function DashboardTour({ userRole, run, onComplete }: DashboardTourProps) {
  const { user } = useAuth();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      if (user?.id) {
        localStorage.setItem(`dashboard_tour_seen_${user.id}`, "true");
      }
      onComplete();
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
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--background))",
          arrowColor: "hsl(var(--background))",
          zIndex: 100000,
          overlayColor: "hsl(var(--background) / 0.85)",
        },
        overlay: {
          backdropFilter: "blur(4px)",
        },
        tooltip: {
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 60px -15px hsl(var(--primary) / 0.3), 0 0 0 1px hsl(var(--border))",
        },
        tooltipContent: {
          padding: "8px 0",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: 8,
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          transition: "all 0.2s ease",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: 12,
          fontSize: "14px",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "14px",
        },
      }}
      locale={{
        back: "← Back",
        close: "Close",
        last: "Finish Tour ✨",
        next: "Next →",
        skip: "Skip Tour",
      }}
      floaterProps={{
        disableAnimation: false,
        styles: {
          arrow: {
            length: 8,
            spread: 16,
          },
        },
      }}
    />
  );
}
