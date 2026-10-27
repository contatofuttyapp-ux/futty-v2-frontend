// Futty v2.0 — A aba MENSALIDADE da página do time ("pagou / não pagou"). O app não mexe em dinheiro: mostra o jeito de pagar que o admin
// escreveu, o jogador avisa "Já paguei" e o admin confirma. Mês no topo (o do relógio do time, que vem do motor), setas para os anteriores.
//   · Jogador: o PRÓPRIO status, o valor, o vencimento, "Pagar" (link http/https, abre fora do app mostrando o domínio) ou "Copiar"
//     (qualquer outro texto), "Já paguei" e o "Desfazer" enquanto o admin não confirmou. Nunca marca "Pago".
//   · Admin: a lista dos membros e o contador; um toque alterna Pago / Em aberto (e confirma quem avisou). Meses com mais de 2 meses para
//     trás ficam só para ler. A lista só chega ao jogador se o admin ligar "Mostrar a lista para o time" (quem decide é o motor).
// Mora fora do arranque: a página do time carrega este arquivo só quando a aba existe (mensalidade ligada).
import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, Hourglass } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { copiarTexto } from '../../utils/clipboard';
import { nomeExibicao } from '../../utils/nomeExibicao';
import PlayerAvatar from '../../components/PlayerAvatar';
import LoadingFutty from '../../components/LoadingFutty';
import { STATUS, diaDoVencimento, jeitoDePagar, nomeDoMes, outroMes, textoDoContador } from '../../utils/mensalidade';

const RAJ = "'Rajdhani', sans-serif";
const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12 };
const COR = { pago: '#7bd88f', avisou: '#c9b6ff', aberto: '#9a8fc0' };
const ICONE = { pago: Check, avisou: Clock, aberto: Hourglass };

function ChipStatus({ status }) {
  const Icone = ICONE[status] || Hourglass;
  return (
    <span data-chip-status={status} className="hud-corners-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', fontFamily: RAJ, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap', color: COR[status], border: `1px solid ${COR[status]}55`, background: `${COR[status]}14` }}>
      <Icone size={13} strokeWidth={2.4} aria-hidden="true" />
      {STATUS[status] || STATUS.aberto}
    </span>
  );
}

/** "Pagar" (link de verdade, com o domínio à vista) ou o texto com "Copiar". */
function ComoPagar({ como, showToast }) {
  const jeito = jeitoDePagar(como);
  if (!jeito) return null;
  return (
    <div data-como-pagar style={{ display: 'grid', gap: 8 }}>
      {jeito.link ? (
        <div style={{ display: 'grid', gap: 4 }}>
          <a href={jeito.link.href} target="_blank" rel="noopener noreferrer" data-pagar className="btn hud-corners-s cta-gold" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
            <ExternalLink size={15} aria-hidden="true" /> Pagar
          </a>
          <span data-dominio style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>abre {jeito.link.dominio}, fora do app</span>
        </div>
      ) : null}
      {jeito.texto ? (
        <div style={{ ...CARD, padding: '10px 12px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
          <span data-texto-como-pagar style={{ fontSize: 14, lineHeight: 1.4, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{jeito.texto}</span>
          <button type="button" data-copiar className="btn btn--sm btn--outline hud-corners-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={async () => showToast(await copiarTexto(jeito.texto) ? 'Copiado.' : 'Não deu para copiar, copie à mão.', 'success')}>
            <Copy size={14} aria-hidden="true" /> Copiar
          </button>
        </div>
      ) : null}
    </div>
  );
}

const comStatus = (d, userId, status) => {
  if (!d) return d;
  const lista = d.lista ? d.lista.map((x) => (x.user_id === userId ? { ...x, status } : x)) : null;
  const contador = lista ? { pagos: lista.filter((x) => x.status === 'pago').length, avisaram: lista.filter((x) => x.status === 'avisou').length, total: lista.length } : d.contador;
  return { ...d, lista, contador };
};

export default function AbaMensalidade({ slug, meId, mesInicial = null, showToast, aoAbrirAjustes }) {
  const [pedido, setPedido] = useState(mesInicial || '');
  const [versao, setVersao] = useState(0);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(null); // user_id da linha em gravação, ou 'eu'

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/mensalidade${pedido ? `?mes=${encodeURIComponent(pedido)}` : ''}`)
      .then((d) => { if (ativo) { setDados(d); setErro(''); } })
      .catch((e) => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [slug, pedido, versao]);

  if (erro && !dados) return <div className="alert alert--error">{erro}</div>;
  if (!dados) return <LoadingFutty />;

  if (!dados.ativa) {
    return (
      <div data-mensalidade data-mensalidade-desligada style={{ ...CARD, padding: 16, display: 'grid', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 14 }}>A mensalidade deste time está desligada.</p>
        {dados.sou_admin ? <button type="button" className="btn btn--outline btn--sm hud-corners-s" onClick={aoAbrirAjustes}>Ligar no Painel</button> : null}
      </div>
    );
  }

  const { mes, mes_atual: atual, primeiro_mes: primeiro, editavel, vencimento, config, eu, lista, contador, sou_admin: souAdmin } = dados;
  const venc = diaDoVencimento(vencimento);

  async function marcar(linha) {
    if (!souAdmin || !editavel || ocupado) return;
    const novo = linha.status === 'pago' ? 'aberto' : 'pago';
    setOcupado(linha.user_id);
    try {
      await apiFetch(`/api/teams/${slug}/mensalidade/${mes}/membros/${linha.user_id}`, { method: 'PUT', body: JSON.stringify({ status: novo }) });
      setDados((d) => comStatus(d, linha.user_id, novo));
    } catch (e) {
      showToast(e.message, 'error');
      setVersao((v) => v + 1);
    } finally {
      setOcupado(null);
    }
  }

  async function avisar(desfazer) {
    if (ocupado) return;
    setOcupado('eu');
    try {
      const r = await apiFetch(`/api/teams/${slug}/mensalidade/${mes}/ja-paguei`, { method: desfazer ? 'DELETE' : 'POST' });
      setDados((d) => ({ ...comStatus(d, meId, r.status), eu: { ...d.eu, status: r.status } }));
      showToast(desfazer ? 'Aviso desfeito.' : 'Avisado! O admin confere e confirma.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
      setVersao((v) => v + 1);
    } finally {
      setOcupado(null);
    }
  }

  const setaEstilo = (on) => ({ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: on ? '#fff' : 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', cursor: on ? 'pointer' : 'default' });
  const podeVoltar = mes > primeiro;
  const podeAvancar = mes < atual;

  return (
    <div data-mensalidade data-mes={mes} style={{ display: 'grid', gap: 12 }}>
      {/* O mês: o do relógio do time no topo; setas para os anteriores (até o mês em que o time nasceu). */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: 8 }}>
        <button type="button" data-mes-anterior className="hud-corners-s" aria-label="Mês anterior" disabled={!podeVoltar} onClick={() => setPedido(outroMes(mes, -1))} style={setaEstilo(podeVoltar)}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <div data-nome-do-mes style={{ fontFamily: RAJ, fontSize: 18, fontWeight: 800, letterSpacing: '0.04em' }}>{nomeDoMes(mes)}</div>
          <div data-resumo-mensalidade style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {[config.valor, venc ? `vence ${venc}` : null].filter(Boolean).join(' · ') || 'Mensalidade do time'}
          </div>
        </div>
        <button type="button" data-mes-seguinte className="hud-corners-s" aria-label="Mês seguinte" disabled={!podeAvancar} onClick={() => setPedido(outroMes(mes, 1))} style={setaEstilo(podeAvancar)}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {!editavel ? (
        <p data-mes-fechado className="texto-apoio" style={{ margin: 0, textAlign: 'center' }}>Mês fechado: dá só para ver.</p>
      ) : null}

      {/* O próprio jogador. O admin marca a si mesmo na lista, como a todo mundo. */}
      {!souAdmin ? (
        <div data-meu-status={eu.status} className="hud-corners" style={{ ...CARD, padding: 14, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: RAJ, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Sua mensalidade</span>
            <ChipStatus status={eu.status} />
          </div>
          {eu.status !== 'pago' && editavel ? <ComoPagar como={config.como_pagar} showToast={showToast} /> : null}
          {editavel && eu.status === 'aberto' ? (
            <button type="button" data-ja-paguei className="btn btn--outline hud-corners-s" disabled={ocupado === 'eu'} onClick={() => avisar(false)} style={{ width: '100%', fontFamily: RAJ, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {ocupado === 'eu' ? 'Avisando…' : 'Já paguei'}
            </button>
          ) : null}
          {editavel && eu.status === 'avisou' ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <span className="texto-apoio" style={{ margin: 0 }}>O admin já foi avisado. Assim que ele conferir, fica "Pago".</span>
              <button type="button" data-desfazer className="btn btn--sm btn--outline hud-corners-s" disabled={ocupado === 'eu'} onClick={() => avisar(true)}>Desfazer o aviso</button>
            </div>
          ) : null}
          {eu.status === 'pago' ? <span className="texto-apoio" style={{ margin: 0 }}>Confirmado pelo admin.</span> : null}
        </div>
      ) : null}

      {lista ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span data-contador style={{ fontFamily: RAJ, fontSize: 16, fontWeight: 800 }}>{textoDoContador(contador)}</span>
            {contador.avisaram ? <span data-avisaram style={{ fontSize: 12, color: COR.avisou }}>{contador.avisaram} {contador.avisaram === 1 ? 'avisou' : 'avisaram'} que pagou</span> : null}
          </div>
          {souAdmin && editavel ? <span className="texto-apoio" style={{ margin: 0 }}>Toque em alguém para marcar Pago ou Em aberto.</span> : null}
          <div style={{ ...CARD, padding: '2px 12px' }} data-lista-mensalidade>
            {lista.map((x, i) => {
              const tocavel = souAdmin && editavel;
              const Linha = tocavel ? 'button' : 'div';
              return (
                <Linha
                  key={x.user_id}
                  {...(tocavel ? { type: 'button', onClick: () => marcar(x), disabled: !!ocupado, 'aria-label': `${nomeExibicao(x)}: ${STATUS[x.status]}. Tocar para marcar ${x.status === 'pago' ? 'Em aberto' : 'Pago'}.` } : {})}
                  data-linha={x.user_id}
                  data-status={x.status}
                  style={{ width: '100%', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '9px 0', background: 'none', border: 'none', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', color: '#fff', textAlign: 'left', cursor: tocavel ? 'pointer' : 'default', opacity: ocupado === x.user_id ? 0.5 : 1 }}
                >
                  <PlayerAvatar nome={nomeExibicao(x)} avatarUrl={x.avatar_url} userId={x.user_id} avatarGenerico={x.avatar_generico} sm />
                  <span style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{nomeExibicao(x)}{x.user_id === meId ? ' (você)' : ''}</span>
                  <ChipStatus status={x.status} />
                </Linha>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
