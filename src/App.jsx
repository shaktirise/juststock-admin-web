import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { getAdminToken } from './services/api'

const RequireAuth = ({ children }) => {
  const token = getAdminToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

const App = () => {
  const token = getAdminToken()

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to={token ? '/app' : '/signup'} replace />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
