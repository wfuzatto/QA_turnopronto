# QA TurnoPronto

Sistema independente de qualidade do [turnopronto_web](https://github.com/wfuzatto/turnopronto_web).

## O que este repositório verifica

- Site público: anúncios, pesquisa, filtros, valor, modal, navegação e cadastro progressivo.
- Segurança: isolamento de perfis, acesso sem autenticação, respostas da API, CSRF, erros HTTP e vazamentos de PHP.
- Profissional: páginas de oportunidades, agenda, turnos, ganhos, reputação, documentos, notificações e suporte.
- Empresa: dashboard, vagas, formulário, categorias, escalas, financeiro, avaliações, verificação e suporte.
- Administração: diretórios, usuários, documentos, cadastros, relatórios, configurações, auditoria e suporte.
- Contrato REST: respostas públicas, endpoints autenticados, 401/403/404 e formato JSON.
- Observabilidade: console JavaScript, falhas de requisição, erros de renderização, screenshots, traces e relatório HTML.
- Auditoria da superfície: comparação automática de todas as ramificações de rotas PHP com um inventário versionado.

**Importante:** nenhuma suíte consegue garantir ausência total de defeitos. O projeto diferencia explicitamente **testado, ignorado por falta de fixture, bloqueado e falhou**. Um teste ignorado não é considerado evidência de que a função funciona.

## Iniciar

Requisitos: Node.js 20+, ambiente web PHP/MySQL do TurnoPronto já instalado e executando.

```bash
npm install --no-audit --no-fund
npx playwright install --with-deps chromium
cp .env.example .env
# Configure QA_BASE_URL no ambiente ou carregue .env
npm run qa:smoke
npm run qa:full
npm run qa:audit
npm run qa:report
```

`QA_BASE_URL` **é obrigatório**. Use um ambiente de homologação. O navegador não deve apontar para o banco de produção para fluxos mutáveis.

## Modos de execução

| Comando | Abrangência | Modifica dados? |
|---|---|---|
| `npm run qa:smoke` | páginas/API públicas e segurança anônima | não modifica registros funcionais |
| `npm run qa:full` | público, contas por perfil (quando fornecidas), API e regressões | apenas leitura funcional, exceto login (atualiza último acesso) |
| `npm run qa:staging` | fluxos positivos de alteração em massa controlados por fixtures | **sim; somente em homologação isolada** |
| `npm run qa:audit` | inventário de caminhos PHP e rotas REST | não |
| `npm run qa:report` | consolida resultados de cobertura por grupos | não |

Para contas autenticadas, preencha `QA_COMPANY_USER/PASSWORD`, `QA_PROFESSIONAL_USER/PASSWORD`, `QA_ADMIN_USER/PASSWORD`. Para a API, utilize tokens de teste `QA_PROFESSIONAL_TOKEN`, `QA_COMPANY_TOKEN`.

Para liberar **mutação**, é obrigatório `QA_ALLOW_WRITES=1`, `QA_TARGET=staging` e hostname de homologação explicitamente permitido por `QA_STAGING_HOSTS`. Nunca adicione dados reais no repositório.

## Integrando com o código-fonte

O workflow baixa o `wfuzatto/turnopronto_web` no diretório `app-under-test` e compara `app/Web.php` e `app/Api.php` com `inventory/source-branches.json`. Um novo `if` de roteamento obriga a atualizar o inventário e os testes correspondentes. Não esconda falhas de cobertura marcando tudo como coberto.

- `docs/COBERTURA.md`: matriz de cenários, riscos e critérios de aceite.
- `playwright-report/`: relatório local HTML.
- `test-results/`: vídeo/trace/screenshot no erro, quando aplicável.
- `artifacts/`: relatório de inventário e cobertura.

## Limitações e critérios de liberação

Para afirmar que um release está validado, exigimos execução com contas e dados próprios de QA, zero falhas críticas, nenhuma rota nova sem cobertura, todos os testes críticos concluídos e análise dos itens condicionais (WhatsApp, pagamentos, check-in, geolocalização, rede externa). Testes que dependem de dados de turno, PIN ou KYC precisam de fixtures controladas e nunca devem ser disparados contra produção.

> Este repositório é **QA**; não executa deploy no site nem altera o `turnopronto_web`.

## Execucao no GitHub Actions

O workflow faz **smoke read-only** da pagina publica e da API diariamente de segunda a sexta e nos pushes (por padrao `https://turnopronto.com.br`; mude `vars.QA_BASE_URL` para homologacao). O pacote completo autenticado executa quando `vars.QA_BASE_URL` estiver configurado e os secrets forem fornecidos. `QA_ENFORCE_COMPLETE=1` reprova a etapa completa se houver testes ignorados ou instaveis; isso impede um falso verde causado por falta de credenciais.

**Defeito de regressao ja mapeado:** `/profissional/oportunidades` atualmente nao possui checkbox para mostrar apenas vagas acompanhadas. O teste correspondente deve falhar ate o controle ser implementado no sistema web.
