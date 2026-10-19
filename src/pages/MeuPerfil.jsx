// Futty v2.0 — Perfil (/perfil): a página mais pessoal — define como o
// utilizador aparece em todo o lado. Mobile-first, dark theme.
//
// Topbar HUD (a mesma da Figurinha e dos Planos), cantos a 45° em vez do
// radius 12, Rajdhani no que é estrutura.
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { limparCacheLocal } from '../lib/cacheLocal';
import { useAuth } from '../hooks/useAuth';
import { useApiComCache } from '../hooks/useApiComCache';
import { usePerfil } from '../context/PerfilContext';
// Liga o alinhamento dos caches ao perfil (foto/genérico novo chega ao Início, Ranking, Feed).
import '../lib/alinharCard';
import { useTeams } from '../hooks/useTeam';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { nomeExibicao } from '../utils/nomeExibicao';
import { CONFIRMACAO_EXCLUIR, confirmacaoExcluirValida } from '../utils/confirmarExclusao';
import { useI18n } from '../context/I18nContext';
// O UploadComCrop saiu com a secção de personalizar (o upload de foto vive na
// Figurinha, que já o tinha). O PlayerAvatar fica: o cabeçalho de identidade mostra
// o avatar — só não o deixa clicar.
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import LoadingFutty from '../components/LoadingFutty';
import '../styles/app.css';
import SheetExcluirConta from './meuPerfil/SheetExcluirConta';
import SheetIdioma from './meuPerfil/SheetIdioma';
import ConfirmarSaida from './meuPerfil/ConfirmarSaida';
import NotificacoesEConta from './meuPerfil/NotificacoesEConta';
import PrivacidadeDoPerfil from './meuPerfil/PrivacidadeDoPerfil';
import IdiomaEMeusTimes from './meuPerfil/IdiomaEMeusTimes';
import DadosDoPerfil from './meuPerfil/DadosDoPerfil';
import IdentidadeDoPerfil from './meuPerfil/IdentidadeDoPerfil';

// A lista GENERICOS (18 ficheiros) e o genericoSrc() saíram com a galeria — só ela
// os usava. Os PNGs ficam em /public/avatares/genericos: continuam a servir a
// LandingPage, o ruído da slot machine e o fallback por cor do avatarParaCor().
// A rota backend/routes/avatares.js também fica intacta.

// O card do nome de jogador (o HERO) mudou-se para o app.css: .perfil-nome-glow /
// .perfil-nome-campo / .perfil-nome-shine. Não foi arrumação — foi necessidade: o
// :focus-within tem de poder mexer na borda e no glow, e estilo inline ganha a
// qualquer selector. Tentar acender a borda a partir daqui não pintava nada.
// Percurso, para quem vier a seguir: primeiro o hero era pesado (borda 2px, 0.55)
// para vencer o roxo do "Salvar dados" ao lado; não vencia — só engordava, porque
// quem empatava era a SATURAÇÃO do roxo, não a espessura. Agora quase dorme em
// repouso (0.35, sem glow) e ganha o olho por um shine que passa de 7 em 7s.

export default function MeuPerfil() {
  const { user, signOut } = useAuth();
  const { teams } = useTeams();
  const navigate = useNavigate();
  // /api/me vem do PerfilContext partilhado — carregado 1x por sessão, em vez desta página o pedir 2x por
  // conta própria.
  const { perfil: perfilCtx, carregando: perfilCarregando, erro: erroCtx, recarregar: recarregarPerfil } = usePerfil();
  const { estado: pushEstado, subscrever: pushSubscrever, dessubscrever: pushDessubscrever } = usePushNotifications();
  // Sem "Painel de administração" nesta página — admin não é um lugar. Cada time de "Meus times" leva à
  // página do time, onde o admin tem a aba Ajustes (e o resto do que era o painel, nas abas Jogos e
  // Elenco).

  // Rascunho local { user, stats }: espelha o contexto, mas a edição dos campos
  // (setField/patchMe) precisa de mutação optimista própria — não faz sentido
  // escrever a cada tecla no estado partilhado. Depois de guardar, recarregarPerfil()
  // actualiza o contexto para as outras páginas.
  // Sincronizado DURANTE o render (padrão React de "ajustar estado quando uma prop
  // muda"), não num efeito — evita o roundtrip extra e o lint react-hooks/set-state-in-effect.
  const [perfil, setPerfil] = useState(perfilCtx);
  const [perfilCtxAnterior, setPerfilCtxAnterior] = useState(perfilCtx);
  if (perfilCtx !== perfilCtxAnterior) {
    setPerfilCtxAnterior(perfilCtx);
    if (perfilCtx) setPerfil(perfilCtx);
  }
  const [toast, setToast] = useState(null);
  const souSuperAdmin = perfil?.user?.is_super_admin === true;
  // Bloqueio entre jogadores (Apple UGC 1.2): lista de quem EU bloqueei.
  // Usa o mesmo stale-while-revalidate do resto da casa — a
  // lista de bloqueados quase nunca muda, e o pré-aquecimento já a trouxe.
  const { data: blocksData, reload: reloadBlocks } = useApiComCache('/api/blocks', 'blocks');
  const bloqueados = blocksData?.bloqueados || [];
  const [desbloqueandoId, setDesbloqueandoId] = useState(null);
  // avatarAberto e avatarBusy saíram com a galeria: o primeiro era o disclosure que
  // a escondia, o segundo o "wait" das miniaturas enquanto o PATCH corria.
  const [savingDados, setSavingDados] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [nomeJogFocus, setNomeJogFocus] = useState(false);
  const [sheetIdioma, setSheetIdioma] = useState(false);
  // Excluir conta (LGPD/exigência das lojas).
  const [sheetExcluir, setSheetExcluir] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const campoExcluirRef = useRef(null);
  // "excluir", "Excluir " e "EXCLUIR" valem (o teclado do iPhone corrige a palavra).
  const confirmacaoOk = confirmacaoExcluirValida(confirmExcluir);

  function showToast(mensagem, tipo = 'success') {
    setToast({ mensagem, tipo });
  }

  // Desbloquear: o conteúdo dessa pessoa volta a aparecer na Resenha (dos dois lados).
  async function desbloquear(id) {
    setDesbloqueandoId(id);
    try {
      await apiFetch(`/api/blocks/${id}`, { method: 'DELETE' });
      await reloadBlocks();
      showToast('Jogador desbloqueado.');
    } catch (e) {
      showToast(e.message || 'Não deu para desbloquear agora. Tente de novo.', 'error');
    } finally {
      setDesbloqueandoId(null);
    }
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
    // suporte@futty.app não é um domínio nosso — o e-mail da casa é o dos Termos.
    window.location.href = 'mailto:contato@futtyapp.com?subject=Problema%20no%20Futty';
    setTimeout(() => {
      showToast('E-mail: contato@futtyapp.com', 'info');
    }, 500);
  }

  // Excluir conta — irreversível. DELETE /api/me já faz tudo no servidor
  // (times, Storage, conta); aqui só resta limpar o que sobra no aparelho e
  // sair. limparCacheLocal() antes do signOut() é redundante com o que o
  // próprio signOut já faz (AuthContext.jsx) — fica explícito mesmo assim,
  // pela mesma razão de sempre: o próximo a entrar neste aparelho não pode
  // ver, nem por 1 render, dados de uma conta que acabou de deixar de existir.
  async function excluirConta() {
    if (excluindo) return;
    // Botão sem `disabled` mudo: enquanto a palavra não bate, tocar nele leva a pessoa ao campo.
    if (!confirmacaoOk) { campoExcluirRef.current?.focus(); return; }
    setExcluindo(true);
    try {
      // O motor exige 'EXCLUIR' exato: manda sempre a constante, nunca o que a pessoa digitou.
      await apiFetch('/api/me', { method: 'DELETE', body: JSON.stringify({ confirmacao: CONFIRMACAO_EXCLUIR }) });
      limparCacheLocal();
      await signOut();
      navigate('/', { state: { toast: 'Conta excluída.' } });
    } catch (e) {
      showToast(e.message || 'Não deu para excluir a conta agora. Tente de novo.', 'error');
      setExcluindo(false);
    }
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
      // Invalida o PerfilContext partilhado depois de salvar — as outras páginas (Início, Figurinha, guards)
      // deixam de ver dados velhos.
      recarregarPerfil();
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
    if (ok) showToast('Dados salvos.');
  }

  // Saíram com a secção do avatar: escolherGenerico() (o único escritor que metia no
  // avatar_url um valor que não era upload nem geração), enviarAvatar() e
  // aoEnviarFoto(). O upload de foto vive agora só na Figurinha, que já o tinha.
  // O patchMe() fica — o guardarDados() usa-o para o nome.

  if (!perfil) {
    // Padrão único de carregamento: só o F, sem título nem legenda (o shell com título + <p>Carregando…</p>
    // lia-se como "branco + texto"). O ramo de ERRO mantém a página com título — aí o utilizador precisa
    // do contexto.
    return (
      <div className="app-shell">
        <Topbar hud="PERFIL" />
        <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16 }}>
          {erroCtx && !perfilCarregando ? <div className="alert alert--error">{erroCtx}</div> : <LoadingFutty />}
        </main>
      </div>
    );
  }

  const u = perfil.user;
  const stats = perfil.stats || {};
  const nomeMostrar = nomeExibicao(u);
  // O time principal (o primeiro da lista) é o que dá a vitrine — com mais de um, é o mesmo critério que o
  // Início já usa para o campeonato.
  const vitrineSlug = teams[0]?.slug || null;

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
        <IdentidadeDoPerfil nomeMostrar={nomeMostrar} stats={stats} u={u} vitrineSlug={vitrineSlug} />

        <DadosDoPerfil guardarDados={guardarDados} nomeJogFocus={nomeJogFocus} savingDados={savingDados} setField={setField} setNomeJogFocus={setNomeJogFocus} u={u} user={user} />

        <IdiomaEMeusTimes idiomaActual={idiomaActual} perfil={perfil} setSheetIdioma={setSheetIdioma} showToast={showToast} teams={teams} />

        <PrivacidadeDoPerfil bloqueados={bloqueados} desbloqueandoId={desbloqueandoId} desbloquear={desbloquear} patchMe={patchMe} perfil={perfil} />

        <NotificacoesEConta navigate={navigate} pushDessubscrever={pushDessubscrever} pushEstado={pushEstado} pushSubscrever={pushSubscrever} relatarProblema={relatarProblema} setConfirmExcluir={setConfirmExcluir} setConfirmSignOut={setConfirmSignOut} setSheetExcluir={setSheetExcluir} showToast={showToast} souSuperAdmin={souSuperAdmin} />

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', margin: '16px 0 0' }}>
          <Link to="/termos" style={{ color: 'var(--text-dim)' }}>Termos de Uso</Link>
          {' · '}
          <Link to="/privacidade" style={{ color: 'var(--text-dim)' }}>Privacidade</Link>
        </p>
      </main>

      <ConfirmarSaida confirmSignOut={confirmSignOut} setConfirmSignOut={setConfirmSignOut} signOut={signOut} />

      <SheetIdioma IDIOMAS={IDIOMAS} idiomaActual={idiomaActual} setSheetIdioma={setSheetIdioma} sheetIdioma={sheetIdioma} trocarIdioma={trocarIdioma} />

      <SheetExcluirConta campoExcluirRef={campoExcluirRef} confirmExcluir={confirmExcluir} confirmacaoOk={confirmacaoOk} excluindo={excluindo} excluirConta={excluirConta} setConfirmExcluir={setConfirmExcluir} setSheetExcluir={setSheetExcluir} sheetExcluir={sheetExcluir} />

      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
