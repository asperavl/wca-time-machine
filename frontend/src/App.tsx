import React, { useState, useEffect } from 'react';
import type { OverviewData } from './types';
import { fetchOverview } from './api';
import { AnalyticsView } from './components/AnalyticsView';
import { TimeMachineView } from './components/TimeMachineView';
import { LandingView } from './components/LandingView';
import { Clock, BarChart2, AlertTriangle, LayoutGrid } from 'lucide-react';

type MainTab = 'landing' | 'analytics' | 'timemachine';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<MainTab>('landing');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Guard flag for mid-session protection
  const [activeSessionInProgress, setActiveSessionInProgress] = useState<boolean>(false);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    fetchOverview()
      .then((data) => {
        setOverview(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load historical WCA competition dataset. Please check your data connection or rebuild the pipeline.');
        setLoading(false);
      });
  }, []);

  // Prevent accidental page close or refresh mid-solve
  useEffect(() => {
    if (!isTimerRunning) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTimerRunning]);

  const handleTabSwitch = (targetTab: MainTab) => {
    if (isTimerRunning) return;
    if (targetTab === currentTab) return;
    setCurrentTab(targetTab);
    localStorage.setItem('wca_time_machine_tab', targetTab);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--accent-lime)', marginBottom: 8 }}>
          Loading WCA Time Machine...
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          Reading historical competition records (1982:2026)
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <AlertTriangle size={36} style={{ color: 'var(--color-error)', marginBottom: 12 }} />
        <h2 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Unable to Load Dataset</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 480, textAlign: 'center', marginBottom: 20 }}>
          {error}
        </p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Top Functional Rubik's Color Spectrum Ribbon */}
      <div className="spectrum-bar">
        <span className="sp-white" />
        <span className="sp-yellow" />
        <span className="sp-green" />
        <span className="sp-blue" />
        <span className="sp-red" />
        <span className="sp-orange" />
      </div>

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div
            className={`brand-section ${isTimerRunning ? 'nav-locked' : ''}`}
            style={{ cursor: isTimerRunning ? 'not-allowed' : 'pointer' }}
            onClick={() => !isTimerRunning && handleTabSwitch('landing')}
            title={isTimerRunning ? 'Solve in progress: complete solve first' : 'Return to Overview'}
          >
            <div className="rubik-grid-icon" title="WCA Time Machine">
              <div style={{ background: 'var(--cube-white)' }} />
              <div style={{ background: 'var(--cube-yellow)' }} />
              <div style={{ background: 'var(--cube-green)' }} />
              <div style={{ background: 'var(--cube-blue)' }} />
              <div style={{ background: 'var(--cube-red)' }} />
              <div style={{ background: 'var(--cube-orange)' }} />
              <div style={{ background: 'var(--cube-yellow)' }} />
              <div style={{ background: 'var(--cube-white)' }} />
              <div style={{ background: 'var(--cube-blue)' }} />
            </div>
            <div>
              <h1 className="brand-title">
                WCA TIME MACHINE
                <span className="brand-badge">3×3 HISTORICAL ARCHIVE</span>
              </h1>
            </div>
          </div>

          {/* Primary View Switcher */}
          <nav className="view-mode-tabs" aria-label="Main Navigation">
            <button
              className={`view-mode-btn mode-overview ${currentTab === 'landing' ? 'active' : ''} ${isTimerRunning ? 'nav-disabled' : ''}`}
              onClick={() => handleTabSwitch('landing')}
              disabled={isTimerRunning}
              title={isTimerRunning ? 'Solve in progress: complete solve first' : 'Overview'}
            >
              <LayoutGrid size={15} style={{ color: currentTab === 'landing' ? 'var(--cube-white)' : 'inherit' }} />
              Overview
            </button>
            <button
              className={`view-mode-btn mode-tm ${currentTab === 'timemachine' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('timemachine')}
              title="Time Machine"
            >
              <Clock size={15} style={{ color: currentTab === 'timemachine' ? 'var(--cube-yellow)' : 'inherit' }} />
              Time Machine
            </button>
            <button
              className={`view-mode-btn mode-archive ${currentTab === 'analytics' ? 'active' : ''} ${isTimerRunning ? 'nav-disabled' : ''}`}
              onClick={() => handleTabSwitch('analytics')}
              disabled={isTimerRunning}
              title={isTimerRunning ? 'Solve in progress: complete solve first' : 'Historical Archive'}
            >
              <BarChart2 size={15} style={{ color: currentTab === 'analytics' ? 'var(--cube-blue)' : 'inherit' }} />
              Historical Archive
            </button>
          </nav>
        </header>

      {/* Main Content Area - Keeping components mounted preserves session state across tab switches */}
      <main>
        <div style={{ display: currentTab === 'landing' ? 'block' : 'none' }}>
          <LandingView
            overview={overview}
            onSelectMode={(mode) => handleTabSwitch(mode)}
          />
        </div>
        <div style={{ display: currentTab === 'analytics' ? 'block' : 'none' }}>
          <AnalyticsView overview={overview} />
        </div>
        <div style={{ display: currentTab === 'timemachine' ? 'block' : 'none' }}>
          <TimeMachineView
            overview={overview}
            isActiveTab={currentTab === 'timemachine'}
            activeSessionInProgress={activeSessionInProgress}
            setActiveSessionInProgress={setActiveSessionInProgress}
            onTimerRunningChange={setIsTimerRunning}
          />
        </div>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
        <div>
          Data sourced from official <a href="https://www.worldcubeassociation.org/results" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>World Cube Association</a> competition results export.
        </div>
        <div style={{ fontFamily: 'var(--font-mono)' }}>
          {overview.metadata.total_competitors.toLocaleString()} competitors • {overview.metadata.total_competitions.toLocaleString()} competitions
        </div>
      </footer>
    </div>
  </>
  );
};

export default App;
