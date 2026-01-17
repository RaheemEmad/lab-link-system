import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

/**
 * NotificationPopup Provider Component
 * 
 * This component initializes the real-time notification listener
 * and handles showing popup toasts for important notifications.
 * 
 * Include this component once in your app layout to enable
 * real-time notification popups.
 */
export const NotificationPopup = () => {
  // Initialize real-time notification listener
  useRealtimeNotifications();
  
  // This component doesn't render anything visible
  // It only sets up the real-time listener and shows toasts
  return null;
};

export default NotificationPopup;
