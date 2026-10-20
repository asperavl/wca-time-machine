import type { SolveRecord } from '../types';
import { randomScrambleForEvent } from 'cubing/scramble';

/**
 * Generate an official WCA-compliant random-state 3x3 scramble using cubing.js.
 * Uses Herbert Kociemba's Two-Phase Algorithm across all 43 quintillion legal states.
 */
export async function generateWcaRandomStateScramble(): Promise<string> {
  const scramble = await randomScrambleForEvent('333');
  return scramble.toString();
}

/**
 * Generate multiple official WCA-compliant random-state 3x3 scrambles.
 */
export async function generateWcaScrambles(count = 5): Promise<string[]> {
  const promises = Array.from({ length: count }, () => randomScrambleForEvent('333'));
  const results = await Promise.all(promises);
  return results.map((s) => s.toString());
}

/**
 * Return CSS color class based on the facelet axis of the move.
 */
export function getMoveColorClass(move: string): string {
  const face = move.charAt(0).toUpperCase();
  switch (face) {
    case 'U': return 'move-u';
    case 'D': return 'move-d';
    case 'F': return 'move-f';
    case 'B': return 'move-b';
    case 'R': return 'move-r';
    case 'L': return 'move-l';
    default: return '';
  }
}

export interface Ao5CalculationResult {
  ao5Sec: number | null; // null if DNF
  bestSingleSec: number | null;
  bestIndex: number | null;
  worstIndex: number | null;
}

/**
 * Calculate WCA-compliant Average of 5 (Ao5).
 * Drops fastest and slowest, averages middle 3.
 * Handles +2 penalties and DNF rules strictly.
 */
export function calculateAo5(solves: SolveRecord[]): Ao5CalculationResult {
  if (solves.length !== 5) {
    return { ao5Sec: null, bestSingleSec: null, bestIndex: null, worstIndex: null };
  }

  // Map each solve to an effective time (DNF = Infinity)
  const effectiveTimes = solves.map((s) => {
    if (s.penalty === 'DNF') return Infinity;
    if (s.penalty === '+2') return Math.round((s.rawTimeSec + 2.0) * 100) / 100;
    return s.rawTimeSec;
  });

  const validTimes = effectiveTimes.filter((t) => t !== Infinity);
  const bestSingleSec = validTimes.length > 0 ? Math.min(...validTimes) : null;

  // Find index of best (fastest) and worst (slowest)
  let bestIdx = 0;
  let worstIdx = 0;

  for (let i = 1; i < 5; i++) {
    if (effectiveTimes[i] < effectiveTimes[bestIdx]) {
      bestIdx = i;
    }
    if (effectiveTimes[i] > effectiveTimes[worstIdx]) {
      worstIdx = i;
    }
  }

  // Count DNFs
  const dnfCount = solves.filter((s) => s.penalty === 'DNF').length;
  if (dnfCount >= 2) {
    return {
      ao5Sec: null, // Official WCA DNF
      bestSingleSec,
      bestIndex: bestIdx,
      worstIndex: worstIdx,
    };
  }

  // Exclude best and worst indices
  const trimmed = effectiveTimes.filter((_, idx) => idx !== bestIdx && idx !== worstIdx);

  if (trimmed.length !== 3 || trimmed.includes(Infinity)) {
    return {
      ao5Sec: null,
      bestSingleSec,
      bestIndex: bestIdx,
      worstIndex: worstIdx,
    };
  }

  const sum = trimmed.reduce((acc, curr) => acc + curr, 0);
  const ao5Sec = Math.round((sum / 3.0) * 100) / 100;

  return {
    ao5Sec,
    bestSingleSec,
    bestIndex: bestIdx,
    worstIndex: worstIdx,
  };
}

/**
 * Format seconds into mm:ss.xx or ss.xx
 */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds === Infinity) return 'DNF';

  const mins = Math.floor(seconds / 60);
  const remSecs = (seconds % 60).toFixed(2);

  if (mins > 0) {
    const paddedSecs = (seconds % 60) < 10 ? `0${remSecs}` : remSecs;
    return `${mins}:${paddedSecs}`;
  }
  return remSecs;
}
