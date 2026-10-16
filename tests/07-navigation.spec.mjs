import {test,expect} from '@playwright/test';
import {site,hasRole} from '../src/config.mjs';
import {loginAs} from '../src/auth.mjs';

test.describe('Navegacao e componentes resilientes',()=>{
  test('HTML e recursos internos criticos nao geram erro 404 @smoke',async({page})=>{
    for(const path of ['/vagas','/login','/cadastro/empresa']){
      const response=await page.goto(site(path));
      expect(response.status()).toBeLessThan(400);
      const assets=await page.locator('link[rel="stylesheet"][href], script[src], img[src]').evaluateAll(nodes=>
        nodes.map(n=>n.href||n.src).filter(u=>new URL(u).origin===location.origin)
      );
      const unique=[...new Set(assets)];
      for(const url of unique){
        const result=await page.request.get(url);
        expect(result.status(),'Asset indisponivel: '+url).toBeLessThan(400);
      }
    }
  });

  for(const role of ['professional','company','admin']){
    test('menu '+role+' nao tem links vazios nem destino 404',async({page})=>{
      test.skip(!hasRole(role),'Conta QA ausente');
      await loginAs(page,role);
      const menu=page.locator('#sidebar .side-link');
      const count=await menu.count();
      expect(count).toBeGreaterThan(0);
      const hrefs=await menu.evaluateAll(els=>els.map(el=>el.getAttribute('href')));
      expect(hrefs.every(Boolean)).toBe(true);
      for(const href of hrefs){
        const resp=await page.goto(new URL(href,site('/')).href);
        expect(resp.status(),href).toBeLessThan(400);
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
      }
    });
  }

  test('CEP e CPF admitem apenas formato valido no cadastro @smoke',async({page})=>{
    await page.goto(site('/cadastro/empresa'));
    const cpf=page.locator('[name="responsible_cpf"]');
    await cpf.fill('12345678901');
    await expect(cpf).toHaveValue(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    const cep=page.locator('[name="postal_code"]');
    await cep.fill('37456000');
    await expect(cep).toHaveValue(/\d{5}-\d{3}/);
  });

  test('nao aceitar envio do cadastro sem consentimentos @smoke',async({page})=>{
    await page.goto(site('/cadastro/empresa'));
    const terms=page.locator('[name="terms_accepted"]');
    const privacy=page.locator('[name="privacy_accepted"]');
    const whatsapp=page.locator('[name="whatsapp_consent"]');
    await expect(terms).toHaveAttribute('required','');
    await expect(privacy).toHaveAttribute('required','');
    await expect(whatsapp).toHaveAttribute('required','');
  });

  test('página invalida entrega 404 e nao stack trace @smoke',async({page})=>{
    const resp=await page.goto(site('/rota-qa-que-nao-existe-43842'));
    expect(resp.status()).toBe(404);
    await expect(page.locator('body')).not.toContainText(/Stack trace:|Fatal error:|SQLSTATE\[/i);
  });
});
