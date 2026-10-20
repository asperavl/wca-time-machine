import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, X } from 'lucide-react';

interface YearScrubberBarProps {
  availableYears: number[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
  disabledYears?: number[];
  label?: string;
  subtext?: string;
}

export const YearScrubberBar: React.FC<YearScrubberBarProps> = ({
  availableYears,
  selectedYear,
  onSelectYear,
  disabledYears = [],
  label = 'Selected Season',
  subtext,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = availableYears.indexOf(selectedYear);

  const handlePrev = () => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const yr = availableYears[i];
      if (!disabledYears.includes(yr)) {
        onSelectYear(yr);
        break;
      }
    }
  };

  const handleNext = () => {
    for (let i = currentIndex + 1; i < availableYears.length; i++) {
      const yr = availableYears[i];
      if (!disabledYears.includes(yr)) {
        onSelectYear(yr);
        break;
      }
    }
  };

  const isPrevDisabled =
    currentIndex <= 0 ||
    availableYears.slice(0, currentIndex).every((y) => disabledYears.includes(y));
  const isNextDisabled =
    currentIndex >= availableYears.length - 1 ||
    availableYears.slice(currentIndex + 1).every((y) => disabledYears.includes(y));

  // Close popover on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Group available years by era / decade
  const eras = [
    { label: '1980s', years: availableYears.filter((y) => y >= 1980 && y < 1990) },
    { label: '2000s', years: availableYears.filter((y) => y >= 2000 && y < 2010) },
    { label: '2010s', years: availableYears.filter((y) => y >= 2010 && y < 2020) },
    { label: '2020s', years: availableYears.filter((y) => y >= 2020 && y < 2030) },
  ].filter((era) => era.years.length > 0);

  // Quick decade jump handler
  const handleDecadeJump = (decadeYears: number[]) => {
    const valid = decadeYears.filter((y) => !disabledYears.includes(y));
    if (valid.length === 0) return;
    if (valid.includes(selectedYear)) return;
    const target = valid[Math.floor(valid.length / 2)] || valid[0];
    onSelectYear(target);
  };

  const currentDecadeLabel =
    selectedYear >= 1980 && selectedYear < 1990
      ? '1980s'
      : selectedYear >= 2000 && selectedYear < 2010
      ? '2000s'
      : selectedYear >= 2010 && selectedYear < 2020
      ? '2010s'
      : '2020s';

  return (
    <div className="year-scrubber-bar" role="region" aria-label="Year and Season Selector">
      {/* Left: Label, Stepper and Custom Popover Trigger */}
      <div className="year-stepper-group" ref={containerRef}>
        <div className="year-stepper-label">
          <Calendar size={15} style={{ color: 'var(--cube-yellow)' }} />
          <span>{label.toUpperCase()}:</span>
        </div>

        <div className="year-stepper-controls">
          <button
            type="button"
            className="year-step-btn"
            onClick={handlePrev}
            disabled={isPrevDisabled}
            aria-label="Previous Season"
            title="Step back one season"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="year-select-wrapper">
            <button
              type="button"
              className={`year-trigger-btn ${isOpen ? 'active' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              aria-label={`Selected year ${selectedYear}. Click to pick a different year.`}
            >
              <span className="year-badge-num">{selectedYear}</span>
              <ChevronDown
                size={16}
                className={`year-chevron-icon ${isOpen ? 'rotated' : ''}`}
              />
            </button>

            {/* Custom Dark Year Grid Popover */}
            {isOpen && (
              <div className="year-picker-popover" role="dialog" aria-modal="true" aria-label="Select Season">
                <div className="year-popover-header">
                  <div className="year-popover-title">SELECT WCA SEASON</div>
                  <button
                    type="button"
                    className="year-popover-close-btn"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close season picker"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="year-popover-body">
                  {eras.map((era) => (
                    <div key={era.label} className="year-popover-era-section">
                      <div className="year-popover-era-title">{era.label}</div>
                      <div className="year-popover-grid">
                        {era.years.map((yr) => {
                          const isDisabled = disabledYears.includes(yr);
                          const isSelected = yr === selectedYear;

                          return (
                            <button
                              key={yr}
                              type="button"
                              className={`year-grid-cell ${isSelected ? 'selected' : ''} ${
                                isDisabled ? 'disabled' : ''
                              }`}
                              onClick={() => {
                                if (!isDisabled) {
                                  onSelectYear(yr);
                                  setIsOpen(false);
                                }
                              }}
                              disabled={isDisabled}
                              title={isDisabled ? `${yr} (Unavailable for this metric)` : `Select ${yr}`}
                            >
                              <span className="cell-year">{yr}</span>
                              {isDisabled && <span className="cell-subnote">No Ao5</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="year-step-btn"
            onClick={handleNext}
            disabled={isNextDisabled}
            aria-label="Next Season"
            title="Step forward one season"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Quick Era Pills for Rapid Macro Navigation */}
        <div className="year-era-pills" role="toolbar" aria-label="Jump to era">
          {eras.map((era) => {
            const isEraActive = currentDecadeLabel === era.label;
            const hasValidYears = era.years.some((y) => !disabledYears.includes(y));

            return (
              <button
                key={era.label}
                type="button"
                className={`year-era-pill-btn ${isEraActive ? 'active' : ''}`}
                onClick={() => handleDecadeJump(era.years)}
                disabled={!hasValidYears}
                title={`Jump into ${era.label}`}
              >
                {era.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Contextual Subtext */}
      {subtext && (
        <div className="year-scrubber-subtext">
          {subtext}
        </div>
      )}
    </div>
  );
};
