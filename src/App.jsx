import { AuthProvider } from './components/AuthProvider'
import { Auth } from './components/Auth'
import { VoiceCheckIn } from './components/VoiceCheckIn'
import { useAuthStore } from './store/authStore'

function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <AuthProvider>
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Reflector</h1>
        <p>Personal time tracking and journaling</p>
        {user ? (
          <VoiceCheckIn />
        ) : (
          <Auth />
        )}
      </div>
    </AuthProvider>
  )
}

export default App
