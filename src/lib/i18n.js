// Futty v2.0 — i18n (6 idiomas). LEI: o TEXTO-BASE é PT-BR (selado) e É a própria
// CHAVE (string-as-key) — o catálogo guarda só as OUTRAS 5 línguas. O fallback de
// qualquer língua é o PT-BR (nunca uma chave crua). Deteção pela língua do
// dispositivo; a escolha do utilizador (com conta) fixa a preferência.
//
// Este ficheiro é a CAMADA SEM-REACT (deteção, catálogo, traduzir). A reatividade
// (troca SEM reload) vive no I18nContext; os componentes usam `useI18n().t`.
import CATALOGO from './i18n-catalogo';

export const IDIOMA_PADRAO = 'pt-BR';

// Achado 7 (roteiro 10-set): trocar de idioma só muda o rótulo do seletor — nav,
// Início e Perfil continuam em pt-BR. Enquanto o i18n não estiver completo, o
// seletor fica escondido (o catálogo e a lógica ficam intactos, só a UI some).
export const MOSTRAR_IDIOMA = false;

// As 6 línguas. `nome` = o idioma NA PRÓPRIA LÍNGUA (quem procura o seu idioma
// procura a palavra que conhece). Bandeira do Reino Unido para o inglês; Chéquia (cs).
// 31-jul (ordem do dono): pt-PT REMOVIDO (o português do app é um só, BR);
// francês ENTRA. Preferências antigas 'pt-PT' caem sozinhas em pt-BR (idiomaGuardado
// só aceita ids desta lista e a deteção manda qualquer 'pt*' para pt-BR).
export const IDIOMAS = [
  { id: 'pt-BR', bandeira: '🇧🇷', nome: 'Português (Brasil)' },
  { id: 'en', bandeira: '🇬🇧', nome: 'English' },
  { id: 'es', bandeira: '🇪🇸', nome: 'Español' },
  { id: 'fr', bandeira: '🇫🇷', nome: 'Français' },
  { id: 'ko', bandeira: '🇰🇷', nome: '한국어' },
  { id: 'cs', bandeira: '🇨🇿', nome: 'Čeština' },
];
const IDS = IDIOMAS.map((i) => i.id);
const CHAVE_LS = 'futty_idioma';

export function nomeIdioma(id) {
  return IDIOMAS.find((i) => i.id === id)?.nome || IDIOMAS[0].nome;
}

// Deteção pela língua do dispositivo (navigator.languages, em ordem de preferência).
// Qualquer variante de português cai em pt-BR. Fora das 6 línguas → PT-BR.
export function detectarIdioma() {
  try {
    const navs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
    for (const raw of navs) {
      const l = String(raw || '').toLowerCase();
      if (l.startsWith('pt')) return 'pt-BR'; // qualquer português → BR (31-jul)
      if (l.startsWith('en')) return 'en';
      if (l.startsWith('es')) return 'es';
      if (l.startsWith('fr')) return 'fr';
      if (l.startsWith('ko')) return 'ko';
      if (l.startsWith('cs')) return 'cs';
    }
  } catch { /* SSR/sem navigator */ }
  return IDIOMA_PADRAO;
}

// Preferência guardada localmente (o servidor sobrepõe quando há conta — ver I18nContext).
export function idiomaGuardado() {
  try { const s = localStorage.getItem(CHAVE_LS); if (s && IDS.includes(s)) return s; } catch { /* */ }
  return null;
}
export function guardarIdiomaLocal(id) {
  try { if (IDS.includes(id)) localStorage.setItem(CHAVE_LS, id); } catch { /* */ }
}

// Idioma inicial: guardado (utilizador escolheu) → senão deteção → senão PT-BR.
export function idiomaInicial() {
  return idiomaGuardado() || detectarIdioma();
}

// Termos GENÉRICOS legados (retrocompatível com o t('salvar') antigo). Resolvem em
// TODAS as línguas; para pt-BR devolvem o texto correto (não a chave curta).
const GENERICO = {
  'pt-BR': { time: 'time', times: 'times', usuario: 'usuário', senha: 'senha', salvar: 'Salvar', excluir: 'Excluir', compartilhar: 'Compartilhar', ativo: 'ativo', inativo: 'inativo', celular: 'celular', arquivo: 'arquivo', carregando: 'Carregando', gerando: 'Gerando', criando: 'Criando', enviando: 'Enviando' },
  fr: { time: 'équipe', times: 'équipes', usuario: 'utilisateur', senha: 'mot de passe', salvar: 'Enregistrer', excluir: 'Supprimer', compartilhar: 'Partager', ativo: 'actif', inativo: 'inactif', celular: 'téléphone', arquivo: 'fichier', carregando: 'Chargement', gerando: 'Génération', criando: 'Création', enviando: 'Envoi' },
  en: { time: 'team', times: 'teams', usuario: 'user', senha: 'password', salvar: 'Save', excluir: 'Delete', compartilhar: 'Share', ativo: 'active', inativo: 'inactive', celular: 'phone', arquivo: 'file', carregando: 'Loading', gerando: 'Generating', criando: 'Creating', enviando: 'Sending' },
  es: { time: 'equipo', times: 'equipos', usuario: 'usuario', senha: 'contraseña', salvar: 'Guardar', excluir: 'Eliminar', compartilhar: 'Compartir', ativo: 'activo', inativo: 'inactivo', celular: 'móvil', arquivo: 'archivo', carregando: 'Cargando', gerando: 'Generando', criando: 'Creando', enviando: 'Enviando' },
  ko: { time: '팀', times: '팀', usuario: '사용자', senha: '비밀번호', salvar: '저장', excluir: '삭제', compartilhar: '공유', ativo: '활성', inativo: '비활성', celular: '휴대폰', arquivo: '파일', carregando: '불러오는 중', gerando: '생성 중', criando: '만드는 중', enviando: '보내는 중' },
  cs: { time: 'tým', times: 'týmy', usuario: 'uživatel', senha: 'heslo', salvar: 'Uložit', excluir: 'Smazat', compartilhar: 'Sdílet', ativo: 'aktivní', inativo: 'neaktivní', celular: 'telefon', arquivo: 'soubor', carregando: 'Načítání', gerando: 'Generování', criando: 'Vytváření', enviando: 'Odesílání' },
};

// Interpola {var} e escolhe plural via `vars.count` quando a chave traz `|` (sing|plural).
function aplicar(str, vars) {
  if (str == null) return str;
  let out = str;
  if (out.includes('|') && vars && typeof vars.count === 'number') {
    const partes = out.split('|');
    out = vars.count === 1 ? partes[0] : (partes[1] ?? partes[0]);
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
  return out;
}

// O tradutor puro. `chave` = a string PT-BR (string-as-key) OU um termo genérico legado.
export function traduzir(idioma, chave, vars) {
  const g = GENERICO[idioma]?.[chave] ?? GENERICO[IDIOMA_PADRAO]?.[chave];
  if (g != null) return aplicar(g, vars);
  if (idioma === IDIOMA_PADRAO) return aplicar(chave, vars);
  const val = CATALOGO[idioma]?.[chave];
  return aplicar(val != null && val !== '' ? val : chave, vars); // fallback = PT-BR (a chave)
}

// t() NÃO-reactivo (para código fora de componentes React). Lê o idioma guardado.
export function tGlobal(chave, vars) {
  return traduzir(idiomaInicial(), chave, vars);
}

// ── Retrocompatibilidade com o i18n antigo (não quebrar o que já importa) ──
export function getIdioma() { return idiomaInicial(); }
export function t(chave, vars) { return tGlobal(chave, vars); }
// setIdioma legado: guarda + reload. O I18nContext oferece a troca SEM reload
// (useI18n().setIdioma); este export é a ponte até os ecrãs passarem a usá-lo.
export function setIdioma(id) {
  guardarIdiomaLocal(id);
  try { window.location.reload(); } catch { /* */ }
}
