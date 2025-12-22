import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { adminLogin } from '../services/api'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const initialEmail = useMemo(() => location.state?.email || '', [location])
  const [formValues, setFormValues] = useState({
    email: initialEmail,
    password: '',
  })
  const [status, setStatus] = useState({ loading: false, error: '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ loading: true, error: '' })

    try {
      const data = await adminLogin({
        email: formValues.email.trim(),
        password: formValues.password,
      })
      const token =
        data?.token ||
        data?.data?.token ||
        data?.accessToken ||
        data?.data?.accessToken

      if (!token) {
        throw new Error('Login succeeded but no token was returned.')
      }

      window.localStorage.setItem('adminToken', token)
      navigate('/app', { replace: true })
    } catch (error) {
      setStatus({
        loading: false,
        error: error?.message || 'Login failed. Please try again.',
      })
    }
  }

  return (
    <AuthLayout
      title="Sign in to JustStock"
      subtitle="Enter your admin credentials to reach the command center."
      footnote={
        <p>
          New admin? <Link to="/signup">Create your account</Link>.
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit}>
        <label className="input-field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={formValues.email}
            onChange={handleChange}
            placeholder="admin@example.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="input-field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={formValues.password}
            onChange={handleChange}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />
        </label>
        {status.error ? <p className="form-error">{status.error}</p> : null}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={status.loading}
        >
          {status.loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default Login
