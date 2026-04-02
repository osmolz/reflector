import { AuthProvider } from './components/AuthProvider'
import { Auth } from './components/Auth'
import { Timeline } from './components/Timeline'
import { LogJournal } from './pages/LogJournal'
import Chat from './components/Chat'
import { AppHeader } from './components/AppHeader'
import { clearActiveChatSession } from './lib/chatSessionStorage'
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
    try {
      if (user?.id) clearActiveChatSession(user.id)
    } catch {
      /* ignore */
    }
    await signOut()
  }

  return (
    <AuthProvider>
      {user ? (
        currentView === VIEWS.chat ? (
          <div className="app-shell app-shell--chat">
            <Chat
              views={VIEWS}
              currentView={currentView}
              onViewChange={setCurrentView}
              user={user}
              onSignOut={handleSignOut}
            />
          </div>
        ) : (
          <div className="app-shell">
            <AppHeader
              views={VIEWS}
              currentView={currentView}
              onViewChange={setCurrentView}
              onSignOut={handleSignOut}
            />

            <main
              className={`main-container${currentView === VIEWS.timeline ? ' main-container--wide' : ''}`}
              role="main"
            >
              {currentView === VIEWS.logJournal && (
                <LogJournal onActivitiesSaved={handleActivitiesSaved} />
              )}

              {currentView === VIEWS.timeline && (
                <Timeline refreshKey={timelineRefreshKey} />
              )}
            </main>
          </div>
        )
      ) : (
        <Auth />
      )}
    </AuthProvider>
  )
}

export default App
