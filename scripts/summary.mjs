import fs from 'node:fs';
const file = 'artifacts/playwright.json';
if (!fs.existsSync(file)) {
  console.error('Sem artifacts/playwright.json: testes nao executados. Nao ha laudo de liberacao.');
  process.exitCode = 2;
} else {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let passed=0, failed=0, skipped=0, flaky=0;
  function walk(suites) {
    for (const suite of suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const status=test.status || '';
          if(status==='expected') passed++;
          else if(status==='skipped') skipped++;
          else if(status==='flaky') flaky++;
          else failed++;
        }
      }
      walk(suite.suites);
    }
  }
  walk(data.suites);
  const summary={passed,failed,skipped,flaky,complete:skipped===0 && failed===0 && flaky===0 && passed>0,generated_at:new Date().toISOString()};
  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync('artifacts/qa-summary.json',JSON.stringify(summary,null,2));
  console.log('Resumo QA:',summary);
  if (failed || !passed || (process.env.QA_ENFORCE_COMPLETE==='1' && (skipped || flaky))) process.exitCode=1;
}
