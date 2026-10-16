import fs from 'node:fs';
if (fs.existsSync('.env')) {
  for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)) {
    const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'');
  }
}
import { URL } from 'node:url';

export const baseUrl = (process.env.QA_BASE_URL || '').replace(/\/+$/, '');
export const base = () => {
  if (!baseUrl) throw Error('Configure QA_BASE_URL; testes em ambiente nao definido sao proibidos.');
  return new URL(baseUrl + '/');
};
export const site = (path = '/') => {
  const root = baseUrl.replace(/\/+$/, '');
  return root + '/' + path.replace(/^\/+/, '');
};
export const roleCredentials = {
  company: { user: process.env.QA_COMPANY_USER, password: process.env.QA_COMPANY_PASSWORD },
  professional: { user: process.env.QA_PROFESSIONAL_USER, password: process.env.QA_PROFESSIONAL_PASSWORD },
  admin: { user: process.env.QA_ADMIN_USER, password: process.env.QA_ADMIN_PASSWORD }
};
export const hasRole = (role) => Boolean(roleCredentials[role]?.user && roleCredentials[role]?.password);
export const tokenFor = role => process.env['QA_' + role.toUpperCase() + '_TOKEN'];
export const productionHost = () => {
  const host = base().hostname.toLowerCase();
  return host === 'turnopronto.com.br' || host.endsWith('.turnopronto.com.br') && !host.startsWith('staging.') && !host.startsWith('qa.');
};
export function assertWritesEnabled() {
  if (process.env.QA_ALLOW_WRITES !== '1' || process.env.QA_TARGET !== 'staging') {
    throw Error('Mutacoes exigem QA_ALLOW_WRITES=1 e QA_TARGET=staging.');
  }
  const allowed = (process.env.QA_STAGING_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const host = base().hostname.toLowerCase();
  if (!allowed.includes(host) || productionHost()) {
    throw Error('Hostname nao permitido para escrita: ' + host + '. Configure QA_STAGING_HOSTS.');
  }
}
export const fixture = name => {
  const raw = process.env['QA_' + name.toUpperCase() + '_ID'];
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
};
