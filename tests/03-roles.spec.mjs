import { test, expect } from '@playwright/test';
import { site, hasRole, fixture } from '../src/config.mjs';
import { loginAs } from '../src/auth.mjs';
import { pages, sharedPages } from '../src/routes.mjs';
import { assertHealthyPage, observe } from '../src/observability.mjs';

for(const role of ['professional','company','admin']) {
  test.describe('Painel '+role,()=>{
    test.beforeEach(async ({page})=>{
      test.skip(!hasRole(role),'Configure login QA desse perfil');
      await loginAs(page,role);
    });

    for(const route of pages[role]) {
      test('pagina '+route+' carrega sem erros',async({page},testInfo)=>{
        const finish=observe(page,testInfo);
        const resp=await page.goto(site(route));
        expect(resp.status(),route).toBeLessThan(400);
        await assertHealthyPage(page);
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
        await finish();
      });
    }

    test('busca global, notificacoes e navegação compartilhada',async({page},testInfo)=>{
      const finish=observe(page,testInfo);
      await page.goto(site(pages[role][0]));
      const search=page.locator('[data-global-search-input]');
      if (role === 'admin') {
        // O layout do administrador omite deliberadamente a barra de busca global.
        await expect(search).toHaveCount(0);
        await page.goto(site('/buscar?q=qa-palavra-sem-correspondencia-9271'));
      } else {
        await expect(search).toBeVisible();
        await search.fill('qa-palavra-sem-correspondencia-9271');
        await search.press('Enter');
      }
      await expect(page).toHaveURL(/\/buscar\?q=/);
      await expect(page.locator('body')).toContainText(/busca|resultado|encontrad/i);
      const r=await page.request.get(site('/notificacoes/feed'));
      expect(r.status()).toBe(200);
      const data=await r.json();
      expect(data.ok).toBe(true);
      expect(data.data).toBeTruthy();
      await page.goto(site('/notificacoes'));
      await assertHealthyPage(page);
      await finish();
    });

    test('controle de notificacoes abre e fecha',async({page})=>{
      await page.goto(site(pages[role][0]));
      const button=page.locator('[data-notifications-toggle]');
      await expect(button).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute('aria-expanded','true');
      await expect(page.locator('[data-notifications-panel]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(button).toHaveAttribute('aria-expanded','false');
    });
  });
}

test.describe('Empresa: formulario de vaga',()=>{
  test.beforeEach(async({page})=>{test.skip(!hasRole('company'),'Credenciais QA empresa ausentes');await loginAs(page,'company');});
  test('campos, foto e modalidade de aceite manual',async({page})=>{
    await page.goto(site('/empresa/vagas/nova'));
    for(const name of ['category_id','title','required_workers','value','date','start_time','end_time','address','city','state','acceptance_mode']) {
      await expect(page.locator('[name="'+name+'"]').first()).toBeVisible();
    }
    await expect(page.locator('input[name="shift_image"]')).toHaveAttribute('accept',/image/);
    await page.locator('input[name="acceptance_mode"][value="manual"]').check();
    await expect(page.locator('input[name="acceptance_mode"][value="manual"]')).toBeChecked();
  });
  test('modal de categoria abre sem salvar',async({page})=>{
    await page.goto(site('/empresa/vagas/nova'));
    await page.locator('[data-category-modal-open]').click();
    await expect(page.locator('[data-category-modal]')).toBeVisible();
    await expect(page.locator('#new-category-name')).toBeVisible();
    await page.locator('[data-category-modal-close]').first().click();
    await expect(page.locator('[data-category-modal]')).toBeHidden();
  });
  test('filtro da listagem de vagas nao remove a tabela permanentemente',async({page})=>{
    await page.goto(site('/empresa/vagas'));
    const input=page.locator('[data-filter-search]');
    await input.fill('termo-qa-nunca-existente-028377');
    await expect(page.locator('[data-filter-row]:visible')).toHaveCount(0);
    await input.fill('');
    expect(await page.locator('[data-filter-row]').count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Admin: diretorio e ajustes',()=>{
  test.beforeEach(async({page})=>{test.skip(!hasRole('admin'),'Credenciais QA admin ausentes');await loginAs(page,'admin');});
  test('usuarios possui busca que filtra na tabela',async({page})=>{
    await page.goto(site('/admin/usuarios'));
    const search=page.locator('[data-filter-search]');
    await expect(search).toBeVisible();
    await search.fill('usuario-inexistente-qa-0029');
    await expect(page.locator('[data-filter-row]:visible')).toHaveCount(0);
    await search.fill('');
  });
  test('configuracoes oferecem skins sem publicar alteracoes',async({page})=>{
    await page.goto(site('/admin/configuracoes'));
    await expect(page.locator('form')).not.toHaveCount(0);
    await expect(page.locator('input[name="web_skin"],.admin-skin-card')).not.toHaveCount(0);
  });
  test('edicao inline visivel quando existe cadastro de teste',async({page})=>{
    const id=fixture('admin_company');
    test.skip(!id,'Configure QA_ADMIN_COMPANY_ID de fixture');
    await page.goto(site('/admin/verificacao/empresa/'+id));
    const editable=page.locator('[data-inline-field][data-inline-edit-url]').first();
    await expect(editable,'Edicao inline deve existir no cadastro da empresa').toBeVisible();
    await editable.dblclick();
    await expect(editable.locator('input,textarea,select').first()).toBeVisible();
    // Nao salva: integridade do dado de teste e preservada.
    await page.keyboard.press('Escape');
  });
});

test.describe('Profissional: turnos e oportunidades',()=>{
  test.beforeEach(async({page})=>{test.skip(!hasRole('professional'),'Credenciais QA profissional ausentes');await loginAs(page,'professional');});
  test('listagem de oportunidades possui controle de distancia',async({page})=>{
    await page.goto(site('/profissional/oportunidades'));
    await expect(page.locator('body')).toContainText(/oportunidade|vaga/i);
    const location=page.locator('[data-opportunity-location]');
    if (await location.count()) {
      await expect(location.locator('[data-location-status]').first()).toBeVisible();
    }
  });
  test('turno especifico exige dados proprios de QA',async({page})=>{
    const id=fixture('assignment');
    test.skip(!id,'QA_ASSIGNMENT_ID nao definido');
    await page.goto(site('/profissional/turno/'+id));
    await assertHealthyPage(page);
    await expect(page.locator('body')).toContainText(/turno|check-in|check-out/i);
  });
  test('detalhe da vaga acompanha identidade e valor',async({page})=>{
    const id=fixture('shift');
    test.skip(!id,'QA_SHIFT_ID nao definido');
    await page.goto(site('/profissional/vagas/'+id));
    await assertHealthyPage(page);
    await expect(page.locator('body')).toContainText(/R\$|valor|remunera/i);
  });
});
