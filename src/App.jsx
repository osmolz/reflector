import { AuthProvider } from './components/AuthProvider'
import { Auth } from './components/Auth'
import { VoiceCheckIn } from './components/VoiceCheckIn'
import { Timeline } from './components/Timeline'
import { Journal } from './pages/Journal'
import Chat from './components/Chat'
import { useAuthStore } from './store/authStore'
import { useState } from 'react'

function App() {
  const user = useAuthStore((state) => state.user);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'timeline', 'journal'

  const handleActivitiesSaved = () => {
    setTimelineRefreshKey((k) => k + 1);
  };

  return (
    <AuthProvider>
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <h1>Reflector</h1>
        <p>Personal time tracking and journaling</p>

        {user ? (
          <div>
            {/* Navigation */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
              <button
                onClick={() => setCurrentView('dashboard')}
                style={{
                  padding: '0.5rem 1rem',
                  background: currentView === 'dashboard' ? '#0066cc' : '#f5f5f5',
                  color: currentView === 'dashboard' ? 'white' : '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: currentView === 'dashboard' ? 'bold' : 'normal',
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('timeline')}
                style={{
                  padding: '0.5rem 1rem',
                  background: currentView === 'timeline' ? '#0066cc' : '#f5f5f5',
                  color: currentView === 'timeline' ? 'white' : '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: currentView === 'timeline' ? 'bold' : 'normal',
                }}
              >
                Timeline
              </button>
              <button
                onClick={() => setCurrentView('journal')}
                style={{
                  padding: '0.5rem 1rem',
                  background: currentView === 'journal' ? '#0066cc' : '#f5f5f5',
                  color: currentView === 'journal' ? 'white' : '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: currentView === 'journal' ? 'bold' : 'normal',
                }}
              >
                Journal
              </button>
            </div>

            {/* Dashboard View */}
            {currentView === 'dashboard' && (
              <div>
                <div style={{ marginBottom: '40px' }}>
                  <h2>Voice Check-in</h2>
                  <VoiceCheckIn onActivitiesSaved={handleActivitiesSaved} />
                </div>
                <div>
                  <h2>Chat Analytics</h2>
                  <Chat />
                </div>
              </div>
            )}

            {/* Timeline View */}
            {currentView === 'timeline' && <Timeline refreshKey={timelineRefreshKey} />}

            {/* Journal View */}
            {currentView === 'journal' && <Journal />}
          </div>
        ) : (
          <Auth />
        )}
      </div>
    </AuthProvider>
  )
}

export default App
