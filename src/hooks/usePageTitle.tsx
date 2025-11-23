import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const routeTitles: Record<string, string> = {
  '/': 'LabLink - Transform Your Dental Lab Workflow',
  '/how-it-works': 'How It Works - LabLink',
  '/labs': 'Browse Labs - LabLink',
  '/preferred-labs': 'Preferred Labs - LabLink',
  '/lab-admin': 'Lab Administration - LabLink',
  '/auth': 'Sign In - LabLink',
  '/reset-password': 'Reset Password - LabLink',
  '/onboarding': 'Welcome to LabLink',
  '/profile-completion': 'Complete Your Profile - LabLink',
  '/new-order': 'Create New Order - LabLink',
  '/dashboard': 'Dashboard - LabLink',
  '/order-tracking': 'Track Orders - LabLink',
  '/lab-workflow': 'Lab Workflow - LabLink',
  '/design-approval': 'Design Approval - LabLink',
  '/orders-marketplace': 'Orders Marketplace - LabLink',
  '/lab-requests': 'Lab Applications - LabLink',
  '/logistics': 'Logistics Dashboard - LabLink',
  '/track-orders': 'Track Orders - LabLink',
  '/achievements': 'Achievements - LabLink',
  '/doctor-achievements': 'My Achievements - LabLink',
  '/lab-achievements': 'Lab Achievements - LabLink',
  '/profile': 'My Profile - LabLink',
  '/about': 'About Us - LabLink',
  '/privacy': 'Privacy Policy - LabLink',
  '/terms': 'Terms of Service - LabLink',
  '/contact': 'Contact Us - LabLink',
  '/install': 'Install App - LabLink',
  '/notifications': 'Notifications - LabLink',
  '/style-guide': 'Style Guide - LabLink',
  '/autosave-demo': 'Autosave Demo - LabLink',
  '/drafts': 'Drafts - LabLink',
  '/chat-history': 'Chat History - LabLink',
  '/admin/login': 'Admin Login - LabLink',
  '/admin': 'Admin Panel - LabLink',
};

export const usePageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    // Get the base path (without dynamic segments)
    const basePath = location.pathname.split('/').slice(0, 2).join('/') || '/';
    
    // Check for dynamic routes
    let title = routeTitles[location.pathname];
    
    if (!title) {
      // Handle dynamic routes
      if (location.pathname.startsWith('/labs/')) {
        title = 'Lab Profile - LabLink';
      } else if (location.pathname.startsWith('/lab-order/')) {
        title = 'Order Details - LabLink';
      } else if (location.pathname.startsWith('/edit-order/')) {
        title = 'Edit Order - LabLink';
      } else {
        // Fallback to base path or default
        title = routeTitles[basePath] || 'LabLink';
      }
    }

    document.title = title;
  }, [location.pathname]);
};
