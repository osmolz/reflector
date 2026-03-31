import { AuthProvider } from './components/AuthProvider'
import { Auth } from './components/Auth'
import { Timeline } from './components/Timeline'
import { LogJournal } from './pages/LogJournal'
import Chat from './components/Chat'
import { useAuthStore } from './store/authStore'
import { useState } from 'react'
import './components/Layout.css'

const VIEWS = {
  logJournal: 'log-journal',
  timeline: 'timeline',
  chat: 'chat',
}

function App() {
  const user = useAuthStore((state) => state.user);
  const { signOut } = useAuthStore();
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);
  const [currentView, setCurrentView] = useState(VIEWS.logJournal);

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
          <header className="header" role="banner">
            <div className="header-brand">
              <span className="header-title">Reflector</span>
            </div>

            <nav aria-label="Main navigation">
              <ul className="header-nav" role="list">
                <li className="header-nav-item">
                  <button
                    type="button"
                    className={`header-nav-link${currentView === VIEWS.logJournal ? ' active' : ''}`}
                    onClick={() => setCurrentView(VIEWS.logJournal)}
                    aria-current={currentView === VIEWS.logJournal ? 'page' : undefined}
                  >
                    Log &amp; journal
                  </button>
                </li>
                <li className="header-nav-item">
                  <button
                    type="button"
                    className={`header-nav-link${currentView === VIEWS.timeline ? ' active' : ''}`}
                    onClick={() => setCurrentView(VIEWS.timeline)}
                    aria-current={currentView === VIEWS.timeline ? 'page' : undefined}
                  >
                    Timeline
                  </button>
                </li>
                <li className="header-nav-item">
                  <button
                    type="button"
                    className={`header-nav-link${currentView === VIEWS.chat ? ' active' : ''}`}
                    onClick={() => setCurrentView(VIEWS.chat)}
                    aria-current={currentView === VIEWS.chat ? 'page' : undefined}
                  >
                    Chat
                  </button>
                </li>
              </ul>
            </nav>

            <div className="header-actions">
              <span className="header-user-email" title={user.email}>
                {user.email}
              </span>
              <button type="button" className="header-sign-out" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </header>

          <main
            className={`main-container${currentView === VIEWS.chat ? ' main-container--chat' : ''}${currentView === VIEWS.timeline ? ' main-container--wide' : ''}`}
            role="main"
          >
            {currentView === VIEWS.logJournal && (
              <LogJournal onActivitiesSaved={handleActivitiesSaved} />
            )}

            {currentView === VIEWS.timeline && (
              <Timeline refreshKey={timelineRefreshKey} />
            )}

            {currentView === VIEWS.chat && <Chat />}
          </main>
        </div>
      ) : (
        <Auth />
      )}
    </AuthProvider>
  )
}

export default App
