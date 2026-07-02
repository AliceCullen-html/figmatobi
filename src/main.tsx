import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './auth/Gate'
import { msalInstance, authEnabled } from './auth/msal'

const root = createRoot(document.getElementById('root')!)

function render() {
  root.render(
    <StrictMode>
      {authEnabled ? (
        <MsalProvider instance={msalInstance}>
          <AuthGate>
            <App />
          </AuthGate>
        </MsalProvider>
      ) : (
        <App />
      )}
    </StrictMode>,
  )
}

if (authEnabled) {
  // MSAL v5 exige initialize() + tratar o retorno do redirect antes de renderizar
  msalInstance
    .initialize()
    .then(() => msalInstance.handleRedirectPromise())
    .then(() => {
      const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
      if (account) msalInstance.setActiveAccount(account)
      render()
    })
    .catch((e) => {
      console.error('Falha ao inicializar login Microsoft:', e)
      render() // ainda renderiza (cai na tela de login)
    })
} else {
  render()
}
