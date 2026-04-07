import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initKeycloak, getKeycloak } from './keycloak'
import api from './api/client'

initKeycloak().then(() => {
  // Attach the Keycloak token to every axios request and refresh it
  // automatically when it's about to expire.
  api.interceptors.request.use(async config => {
    const kc = getKeycloak()
    try {
      await kc.updateToken(30) // refresh if expiring within 30 s
    } catch {
      kc.logout()
      return Promise.reject(new Error('Session expired'))
    }
    if (kc.token) {
      config.headers.Authorization = `Bearer ${kc.token}`
    }
    return config
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
