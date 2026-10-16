import { test, expect } from '@playwright/test';
import { site, tokenFor, fixture } from '../src/config.mjs';
import { publicApi, professionalApi } from '../src/routes.mjs';

test.describe('Contrato API publica @smoke', () => {
  for(const route of publicApi) {
    test('GET /api/v1'+route+' retorna contrato JSON',async({request})=>{
      const response=await request.get(site('/api/v1'+route));
      expect(response.status(),route).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');
      const json=await response.json();
      expect(json.ok).toBe(true);
      if(route!=='/health') expect(json.data).toBeDefined();
    });
  }
  test('saude inclui versão e caminho-base',async({request})=>{
    const json=await (await request.get(site('/api/v1/health'))).json();
    expect(json.service).toContain('TurnoPronto');
    expect(json.version).toBeTruthy();
    expect(json.public_base_path).toBeDefined();
  });
  test('vagas anonimas nao vazam credenciais nem senha',async({request})=>{
    const response=await request.get(site('/api/v1/public/opportunities'));
    const result=await response.json();
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(JSON.stringify(result.data)).not.toMatch(/"password_hash"|"api_token"|"client_secret"/i);
  });
  test('detalhe de vaga publica preserva status e campos',async({request})=>{
    const listing=await (await request.get(site('/api/v1/public/opportunities'))).json();
    const id=listing.data.find(x=>x.id)?.id;
    test.skip(!id,'Fixture sem vagas publicadas');
    const r=await request.get(site('/api/v1/public/shifts/'+id));
    expect(r.status()).toBe(200);
    const body=await r.json();
    expect(body.ok).toBe(true);
    expect(Number(body.data.id)).toBe(Number(id));
    expect(body.data.title).toBeDefined();
    expect(body.data).not.toHaveProperty('password_hash');
  });
  test('vaga inexistente nao retorna dados',async({request})=>{
    const r=await request.get(site('/api/v1/public/shifts/0'));
    expect(r.status()).toBe(404);
    expect((await r.json()).ok).toBe(false);
  });
  test('endpoint inexistente nao retorna sucesso',async({request})=>{
    const r=await request.get(site('/api/v1/recurso-qa-inexistente'));
    expect([401,404]).toContain(r.status());
  });
});

test.describe('Contrato API autenticada',()=>{
  test('profissional consulta home, oportunidades, agenda e ganhos',async({request})=>{
    const token=tokenFor('professional');
    test.skip(!token,'Configure QA_PROFESSIONAL_TOKEN com token somente de homologacao');
    const headers={Authorization:'Bearer '+token};
    for(const route of professionalApi){
      const r=await request.get(site('/api/v1'+route),{headers});
      expect(r.status(),route).toBe(200);
      const json=await r.json();
      expect(json.ok,route).toBe(true);
      if(route==='/me') expect(json.user.role).toBe('professional');
      else expect(json.data,route).toBeDefined();
    }
  });
  test('empresa nao consulta dados exclusivos do profissional',async({request})=>{
    const token=tokenFor('company');
    test.skip(!token,'Configure QA_COMPANY_TOKEN');
    const headers={Authorization:'Bearer '+token};
    for(const route of ['/opportunities','/home','/onboarding','/assignments','/earnings','/reputation','/documents']){
      const r=await request.get(site('/api/v1'+route),{headers});
      expect(r.status(),route).toBe(403);
      expect((await r.json()).ok).toBe(false);
    }
  });
  test('turno nao existente da API devolve 404 sem vazamento',async({request})=>{
    const token=tokenFor('professional');
    test.skip(!token,'Configure QA_PROFESSIONAL_TOKEN');
    const r=await request.get(site('/api/v1/assignments/0'),{headers:{Authorization:'Bearer '+token}});
    expect(r.status()).toBe(404);
    expect((await r.json()).ok).toBe(false);
  });
  test('busca de vaga valida permite consulta individual',async({request})=>{
    const id=fixture('shift'),token=tokenFor('professional');
    test.skip(!id||!token,'Exige QA_SHIFT_ID e QA_PROFESSIONAL_TOKEN');
    const r=await request.get(site('/api/v1/shifts/'+id),{headers:{Authorization:'Bearer '+token}});
    expect(r.status()).toBe(200);
    const json=await r.json();
    expect(json.ok).toBe(true);
    expect(Number(json.data.id)).toBe(id);
  });
  test('bearer invalido nunca autentica',async({request})=>{
    const r=await request.get(site('/api/v1/me'),{headers:{Authorization:'Bearer qa-invalid-000000000'}});
    expect(r.status()).toBe(401);
    expect((await r.json()).ok).toBe(false);
  });
});
