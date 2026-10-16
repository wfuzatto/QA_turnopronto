import { test, expect } from '@playwright/test';
import { site, hasRole } from '../src/config.mjs';
import { loginAs } from '../src/auth.mjs';
import { pages } from '../src/routes.mjs';
import { assertHealthyPage } from '../src/observability.mjs';

test.describe('Negativos de autorizacao @smoke', () => {
  for (const role of ['company','professional','admin']) {
    test('usuario anonimo nao acessa ' + role, async ({ page }) => {
      const protectedPaths=pages[role].slice(0,5);
      for (const route of protectedPaths) {
        const resp=await page.goto(site(route));
        expect(resp?.status(),route).toBeLessThan(500);
        await expect(page, route).toHaveURL(/\/login(?:\?|$)/);
      }
    });
  }

  test('API sem bearer devolve JSON 401, jamais HTML ou dados privados', async ({ request }) => {
    for (const route of ['/me','/opportunities','/home','/assignments','/earnings','/reputation','/documents','/onboarding']) {
      const r=await request.get(site('/api/v1'+route));
      expect(r.status(),route).toBe(401);
      const obj=await r.json();
      expect(obj.ok,route).toBe(false);
      expect(obj.error).toBeTruthy();
      expect(obj).not.toHaveProperty('user');
    }
  });

  test('login incorreto devolve feedback sem autenticar', async ({ page }) => {
    await page.goto(site('/login'));
    await page.locator('input[name="identifier"]').fill('qa-inexistente@turnopronto.invalid');
    await page.locator('input[name="password"]').fill('senha-qa-invalida-23456');
    await page.locator('form[method="post"] button[type="submit"]').first().click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.locator('body')).toContainText(/inválid|incorret|senha/i);
  });

  test('API invalida credenciais com 422 @smoke', async ({ request }) => {
    const r=await request.post(site('/api/v1/auth/login'), {data:{email:'invalid@turnopronto.invalid',password:'invalid'}});
    expect(r.status()).toBe(422);
    const obj=await r.json();
    expect(obj.ok).toBe(false);
    expect(obj).not.toHaveProperty('token');
  });

  test('documentos nao podem ser acessados sem admin', async ({ request }) => {
    for (const path of ['/admin/documentos/1/arquivo','/admin/documentos/empresa/1/arquivo']) {
      const response=await request.get(site(path),{maxRedirects:0});
      expect([301,302,303,307,308,401,403,404]).toContain(response.status());
    }
  });
});

test.describe('Isolamento de papeis', () => {
  const cross={
    professional:['/empresa/dashboard','/admin/dashboard'],
    company:['/profissional/inicio','/admin/dashboard'],
    admin:['/empresa/dashboard','/profissional/inicio']
  };
  for (const [role,paths] of Object.entries(cross)) {
    test(role+' nao pode abrir areas de outros perfis',async({page})=>{
      test.skip(!hasRole(role),'Credenciais QA nao configuradas: '+role);
      await loginAs(page,role);
      for(const route of paths){
        const r=await page.goto(site(route));
        expect(r.status(),route).toBe(403);
        await expect(page.locator('body')).toContainText('Acesso negado');
      }
    });
  }
});
