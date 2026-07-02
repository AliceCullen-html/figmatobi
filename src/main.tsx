import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import './index.css'
import App from './App.tsx'
import { AuthGate, LoadingScreen } from './auth/Gate'
import { msalInstance, authEnabled, authState } from './auth/msal'

const root = createRoot(document.getElementById('root')!)

function renderApp() {
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
  // mostra "Entrando…" enquanto o MSAL inicializa / conclui o redirect
  root.render(<StrictMode><LoadingScreen /></StrictMode>)
  msalInstance
    .initialize()
    // navigateToLoginRequestUrl:false → processa a resposta aqui, sem reload extra
    .then(() => msalInstance.handleRedirectPromise({ navigateToLoginRequestUrl: false }))
    .then((res) => {
      const account = res?.account ?? msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
      if (account) msalInstance.setActiveAccount(account)
      renderApp()
    })
    .catch((e) => {
      // surfacia o erro na tela de login (ex.: AADSTS9002326 = redirect não é SPA)
      authState.error = (e && (e.errorMessage || e.message)) ? String(e.errorMessage || e.message) : String(e)
      console.error('MSAL redirect:', e)
      renderApp()
    })
} else {
  renderApp()
}
