import fs from 'node:fs';
// Credenciais somente da instalacao tp_ci efemera: nunca publicar tokens de producao.
if (process.env.TP_TEST_DB !== 'tp_ci') throw Error('Token QA apenas em banco tp_ci');
const base='http://127.0.0.1:8080';
const password=process.env.TP_TEST_PASSWORD;
const roles={company:'empresa@turnopronto.local',professional:'juliana@turnopronto.local'};
for(const [role,email] of Object.entries(roles)){
  const res=await fetch(base+'/api/v1/auth/login',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email,password})
  });
  const body=await res.json();
  if (!res.ok || !body.ok || !body.token) {
    throw Error('Falha ao criar token QA para '+role+': HTTP '+res.status);
  }
  fs.appendFileSync(process.env.GITHUB_ENV,
    'QA_'+role.toUpperCase()+'_TOKEN='+body.token+'\n');
  console.log('Credencial efemera de API inicializada: '+role);
}
