import { useState, useRef, useEffect, useCallback } from 'react';

export type TimerStatus = 'IDLE' | 'HOLDING' | 'READY' | 'RUNNING' | 'FINISHED';

interface UseCubeTimerOptions {
  onSolveFinished: (timeSec: number) => void;
  disabled?: boolean;
}

export function useCubeTimer({ onSolveFinished, disabled = false }: UseCubeTimerOptions) {
  const [status, setStatus] = useState<TimerStatus>('IDLE');
  const [displayTime, setDisplayTime] = useState<number>(0);

  // Refs to maintain current values without triggering listener re-attachments
  const statusRef = useRef<TimerStatus>('IDLE');
  const startTimeRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const onSolveFinishedRef = useRef(onSolveFinished);

  useEffect(() => {
    onSolveFinishedRef.current = onSolveFinished;
  }, [onSolveFinished]);

  const updateStatus = (newStatus: TimerStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  };

  const stopRunningTimer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const finalSec = Math.round(elapsed * 100) / 100;
    setDisplayTime(finalSec);
    updateStatus('FINISHED');
    onSolveFinishedRef.current(finalSec);
  }, []);

  const startRunningTimer = useCallback(() => {
    updateStatus('RUNNING');
    startTimeRef.current = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setDisplayTime(elapsed);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling when pressing spacebar
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;

        const current = statusRef.current;
        if (current === 'RUNNING') {
          stopRunningTimer();
        } else if (current === 'IDLE' || current === 'FINISHED') {
          updateStatus('HOLDING');
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
          holdTimerRef.current = setTimeout(() => {
            if (statusRef.current === 'HOLDING') {
              updateStatus('READY');
            }
          }, 300); // 300ms hold to turn green
        }
      } else if (statusRef.current === 'RUNNING') {
        // Any key stops the timer while running
        e.preventDefault();
        stopRunningTimer();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }

        const current = statusRef.current;
        if (current === 'READY') {
          startRunningTimer();
        } else if (current === 'HOLDING') {
          // Released before 300ms passed
          updateStatus('IDLE');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [disabled, startRunningTimer, stopRunningTimer]);

  // Pointer / Touch controls for mobile / mouse
  const handlePointerDown = () => {
    if (disabled) return;
    const current = statusRef.current;
    if (current === 'RUNNING') {
      stopRunningTimer();
    } else if (current === 'IDLE' || current === 'FINISHED') {
      updateStatus('HOLDING');
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        if (statusRef.current === 'HOLDING') {
          updateStatus('READY');
        }
      }, 300);
    }
  };

  const handlePointerUp = () => {
    if (disabled) return;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    const current = statusRef.current;
    if (current === 'READY') {
      startRunningTimer();
    } else if (current === 'HOLDING') {
      updateStatus('IDLE');
    }
  };

  const resetTimer = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setDisplayTime(0);
    updateStatus('IDLE');
  }, []);

  return {
    status,
    displayTime,
    resetTimer,
    handlePointerDown,
    handlePointerUp,
  };
}
