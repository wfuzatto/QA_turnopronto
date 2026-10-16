import fs from 'node:fs';
import path from 'node:path';

const root = process.env.QA_SOURCE_DIR || '../turnopronto_web';
const baseline = JSON.parse(fs.readFileSync('inventory/source-branches.json', 'utf8'));
const derive = (content, file) => content.split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.startsWith('if(') || line.startsWith('if ('))
  .filter(line => file.includes('Web') ? line.includes('$path') : line.includes('$relative'));
let missing = 0, added = 0, actualCount = 0;
const details = [];
for (const [file, expected] of Object.entries(baseline.files)) {
  const full = path.resolve(root, file);
  if (!fs.existsSync(full)) {
    console.error('FONTE NAO LOCALIZADA: ' + full);
    process.exit(2);
  }
  const found = derive(fs.readFileSync(full, 'utf8'), file);
  const want = expected.map(e => e.condition);
  const newBranches = found.filter(x => !want.includes(x));
  const removedBranches = want.filter(x => !found.includes(x));
  actualCount += found.length; added += newBranches.length; missing += removedBranches.length;
  details.push({ file, baseline: want.length, actual: found.length, newBranches, removedBranches });
  console.log(file, 'esperado=',want.length,'real=',found.length,'novas=',newBranches.length,'removidas=',removedBranches.length);
  for(const expr of newBranches) console.error('NOVA ROTA SEM MATRIZ:',expr);
  for(const expr of removedBranches) console.error('ROTA MODIFICADA/REMOVIDA:',expr);
}
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/source-audit.json', JSON.stringify({source:root,actualCount,added,missing,details},null,2));
if (added || missing) {
  console.error('AUDITORIA REPROVADA: reveja inventory/source-branches.json e acrescente/atualize testes.');
  process.exit(1);
}
console.log('AUDITORIA OK: nenhuma alteracao silenciosa de roteamento; isso NAO comprova sucesso funcional.');
