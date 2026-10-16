import { expect } from '@playwright/test';
import { hasRole, roleCredentials, site } from './config.mjs';

export async function loginAs(page, role) {
  if (!hasRole(role)) throw Error('Credenciais de QA ausentes para ' + role);
  await page.goto(site('/login'));
  await expect(page.locator('input[name="identifier"]')).toBeVisible();
  await page.locator('input[name="identifier"]').fill(roleCredentials[role].user);
  await page.locator('input[name="password"]').fill(roleCredentials[role].password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 15_000 }),
    page.locator('form[method="post"] button[type="submit"]').first().click()
  ]);
  const destinations = { company: '/empresa/dashboard', professional: '/profissional/inicio', admin: '/admin/dashboard' };
  await expect(page).toHaveURL(new RegExp(destinations[role].replaceAll('/', '\\/').replace('?', '\\?')));
}
export function roleEnabled(role) { return hasRole(role); }
