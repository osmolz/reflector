import { AuthProvider } from './components/AuthProvider'
import { Auth } from './components/Auth'
import { VoiceCheckIn } from './components/VoiceCheckIn'
import { Timeline } from './components/Timeline'
import { Journal } from './pages/Journal'
import Chat from './components/Chat'
import { useAuthStore } from './store/authStore'
import { useState } from 'react'
import './components/Layout.css'

function App() {
  const user = useAuthStore((state) => state.user);
  const { signOut } = useAuthStore();
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [currentView, setCurrentView] = useState('dashboard');

  const handleActivitiesSaved = () => {
    setTimelineRefreshKey((k) => k + 1);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthProvider>
      {user ? (
        <div className="app-shell">
          {/* Header */}
          <header className="header" role="banner">
            <div className="header-brand">
              <span className="header-title">Reflector</span>
              <span className="header-tagline">Time &amp; Journal</span>
            </div>

            <nav aria-label="Main navigation">
              <ul className="header-nav" role="list">
                <li className="header-nav-item">
                  <button
                    className={`header-nav-link${currentView === 'dashboard' ? ' active' : ''}`}
                    onClick={() => setCurrentView('dashboard')}
                    aria-current={currentView === 'dashboard' ? 'page' : undefined}
                  >
                    Dashboard
                  </button>
                </li>
                <li className="header-nav-item">
                  <button
                    className={`header-nav-link${currentView === 'timeline' ? ' active' : ''}`}
                    onClick={() => setCurrentView('timeline')}
                    aria-current={currentView === 'timeline' ? 'page' : undefined}
                  >
                    Timeline
                  </button>
                </li>
                <li className="header-nav-item">
                  <button
                    className={`header-nav-link${currentView === 'journal' ? ' active' : ''}`}
                    onClick={() => setCurrentView('journal')}
                    aria-current={currentView === 'journal' ? 'page' : undefined}
                  >
                    Journal
                  </button>
                </li>
              </ul>
            </nav>

            <div className="header-actions">
              <span className="header-user-email">{user.email}</span>
              <button className="header-sign-out" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="main-container" role="main">
            {/* Dashboard View */}
            {currentView === 'dashboard' && (
              <div>
                <div className="page-header">
                  <h1 className="page-title">Good morning</h1>
                  <p className="page-subtitle">Track your time. Understand your day.</p>
                </div>

                <section className="section" aria-labelledby="checkin-heading">
                  <div className="section-header">
                    <h2 className="section-title" id="checkin-heading">Voice Check-in</h2>
                  </div>
                  <VoiceCheckIn onActivitiesSaved={handleActivitiesSaved} />
                </section>

                <section className="section" aria-labelledby="chat-heading">
                  <div className="section-header">
                    <h2 className="section-title" id="chat-heading">Chat Analytics</h2>
                    <span className="section-meta">Ask about your time</span>
                  </div>
                  <Chat />
                </section>
              </div>
            )}

            {/* Timeline View */}
            {currentView === 'timeline' && <Timeline refreshKey={timelineRefreshKey} />}

            {/* Journal View */}
            {currentView === 'journal' && <Journal />}
          </main>
        </div>
      ) : (
        <Auth />
      )}
    </AuthProvider>
  )
}

export default App
