import type { SolveRecord } from '../types';

const FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
const MODIFIERS = ['', "'", '2'] as const;

// Opposite face groups to prevent cancelling moves (e.g. U D U is invalid)
const OPPOSITE_AXES: Record<string, string> = {
  U: 'D',
  D: 'U',
  L: 'R',
  R: 'L',
  F: 'B',
  B: 'F',
};

/**
 * Generate a standard random-state-compliant 3x3 scramble string of length 21.
 * Ensures no same face in succession and no opposite face redundancy.
 */
export function generate3x3Scramble(length = 21): string {
  const moves: string[] = [];
  let lastFace = '';
  let secondLastFace = '';

  for (let i = 0; i < length; i++) {
    const validFaces = FACES.filter((face) => {
      if (face === lastFace) return false;
      if (secondLastFace && OPPOSITE_AXES[face] === lastFace && face === secondLastFace) {
        return false;
      }
      return true;
    });

    const chosenFace = validFaces[Math.floor(Math.random() * validFaces.length)];
    const chosenMod = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];

    moves.push(`${chosenFace}${chosenMod}`);
    secondLastFace = lastFace;
    lastFace = chosenFace;
  }

  return moves.join(' ');
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
