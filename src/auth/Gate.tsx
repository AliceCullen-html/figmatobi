/**
 * Gate de acesso: exige login Microsoft (Cattalini) quando o Azure está
 * configurado. Sem configuração, libera o app direto (não bloqueia o deploy).
 *
 * O <MsalProvider> vive no main.tsx (topo). Aqui só consumimos o contexto.
 */
import { type ReactNode } from 'react';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { authEnabled, loginRequest, allowedDomain, dominioOk } from './msal';
import { LoginBackground } from './LoginBackground';

export function AuthGate({ children }: { children: ReactNode }) {
  if (!authEnabled) return <>{children}</>;
  return (
    <>
      <AuthenticatedTemplate>
        <DominioGuard>{children}</DominioGuard>
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <TelaLogin />
      </UnauthenticatedTemplate>
    </>
  );
}

function TelaLogin() {
  const { instance } = useMsal();
  return (
    <div className="login-wrap">
      <LoginBackground />
      <div className="login-card">
        <div className="login-tag">CATTALINI · COMERCIAL</div>
        <h1>Deck Mensal — Excel → 18 slides</h1>
        <p>Acesso restrito à equipe Cattalini. Entre com sua conta Microsoft corporativa.</p>
        <button className="btn login-ms" onClick={() => instance.loginRedirect(loginRequest)}>
          <MicrosoftLogo /> Entrar com Microsoft
        </button>
        {allowedDomain && <p className="login-dom">Somente contas <strong>@{allowedDomain}</strong>.</p>}
      </div>
    </div>
  );
}

/** Bloqueia usuários autenticados mas de fora do domínio permitido. */
function DominioGuard({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal();
  const user = accounts[0];
  if (!dominioOk(user?.username)) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-tag">ACESSO NEGADO</div>
          <h1>Conta fora do domínio permitido</h1>
          <p>Você entrou como <strong>{user?.username}</strong>, mas este app é restrito a contas <strong>@{allowedDomain}</strong>.</p>
          <button className="btn sec" onClick={() => instance.logoutRedirect()}>Sair e trocar de conta</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/** Chip de usuário + logout para o cabeçalho (só aparece com auth ligado). */
export function UserChip() {
  const { instance, accounts } = useMsal();
  if (!authEnabled) return null;
  const user = accounts[0];
  if (!user) return null;
  return (
    <span className="user-chip" title={user.username}>
      <span className="user-nome">{user.name ?? user.username}</span>
      <button className="user-sair" onClick={() => instance.logoutRedirect()}>Sair</button>
    </span>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true" style={{ marginRight: 8, verticalAlign: 'middle' }}>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
