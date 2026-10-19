import React, { useState, useEffect } from 'react';
import type { OverviewData } from './types';
import { fetchOverview } from './api';
import { AnalyticsView } from './components/AnalyticsView';
import { TimeMachineView } from './components/TimeMachineView';
import { Clock, BarChart2, AlertTriangle } from 'lucide-react';

type MainTab = 'analytics' | 'timemachine';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<MainTab>('analytics');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Guard flag for mid-session protection
  const [activeSessionInProgress, setActiveSessionInProgress] = useState<boolean>(false);

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

  const handleTabSwitch = (targetTab: MainTab) => {
    if (targetTab === currentTab) return;

    if (currentTab === 'timemachine' && activeSessionInProgress) {
      const confirmLeave = window.confirm(
        'You have an active solving session in progress. Leaving now will discard your recorded solves. Are you sure you want to exit?'
      );
      if (!confirmLeave) return;
    }

    setCurrentTab(targetTab);
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
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <h1 className="brand-title">WCA TIME MACHINE</h1>
          <span className="dataset-pill">
            WCA 3x3 • Oct 2026 • 1982–2026
          </span>
        </div>

        {/* Primary View Switcher */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab-btn ${currentTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('analytics')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={14} /> Historical Analytics
            </span>
          </button>
          <button
            className={`nav-tab-btn ${currentTab === 'timemachine' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('timemachine')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Time Machine
            </span>
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main>
        {currentTab === 'analytics' && <AnalyticsView overview={overview} />}
        {currentTab === 'timemachine' && (
          <TimeMachineView
            overview={overview}
            activeSessionInProgress={activeSessionInProgress}
            setActiveSessionInProgress={setActiveSessionInProgress}
          />
        )}
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
  );
};

export default App;
