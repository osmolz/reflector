import { AuthProvider } from './components/AuthProvider'
import { Auth } from './components/Auth'
import { VoiceCheckIn } from './components/VoiceCheckIn'
import Chat from './components/Chat'
import { useAuthStore } from './store/authStore'

function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <AuthProvider>
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Reflector</h1>
        <p>Personal time tracking and journaling</p>
        {user ? (
          <div>
            <div style={{ marginBottom: '40px' }}>
              <h2>Voice Check-in</h2>
              <VoiceCheckIn />
            </div>
            <div>
              <h2>Chat Analytics</h2>
              <Chat />
            </div>
          </div>
        ) : (
          <Auth />
        )}
      </div>
    </AuthProvider>
  )
}

export default App
