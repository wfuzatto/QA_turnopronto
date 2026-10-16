<?php
// Somente GitHub Actions, protegido pelo modo de BD TP_TEST_DB=tp_ci.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || getenv('TP_TEST_DB') !== 'tp_ci') {
    fwrite(STDERR, "Fixtures permitidas somente no banco descartavel tp_ci.\n");
    exit(2);
}
require __DIR__.'/../app-under-test/app/bootstrap.php';
$pdo=Database::connection();
$shift=$pdo->query("SELECT id FROM tp_shifts WHERE status IN ('published','filling') AND starts_at > NOW() ORDER BY starts_at LIMIT 1")->fetchColumn();
$assignment=$pdo->query("SELECT a.id,s.checkin_pin FROM tp_assignments a JOIN tp_shifts s ON s.id=a.shift_id WHERE a.status='confirmed' ORDER BY a.id LIMIT 1")->fetch();
$admin=$pdo->query("SELECT id FROM tp_users WHERE role='admin' ORDER BY id LIMIT 1")->fetchColumn();
$adminCompany=$pdo->query("SELECT id FROM tp_companies ORDER BY id LIMIT 1")->fetchColumn();
if (!$shift || !$assignment || !$admin) throw new RuntimeException('Fixture de vaga, turno ou admin nao criada no banco descartavel.');
foreach([
  'QA_BASE_URL'=>'http://127.0.0.1:8080',
  'QA_TARGET'=>'staging',
  'QA_STAGING_HOSTS'=>'127.0.0.1',
  'QA_ALLOW_WRITES'=>'1',
  'QA_RUN_ID'=>'github-action',
  'QA_SHIFT_ID'=>(string)$shift,
  'QA_ASSIGNMENT_ID'=>(string)$assignment['id'],
  'QA_ADMIN_USER_ID'=>(string)$admin,
  'QA_ADMIN_COMPANY_ID'=>(string)$adminCompany,
  'QA_CHECKIN_PIN'=>(string)$assignment['checkin_pin'],
  'QA_COMPANY_USER'=>'empresa@turnopronto.local',
  'QA_PROFESSIONAL_USER'=>'juliana@turnopronto.local',
  'QA_ADMIN_USER'=>'admin@turnopronto.local',
  'QA_COMPANY_PASSWORD'=>getenv('TP_TEST_PASSWORD'),
  'QA_PROFESSIONAL_PASSWORD'=>getenv('TP_TEST_PASSWORD'),
  'QA_ADMIN_PASSWORD'=>getenv('TP_TEST_PASSWORD')
] as $key=>$value){
  if (str_contains($key,'PASSWORD') && !is_string($value)) throw new RuntimeException('Senha nao definida');
  echo $key.'='.$value."\n";
}
