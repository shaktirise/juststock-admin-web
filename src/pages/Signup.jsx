import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { adminSignup } from '../services/api'

const Signup = () => {
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [status, setStatus] = useState({ loading: false, error: '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ loading: true, error: '' })

    if (formValues.password !== formValues.confirmPassword) {
      setStatus({
        loading: false,
        error: 'Passwords do not match. Please try again.',
      })
      return
    }

    try {
      await adminSignup({
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        password: formValues.password,
        confirmPassword: formValues.confirmPassword,
      })
      navigate('/login', {
        replace: true,
        state: { email: formValues.email.trim() },
      })
    } catch (error) {
      setStatus({
        loading: false,
        error: error?.message || 'Unable to create account. Please try again.',
      })
    }
  }

  return (
    <AuthLayout
      title="Create your admin account"
      subtitle="Set up the admin account to access the JustStock console."
      footnote={
        <p>
          Already have an account? <Link to="/login">Log in here</Link>.
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="input-field">
            <span>Full name</span>
            <input
              type="text"
              name="name"
              value={formValues.name}
              onChange={handleChange}
              placeholder="Admin Name"
              autoComplete="name"
              required
            />
          </label>
          <label className="input-field">
            <span>Work email</span>
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
        </div>
        <label className="input-field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={formValues.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="input-field">
          <span>Confirm password</span>
          <input
            type="password"
            name="confirmPassword"
            value={formValues.confirmPassword}
            onChange={handleChange}
            placeholder="Repeat password"
            autoComplete="new-password"
            required
          />
        </label>
        {status.error ? <p className="form-error">{status.error}</p> : null}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={status.loading}
        >
          {status.loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default Signup
