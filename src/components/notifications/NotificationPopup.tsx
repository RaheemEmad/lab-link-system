import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useEffect } from "react";

/**
 * NotificationPopup Provider Component
 * 
 * This component initializes the real-time notification listener
 * and handles showing popup toasts for important notifications.
 * 
 * It also manages native browser notifications for lock screen support
 * on phones and tablets.
 * 
 * Include this component once in your app layout to enable
 * real-time notification popups.
 */
export const NotificationPopup = () => {
  // Initialize real-time notification listener with native notification support
  const { permission, requestPermission, isSupported } = useRealtimeNotifications();
  
  // Listen for navigation messages from service worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        window.location.href = event.data.url;
      }
    };
    
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);
  
  // This component doesn't render anything visible
  // It only sets up the real-time listener and shows toasts
  return null;
};

export default NotificationPopup;
