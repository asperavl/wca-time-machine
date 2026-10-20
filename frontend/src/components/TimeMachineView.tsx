import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { OverviewData, YearDetail, SolveRecord, MetricType } from '../types';
import { fetchYearDetail, calculateTopPercentile } from '../api';
import { generateWcaScrambles, calculateAo5, formatTime, getMoveColorClass } from '../utils/wca';
import { useCubeTimer } from '../hooks/useCubeTimer';
import { RotateCcw, Check, Copy, Keyboard, AlertCircle } from 'lucide-react';

import { YearScrubberBar } from './YearScrubberBar';

interface TimeMachineViewProps {
  overview: OverviewData;
  activeSessionInProgress?: boolean;
  setActiveSessionInProgress?: (inProgress: boolean) => void;
  onTimerRunningChange?: (isRunning: boolean) => void;
  isActiveTab?: boolean;
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
}

export const TimeMachineView: React.FC<TimeMachineViewProps> = ({
  overview,
  setActiveSessionInProgress,
  onTimerRunningChange,
  isActiveTab = true,
  selectedYear: propSelectedYear,
  onSelectYear: propOnSelectYear,
}) => {
  // Scrambles for the 5 solves (persisted across tab switches and refreshes)
  const [scrambles, setScrambles] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('wca_active_scrambles');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Solves recorded so far
  const [solves, setSolves] = useState<SolveRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem('wca_active_solves');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [currentSolveIdx, setCurrentSolveIdx] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('wca_active_solves');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Math.min(parsed.length, 4);
      }
    } catch {}
    return 0;
  });

  // Result inspection year (synchronized with global prop or local state)
  const [internalInspectedYear, setInternalInspectedYear] = useState<number>(2024);
  const inspectedYear = propSelectedYear !== undefined ? propSelectedYear : internalInspectedYear;
  const setInspectedYear = propOnSelectYear || setInternalInspectedYear;
  const [inspectedDetail, setInspectedDetail] = useState<YearDetail | null>(null);

  // Manual entry toggle
  const [manualInputMode, setManualInputMode] = useState<boolean>(false);
  const [manualTimeStr, setManualTimeStr] = useState<string>('');
  const [copiedScramble, setCopiedScramble] = useState<boolean>(false);

  // Result percentile graph metric toggle (Ao5 vs Single)
  const [resultGraphMetric, setResultGraphMetric] = useState<MetricType>('average');

  // Scramble generation state and monotonic request tracking
  const [loadingScrambles, setLoadingScrambles] = useState<boolean>(false);
  const [scrambleError, setScrambleError] = useState<string | null>(null);
  const scrambleRequestIdRef = useRef<number>(0);

  const fetchScrambles = useCallback(() => {
    const requestId = ++scrambleRequestIdRef.current;
    setLoadingScrambles(true);
    setScrambleError(null);

    generateWcaScrambles(5)
      .then((wcaScrambles) => {
        if (requestId === scrambleRequestIdRef.current) {
          setScrambles(wcaScrambles);
          setLoadingScrambles(false);
          setScrambleError(null);
        }
      })
      .catch((err) => {
        console.error('Failed to generate WCA scrambles:', err);
        if (requestId === scrambleRequestIdRef.current) {
          setLoadingScrambles(false);
          setScrambleError('Unable to generate official WCA scramble in this environment.');
        }
      });
  }, []);

  // Fetch official WCA random-state scrambles when none exist
  useEffect(() => {
    if (scrambles.length === 0) {
      fetchScrambles();
    }
  }, [scrambles.length, fetchScrambles]);

  // Synchronize active session state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('wca_active_solves', JSON.stringify(solves));
      sessionStorage.setItem('wca_active_scrambles', JSON.stringify(scrambles));
    } catch {}
  }, [solves, scrambles]);

  // Callback when a solve finishes via timer
  const handleSolveFinished = (finalSec: number) => {
    const newSolve: SolveRecord = {
      id: currentSolveIdx + 1,
      scramble: scrambles[currentSolveIdx] || '',
      rawTimeSec: finalSec,
      penalty: 'NONE',
      finalTimeSec: finalSec,
    };

    setSolves((prev) => [...prev, newSolve]);
    if (currentSolveIdx < 4) {
      setCurrentSolveIdx((prev) => prev + 1);
    }
  };

  const timer = useCubeTimer({
    onSolveFinished: handleSolveFinished,
    disabled: !isActiveTab || manualInputMode || solves.length >= 5 || loadingScrambles || scrambles.length === 0,
  });

  // Notify parent if the timer is actively running or primed
  useEffect(() => {
    const isMidSolve = timer.status === 'RUNNING' || timer.status === 'HOLDING' || timer.status === 'READY';
    onTimerRunningChange?.(isMidSolve);
  }, [timer.status, onTimerRunningChange]);

  // Sync activeSessionInProgress flag to parent if callback provided
  useEffect(() => {
    if (setActiveSessionInProgress) {
      const inProgress = solves.length > 0 && solves.length < 5;
      setActiveSessionInProgress(inProgress);
    }
  }, [solves, setActiveSessionInProgress]);

  // Load inspected year details once session finishes
  useEffect(() => {
    if (solves.length === 5) {
      fetchYearDetail(inspectedYear)
        .then(setInspectedDetail)
        .catch((err) => console.error(err));
    }
  }, [solves.length, inspectedYear]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(manualTimeStr.trim());
    if (isNaN(parsed) || parsed <= 0) return;

    const finalSec = Math.round(parsed * 100) / 100;
    handleSolveFinished(finalSec);
    setManualTimeStr('');
  };

  const updatePenalty = (index: number, penalty: 'NONE' | '+2' | 'DNF') => {
    setSolves((prev) =>
      prev.map((s, idx) => {
        if (idx !== index) return s;
        let finalTime: number | null = s.rawTimeSec;
        if (penalty === '+2') finalTime = Math.round((s.rawTimeSec + 2.0) * 100) / 100;
        if (penalty === 'DNF') finalTime = null;

        return {
          ...s,
          penalty,
          finalTimeSec: finalTime,
        };
      })
    );
  };

  const resetSession = () => {
    setSolves([]);
    setCurrentSolveIdx(0);
    setScrambles([]);
    try {
      sessionStorage.removeItem('wca_active_solves');
      sessionStorage.removeItem('wca_active_scrambles');
    } catch {}
    if (setActiveSessionInProgress) {
      setActiveSessionInProgress(false);
    }
    fetchScrambles();
  };

  const copyCurrentScramble = () => {
    if (!scrambles[currentSolveIdx]) return;
    navigator.clipboard.writeText(scrambles[currentSolveIdx]);
    setCopiedScramble(true);
    setTimeout(() => setCopiedScramble(false), 1500);
  };

  const ao5Calc = calculateAo5(solves);
  const sessionCompleted = solves.length === 5;

  // Compute user percentiles for the currently inspected year
  const userAo5TopPct =
    inspectedDetail && ao5Calc.ao5Sec !== null
      ? calculateTopPercentile(ao5Calc.ao5Sec, inspectedDetail.average.percentiles)
      : null;

  const userSingleTopPct =
    inspectedDetail && ao5Calc.bestSingleSec !== null
      ? calculateTopPercentile(ao5Calc.bestSingleSec, inspectedDetail.single.percentiles)
      : null;

  // Active user metric evaluation
  const activeUserTime = resultGraphMetric === 'average' ? ao5Calc.ao5Sec : ao5Calc.bestSingleSec;
  const userActiveTopPct = resultGraphMetric === 'average' ? userAo5TopPct : userSingleTopPct;

  // "Across the Eras" percentile graph data across all years
  const acrossErasData = useMemo(() => {
    if (!sessionCompleted || activeUserTime === null) return [];

    return overview.years
      .filter((y) => {
        if (resultGraphMetric === 'average' && y.year === 1982) return false;
        return true;
      })
      .map((y) => {
        const stats = resultGraphMetric === 'average' ? y.average : y.single;
        let topPct: number | null = null;

        if (stats.min && activeUserTime <= stats.min) {
          topPct = 0.1;
        } else if (stats.p90 && stats.p10) {
          if (activeUserTime <= stats.p10) topPct = 5.0;
          else if (stats.p25 && activeUserTime <= stats.p25) topPct = 17.5;
          else if (stats.median && activeUserTime <= stats.median) topPct = 37.5;
          else if (stats.p75 && activeUserTime <= stats.p75) topPct = 62.5;
          else if (activeUserTime <= stats.p90) topPct = 82.5;
          else topPct = 95.0;
        }

        return {
          year: y.year,
          topPercentile: topPct,
          median: stats.median,
          isInspectedYear: y.year === inspectedYear,
        };
      });
  }, [sessionCompleted, resultGraphMetric, activeUserTime, overview.years, inspectedYear]);


  return (
    <div className="time-machine-view">
      {/* ACTIVE SOLVING VIEW */}
      {!sessionCompleted ? (
        <div>
          {/* Scramble Presentation Strip */}
          <div className="surface-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--cube-yellow)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  SOLVE {currentSolveIdx + 1} OF 5
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>• Official 3×3 Scramble Sequence</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setManualInputMode(!manualInputMode)}
                >
                  <Keyboard size={13} />
                  {manualInputMode ? 'Use Spacebar Timer' : 'Enter Time Manually'}
                </button>

                <button
                  onClick={copyCurrentScramble}
                  className="btn-secondary btn-sm"
                  title="Copy Scramble"
                >
                  {copiedScramble ? <Check size={13} style={{ color: 'var(--cube-green)' }} /> : <Copy size={13} />}
                  {copiedScramble ? 'Copied' : 'Copy'}
                </button>

                <button
                  className="btn-secondary btn-sm"
                  onClick={resetSession}
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            </div>

            {/* Color-Coded Scramble Display */}
            <div
              className="scramble-strip"
              style={{ marginBottom: 0 }}
            >
              {scrambleError ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--color-error)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} /> {scrambleError}
                  </span>
                  <button className="btn-secondary btn-sm" onClick={fetchScrambles}>
                    <RotateCcw size={12} /> Retry Scramble Generation
                  </button>
                </div>
              ) : loadingScrambles || !scrambles[currentSolveIdx] ? (
                <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: 13 }}>
                  Generating official WCA random-state scramble...
                </span>
              ) : (
                scrambles[currentSolveIdx].split(' ').map((move, idx) => (
                  <span key={idx} className={getMoveColorClass(move)} style={{ display: 'inline-block', marginRight: 10 }}>
                    {move}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Precision Stopwatch */}
          {!manualInputMode ? (
            <div
              className="stopwatch-container"
              onPointerDown={timer.handlePointerDown}
              onPointerUp={timer.handlePointerUp}
            >
              <div
                className={`stopwatch-display ${
                  timer.status === 'READY'
                    ? 'stopwatch-ready'
                    : timer.status === 'HOLDING'
                    ? 'stopwatch-holding'
                    : timer.status === 'RUNNING'
                    ? 'stopwatch-running'
                    : 'stopwatch-idle'
                }`}
              >
                {timer.displayTime === 0 ? '0.00' : timer.displayTime.toFixed(2)}
              </div>

              <div className="stopwatch-instructions">
                {scrambleError && 'SCRAMBLE GENERATION FAILED. CLICK RETRY ABOVE TO PROCEED.'}
                {!scrambleError && loadingScrambles && 'GENERATING OFFICIAL WCA RANDOM-STATE SCRAMBLE...'}
                {!scrambleError && !loadingScrambles && timer.status === 'IDLE' && 'HOLD SPACEBAR (OR HOLD SCREEN) TO GET READY'}
                {!scrambleError && !loadingScrambles && timer.status === 'HOLDING' && 'HOLD UNTIL GREEN LOCK...'}
                {!scrambleError && !loadingScrambles && timer.status === 'READY' && 'READY! RELEASE SPACEBAR TO START SOLVING'}
                {!scrambleError && !loadingScrambles && timer.status === 'RUNNING' && 'PRESS ANY KEY OR TAP SCREEN TO STOP'}
                {!scrambleError && !loadingScrambles && timer.status === 'FINISHED' && 'SOLVE LOGGED! HOLD SPACEBAR FOR NEXT SOLVE'}
              </div>
            </div>
          ) : (
            <div className="surface-card" style={{ padding: '30px 20px', textAlign: 'center', marginBottom: 24 }}>
              <form onSubmit={handleManualSubmit} style={{ maxWidth: 340, margin: '0 auto' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                  Enter Solve {currentSolveIdx + 1} Result (seconds):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 14.85"
                    className="select-input"
                    style={{ flex: 1, fontSize: 18, textAlign: 'center' }}
                    value={manualTimeStr}
                    onChange={(e) => setManualTimeStr(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn-primary">
                    Record
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 5-Solve Session */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              5-Solve Session (Ao5)
            </div>

            <div className="solve-cassette solve-cassette-scrollable">
              {Array.from({ length: 5 }).map((_, idx) => {
                const s = solves[idx];
                const isCurrent = idx === currentSolveIdx && solves.length < 5;

                return (
                  <div
                    key={idx}
                    className={`solve-pod ${isCurrent ? 'active' : ''}`}
                  >
                    <div className="solve-pod-header">
                      <span className="solve-pod-index">SOLVE #{idx + 1}</span>
                      <span className={`solve-pod-tag ${isCurrent ? 'tag-active' : s ? 'tag-counted' : 'tag-queued'}`}>
                        {isCurrent ? 'ACTIVE' : s ? 'RECORDED' : 'QUEUED'}
                      </span>
                    </div>

                    <div className="solve-pod-time">
                      {s ? (s.penalty === 'DNF' ? 'DNF' : `${s.finalTimeSec?.toFixed(2)}s`) : '--.--'}
                    </div>

                    <div className="solve-pod-scramble" title={scrambles[idx] || ''}>
                      {scrambles[idx] || (loadingScrambles ? 'Generating...' : '--')}
                    </div>

                    {s && (
                      <div className="pod-modifiers">
                        <button
                          className={`btn-modifier ${s.penalty === '+2' ? 'active-pen' : ''}`}
                          onClick={() => updatePenalty(idx, s.penalty === '+2' ? 'NONE' : '+2')}
                        >
                          +2s
                        </button>
                        <button
                          className={`btn-modifier ${s.penalty === 'DNF' ? 'active-dnf' : ''}`}
                          onClick={() => updatePenalty(idx, s.penalty === 'DNF' ? 'NONE' : 'DNF')}
                        >
                          DNF
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* COMPLETED SESSION: HISTORICAL SPECTROGRAM UNLOCKED */
        <div>
          {/* Main Ao5 Headline */}
          <div className="benchmark-banner">
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--cube-yellow)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
                YOUR AO5 RESULT
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                <span className="ao5-headline">
                  {ao5Calc.ao5Sec !== null ? `${ao5Calc.ao5Sec.toFixed(2)}s` : 'DNF'}
                </span>
                <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
                  Average of 5 (Ao5)
                </span>
                {ao5Calc.bestSingleSec && (
                  <span style={{ fontSize: 15, color: 'var(--cube-blue)', fontFamily: 'var(--font-mono)' }}>
                    Best Single: {ao5Calc.bestSingleSec.toFixed(2)}s
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                Fastest and slowest times trimmed automatically. Compared against 1,880,000+ official competition rounds.
              </p>
            </div>

            <button className="btn-primary" onClick={resetSession}>
              <RotateCcw size={14} /> Start New 5-Solve Session
            </button>
          </div>

          {/* 5-Solve Breakdown with Trimming Badges */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              Official Ao5 Breakdown
            </div>

            <div className="solve-cassette solve-cassette-scrollable">
              {solves.map((s, idx) => {
                const isBest = idx === ao5Calc.bestIndex;
                const isWorst = idx === ao5Calc.worstIndex;

                return (
                  <div
                    key={idx}
                    className={`solve-pod ${
                      isBest ? 'trimmed-best' : isWorst ? 'trimmed-worst' : 'counted'
                    }`}
                  >
                    <div className="solve-pod-header">
                      <span className="solve-pod-index">SOLVE #{idx + 1}</span>
                      <span className={`solve-pod-tag ${isBest ? 'tag-best' : isWorst ? 'tag-worst' : 'tag-counted'}`}>
                        {isBest ? 'TRIMMED (FAST)' : isWorst ? 'TRIMMED (SLOW)' : 'COUNTED'}
                      </span>
                    </div>

                    <div className="solve-pod-time" style={{ color: isBest ? 'var(--cube-green)' : isWorst ? 'var(--cube-red)' : 'var(--text-primary)' }}>
                      {isBest || isWorst ? `(${formatTime(s.finalTimeSec)})` : `${formatTime(s.finalTimeSec)}s`}
                    </div>

                    <div className="solve-pod-scramble" title={s.scramble}>
                      {s.scramble}
                    </div>

                    <div className="pod-modifiers">
                      <button
                        className={`btn-modifier ${s.penalty === '+2' ? 'active-pen' : ''}`}
                        onClick={() => updatePenalty(idx, s.penalty === '+2' ? 'NONE' : '+2')}
                      >
                        +2s
                      </button>
                      <button
                        className={`btn-modifier ${s.penalty === 'DNF' ? 'active-dnf' : ''}`}
                        onClick={() => updatePenalty(idx, s.penalty === 'DNF' ? 'NONE' : 'DNF')}
                      >
                        DNF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Persistent Pinned Top Year Scrubber Bar */}
          <YearScrubberBar
            availableYears={overview.available_years}
            selectedYear={inspectedYear}
            onSelectYear={setInspectedYear}
            disabledYears={resultGraphMetric === 'average' ? [1982] : []}
            label="Benchmark Season"
            subtext={`Your Rank in ${inspectedYear}: Top ${userActiveTopPct}%`}
          />

          {/* Historical Percentile Chart */}
          <div className="surface-card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Your Global Percentile Over Time (1982 to 2026)</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Showing your global percentile across speedcubing history for your {resultGraphMetric === 'average' ? `Ao5 (${ao5Calc.ao5Sec?.toFixed(2)}s)` : `Single (${ao5Calc.bestSingleSec?.toFixed(2)}s)`}. Top 0% is World #1.
                </p>
              </div>

              <div className="nav-tabs">
                <button
                  className={`nav-tab-btn ${resultGraphMetric === 'average' ? 'active' : ''}`}
                  onClick={() => setResultGraphMetric('average')}
                >
                  Ao5 Metric
                </button>
                <button
                  className={`nav-tab-btn ${resultGraphMetric === 'single' ? 'active' : ''}`}
                  onClick={() => setResultGraphMetric('single')}
                >
                  Best Single
                </button>
              </div>
            </div>

            <div style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={acrossErasData}
                  margin={{ top: 28, right: 36, left: 0, bottom: 20 }}
                  onClick={(e) => {
                    if (e && e.activeLabel) {
                      const yr = Number(e.activeLabel);
                      if (overview.available_years.includes(yr)) setInspectedYear(yr);
                    }
                  }}
                >
                  <CartesianGrid stroke="#1E2536" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#475569"
                    tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    stroke="#475569"
                    unit="%"
                    domain={[0, 100]}
                    reversed={true}
                    tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#111520', border: '1px solid #2B354C', borderRadius: 4, padding: '10px 14px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                          <div style={{ fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>WCA Season {label}</div>
                          <div style={{ color: 'var(--cube-yellow)' }}>Global Standing: Top {d.topPercentile}%</div>
                          <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>Era Median: {d.median}s</div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    x={inspectedYear}
                    stroke="#3B82F6"
                    strokeDasharray="3 3"
                    label={(props: any) => {
                      const { viewBox } = props;
                      if (!viewBox) return null;
                      const x = viewBox.x;
                      const y = viewBox.y - 8;
                      const isNearRight = inspectedYear >= 2024;
                      const isNearLeft = inspectedYear <= 2004;
                      const anchor = isNearRight ? 'end' : isNearLeft ? 'start' : 'middle';
                      const dx = isNearRight ? -6 : isNearLeft ? 6 : 0;
                      return (
                        <text
                          x={x + dx}
                          y={y}
                          fill="#60A5FA"
                          textAnchor={anchor}
                          fontSize={11}
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight={600}
                        >
                          Viewing {inspectedYear}
                        </text>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="topPercentile"
                    name="Top Percentile"
                    stroke="#EAB308"
                    strokeWidth={2.4}
                    dot={{ r: 3.5, fill: '#EAB308' }}
                    activeDot={{ r: 6, fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deep Dive into Selected Era Distribution */}
          <div className="surface-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  Season {inspectedYear} Performance Distribution
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Showing your solve time ({activeUserTime?.toFixed(2)}s) plotted against all official results recorded in {inspectedYear}.
                </p>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cube-green)', fontWeight: 600 }}>
                Season {inspectedYear} Benchmark: Top {userActiveTopPct}%
              </div>
            </div>

            {/* Quick 4-box Stat Strip */}
            <div className="benchmark-card-grid">
              <div className="stat-box border-yellow">
                <div className="stat-box-label">Your Delta vs {inspectedYear} Median</div>
                <div className="stat-box-val" style={{ color: 'var(--cube-yellow)' }}>
                  {ao5Calc.ao5Sec && inspectedDetail?.summary.average.median
                    ? `${(inspectedDetail.summary.average.median - ao5Calc.ao5Sec).toFixed(2)}s`
                    : '-'}
                </div>
                <div className="stat-box-sub">
                  {ao5Calc.ao5Sec && inspectedDetail?.summary.average.median
                    ? ao5Calc.ao5Sec < inspectedDetail.summary.average.median
                      ? 'Faster than typical competitor'
                      : 'Slower than typical competitor'
                    : '-'}
                </div>
              </div>

              <div className="stat-box border-blue">
                <div className="stat-box-label">{inspectedYear} Season Median</div>
                <div className="stat-box-val">
                  {formatTime(resultGraphMetric === 'average' ? inspectedDetail?.summary.average.median : inspectedDetail?.summary.single.median)}s
                </div>
                <div className="stat-box-sub">50th percentile of {inspectedYear} field</div>
              </div>

              <div className="stat-box border-orange">
                <div className="stat-box-label">{inspectedYear} Elite (Top 10%)</div>
                <div className="stat-box-val" style={{ color: 'var(--cube-orange)' }}>
                  {formatTime(resultGraphMetric === 'average' ? inspectedDetail?.summary.average.p10 : inspectedDetail?.summary.single.p10)}s
                </div>
                <div className="stat-box-sub">Decile threshold cutoff</div>
              </div>

              <div className="stat-box border-green">
                <div className="stat-box-label">{inspectedYear} Official Competitors</div>
                <div className="stat-box-val">
                  {inspectedDetail?.summary.competitors.toLocaleString()}
                </div>
                <div className="stat-box-sub">Sanctioned athletes recorded</div>
              </div>
            </div>

            {/* Histogram with User Time Marker */}
            {inspectedDetail && (
              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resultGraphMetric === 'average' ? inspectedDetail.average.histogram : inspectedDetail.single.histogram}
                    margin={{ top: 28, right: 15, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid stroke="#1E2536" vertical={false} />
                    <XAxis
                      dataKey="start"
                      unit="s"
                      interval={9}
                      stroke="#475569"
                      tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis
                      stroke="#475569"
                      tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const bin = payload[0].payload;
                        return (
                          <div style={{ background: '#111520', border: '1px solid #2B354C', borderRadius: 4, padding: '8px 12px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                            <div style={{ fontWeight: 600, color: '#F8FAFC', marginBottom: 4 }}>Solve Time: {bin.label}</div>
                            <div style={{ color: 'var(--cube-green)' }}>Rounds: {bin.count.toLocaleString()}</div>
                            <div style={{ color: '#94A3B8', fontSize: 11 }}>Cumulative: Top {bin.cumulative_pct}%</div>
                          </div>
                        );
                      }}
                    />
                    {activeUserTime && (
                      <ReferenceLine
                        x={Math.floor(activeUserTime * 2) / 2.0}
                        stroke="#EAB308"
                        strokeWidth={2}
                        label={{
                          value: `Your Time ${activeUserTime.toFixed(2)}s`,
                          fill: '#EAB308',
                          position: 'top',
                          fontSize: 11,
                          offset: 8,
                        }}
                      />
                    )}
                    <Bar dataKey="count" fill="#1B2232" stroke="#2B364E" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
