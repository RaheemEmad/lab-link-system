import { useCallback, useRef } from "react";

export function useAchievementSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playUnlockSound = useCallback(() => {
    try {
      // Create achievement unlock sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Play a triumphant chord sequence
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.value = frequency;
        osc.type = 'sine';
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      // Triumphant chord progression (C major -> G major -> C major)
      playNote(523.25, now, 0.3); // C5
      playNote(659.25, now, 0.3); // E5
      playNote(783.99, now, 0.3); // G5
      
      playNote(587.33, now + 0.15, 0.3); // D5
      playNote(783.99, now + 0.15, 0.3); // G5
      playNote(987.77, now + 0.15, 0.3); // B5
      
      playNote(523.25, now + 0.3, 0.5); // C5
      playNote(659.25, now + 0.3, 0.5); // E5
      playNote(1046.50, now + 0.3, 0.5); // C6
    } catch (error) {
      console.warn("Could not play achievement sound:", error);
    }
  }, []);

  const playProgressSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn("Could not play progress sound:", error);
    }
  }, []);

  return { playUnlockSound, playProgressSound };
}
