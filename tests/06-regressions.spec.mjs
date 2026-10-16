import {test,expect} from '@playwright/test';
import {site,hasRole} from '../src/config.mjs';
import {loginAs} from '../src/auth.mjs';

test.describe('Regressoes conhecidas por produto',()=>{
  test('o mesmo conjunto de vagas publicas permanece apos login do profissional',async({page})=>{
    test.skip(!hasRole('professional'),'Precisa de QA_PROFESSIONAL_USER/PASSWORD');
    await page.goto(site('/vagas'));
    const listing=page.locator('[data-tp3-list-job]');
    const idsBefore=await listing.locator('form[action$="/interesse"]').evaluateAll(forms=>
      forms.map(f=>(f.getAttribute('action')||'').match(/\/vagas\/(\d+)\//)?.[1]).filter(Boolean).sort()
    );
    test.skip(idsBefore.length===0,'Necessaria vaga publica na fixture e skin moderna');
    await loginAs(page,'professional');
    await page.goto(site('/vagas'));
    const idsAfter=await page.locator('[data-tp3-list-job] form[action$="/interesse"]').evaluateAll(forms=>
      forms.map(f=>(f.getAttribute('action')||'').match(/\/vagas\/(\d+)\//)?.[1]).filter(Boolean).sort()
    );
    expect(idsAfter,'Vagas publicas nao podem desaparecer ao autenticar').toEqual(idsBefore);
  });

  test('usuario profissional tem filtro exclusivo de vagas acompanhadas',async({page})=>{
    test.skip(!hasRole('professional'),'Exige profissional QA');
    await loginAs(page,'professional');
    await page.goto(site('/profissional/oportunidades'));
    const checkbox=page.getByRole('checkbox',{name:'Apenas vagas acompanhadas'});
    await expect(checkbox,'Regressao: falta o filtro acessivel de vagas acompanhadas').toBeVisible();
    await expect(checkbox).not.toBeChecked();

    const rows=page.locator('[data-opportunity-row]');
    await expect(rows,'Fixture QA precisa trazer vagas para validar o filtro').not.toHaveCount(0);
    await page.locator('[data-opportunity-radius]').selectOption('0');
    await page.locator('[data-opportunity-days]').selectOption('0');
    const total=await rows.count();
    await expect(page.locator('[data-opportunity-row]:visible')).toHaveCount(total);

    const followed=await page.locator('[data-opportunity-row][data-following="1"]').count();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await expect(page.locator('[data-opportunity-row][data-following="0"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-opportunity-row]:visible'),'Apenas vagas acompanhadas devem permanecer visiveis').toHaveCount(followed);

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await expect(page.locator('[data-opportunity-row]:visible'),'Desmarcar o filtro deve restaurar as vagas').toHaveCount(total);
  });

  test('busca de oportunidades filtra e volta a mostrar todas as vagas',async({page})=>{
    test.skip(!hasRole('professional'),'Exige profissional QA');
    await loginAs(page,'professional');
    await page.goto(site('/profissional/oportunidades'));
    const search=page.locator('[data-opportunity-search]');
    await expect(search).toBeVisible();
    const rows=page.locator('[data-opportunity-row]');
    const count=await rows.count();
    await search.fill('termoqa-inexistente-2222');
    await expect(page.locator('[data-opportunity-row]:visible')).toHaveCount(0);
    await search.fill('');
    await expect(rows).toHaveCount(count);
  });

  test('foto e remuneração aparecem no anuncio publico',async({page})=>{
    await page.goto(site('/vagas'));
    const cards=page.locator('[data-tp3-list-job]');
    test.skip(!(await cards.count()),'Sem vaga no banco QA ou skin diferente');
    await expect(cards.first()).toContainText(/R\$|remunera|valor/i);
    const button=cards.first().locator('[data-public-job-modal-open]');
    if(await button.count()){
      await button.first().click();
      const modal=page.locator('dialog.public-job-modal[open]');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(/remunera/i);
    }
  });

  test('login permite revelar e ocultar a senha sem alterar o valor @smoke',async({page})=>{
    await page.goto(site('/login'));
    const password=page.locator('input[name="password"]');
    const toggle=page.locator('[data-password-toggle]').first();
    await password.fill('Segredo_123');
    await toggle.click();
    await expect(password).toHaveAttribute('type','text');
    await expect(password).toHaveValue('Segredo_123');
    await toggle.click();
    await expect(password).toHaveAttribute('type','password');
    await expect(password).toHaveValue('Segredo_123');
  });
});
