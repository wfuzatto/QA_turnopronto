import { assertWritesEnabled, baseUrl } from '../src/config.mjs';
if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
  console.error('ERRO: QA_BASE_URL deve apontar para a instancia de homologacao ou alvo de leitura.');
  process.exit(2);
}
if (process.argv.includes('--writes')) {
  try { assertWritesEnabled(); } catch (e) { console.error(e.message); process.exit(2); }
}
console.log('Alvo configurado: ' + new URL(baseUrl).origin + new URL(baseUrl).pathname);
