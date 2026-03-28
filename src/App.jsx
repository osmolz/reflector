import { AuthProvider } from './components/AuthProvider'
import { Auth } from './components/Auth'

function App() {
  return (
    <AuthProvider>
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Reflector</h1>
        <p>Personal time tracking and journaling</p>
        <Auth />
      </div>
    </AuthProvider>
  )
}

export default App
