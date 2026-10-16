import {test,expect} from '@playwright/test';
import {assertWritesEnabled,hasRole,fixture,site,tokenFor} from '../src/config.mjs';
import {loginAs} from '../src/auth.mjs';

test.describe('Fluxos reais com escrita @mutation',()=>{
  test.beforeEach(()=>assertWritesEnabled());

  test('empresa publica, edita e cancela vaga de QA',async({page})=>{
    test.skip(!hasRole('company'),'Conta QA empresa obrigatoria');
    await loginAs(page,'company');
    const seed=(process.env.QA_RUN_ID||'run')+'-'+Date.now();
    const title='[QA] Vaga automatizada '+seed;
    const updated=title+' revisada';
    let createdId=null;
    page.on('dialog', d=>d.accept());
    try {
      await page.goto(site('/empresa/vagas/nova'));
      const options=page.locator('select[name="category_id"] option:not([value=""])');
      test.skip(!(await options.count()),'Nenhuma categoria disponivel no ambiente QA');
      await page.locator('select[name="category_id"]').selectOption({index:1});
      const date=new Date(Date.now()+14*86400_000).toISOString().slice(0,10);
      for(const [name,val] of Object.entries({
        title, required_workers:'1', value:'125.50',date,start_time:'08:00',end_time:'16:00',
        address:'Rua de Testes, 100',city:'Virgínia',state:'MG',
        description:'Cenario automatico isolado QA'
      })) await page.locator('[name="'+name+'"]').fill(val);
      await page.locator('input[name="acceptance_mode"][value="manual"]').check();
      await page.getByRole('button',{name:'Publicar vaga'}).click();
      await expect(page).toHaveURL(/\/empresa\/vagas(?:\?|$)/);
      const row=page.locator('[data-filter-row]').filter({hasText:title}).first();
      await expect(row).toBeVisible();
      const href=await row.locator('a[href*="/empresa/vagas/"]').first().getAttribute('href');
      createdId=Number(href.match(/\/empresa\/vagas\/(\d+)/)?.[1]);
      expect(createdId).toBeGreaterThan(0);
      await page.goto(site('/empresa/vagas/'+createdId+'/editar'));
      await page.locator('[name="title"]').fill(updated);
      await page.getByRole('button',{name:'Salvar alterações'}).click();
      await expect(page.locator('body')).toContainText(updated);
      await page.goto(site('/empresa/vagas/'+createdId));
      await page.locator('form[action$="/cancelar"] button').click();
      await expect(page.locator('body')).toContainText(/cancelad/i);
    } finally {
      if(createdId){
        await page.goto(site('/empresa/vagas/'+createdId)).catch(()=>{});
        const cancel=page.locator('form[action$="/cancelar"] button');
        if(await cancel.count()) await cancel.click().catch(()=>{});
      }
    }
  });

  test('profissional acompanha e deixa de acompanhar via API',async({request})=>{
    const id=fixture('shift'),token=tokenFor('professional');
    test.skip(!id||!token,'Exige vaga e token descartavel para profissional QA');
    const headers={Authorization:'Bearer '+token};
    const follow=await request.post(site('/api/v1/shifts/'+id+'/follow'),{headers,data:{}});
    expect(follow.status()).toBe(200);
    expect((await follow.json()).following).toBe(true);
    const info=await (await request.get(site('/api/v1/shifts/'+id),{headers})).json();
    expect(info.data.following).toBe(true);
    const unfollow=await request.post(site('/api/v1/shifts/'+id+'/unfollow'),{headers,data:{}});
    expect(unfollow.status()).toBe(200);
    expect((await unfollow.json()).following).toBe(false);
  });

  test('empresa abre chamado e conversa com suporte',async({page,context})=>{
    test.skip(!hasRole('company'),'Conta empresa QA obrigatoria');
    await loginAs(page,'company');
    await page.goto(site('/empresa/suporte'));
    const form=page.locator('form.support-form');
    await expect(form).toBeVisible();
    await form.locator('[name="category"]').selectOption({index:1});
    const subject='[QA] Chamado '+Date.now();
    const body='Mensagem de teste QA sem dados pessoais';
    await form.locator('[name="subject"]').fill(subject);
    await form.locator('[name="message"]').fill(body);
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/empresa\/suporte\/chamados\/\d+/);
    const ticketId=Number(page.url().match(/chamados\/(\d+)/)?.[1]);
    expect(ticketId).toBeGreaterThan(0);
    await expect(page.locator('body')).toContainText(subject);
    const reply=page.locator('[data-support-composer]');
    await reply.locator('[name="message"]').fill('Acompanhamento QA '+ticketId);
    await reply.locator('button[type="submit"]').click();
    await expect(page.locator('body')).toContainText('Acompanhamento QA '+ticketId);
    if(hasRole('admin')){
      const admin=await context.browser().newPage();
      try{
        await loginAs(admin,'admin');
        await admin.goto(site('/admin/suporte/chamados/'+ticketId));
        await expect(admin.locator('body')).toContainText(subject);
      } finally {await admin.close();}
    }
  });

  test('checkin com PIN e bloqueio imediato de checkout (fixture controlada)',async({request})=>{
    const id=fixture('assignment'),token=tokenFor('professional'),pin=process.env.QA_CHECKIN_PIN;
    test.skip(!id||!token||!pin,'Exige turno novo e confirmado + QA_CHECKIN_PIN');
    const headers={Authorization:'Bearer '+token};
    const r=await request.post(site('/api/v1/assignments/'+id+'/check-in'),{headers,data:{pin}});
    expect(r.status()).toBe(200);
    expect((await r.json()).ok).toBe(true);
    const early=await request.post(site('/api/v1/assignments/'+id+'/check-out'),{headers,data:{}});
    expect(early.status(),'Checkout antes de 15 minutos deve ser recusado').toBe(422);
    expect((await early.json()).ok).toBe(false);
  });
});
