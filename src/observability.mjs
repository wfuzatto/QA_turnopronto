import { expect } from '@playwright/test';

const phpError = /(?:Fatal error:|Uncaught (?:Error|Exception)|Warning:.*(?:php|line \d+)|Parse error:|Stack trace:|SQLSTATE\[)/i;

export function observe(page, testInfo) {
  const problems = [];
  page.on('pageerror', e => problems.push('JS: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('Console: ' + m.text()); });
  page.on('response', response => {
    if (response.status() >= 500 && new URL(response.url()).origin === new URL(page.url() || 'http://localhost').origin) {
      problems.push('HTTP ' + response.status() + ': ' + response.url());
    }
  });
  return async () => {
    const html = await page.locator('body').innerText().catch(() => '');
    if (phpError.test(html)) problems.push('PHP error displayed in UI');
    if (problems.length) {
      await testInfo.attach('browser-errors.txt', { body: problems.join('\n'), contentType: 'text/plain' });
    }
    expect(problems, 'Erros de JS/PHP/HTTP 5xx').toEqual([]);
  };
}
export async function assertHealthyPage(page, expectedPath) {
  await expect(page.locator('body')).toBeVisible();
  const html = await page.locator('body').innerText();
  expect(html).not.toMatch(phpError);
  expect(await page.locator('title').count()).toBeGreaterThan(0);
  if (expectedPath) expect(new URL(page.url()).pathname).toContain(expectedPath);
  const images = await page.locator('img:visible').count();
  if (images) {
    const broken = await page.locator('img:visible').evaluateAll(imgs =>
      imgs.filter(img => img.complete && img.naturalWidth === 0).map(img => img.src)
    );
    expect(broken, 'Imagens quebradas').toEqual([]);
  }
}
