# Matriz de cobertura e criterio de liberacao

O inventario `inventory/source-branches.json` fotografa TODAS as clausulas condicionais que implementam rotas no Web.php e no Api.php. Ele e atualizado deliberadamente quando as rotas mudam. A auditoria falha se aparecerem rotas novas ou rotas removidas que nao foram revisadas.

## Grupos de testes

| Grupo | Exemplos de regressao | Camada automatizada |
|---|---|---|
| Publico | /vagas, modal, pesquisa, filtros, imagem, valores, switch lista/cards, erro 404, "Tenho interesse" | browser |
| Cadastro | registro por vaga, 3 etapas, CPF, senha, termos, verificacao, reenvio | browser com fixtures de homologacao |
| Autenticacao | login, logout, CPF/e-mail, invalidos, acesso nao autenticado, multiplos perfis | browser + API |
| Profissional | painel, oportunidades, acompanhar, candidatar-se, agenda, check-in, checkout, ganhos, reputacao, upload | browser + API; acoes mutaveis com fixture |
| Empresa | criacao, edicao, cancelamento e foto da vaga; categoria modal; aceitar/rejeitar candidato; convite; financeiro | browser; escrita staging |
| Admin | usuarios, empresas, candidatos, verificacoes, documentos, edicao inline, auditoria, relatorios, skin | browser; escrita staging |
| Integracoes | WhatsApp, geolocalizacao, mapas, CEP, chat, notificacoes, pagamento | contratos + staging integrado |
| Seguranca | IDOR, acesso entre perfis, token, CSRF, XSS, arquivos privados | negative tests + pentest dedicado |
| Qualidade | JS errors, PHP warnings, 5xx, screenshots, imagens quebradas | observabilidade + browser |
| API | saude, publicas, auth, me, opportunities, assignments, follow, checkin, checkout | contract + escrita staging |

## Regras de qualidade

1. Nao tratar `skip` como `pass`; ausencia de credenciais/fixtures e **lacuna**.
2. Nao executar alteracoes no banco ou arquivos reais; fluxo completo so em homologacao com dados descartaveis.
3. Falhas criticas (autenticacao, permissao, candidatura, checkout, dados financeiros) impedem liberacao.
4. Alteracao de rota exige entrada no inventario + pelo menos um teste executavel ou uma justificativa rastreavel.
5. Cada bug deve conter URL, papel, passos, evidencias (screenshot/trace), esperado e obtido, impacto e commit que introduziu problema.
6. Fazer testes negativos e limites: vazio, invalido, repeticao, concorrencia, timeout, perda de internet, dispositivo movel e acesso indevido.
7. Complementar suite E2E com testes unitarios PHP e analise estatica no proprio `turnopronto_web`.

## Lacunas que dependem de fixture real

- Cadastrar empresas/profissionais novos, confirmar WhatsApp e completar PIX.
- Criar vaga e editar imagem, notificar interessados e aprovar candidaturas.
- Check-in PIN (incluindo restricao de checkout antes de 15 minutos), check-out e contabilizacao.
- Upload/revisao de documentos; reputacao e contestacoes.
- Integracoes externas e entrega efetiva de WhatsApp/pagamentos.
- Sessao de chat com mensagens bidirecionais simultaneas.
- Acessibilidade (WCAG), desempenho sob carga, WebSockets e pentest.

Estas validacoes exigem ambiente isolado, usuarios de teste, dados sem informacoes pessoais reais e, em algumas integracoes, mocks de provedores.
