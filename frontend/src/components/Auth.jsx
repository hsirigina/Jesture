import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

const Auth = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      })

      if (error) throw error

      // Auto-login after signup (no email confirmation)
      if (data.user) {
        console.log('User created and logged in:', data.user)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      console.log('User signed in:', data.user)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Gesture Workflow Builder</h1>
        <p className="auth-subtitle">Build custom gesture-controlled automations</p>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <div className="auth-buttons">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="btn-secondary"
            >
              {loading ? 'Loading...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <p className="auth-note">Hackathon mode: No email confirmation required</p>
      </div>
    </div>
  )
}

export default Auth
