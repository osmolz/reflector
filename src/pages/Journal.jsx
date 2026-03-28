import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { JournalForm } from '../components/JournalForm';
import { JournalHistory } from '../components/JournalHistory';

export function Journal() {
  const user = useAuthStore((state) => state.user);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Journal</h1>
        <p>Please log in to access journal</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>Journal</h1>
      <JournalForm onEntryCreated={() => setRefreshKey((k) => k + 1)} />
      <JournalHistory refreshKey={refreshKey} />
    </div>
  );
}
