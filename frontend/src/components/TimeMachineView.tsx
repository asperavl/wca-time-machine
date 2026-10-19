import React, { useState, useEffect } from 'react';
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
import { generate3x3Scramble, calculateAo5, formatTime } from '../utils/wca';
import { useCubeTimer } from '../hooks/useCubeTimer';
import { RotateCcw, Check, Copy, Sparkles } from 'lucide-react';

interface TimeMachineViewProps {
  overview: OverviewData;
  activeSessionInProgress?: boolean;
  setActiveSessionInProgress: (inProgress: boolean) => void;
}

export const TimeMachineView: React.FC<TimeMachineViewProps> = ({
  overview,
  setActiveSessionInProgress,
}) => {
  // Scrambles for the 5 solves
  const [scrambles, setScrambles] = useState<string[]>(() =>
    Array.from({ length: 5 }, () => generate3x3Scramble())
  );
  const [currentSolveIdx, setCurrentSolveIdx] = useState<number>(0);
  const [solves, setSolves] = useState<SolveRecord[]>([]);

  // Result inspection year (defaults to the most recent full competition year, e.g. 2024)
  const [inspectedYear, setInspectedYear] = useState<number>(2024);
  const [inspectedDetail, setInspectedDetail] = useState<YearDetail | null>(null);

  // Manual entry toggle
  const [manualInputMode, setManualInputMode] = useState<boolean>(false);
  const [manualTimeStr, setManualTimeStr] = useState<string>('');
  const [copiedScramble, setCopiedScramble] = useState<boolean>(false);

  // Result percentile graph metric toggle (Ao5 vs Single)
  const [resultGraphMetric, setResultGraphMetric] = useState<MetricType>('average');

  // Callback when a solve finishes via timer
  const handleSolveFinished = (finalSec: number) => {
    const newSolve: SolveRecord = {
      id: currentSolveIdx + 1,
      scramble: scrambles[currentSolveIdx],
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
    disabled: manualInputMode || solves.length >= 5,
  });

  // Sync activeSessionInProgress flag to parent
  useEffect(() => {
    const inProgress = solves.length > 0 && solves.length < 5;
    setActiveSessionInProgress(inProgress);
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
    if (solves.length > 0 && solves.length < 5) {
      if (!window.confirm('Discard current in-progress solve session?')) return;
    }
    setSolves([]);
    setCurrentSolveIdx(0);
    timer.resetTimer();
    setScrambles(Array.from({ length: 5 }, () => generate3x3Scramble()));
  };

  const copyCurrentScramble = () => {
    navigator.clipboard.writeText(scrambles[currentSolveIdx]);
    setCopiedScramble(true);
    setTimeout(() => setCopiedScramble(false), 2000);
  };

  // Compute session metrics
  const sessionCompleted = solves.length === 5;
  const ao5Calc = calculateAo5(solves);

  // Compute user percentiles for the currently inspected year
  const userAo5TopPct =
    inspectedDetail && ao5Calc.ao5Sec !== null
      ? calculateTopPercentile(ao5Calc.ao5Sec, inspectedDetail.average.percentiles)
      : null;

  const userSingleTopPct =
    inspectedDetail && ao5Calc.bestSingleSec !== null
      ? calculateTopPercentile(ao5Calc.bestSingleSec, inspectedDetail.single.percentiles)
      : null;

  // "Across the Eras" percentile graph data across all years
  const acrossErasData = React.useMemo(() => {
    if (!sessionCompleted) return [];
    const timeToEvaluate = resultGraphMetric === 'average' ? ao5Calc.ao5Sec : ao5Calc.bestSingleSec;
    if (timeToEvaluate === null) return [];

    return overview.years
      .filter((y) => {
        if (resultGraphMetric === 'average' && y.year === 1982) return false;
        return true;
      })
      .map((y) => {
        const stats = resultGraphMetric === 'average' ? y.average : y.single;
        let topPct: number | null = null;

        if (stats.min && timeToEvaluate <= stats.min) {
          topPct = 0.1;
        } else if (stats.p90 && stats.p10) {
          if (timeToEvaluate <= stats.p10) topPct = 5.0;
          else if (stats.p25 && timeToEvaluate <= stats.p25) topPct = 17.5;
          else if (stats.median && timeToEvaluate <= stats.median) topPct = 37.5;
          else if (stats.p75 && timeToEvaluate <= stats.p75) topPct = 62.5;
          else if (timeToEvaluate <= stats.p90) topPct = 82.5;
          else topPct = 95.0;
        }

        return {
          year: y.year,
          topPercentile: topPct,
          median: stats.median,
          isInspectedYear: y.year === inspectedYear,
        };
      });
  }, [sessionCompleted, resultGraphMetric, ao5Calc, overview.years, inspectedYear]);

  return (
    <div className="time-machine-view">
      {/* ACTIVE SOLVING WORKSPACE */}
      {!sessionCompleted ? (
        <div>
          {/* Top Control Bar */}
          <div className="surface-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} style={{ color: 'var(--accent-lime)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Time Machine Session: Solve {currentSolveIdx + 1} of 5
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setManualInputMode(!manualInputMode)}
                >
                  {manualInputMode ? 'Use Spacebar Timer' : 'Enter Times Manually'}
                </button>

                <button
                  className="btn-secondary btn-sm"
                  onClick={resetSession}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20, alignItems: 'start' }}>
            {/* Main Scramble & Timer Surface */}
            <div
              className="surface-card"
              style={{ textAlign: 'center', padding: '36px 20px', cursor: !manualInputMode ? 'pointer' : 'default', userSelect: 'none' }}
              onPointerDown={timer.handlePointerDown}
              onPointerUp={timer.handlePointerUp}
            >
              {/* Scramble Display */}
              <div
                style={{ marginBottom: 28, maxWidth: 650, margin: '0 auto 28px' }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>
                    Scramble {currentSolveIdx + 1} of 5
                  </span>
                  <button
                    onClick={copyCurrentScramble}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                    }}
                    title="Copy Scramble"
                  >
                    {copiedScramble ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
                    {copiedScramble ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    background: 'var(--surface-elevated)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    userSelect: 'all',
                  }}
                >
                  {scrambles[currentSolveIdx]}
                </div>
              </div>

              {/* Timer Output */}
              {!manualInputMode ? (
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 80,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color:
                        timer.status === 'READY'
                          ? 'var(--color-success)'
                          : timer.status === 'HOLDING'
                          ? 'var(--color-error)'
                          : timer.status === 'RUNNING'
                          ? 'var(--accent-lime)'
                          : 'var(--text-primary)',
                      margin: '16px 0',
                      transition: 'color 0.1s ease',
                    }}
                  >
                    {timer.displayTime === 0 ? '0.00' : timer.displayTime.toFixed(2)}
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                    {timer.status === 'IDLE' && 'Hold SPACE (or hold screen) to get ready'}
                    {timer.status === 'HOLDING' && 'Hold for green light...'}
                    {timer.status === 'READY' && 'Ready! Release spacebar to start solving!'}
                    {timer.status === 'RUNNING' && 'Press ANY KEY or tap to stop'}
                    {timer.status === 'FINISHED' && 'Hold SPACE to start next solve'}
                  </div>
                </div>
              ) : (
                /* Manual Input Mode */
                <form
                  onSubmit={handleManualSubmit}
                  style={{ maxWidth: 320, margin: '20px auto' }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Enter Solve {currentSolveIdx + 1} Time (in seconds):
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
                      Log
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Side Progress & Solves Strip */}
            <div className="surface-card">
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
                Solves (5 Required)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const s = solves[idx];
                  const isCurrent = idx === currentSolveIdx && solves.length < 5;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: isCurrent ? 'var(--surface-elevated)' : 'transparent',
                        border: `1px solid ${isCurrent ? 'var(--accent-lime)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span style={{ fontSize: 12, color: isCurrent ? 'var(--accent-lime)' : 'var(--text-secondary)' }}>
                        #{idx + 1}
                      </span>

                      {s ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>
                            {s.penalty === 'DNF' ? 'DNF' : `${s.finalTimeSec?.toFixed(2)}s`}
                          </span>

                          {/* Modifiers */}
                          <div style={{ display: 'flex', gap: 2 }}>
                            <button
                              onClick={() => updatePenalty(idx, s.penalty === '+2' ? 'NONE' : '+2')}
                              style={{
                                fontSize: 10,
                                padding: '2px 5px',
                                background: s.penalty === '+2' ? 'var(--accent-lime-dim)' : 'transparent',
                                color: s.penalty === '+2' ? 'var(--accent-lime)' : 'var(--text-tertiary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 2,
                                cursor: 'pointer',
                              }}
                            >
                              +2
                            </button>
                            <button
                              onClick={() => updatePenalty(idx, s.penalty === 'DNF' ? 'NONE' : 'DNF')}
                              style={{
                                fontSize: 10,
                                padding: '2px 5px',
                                background: s.penalty === 'DNF' ? 'rgba(240, 113, 120, 0.2)' : 'transparent',
                                color: s.penalty === 'DNF' ? 'var(--color-error)' : 'var(--text-tertiary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 2,
                                cursor: 'pointer',
                              }}
                            >
                              DNF
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {isCurrent ? 'Current' : 'Queued'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* COMPLETED SESSION: HISTORICAL DISCOVERY ACROSS TIME */
        <div>
          {/* Result Highlight Banner */}
          <div className="surface-card" style={{ marginBottom: 20, borderColor: 'var(--accent-lime)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span className="badge-lime" style={{ marginBottom: 8, display: 'inline-block' }}>
                  5 SOLVES COMPLETE: TIME TRAVEL UNLOCKED
                </span>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Your Average of 5 (Ao5):{' '}
                  <span style={{ color: 'var(--accent-lime)', fontFamily: 'var(--font-mono)' }}>
                    {ao5Calc.ao5Sec !== null ? `${ao5Calc.ao5Sec.toFixed(2)}s` : 'DNF'}
                  </span>
                  {ao5Calc.bestSingleSec && (
                    <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 16 }}>
                      Best Single: <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{ao5Calc.bestSingleSec.toFixed(2)}s</span>
                    </span>
                  )}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Inspect below to see how this result would have ranked across every era of speedcubing history.
                </p>
              </div>

              <button className="btn-primary" onClick={resetSession}>
                Start New Session
              </button>
            </div>
          </div>

          {/* Headline Feature: "Across the Eras" Percentile Graph */}
          <div className="surface-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Across the Eras: Your Global Percentile (1982:2026)
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Showing your ranking across speedcubing history for your {resultGraphMetric === 'average' ? `Ao5 (${ao5Calc.ao5Sec}s)` : `Best Single (${ao5Calc.bestSingleSec}s)`}.
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

            <div style={{ height: 340, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={acrossErasData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid stroke="#202329" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#6F7580"
                    tick={{ fill: '#9A9FA9', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    stroke="#6F7580"
                    unit="%"
                    domain={[0, 100]}
                    reversed={true} // Top 0.1% at top of chart
                    tick={{ fill: '#9A9FA9', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#17191E', border: '1px solid #30333A', borderRadius: 4, padding: '10px 14px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                          <div style={{ fontWeight: 600, color: '#F0F1F3', marginBottom: 4 }}>Year {label}</div>
                          <div style={{ color: 'var(--accent-lime)' }}>Ranking: Top {d.topPercentile}%</div>
                          <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>Era Median: {d.median}s</div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    x={inspectedYear}
                    stroke="#C4F56A"
                    strokeDasharray="3 3"
                    label={{ value: `Viewing: ${inspectedYear}`, fill: '#C4F56A', position: 'top', fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="topPercentile"
                    name="Top Percentile"
                    stroke="#C4F56A"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#C4F56A' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Era Deep Dive Explorer (inspect any year's distribution) */}
          <div className="surface-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Inspect Specific Historical Year:</span>
                <select
                  className="select-input"
                  value={inspectedYear}
                  onChange={(e) => setInspectedYear(Number(e.target.value))}
                >
                  {overview.available_years
                    .filter((yr) => (resultGraphMetric === 'average' ? yr !== 1982 : true))
                    .map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-lime)' }}>
                Your Rank in {inspectedYear}: Top {resultGraphMetric === 'average' ? userAo5TopPct : userSingleTopPct}%
              </div>
            </div>

            {/* Quick KPI Strip for Inspected Year */}
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              <div className="stat-item">
                <div className="stat-label">Your Time vs Median</div>
                <div className="stat-value" style={{ color: 'var(--accent-lime)' }}>
                  {ao5Calc.ao5Sec && inspectedDetail?.summary.average.median
                    ? `${(inspectedDetail.summary.average.median - ao5Calc.ao5Sec).toFixed(2)}s`
                    : '-'}
                </div>
                <div className="stat-subtext">
                  {ao5Calc.ao5Sec && inspectedDetail?.summary.average.median
                    ? ao5Calc.ao5Sec < inspectedDetail.summary.average.median
                      ? 'Faster than typical competitor'
                      : 'Slower than typical competitor'
                    : '-'}
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">{inspectedYear} Median</div>
                <div className="stat-value">
                  {formatTime(resultGraphMetric === 'average' ? inspectedDetail?.summary.average.median : inspectedDetail?.summary.single.median)}s
                </div>
                <div className="stat-subtext">50th percentile of {inspectedYear}</div>
              </div>

              <div className="stat-item">
                <div className="stat-label">{inspectedYear} Elite (Top 10%)</div>
                <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                  {formatTime(resultGraphMetric === 'average' ? inspectedDetail?.summary.average.p10 : inspectedDetail?.summary.single.p10)}s
                </div>
                <div className="stat-subtext">Top decile boundary</div>
              </div>

              <div className="stat-item">
                <div className="stat-label">{inspectedYear} Competitors</div>
                <div className="stat-value">
                  {inspectedDetail?.summary.competitors.toLocaleString()}
                </div>
                <div className="stat-subtext">Official participants</div>
              </div>
            </div>

            {/* Histogram with User Marker */}
            {inspectedDetail && (
              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resultGraphMetric === 'average' ? inspectedDetail.average.histogram : inspectedDetail.single.histogram}
                    margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid stroke="#202329" vertical={false} />
                    <XAxis
                      dataKey="start"
                      unit="s"
                      interval={9}
                      stroke="#6F7580"
                      tick={{ fill: '#9A9FA9', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis
                      stroke="#6F7580"
                      tick={{ fill: '#9A9FA9', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const bin = payload[0].payload;
                        return (
                          <div style={{ background: '#17191E', border: '1px solid #30333A', borderRadius: 4, padding: '8px 12px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                            <div style={{ fontWeight: 600, color: '#F0F1F3', marginBottom: 4 }}>Time: {bin.label}</div>
                            <div style={{ color: '#C4F56A' }}>Solves: {bin.count.toLocaleString()}</div>
                            <div style={{ color: '#9A9FA9', fontSize: 11 }}>Cumulative: Top {bin.cumulative_pct}%</div>
                          </div>
                        );
                      }}
                    />
                    {/* User solve reference line */}
                    {(resultGraphMetric === 'average' ? ao5Calc.ao5Sec : ao5Calc.bestSingleSec) && (
                      <ReferenceLine
                        x={Math.floor(((resultGraphMetric === 'average' ? ao5Calc.ao5Sec : ao5Calc.bestSingleSec) || 0) * 2) / 2.0}
                        stroke="#C4F56A"
                        strokeWidth={2}
                        label={{
                          value: `Your Time ${(resultGraphMetric === 'average' ? ao5Calc.ao5Sec : ao5Calc.bestSingleSec)?.toFixed(2)}s`,
                          fill: '#C4F56A',
                          position: 'top',
                          fontSize: 11,
                        }}
                      />
                    )}
                    <Bar dataKey="count" fill="#202329" stroke="#30333A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Solves Detail Table */}
          <div className="surface-card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Five Solves Inspection</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {solves.map((s, idx) => {
                const isBest = idx === ao5Calc.bestIndex;
                const isWorst = idx === ao5Calc.worstIndex;
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                      <span>Solve #{idx + 1}</span>
                      <span>{isBest ? '(Trimmed - Fastest)' : isWorst ? '(Trimmed - Slowest)' : 'Counted'}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: isBest || isWorst ? 'var(--text-secondary)' : 'var(--accent-lime)' }}>
                      {isBest || isWorst ? `(${formatTime(s.finalTimeSec)})` : `${formatTime(s.finalTimeSec)}s`}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.scramble}>
                      {s.scramble}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
