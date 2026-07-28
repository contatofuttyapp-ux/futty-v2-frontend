// Futty v2.0 — Perfil (/perfil): a página mais pessoal — define como o
// utilizador aparece em todo o lado. Mobile-first, dark theme.
//
// VAGA 2 (B2) — a página entra no cânone: topbar HUD (a mesma da Figurinha e dos
// Planos), cantos a 45° em vez do radius 12, Rajdhani no que é estrutura.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { useTeams } from '../hooks/useTeam';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatRating } from '../utils/format';
import { useI18n } from '../context/I18nContext';
import { nomeIdioma } from '../lib/i18n';
// O UploadComCrop saiu com a secção de personalizar (o upload de foto vive na
// Figurinha, que já o tinha). O PlayerAvatar fica: o cabeçalho de identidade mostra
// o avatar — só não o deixa clicar.
import PlayerAvatar from '../components/PlayerAvatar';
import Topbar from '../components/Topbar';
import Icon from '../components/Icon';
import Toast from '../components/Toast';
import LoadingFutty from '../components/LoadingFutty';
import '../styles/app.css';

// A lista GENERICOS (18 ficheiros) e o genericoSrc() saíram com a galeria — só ela
// os usava. Os PNGs ficam em /public/avatares/genericos: continuam a servir a
// LandingPage, o ruído da slot machine e o fallback por cor do avatarParaCor().
// A rota backend/routes/avatares.js também fica intacta.

// Cards da página. O borderRadius: 12 saiu: quem manda nos cantos agora é o
// .hud-corners (clip-path a 45°), que anula qualquer radius — deixá-lo aqui só
// mentia a quem viesse ler. Todo o div que espalha o CARD leva a classe.
// A borda passa de 1px a 1.2px para bater certo com os cards dos Planos
// (Planos.jsx:166), a página de referência. Véu e cor já eram os mesmos; a largura
// era a única coisa que divergia. 0.2px não se vê — mas o cânone é os valores
// baterem certo, não o olho não dar por eles.
const CARD = { background: 'rgba(255,255,255,0.03)', border: '1.2px solid rgba(255,255,255,0.06)' };

// O card do nome de jogador (o HERO) mudou-se para o app.css: .perfil-nome-glow /
// .perfil-nome-campo / .perfil-nome-shine. Não foi arrumação — foi necessidade: o
// :focus-within tem de poder mexer na borda e no glow, e estilo inline ganha a
// qualquer selector. Tentar acender a borda a partir daqui não pintava nada.
// Percurso, para quem vier a seguir: primeiro o hero era pesado (borda 2px, 0.55)
// para vencer o roxo do "Salvar dados" ao lado; não vencia — só engordava, porque
// quem empatava era a SATURAÇÃO do roxo, não a espessura. Agora quase dorme em
// repouso (0.35, sem glow) e ganha o olho por um shine que passa de 7 em 7s.

// Label de secção (uppercase cinzento).
function SecLabel({ children }) {
  return (
    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: '22px 0 8px' }}>
      {children}
    </div>
  );
}

export default function MeuPerfil() {
  const { user, signOut } = useAuth();
  const { teams } = useTeams();
  const navigate = useNavigate();
  // Gabinete no menu: verdade do SERVIDOR (/api/me), nunca do cliente.
  const { data: me } = useApi('/api/me');
  const souSuperAdmin = me?.user?.is_super_admin === true;
  const { estado: pushEstado, subscrever: pushSubscrever, dessubscrever: pushDessubscrever } = usePushNotifications();
  const adminTeams = teams.filter((t) => t.role === 'admin');
  const [adminPicker, setAdminPicker] = useState(false);

  // Vai para o painel de admin (ou abre selector se for admin de várias equipas).
  function irParaAdmin() {
    if (adminTeams.length === 1) navigate(`/admin/${adminTeams[0].slug}`);
    else if (adminTeams.length > 1) setAdminPicker(true);
  }

  const [perfil, setPerfil] = useState(null); // { user, stats }
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);
  // avatarAberto e avatarBusy saíram com a galeria: o primeiro era o disclosure que
  // a escondia, o segundo o "wait" das miniaturas enquanto o PATCH corria.
  const [savingDados, setSavingDados] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [nomeJogFocus, setNomeJogFocus] = useState(false);
  const [sheetIdioma, setSheetIdioma] = useState(false);

  useEffect(() => {
    let ativo = true;
    apiFetch('/api/me')
      .then((d) => ativo && setPerfil(d))
      .catch((e) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, []);

  function showToast(mensagem, tipo = 'success') {
    setToast({ mensagem, tipo });
  }

  // Idioma — reativo (I18nContext): troca SEM reload, guarda a preferência.
  const { idioma: idiomaActual, setIdioma: trocarIdiomaCtx, idiomas: IDIOMAS } = useI18n();
  function trocarIdioma(idioma) {
    if (idioma === idiomaActual) return;
    trocarIdiomaCtx(idioma);
    showToast('Idioma alterado.');
  }

  // Abre o cliente de email; se não houver, mostra o email para copiar.
  function relatarProblema() {
    window.location.href = 'mailto:suporte@futty.app?subject=Problema%20no%20Futty';
    setTimeout(() => {
      showToast('Email: suporte@futty.app', 'info');
    }, 500);
  }

  // Atualiza um campo localmente (sem gravar — só para os inputs de texto).
  function setField(k, v) {
    setPerfil((p) => (p ? { ...p, user: { ...p.user, [k]: v } } : p));
  }

  // PATCH com update optimista; reverte em caso de erro.
  async function patchMe(patch) {
    const prev = perfil;
    setPerfil((p) => (p ? { ...p, user: { ...p.user, ...patch } } : p));
    try {
      const res = await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify(patch) });
      setPerfil((p) => (p ? { ...p, user: { ...p.user, ...res.user } } : p));
      return true;
    } catch (e) {
      setPerfil(prev);
      showToast(e.message, 'error');
      return false;
    }
  }

  async function guardarDados() {
    if (savingDados) return;
    setSavingDados(true);
    const u = perfil.user;
    const ok = await patchMe({ nome: u.nome || null, nome_jogador: u.nome_jogador || null });
    setSavingDados(false);
    if (ok) showToast('Dados salvos!');
  }

  // Saíram com a secção do avatar: escolherGenerico() (o único escritor que metia no
  // avatar_url um valor que não era upload nem geração), enviarAvatar() e
  // aoEnviarFoto(). O upload de foto vive agora só na Figurinha, que já o tinha.
  // O patchMe() fica — o guardarDados() usa-o para o nome.

  if (!perfil) {
    // FASE 3.53 — era o shell da página com o título + <p>Carregando…</p>, e lia-se
    // como "branco + texto". Passa ao padrão único: só o F, sem título nem legenda.
    // O ramo de ERRO mantém a página com título — aí o utilizador precisa do contexto.
    return (
      <div className="app-shell">
        <Topbar hud="PERFIL" />
        <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
          {erro ? <div className="alert alert--error">{erro}</div> : <LoadingFutty />}
        </main>
      </div>
    );
  }

  const u = perfil.user;
  const stats = perfil.stats || {};
  const nomeMostrar = u.nome_jogador || u.nome || (u.email || '').split('@')[0] || 'Jogador';
  // O `creditos` (avatar_ia_creditos) saiu com o teaser de IA — só ele o lia.

  return (
    <div className="app-shell">
      {/* Linguagem da casa: topbar HUD (wordmark dourado + linha com degrau 45°), a
          mesma da Figurinha e dos Planos. O <h1> "O meu perfil" morreu — o título
          seco vive na faixa. Sem `back`: o Perfil está na bottom nav. */}
      <Topbar hud="PERFIL" />
      {/* O subtítulo "Como apareces em todo o lado." saiu da UI. Sob uma faixa HUD
          não tinha onde encostar — a Figurinha e os Planos também não têm legenda
          por baixo da faixa. O título seco não precisa de quem lho explique. */}
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 12 }}>
        {erro ? <div className="alert alert--error" style={{ marginBottom: 12 }}>{erro}</div> : null}

        {/* 1. HEADER DE IDENTIDADE (avatar + nome + email + Ver planos)
            O avatar FICA — é identidade: mostra quem tu és. O que se foi foi o
            handler: já não tem role="button", tabIndex, onClick nem onKeyDown, e não
            abre nada. Sem foto, o PlayerAvatar cai nas iniciais sobre fundo escuro
            com anel dourado (verificado a correr: renderiza "C", bg rgb(16,16,18),
            glow dourado) — o formato que já existia, mantido.
            O que saiu foi a secção DE BAIXO, a de trocar/personalizar (ver abaixo). */}
        <div className="hud-corners" style={{ ...CARD, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ lineHeight: 0, flexShrink: 0 }}>
            <PlayerAvatar nome={nomeMostrar} avatarUrl={u.avatar_url} gold size={64} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {/* O nome é estrutura → Rajdhani 700. Estava em Inter 800: o MESMO nome
                  aparecia em duas fontes na mesma página (aqui e no campo hero). E o
                  800 nem existe no Rajdhani carregado (400/600/700) — com
                  font-synthesis: none, era um peso a pedir o que não há.
                  Fica abaixo do hero de propósito: 18px branco contra 23px dourado
                  com moldura e glow. Diz quem tu és; não disputa o campo. */}
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeMostrar}</span>
              {u.plan === 'pro' || u.plan === 'elite' ? (
                <span className="hud-corners-s" style={{ flexShrink: 0, fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#d4a017', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.4)', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                  {u.plan === 'pro' ? '★ Pro' : '♛ Elite'}
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || ''}</div>
            <Link to="/planos" style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--neon)' }}>
              Ver planos →
            </Link>
          </div>
        </div>

        {/* Stats por baixo do header */}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: 'var(--text-dim)' }}>
          <span style={{ color: 'var(--neon)', fontWeight: 800 }}>{stats.nota != null ? formatRating(stats.nota) : '--'}</span>
          <span>·</span>
          <span><b style={{ color: '#fff' }}>{stats.jogos ?? 0}</b> jogos</span>
          <span>·</span>
          <span><b style={{ color: '#fff' }}>{stats.gols ?? 0}</b> gols</span>
        </div>

        {/* A SECÇÃO DE PERSONALIZAR O AVATAR SAIU — o disclosure "Toca no avatar (ou
            aqui) para personalizar →", o teaser de IA, o "Enviar foto" e a galeria
            dos 18 genéricos. A página vai do cabeçalho directa aos Dados.
            Não foi só limpeza. O avatar geria-se em DOIS sítios; passa a gerir-se num
            — a Figurinha, que já faz upload, geração por IA e kits. E a galeria era o
            único escritor que metia no avatar_url uma terceira espécie: o app codifica
            "isto é avatar de IA" como a DESIGUALDADE foto_url !== avatar_url (não há
            booleano), por isso quem escolhesse um genérico DEPOIS de ter enviado foto
            ficava com o genérico a passar por avatar de IA no cromo — e com o upload
            seguinte preso, a dizer "Avatar atualizado!" sem nada mudar. Cortar a UI
            fecha a única porta para esse estado.
            Intactos: a BD, os endpoints, os PNGs e o backend/routes/avatares.js. Quem
            já tem um genérico gravado continua a vê-lo até pôr foto na Figurinha. */}

        {/* 2. SECÇÃO DADOS */}
        <SecLabel>Dados</SecLabel>
        <div className="perfil-form" style={{ ...CARD, padding: 14, display: 'grid', gap: 12 }}>
          {/* NOME DE JOGADOR — tratamento de cromo.
              É o único campo desta página que sai daqui e vai desenhado na placa da
              figurinha; os outros dois são administrativos (o nome completo é
              privado, o email nem se edita). Por isso ganha bloco próprio, moldura
              dourada e corpo maior: a hierarquia passa a dizer o que a página faz,
              em vez de alinhar três campos como se pesassem o mesmo. */}
          <div className="perfil-nome-glow">
          <label className="perfil-nome-campo hud-corners-s" style={{ display: 'grid', gap: 6, padding: 14 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#d4a017' }}>
              <span>Nome de jogador</span>
              {nomeJogFocus ? (
                <span style={{ letterSpacing: 0, fontWeight: 600, color: (u.nome_jogador || '').length >= 18 ? '#d4a017' : 'rgba(255,255,255,0.35)' }}>{(u.nome_jogador || '').length}/18</span>
              ) : null}
            </span>
            {/* O shine é irmão do input, não ::after dele: <input> não tem
                pseudo-elementos. O relative é o berço do overlay. */}
            <span className="hud-corners-s" style={{ position: 'relative', display: 'block' }}>
              <input
                value={u.nome_jogador || ''}
                onChange={(e) => setField('nome_jogador', e.target.value.slice(0, 18))}
                onFocus={() => setNomeJogFocus(true)}
                onBlur={() => setNomeJogFocus(false)}
                maxLength={18}
                placeholder="Como te chamam no campo?"
                style={inputNomeStyle}
              />
              <span className="perfil-nome-shine" aria-hidden="true" />
            </span>
            {/* Hint discreto: fecha o circuito perfil → cromo. Leitura, não estrutura
                → fica no --sans (var(--sans)), como manda a régua. */}
            <span style={{ fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.3, color: 'rgba(255,255,255,0.4)' }}>
              É esse o nome que aparece na sua figurinha.
            </span>
          </label>
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={labelStyle}>Nome completo (privado)</span>
            <input value={u.nome || ''} onChange={(e) => setField('nome', e.target.value.slice(0, 60))} placeholder="Nome completo" className="hud-corners-s" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={labelStyle}>Email</span>
            <div className="hud-corners-s" style={{ ...inputStyle, color: 'var(--text-dim)' }}>{u.email || user?.email || '—'}</div>
          </label>
          {/* OUTLINE ROXO RECUADO. Percurso, para quem vier a seguir:
              era .btn--purple (roxo cheio, rgba(124,58,237,0.18) + borda --purple) e,
              depois de tudo à volta assentar, passou a ser o bloco mais saturado da
              página — disputava o primeiro olhar com o nome de jogador, que é o hero.
              Recuou até rgba(139,92,246,0.07) com texto branco e aí passou ao extremo
              oposto: sumia. É a única acção da secção Dados; tem de se perceber que se
              clica. Meio-termo: fundo transparente, borda 1.5px e o texto a levar a
              cor — assim lê-se como botão sem voltar a gritar.
              NÃO vai para .cta-gold: um segundo dourado a berrar tinha o mesmo
              problema ao contrário, e a Lei dos Gémeos não ganha um 4º irmão por isto.
              #a78bfa e não #b69cff: o segundo não é --purple nem --neon, não existe na
              paleta, e é um dos órfãos que esta vaga varreu — reintroduzi-lo aqui era
              reabrir o que se acabou de fechar. O #a78bfa é o roxo recuado que a Vaga 1
              fixou nos links da auth: mesma leitura, dentro da casa. */}
          <button
            type="button"
            className="btn hud-corners-s"
            style={{
              width: '100%',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: '1.5px solid rgba(167,139,250,0.45)',
              color: '#a78bfa',
            }}
            disabled={savingDados}
            onClick={guardarDados}
          >
            {savingDados ? 'Salvando…' : 'Salvar dados'}
          </button>
        </div>

        {/* 5. SECÇÃO CONTA
            INTOCÁVEL por decisão do utilizador: os ícones custom, o vermelho do
            "Terminar sessão" e o padrão/toggle das notificações ficam exactamente
            como estão. Aqui só se corta o canto do card — a tipografia e as cores
            das linhas não se padronizam. */}
        {/* 5. SECÇÃO IDIOMA — antes da Conta.
            Era um card com dois botões lado a lado (🇧🇷 Português BR / 🇵🇹 Português
            PT). Dois cabiam; seis não — e uma grelha de seis botões dentro do Perfil
            roubava a página ao nome de jogador. Passa a UMA linha, no padrão das
            linhas da Conta, com o valor actual por baixo; a escolha vive num bottom
            sheet. */}
        <SecLabel>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="idioma" size={20} color="#d4a017" />
            Idioma / Language
          </span>
        </SecLabel>
        <div className="hud-corners" style={{ ...CARD, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setSheetIdioma(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Idioma</span>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: '#d4a017' }}>
                {nomeIdioma(idiomaActual)}
              </span>
            </span>
            <span aria-hidden="true" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18, lineHeight: 1 }}>›</span>
          </button>
        </div>

        {/* SECÇÃO PRIVACIDADE (Opção B): o rosto entra por omissão para MAIORES; aqui
            desliga-se para silhueta. No servidor a IDADE manda sempre (menores/sem data
            de nascimento nunca revelam, mesmo com isto ligado). */}
        <SecLabel>Privacidade</SecLabel>
        <div className="hud-corners" style={{ ...CARD, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px' }}>
            <span style={{ display: 'grid', gap: 3, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                <Icon name="cadeado" size={20} color="#d4a017" />
                Mostrar meu rosto em links públicos
              </span>
              <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.4)', paddingLeft: 32 }}>
                Seu rosto aparece em links públicos de sorteio. Desligue aqui se preferir silhueta.
              </span>
            </span>
            <input
              type="checkbox"
              checked={perfil.user.mostrar_rosto_publico !== false}
              onChange={(e) => patchMe({ mostrar_rosto_publico: e.target.checked })}
              style={{ width: 20, height: 20, accentColor: '#8b5cf6', flex: 'none' }}
              aria-label="Mostrar meu rosto em links públicos de sorteio"
            />
          </div>
        </div>

        {/* 6. SECÇÃO CONTA — no fim: é a zona de sessão, e o "Terminar sessão" é a
            última coisa que se quer encontrar por acidente. As notificações push são
            a primeira LINHA deste card (não secção própria), por isso vêm com ele. */}
        <SecLabel>Conta</SecLabel>
        <div className="hud-corners" style={{ ...CARD, overflow: 'hidden' }}>
          {pushEstado !== 'nao_suportado' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                <Icon name="sino" size={20} color="#d4a017" />
                Notificações push
              </span>
              <input
                type="checkbox"
                checked={pushEstado === 'subscrito'}
                disabled={pushEstado === 'negado'}
                onChange={(e) => (e.target.checked ? pushSubscrever() : pushDessubscrever())}
                style={{ width: 20, height: 20, accentColor: '#8b5cf6' }}
              />
            </div>
          ) : null}
          <ContaRow onClick={() => navigate('/alterar-password')}>
            <Icon name="cadeado" size={20} color="#d4a017" />
            Alterar senha
          </ContaRow>
          <ContaRow onClick={relatarProblema}>
            <Icon name="bandeira" size={20} color="#d4a017" />
            Relatar um problema
          </ContaRow>
          {adminTeams.length > 0 ? (
            <ContaRow onClick={irParaAdmin} cor="#8b5cf6">
              <Icon name="definicoes" size={20} color="#d4a017" />
              Painel de administração
            </ContaRow>
          ) : null}
          {souSuperAdmin ? (
            <ContaRow onClick={() => navigate('/gabinete')} cor="#8b5cf6">
              <Icon name="definicoes" size={20} color="#d4a017" />
              Gabinete
            </ContaRow>
          ) : null}
          <ContaRow onClick={() => setConfirmSignOut(true)} cor="rgba(239,68,68,0.8)" semBorda>
            <Icon name="sair" size={20} color="#d4a017" />
            Sair da conta
          </ContaRow>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', margin: '16px 0 0' }}>
          <Link to="/termos" style={{ color: 'var(--text-dim)' }}>Termos de Uso</Link>
          {' · '}
          <Link to="/privacidade" style={{ color: 'var(--text-dim)' }}>Privacidade</Link>
        </p>
      </main>

      {/* Modal confirmar sign out.
          PORTAL pela mesma razão do sheet: sem ele o overlay nasce dentro do
          PageTransition, que cria contexto de empilhamento (transform+opacity), e o
          z-index: 80 fica preso lá — na raiz vale o `auto` (0) do PageTransition
          contra o z-50 da bottom nav. Resultado: a nav pintava POR CIMA do scrim.
          Aqui o defeito era mais discreto que no sheet (o card é centrado, longe da
          nav), mas estava lá: o véu escurecia a página toda menos a nav, que ficava
          acesa por cima de um modal — e continuava clicável por trás dele. */}
      {confirmSignOut ? createPortal(
        <div className="modal-overlay" role="presentation" onClick={() => setConfirmSignOut(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner">
              <p style={{ fontSize: 15, marginBottom: 16 }}>Tem certeza que quer sair da conta?</p>
              <button type="button" className="btn btn--primary" style={{ width: '100%', background: 'var(--danger)', color: '#fff' }} onClick={() => signOut()}>
                Sair da conta
              </button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setConfirmSignOut(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Selector de equipa (admin de várias) — portal pela mesma razão do de cima. */}
      {adminPicker ? createPortal(
        <div className="modal-overlay" role="presentation" onClick={() => setAdminPicker(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__inner" style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, textAlign: 'center' }}>Escolha o time</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                {adminTeams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="btn btn--ghost"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={() => {
                      setAdminPicker(false);
                      navigate(`/admin/${t.slug}`);
                    }}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" style={{ width: '100%', marginTop: 10 }} onClick={() => setAdminPicker(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {/* Bottom sheet do idioma. Reusa o .modal-overlay da casa (fixed, z80, scrim a
          72%) mas encosta o painel em baixo em vez de o centrar — daí o alignItems.
          Tocar fora fecha (onClick no overlay); o painel pára a propagação.
          O painel leva .hud-corners-topo: 45° só em cima, porque em baixo está
          colado ao bordo do ecrã.

          PORTAL PARA O <body>, e não é preferência: sem ele o sheet nascia DENTRO do
          PageTransition, que anima transform+opacity e por isso cria um CONTEXTO DE
          EMPILHAMENTO. O z-index: 80 do overlay ficava preso lá dentro, a competir só
          com irmãos da própria página; na raiz, o que contava era o z-index do
          PageTransition — `auto`, ou seja 0. A bottom nav é fixed z-50 na raiz, logo
          50 > 0 e a nav pintava por cima do sheet inteiro: as duas últimas línguas
          (한국어 e Français) ficavam escondidas atrás dela. Aumentar o 80 para 9999 não
          resolvia nada — de dentro de um contexto de empilhamento não se sai por
          números. Sai-se saindo: o portal põe o overlay como filho do <body>, onde os
          80 finalmente competem com os 50 da nav. E um modal DEVE tapar a nav.
          Nota: os outros dois modais desta página (sair, selector de admin) têm o
          mesmo defeito latente — safaram-se por serem centrados, longe da nav. */}
      {sheetIdioma ? createPortal(
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setSheetIdioma(false)}
          style={{ alignItems: 'flex-end', padding: 0 }}
        >
          <div
            className="hud-corners-topo"
            role="dialog"
            aria-modal="true"
            aria-label="Escolher idioma"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', background: '#16161c', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
          >
            {/* Puxador: diz "isto arrasta-se/fecha-se" sem uma linha de texto. */}
            <div aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '10px auto 6px' }} />
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', padding: '4px 16px 10px' }}>
              Idioma / Language
            </div>
            {IDIOMAS.map((op, i) => {
              const ativo = idiomaActual === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => { setSheetIdioma(false); trocarIdioma(op.id); }}
                  aria-pressed={ativo}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                    padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{op.bandeira}</span>
                  <span style={{ flex: 1, fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: ativo ? 700 : 600, letterSpacing: '0.04em', color: ativo ? '#f0c94a' : 'rgba(255,255,255,0.75)' }}>
                    {op.nome}
                  </span>
                  {/* Check dourado só na activa. */}
                  {ativo ? <span aria-hidden="true" style={{ color: '#d4a017', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      ) : null}

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

// Labels dos campos administrativos: Rajdhani 600, recuados. O nome de jogador
// tem o seu (dourado, 700) inline — é o único que não é administrativo.
const labelStyle = {
  fontFamily: "'Rajdhani', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
};

// O borderRadius: 8 saiu — quem manda é o .hud-corners-s no JSX.
// O fontFamily EXPLÍCITO não é decoração: o index.css dá `font-family: inherit` ao
// <button> mas NÃO ao <input>, por isso um input sem família cai no tipo de letra do
// browser e não no do app. Estes campos são leitura (o que se escreve), logo --sans.
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: '#ffffff',
  fontFamily: 'var(--sans)',
  fontSize: 14,
};

// O HERO. O que se escreve aqui vai desenhado na placa do cromo, por isso o input
// mostra-o já com o peso e o dourado com que vai aparecer lá.
// DOURADO SÓLIDO e não o gradiente do nome do card — medido, não por gosto: o
// gradiente pinta-se sobre a CAIXA, não sobre as letras. "Chavo" mede 46px numa
// caixa de 741px → o texto só amostra 6.2% do gradiente, ou seja o arranque branco.
// Nem um nome de 18 caracteres (o máximo) chega ao stop dourado dos 40%: pára nos
// 35%. E a fatia muda com o comprimento do nome e com a largura do ecrã, portanto a
// cor do nome variava de pessoa para pessoa. No Início o gradiente resulta porque
// ali vive num elemento justo ao texto; num input largo, não.
const inputNomeStyle = {
  ...inputStyle,
  fontFamily: "'Rajdhani', sans-serif",
  fontSize: 23,
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#f0c94a',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(212,160,23,0.3)',
};

// Linha de ação da secção Conta.
function ContaRow({ children, onClick, cor = 'rgba(255,255,255,0.7)', semBorda = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        border: 'none',
        borderBottom: semBorda ? 'none' : '1px solid rgba(255,255,255,0.04)',
        background: 'transparent',
        color: cor,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
