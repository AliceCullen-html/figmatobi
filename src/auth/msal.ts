/**
 * Login Microsoft (Entra ID / Azure AD) — Cattalini.
 *
 * Fluxo SPA + PKCE: roda 100% no navegador, SEM backend e SEM client secret.
 * A config vem de variáveis de ambiente (Vercel → Settings → Environment
 * Variables), nunca commitadas:
 *   VITE_AZURE_TENANT_ID   — Directory (tenant) ID do Azure AD da Cattalini
 *   VITE_AZURE_CLIENT_ID   — Application (client) ID do App Registration (SPA)
 *   VITE_AZURE_ALLOWED_DOMAIN (opcional) — ex.: "cattalini.com.br"; se setado,
 *       só e-mails desse domínio entram (o tenant já restringe, isto é reforço)
 *
 * Se as duas primeiras não estiverem definidas, o login fica DESLIGADO e o app
 * abre normalmente — assim o deploy atual não quebra até o Azure ser configurado.
 */
import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

const tenant = import.meta.env.VITE_AZURE_TENANT_ID as string | undefined;
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined;

/** Domínio de e-mail permitido (opcional). */
export const allowedDomain = (import.meta.env.VITE_AZURE_ALLOWED_DOMAIN as string | undefined)?.trim().toLowerCase() || '';

/** Login só é exigido quando tenant + client estão configurados. */
export const authEnabled = Boolean(tenant && clientId);

const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? '',
    // authority por tenant → só contas do diretório da Cattalini conseguem logar
    authority: `https://login.microsoftonline.com/${tenant ?? 'organizations'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
  },
  cache: {
    cacheLocation: 'localStorage', // mantém a sessão entre reloads
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

/** Escopos mínimos para identificar o usuário. */
export const loginRequest = { scopes: ['User.Read'] };

/** Estado de erro do último redirect (mostrado na tela de login). */
export const authState: { error: string } = { error: '' };

/** Verifica se o e-mail do usuário pertence ao domínio permitido. */
export function dominioOk(username: string | undefined): boolean {
  if (!allowedDomain) return true;
  return (username ?? '').toLowerCase().endsWith('@' + allowedDomain);
}
