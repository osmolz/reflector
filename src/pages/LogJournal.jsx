import { useState } from 'react';
import { VoiceCheckIn } from '../components/VoiceCheckIn';
import { JournalForm } from '../components/JournalForm';
import { JournalHistory } from '../components/JournalHistory';

export function LogJournal({ onActivitiesSaved }) {
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Log and journal</h1>
      </header>

      <section className="section" aria-labelledby="log-time-heading">
        <div className="section-header">
          <h2 className="section-title" id="log-time-heading">
            Log time
          </h2>
        </div>
        <VoiceCheckIn onActivitiesSaved={onActivitiesSaved} />
      </section>

      <section className="section" aria-labelledby="journal-heading">
        <div className="section-header">
          <h2 className="section-title" id="journal-heading">
            Journal
          </h2>
        </div>
        <JournalForm onEntryCreated={() => setJournalRefreshKey((k) => k + 1)} />
        <JournalHistory refreshKey={journalRefreshKey} />
      </section>
    </>
  );
}
