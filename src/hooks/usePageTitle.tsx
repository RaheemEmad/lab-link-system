import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteMetadata {
  title: string;
  description: string;
}

const routeMetadata: Record<string, RouteMetadata> = {
  '/': {
    title: 'LabLink - Transform Your Dental Lab Workflow',
    description: 'Transform chaotic WhatsApp-driven dental lab workflows into streamlined, transparent, trackable digital systems. Connect dentists, labs, and staff seamlessly.',
  },
  '/how-it-works': {
    title: 'How It Works - LabLink',
    description: 'Learn how LabLink streamlines your dental lab workflow with precise order tracking, automated assignments, and real-time updates.',
  },
  '/labs': {
    title: 'Browse Labs - LabLink',
    description: 'Discover and connect with top dental labs. View performance scores, specializations, and turnaround times.',
  },
  '/preferred-labs': {
    title: 'Preferred Labs - LabLink',
    description: 'Manage your preferred dental labs and streamline your order workflow with trusted partners.',
  },
  '/lab-admin': {
    title: 'Lab Administration - LabLink',
    description: 'Manage your dental lab operations, track orders, and optimize workflow efficiency.',
  },
  '/auth': {
    title: 'Sign In - LabLink',
    description: 'Access your LabLink account to manage dental lab orders and workflows.',
  },
  '/reset-password': {
    title: 'Reset Password - LabLink',
    description: 'Reset your LabLink account password securely.',
  },
  '/onboarding': {
    title: 'Welcome to LabLink',
    description: 'Get started with LabLink and set up your dental workflow account.',
  },
  '/profile-completion': {
    title: 'Complete Your Profile - LabLink',
    description: 'Complete your profile to access all LabLink features.',
  },
  '/new-order': {
    title: 'Create New Order - LabLink',
    description: 'Create a new dental lab order with precise specifications and tracking.',
  },
  '/dashboard': {
    title: 'Dashboard - LabLink',
    description: 'View and manage all your dental lab orders in one centralized dashboard.',
  },
  '/order-tracking': {
    title: 'Track Orders - LabLink',
    description: 'Track your dental lab orders in real-time with detailed status updates.',
  },
  '/lab-workflow': {
    title: 'Lab Workflow - LabLink',
    description: 'Manage and optimize your dental lab workflow with advanced tracking tools.',
  },
  '/design-approval': {
    title: 'Design Approval - LabLink',
    description: 'Review and approve dental restoration designs with detailed quality checks.',
  },
  '/orders-marketplace': {
    title: 'Orders Marketplace - LabLink',
    description: 'Browse and accept new dental lab orders from the marketplace.',
  },
  '/lab-requests': {
    title: 'Lab Applications - LabLink',
    description: 'Review and manage lab applications for your dental orders.',
  },
  '/logistics': {
    title: 'Logistics Dashboard - LabLink',
    description: 'Manage delivery schedules, tracking, and shipment details for all orders.',
  },
  '/track-orders': {
    title: 'Track Orders - LabLink',
    description: 'Monitor your dental lab orders with real-time location and status tracking.',
  },
  '/achievements': {
    title: 'Achievements - LabLink',
    description: 'View your achievements and milestones on LabLink.',
  },
  '/doctor-achievements': {
    title: 'My Achievements - LabLink',
    description: 'Track your dental practice achievements and performance milestones.',
  },
  '/lab-achievements': {
    title: 'Lab Achievements - LabLink',
    description: 'View your dental lab achievements and performance metrics.',
  },
  '/profile': {
    title: 'My Profile - LabLink',
    description: 'Manage your LabLink profile and account settings.',
  },
  '/about': {
    title: 'About Us - LabLink',
    description: 'Learn about LabLink and our mission to transform dental lab workflows.',
  },
  '/privacy': {
    title: 'Privacy Policy - LabLink',
    description: 'Read our privacy policy and learn how we protect your data.',
  },
  '/terms': {
    title: 'Terms of Service - LabLink',
    description: 'Review LabLink terms of service and usage guidelines.',
  },
  '/contact': {
    title: 'Contact Us - LabLink',
    description: 'Get in touch with our support team for assistance with LabLink.',
  },
  '/install': {
    title: 'Install App - LabLink',
    description: 'Install the LabLink progressive web app for offline access.',
  },
  '/notifications': {
    title: 'Notifications - LabLink',
    description: 'View and manage your LabLink notifications and alerts.',
  },
  '/admin/login': {
    title: 'Admin Login - LabLink',
    description: 'Administrative access to LabLink platform.',
  },
  '/admin': {
    title: 'Admin Panel - LabLink',
    description: 'Manage LabLink platform settings and user administration.',
  },
};

const updateMetaTag = (name: string, content: string) => {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const updateOGTag = (property: string, content: string) => {
  let element = document.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

export const usePageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    // Get metadata for current route
    let metadata = routeMetadata[location.pathname];
    
    if (!metadata) {
      // Handle dynamic routes
      if (location.pathname.startsWith('/labs/')) {
        metadata = {
          title: 'Lab Profile - LabLink',
          description: 'View detailed information about this dental lab including performance scores and specializations.',
        };
      } else if (location.pathname.startsWith('/lab-order/')) {
        metadata = {
          title: 'Order Details - LabLink',
          description: 'View and manage dental lab order details, status, and communication.',
        };
      } else if (location.pathname.startsWith('/edit-order/')) {
        metadata = {
          title: 'Edit Order - LabLink',
          description: 'Edit dental lab order specifications and details.',
        };
      } else {
        // Fallback to default
        metadata = {
          title: 'LabLink',
          description: 'Transform your dental lab workflow with precision, clarity, and reliability.',
        };
      }
    }

    // Update page title
    document.title = metadata.title;

    // Update meta description
    updateMetaTag('description', metadata.description);

    // Update Open Graph tags for social sharing
    updateOGTag('og:title', metadata.title);
    updateOGTag('og:description', metadata.description);
    updateOGTag('og:url', window.location.href);

    // Update Twitter Card tags
    updateMetaTag('twitter:title', metadata.title);
    updateMetaTag('twitter:description', metadata.description);
  }, [location.pathname]);
};
