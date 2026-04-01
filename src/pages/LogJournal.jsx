import { useCallback, useRef, useState } from 'react';
import { VoiceCheckIn } from '../components/VoiceCheckIn';
import { JournalForm } from '../components/JournalForm';
import { JournalHistory } from '../components/JournalHistory';
import './LogJournal.css';

const TAB_ORDER = ['time', 'journal'];

const TAB_IDS = {
  time: 'log-tab-time',
  journal: 'log-tab-journal',
};

const PANEL_IDS = {
  time: 'log-panel-time',
  journal: 'log-panel-journal',
};

const TAB_HINTS = {
  time: 'Log activities and durations for your timeline.',
  journal: 'Write a free-form note for yourself.',
};

export function LogJournal({ onActivitiesSaved }) {
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('time');
  const tabRefs = useRef({ time: null, journal: null });

  const focusTab = useCallback((key) => {
    requestAnimationFrame(() => {
      tabRefs.current[key]?.focus();
    });
  }, []);

  const selectTab = useCallback(
    (key) => {
      setActiveTab(key);
      focusTab(key);
    },
    [focusTab]
  );

  const handleTabKeyDown = useCallback(
    (event, currentKey) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }
      event.preventDefault();
      const idx = TAB_ORDER.indexOf(currentKey);
      let next = currentKey;
      if (event.key === 'ArrowRight') {
        next = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
      } else if (event.key === 'ArrowLeft') {
        next = TAB_ORDER[(idx - 1 + TAB_ORDER.length) % TAB_ORDER.length];
      } else if (event.key === 'Home') {
        next = TAB_ORDER[0];
      } else if (event.key === 'End') {
        next = TAB_ORDER[TAB_ORDER.length - 1];
      }
      setActiveTab(next);
      focusTab(next);
    },
    [focusTab]
  );

  return (
    <>
      <h1 className="sr-only">Log — track time and reflections</h1>

      <div className="log-journal-shell">
        <div role="tablist" aria-label="Choose time log or journal" className="log-journal-tablist">
          <div className="log-journal-tab-item">
            <button
              ref={(el) => {
                tabRefs.current.time = el;
              }}
              type="button"
              role="tab"
              id={TAB_IDS.time}
              aria-selected={activeTab === 'time'}
              aria-controls={PANEL_IDS.time}
              tabIndex={activeTab === 'time' ? 0 : -1}
              className="log-journal-tab"
              onClick={() => selectTab('time')}
              onKeyDown={(e) => handleTabKeyDown(e, 'time')}
            >
              Time
            </button>
          </div>
          <div className="log-journal-tab-item">
            <button
              ref={(el) => {
                tabRefs.current.journal = el;
              }}
              type="button"
              role="tab"
              id={TAB_IDS.journal}
              aria-selected={activeTab === 'journal'}
              aria-controls={PANEL_IDS.journal}
              tabIndex={activeTab === 'journal' ? 0 : -1}
              className="log-journal-tab"
              onClick={() => selectTab('journal')}
              onKeyDown={(e) => handleTabKeyDown(e, 'journal')}
            >
              Journal
            </button>
          </div>
        </div>

        <p id="log-journal-tab-hint" className="log-journal-tab-hint" aria-live="polite">
          {TAB_HINTS[activeTab]}
        </p>

        <section
          role="tabpanel"
          id={PANEL_IDS.time}
          className="section log-journal-tabpanel"
          aria-labelledby={TAB_IDS.time}
          hidden={activeTab !== 'time'}
        >
          <div className="section-header">
            <h2 className="section-title" id="log-time-heading">
              Log time
            </h2>
          </div>
          <VoiceCheckIn onActivitiesSaved={onActivitiesSaved} />
        </section>

        <section
          role="tabpanel"
          id={PANEL_IDS.journal}
          className="section log-journal-tabpanel"
          aria-labelledby={TAB_IDS.journal}
          hidden={activeTab !== 'journal'}
        >
          <div className="section-header">
            <h2 className="section-title" id="journal-heading">
              Journal
            </h2>
          </div>
          <JournalForm onEntryCreated={() => setJournalRefreshKey((k) => k + 1)} />
          <JournalHistory refreshKey={journalRefreshKey} />
        </section>
      </div>
    </>
  );
}
