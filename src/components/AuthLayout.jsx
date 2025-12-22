import React from 'react'

const AuthLayout = ({ title, subtitle, children, footnote }) => {
  return (
    <div className="auth-layout">
      <section className="auth-card">
        <div className="auth-header">
          <p className="auth-eyebrow">Admin access</p>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {children}
        {footnote ? <div className="auth-footer">{footnote}</div> : null}
      </section>
    </div>
  )
}

export default AuthLayout
