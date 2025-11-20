import { useEffect, useRef } from "react";

/**
 * Custom hook to play notification sounds using Web Audio API
 * Plays a notification beep when called
 */
export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on mount
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    return () => {
      // Cleanup on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playUrgentNotification = () => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create oscillator for a more urgent, attention-grabbing sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Urgent notification: rapid beeps
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.setValueAtTime(1000, now + 0.1);
    oscillator.frequency.setValueAtTime(800, now + 0.2);
    
    oscillator.type = 'sine';

    // Volume envelope for a sharp, attention-grabbing sound
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.setValueAtTime(0.3, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
    gainNode.gain.setValueAtTime(0, now + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  };

  const playNormalNotification = () => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Create oscillator for a subtle notification sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Gentle notification tone
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.type = 'sine';

    // Soft volume envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  };

  return {
    playUrgentNotification,
    playNormalNotification,
  };
};
