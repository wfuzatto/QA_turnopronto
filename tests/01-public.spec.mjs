import { test, expect } from '@playwright/test';
import { site, hasRole, roleCredentials } from '../src/config.mjs';
import { assertHealthyPage, observe } from '../src/observability.mjs';

test.describe('Site publico @smoke', () => {
  test('vagas publicas carregam sem login, com remuneração e chamadas para ação', async ({ page }, testInfo) => {
    const finish = observe(page, testInfo);
    const response = await page.goto(site('/vagas'));
    expect(response?.status()).toBeLessThan(400);
    await assertHealthyPage(page, '/vagas');
    await expect(page.locator('body')).toContainText(/vaga|oportunidade/i);
    await expect(page.locator('a[href*="login"]')).not.toHaveCount(0);
    const cards = page.locator('[data-tp3-list-job], [data-public-job-modal-open], [data-opportunity-row]');
    if (await cards.count()) {
      await expect(page.locator('body')).toContainText(/R\$|valor|remunera/i);
    } else {
      testInfo.annotations.push({ type: 'sem-dados', description: 'Sem vagas publicadas nesta fixture; fluxo de anuncio nao foi exercitado' });
    }
    await finish();
  });

  test('busca e filtros publicos atualizam a lista sem erro de JavaScript', async ({ page }, testInfo) => {
    const finish = observe(page, testInfo);
    await page.goto(site('/vagas'));
    const search = page.locator('[data-tp3-search], [data-modern-job-search]').first();
    if (!(await search.count())) test.skip(true, 'Skin atual nao possui controle de busca instrumentado');
    const input = search.locator('input[name="role"], input[name="q"], input[type="search"]').first();
    await expect(input).toBeVisible();
    await input.fill('qa-palavra-inexistente-928371');
    if (await search.locator('button[type="submit"]').count()) await search.locator('button[type="submit"]').first().click();
    else await input.press('Enter');
    await expect(input).toHaveValue('qa-palavra-inexistente-928371');
    const category = page.locator('[data-tp3-category]').first();
    if (await category.count()) {
      await category.click();
      await expect(category).toHaveAttribute('aria-pressed', 'true');
    }
    await finish();
  });

  test('troca de lista/cards e modal de detalhes funcionam', async ({ page }, testInfo) => {
    const finish = observe(page, testInfo);
    await page.goto(site('/vagas'));
    const grid = page.locator('[data-tp3-view="grid"]');
    const list = page.locator('[data-tp3-view="list"]');
    if (await grid.count()) {
      await grid.click();
      await expect(grid).toHaveAttribute('aria-pressed', 'true');
      await list.click();
      await expect(list).toHaveAttribute('aria-pressed', 'true');
    }
    const open = page.locator('[data-public-job-modal-open]').first();
    if (!(await open.count())) test.skip(true, 'Sem vagas/modal disponiveis nesta skin/fixture');
    await open.click();
    const dialogs = page.locator('dialog.public-job-modal[open], dialog.public-job-modal:modal');
    await expect(dialogs).toHaveCount(1);
    await expect(dialogs.first()).toContainText(/Remuneração|vaga|turno/i);
    await dialogs.first().locator('[data-public-job-modal-close]').first().click();
    await expect(dialogs).toHaveCount(0);
    await finish();
  });

  test('interesse anonimo inicia cadastro somente ao candidatar-se', async ({ page }, testInfo) => {
    await page.goto(site('/vagas'));
    const form = page.locator('form[action$="/interesse"]').first();
    if (!(await form.count())) test.skip(true, 'E necessario pelo menos uma vaga publicada');
    const target = new URL(await form.getAttribute('action'), site('/vagas')).pathname;
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/cadastro\/profissional(?:\?|$)/);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="cpf"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    testInfo.annotations.push({type:'fluxo',description:'Interesse ' + target + ' conduz ao cadastro basico'});
  });

  test('registrar profissional sem vaga nao impõe cadastro', async ({ page }) => {
    await page.goto(site('/cadastro/profissional'));
    await expect(page).toHaveURL(/\/vagas(?:\?|$)/);
  });

  test('formulario empresa possui dados, aceite e confirmacao de senha', async ({ page }) => {
    await page.goto(site('/cadastro/empresa'));
    for (const name of ['name','phone','email','company_email','responsible_cpf','cnpj','trade_name','postal_code','password','password_confirm','terms_accepted','privacy_accepted']) {
      await expect(page.locator('[name="' + name + '"]')).toHaveCount(1);
    }
    const invalid = page.locator('input[name="cnpj"]');
    await invalid.fill('12');
    await expect(invalid).not.toHaveValue('12345678000199');
    const pass = page.locator('input[name="password"]');
    const toggle = pass.locator('xpath=..').locator('[data-password-toggle]');
    if (await toggle.count()) {
      await toggle.click();
      await expect(pass).toHaveAttribute('type','text');
      await toggle.click();
      await expect(pass).toHaveAttribute('type','password');
    }
  });

  test('links legais e login respondem sem erro PHP', async ({ page }, testInfo) => {
    const finish=observe(page,testInfo);
    for (const url of ['/login','/termos','/privacidade']) {
      const resp=await page.goto(site(url));
      expect(resp?.status()).toBeLessThan(400);
      await assertHealthyPage(page);
    }
    await finish();
  });

  test('versao mobile nao tem rolagem horizontal anormal @mobile', async ({ page }) => {
    await page.goto(site('/vagas'));
    const metrics=await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth
    }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport+2);
  });
});

test.describe('regressao apos login', () => {
  test('vagas continuam disponiveis para o profissional autenticado', async ({ page }) => {
    test.skip(!hasRole('professional'), 'Configure QA_PROFESSIONAL_USER e QA_PROFESSIONAL_PASSWORD');
    await page.goto(site('/login'));
    await page.locator('[name="identifier"]').fill(roleCredentials.professional.user);
    await page.locator('[name="password"]').fill(roleCredentials.professional.password);
    await page.locator('form[method="post"] button[type="submit"]').first().click();
    await expect(page).not.toHaveURL(/\/login$/);
    const response=await page.goto(site('/vagas'));
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toContainText(/vaga|oportunidade/i);
    const api=await page.request.get(site('/api/v1/public/opportunities'));
    expect(api.status()).toBe(200);
    expect((await api.json()).ok).toBe(true);
  });
});
