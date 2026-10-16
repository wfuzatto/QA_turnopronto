// Rotas estaticas encontradas no app/Web.php. Dinamicas exigem IDs de fixtures.
export const pages = {
  public: ['/vagas', '/login', '/cadastro', '/cadastro/empresa', '/termos', '/privacidade'],
  company: ['/empresa/dashboard', '/empresa/verificacao', '/empresa/conta', '/empresa/vagas', '/empresa/vagas/nova', '/empresa/profissionais', '/empresa/escalas', '/empresa/financeiro', '/empresa/avaliacoes', '/empresa/suporte'],
  professional: ['/profissional/inicio', '/profissional/completar', '/profissional/perfil', '/profissional/oportunidades', '/profissional/turnos', '/profissional/agenda', '/profissional/ganhos', '/profissional/reputacao', '/profissional/documentos', '/profissional/suporte'],
  admin: ['/admin/dashboard', '/admin/vagas', '/admin/candidatos', '/admin/empresas', '/admin/usuarios', '/admin/locais', '/admin/relatorios', '/admin/configuracoes', '/admin/conta', '/admin/suporte']
};
export const sharedPages = ['/buscar?q=qa', '/notificacoes', '/notificacoes/feed'];
export const publicApi = ['/health', '/categories', '/appearance', '/public/opportunities'];
export const professionalApi = ['/me', '/opportunities', '/home', '/onboarding', '/assignments', '/earnings', '/reputation', '/documents'];
export const writeScenarios = [
  'cadastro da empresa e profissional + WhatsApp', 'completar dados Pix',
  'empresa: publicar, editar, cancelar vaga', 'empresa: aprovar/rejeitar candidaturas, convidar',
  'profissional: acompanhar, deixar de acompanhar, aceitar', 'profissional: check-in com PIN, checkout >=15min, avaliacao',
  'profissional: upload, contestacao de reputacao', 'administrador: validar documentos e usuarios',
  'administrador: alterar skins e editar campo inline', 'suporte: ticket, mensagem e alteracao de status'
];
