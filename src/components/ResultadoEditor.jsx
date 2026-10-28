// Futty v2.0 — O editor ÚNICO do resultado de um jogo. "Quem ganhou?" → (opcional) placar → gols de cada um → artilheiro e destaque do dia (se o
// time conta) → foto do campeão. Um lugar só: a seção Resultado da tela do jogo, a janela de Ajustes → Jogos (ResultadoModal, que abre ESTE editor
// para corrigir) e o passo "Como terminou?" do Jogo passado.
//
// Tocar no time é dizer quem foi o campeão — e o campeão é a verdade (utils/resultadoDoJogo.js). Os gols decidem sozinhos: lançou gols por
// jogador, o placar é a soma por time (não se digita placar) e o placar define o vencedor ou o empate; sem gols, pode digitar só o placar (que
// define o vencedor) ou só tocar no vencedor. Placar e vencedor nunca são escolhas separadas. Com 3 ou 4 times (rodízio) não há placar nem empate:
// só "Quem foi o campeão?", e os gols por jogador seguem valendo (artilheiro).
//
// Dois modos. `salvar` (o de sempre): "Salvar resultado" grava em dois pedidos — o resultado (PATCH /api/games/:id/resultado) e os prêmios
// (PATCH /api/feed/games/:id/resultado). `devolver` (o Jogo passado): o jogo ainda não existe, então nada é salvo aqui — a cada toque o editor
// devolve o que foi preenchido (`aoMudar`) e quem usa grava tudo no fim; sem a foto do campeão (fica para Ajustes → Jogos).
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { urlAsset, urlImagem, iniciaisNome } from '../utils/avatar';
import { avatarQuadrado, enquadroAvatar } from '../lib/enquadroAvatar';
import { GOLS, ARTILHEIRO, DESTAQUE } from './golsEPremios';
import { corpoDoResultadoDoJogo, corpoDosPremios, desfechoDoEstado, estadoDoJogo, RESULTADO_VAZIO, resultadoAbreEm, resultadoJaAbriu, temGols } from '../utils/resultadoDoJogo';
import { formatarHora } from '../utils/dataHora';
import { chaveDoJogador } from '../utils/seloDoSorteio';
import { inputStyle, lbl, secLbl } from './camposDoAdmin';
import UploadComCrop from './UploadComCrop';

// A borda se vê sobre o #0c0c0c (com #222 eram duas caixas pretas, sem forma) e o "0" apagado mostra o que
// se escreve ali (class placar-input, app.css).
const inputPlacar = { width: 48, textAlign: 'center', padding: '8px 6px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.32)', background: '#0c0c0c', color: '#fff', fontSize: 18, fontWeight: 800 };
const stepBtn = { width: 28, height: 28, borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1 };
// O título de cada pergunta: o .section-title da casa (18 px, caixa normal: é pergunta, não letreiro — VOZ-FUTTY §5).
const TITULO_DA_PERGUNTA = { margin: '18px 0 8px' };

const FRASE_DOS_GOLS = 'Os gols de cada um decidem o placar e quem ganhou.';
const FRASE_DO_PLACAR = 'O placar decide quem ganhou. Apague o placar para escolher no toque.';

function MiniAvatar({ nome, avatarUrl }) {
  const [falhou, setFalhou] = useState(false);
  const src = avatarUrl ? urlImagem(urlAsset(avatarUrl), 128, { quadrado: avatarQuadrado(avatarUrl) }) : null;
  return (
    <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: '#15151a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {src && !falhou ? (
        // minWidth/minHeight 0: item de grid — ver a nota em .pavatar img (app.css).
        <img src={src} alt="" decoding="async" onError={() => setFalhou(true)} style={{ display: 'block', width: '100%', height: '100%', minWidth: 0, minHeight: 0, objectFit: 'cover', objectPosition: enquadroAvatar(avatarUrl) }} />
      ) : (
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>{iniciaisNome(nome)}</span>
      )}
    </div>
  );
}

function Seccao({ titulo, ligado, onToggle, children, ...rest }) {
  return (
    <div style={{ display: 'grid', gap: 8, borderTop: '1px solid #222', paddingTop: 12, marginTop: 16 }} {...rest}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={secLbl}>{titulo}</span>
        <input type="checkbox" checked={ligado} onChange={(e) => onToggle(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#8b5cf6' }} />
      </label>
      {ligado ? children : null}
    </div>
  );
}

function SelectJogador({ value, onChange, confirmados }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="">Escolher jogador</option>
      {confirmados.map((p) => (
        <option key={p.user_id} value={p.user_id}>{p.nome}</option>
      ))}
    </select>
  );
}

/**
 * @param {object} props
 * @param {'salvar'|'devolver'} [props.modo]
 * @param {string} [props.gameId] só `salvar`
 * @param {object} [props.game] só `salvar`: o jogo salvo (data, historico, campeão, placar, prêmios) — de onde o editor parte
 * @param {Array<{ user_id: string|null, nome: string, gols: number }>} [props.gols] só `salvar`: os gols já gravados
 * @param {Array<{ nome: string, jogadores?: Array<{ nome: string }> }>} props.times os times do jogo, com o nome que a tela usa ("Time Ouro")
 * @param {Array<{ user_id: string|null, nome: string, avatar_url?: string|null, time?: string, timeIndex?: number }>} props.jogadores quem entra na lista de gols (todos os times)
 * @param {Array<{ user_id: string, nome: string }>} [props.confirmados] quem pode ser artilheiro ou destaque (quem tem conta)
 * @param {{ gols: boolean, artilheiro: boolean, destaque: boolean }} [props.flags] o que o time conta (mostrar_gols, mostrar_artilheiro, mostrar_destaque)
 * @param {object} [props.inicial] só `devolver`: de onde retomar (a pessoa voltou a este passo)
 * @param {{ campeaoIdx: number|null, empate: boolean }|null} [props.escolhaInicial] só `salvar`: o time (ou o empate) já escolhido na pergunta do Início
 * @param {(estado: object) => void} [props.aoMudar] só `devolver`
 * @param {string} [props.fuso] o fuso do time: a hora em que o resultado abre se lê no relógio do campo
 * @param {() => void} [props.onSaved] só `salvar`
 * @param {(mensagem: string, tipo?: string) => void} [props.showToast]
 */
export default function ResultadoEditor({ modo = 'salvar', gameId, game = {}, gols = [], times = [], jogadores = [], confirmados = [], flags = { gols: true, artilheiro: true, destaque: true }, inicial = null, escolhaInicial = null, aoMudar = null, fuso, onSaved, showToast }) {
  const devolver = modo === 'devolver';
  // O resultado abre 5 minutos depois do início do jogo (o Jogo passado, histórico, não tem trava).
  const podeSalvar = devolver || resultadoJaAbriu(game);

  const [estado, setEstado] = useState(() => {
    if (devolver) return { ...RESULTADO_VAZIO, ...(inicial || {}) };
    const doJogo = estadoDoJogo(game, gols);
    // A escolha feita na pergunta do Início ("Quem ganhou o jogo?") segue para cá — mas só num jogo que ainda não tem quem ganhou: o que o motor guardou manda.
    return escolhaInicial && doJogo.campeaoIdx === null && !doJogo.empate ? { ...doJogo, campeaoIdx: escolhaInicial.campeaoIdx, empate: escolhaInicial.empate } : doJogo;
  });
  const [busy, setBusy] = useState(false);
  const nTimes = times.length;
  const nomes = times.map((t) => t.nome);
  const d = desfechoDoEstado(estado, { nTimes, jogadores });
  // Com gols (a soma é o placar) ou com placar digitado, o vencedor sai deles: os botões mostram quem ganhou mas não aceitam outro toque.
  const decididoPorOutro = d.origem === 'gols' || d.origem === 'placar';
  const temAlgo = d.origem !== null || temGols(estado.golsMap);

  function mudar(parcial) {
    const novo = { ...estado, ...parcial };
    setEstado(novo);
    if (devolver) aoMudar?.(novo);
  }
  function setGol(chave, delta) {
    mudar({ golsMap: { ...estado.golsMap, [chave]: Math.max(0, (estado.golsMap[chave] || 0) + delta) } });
  }
  /** Tocar no time é dizer o campeão; tocar de novo desfaz. 'A' | 'B' (2 times), 'empate' (2 times) ou o índice (3 ou 4). */
  function tocar(quem) {
    if (decididoPorOutro) return;
    const idx = quem === 'A' ? 0 : quem === 'B' ? 1 : quem;
    if (quem === 'empate') mudar({ campeaoIdx: null, empate: !estado.empate });
    else mudar({ campeaoIdx: estado.campeaoIdx === idx ? null : idx, empate: false });
  }
  function limpar() {
    mudar({ campeaoIdx: null, empate: false, placarA: null, placarB: null, golsMap: {} });
  }

  async function guardar() {
    if (busy) return;
    setBusy(true);
    try {
      // 1) o resultado (quem ganhou, placar, gols); 2) o que a Resenha mostra além disso (artilheiro, destaque, foto). O motor avisa
      // o time uma vez só, no primeiro pedido que dá resultado.
      await apiFetch(`/api/games/${gameId}/resultado`, { method: 'PATCH', body: JSON.stringify(corpoDoResultadoDoJogo(estado, { nTimes, jogadores })) });
      await apiFetch(`/api/feed/games/${gameId}/resultado`, { method: 'PATCH', body: JSON.stringify(corpoDosPremios(estado)) });
      showToast?.('Resultado salvo.');
      onSaved?.();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!podeSalvar) {
    return (
      <p className="muted" data-resultado-fechado style={{ marginTop: 8 }}>
        O resultado abre 5 minutos depois do início do jogo{resultadoAbreEm(game) ? `, às ${formatarHora(new Date(resultadoAbreEm(game)).toISOString(), fuso)}` : ''}.
      </p>
    );
  }

  const mostraGols = flags.gols && jogadores.length > 0;
  const mostraArtilheiro = flags.artilheiro || estado.temArt;
  const mostraDestaque = flags.destaque || estado.temDest;

  return (
    <div style={{ marginTop: devolver ? 0 : 8 }} data-resultado-editor={modo}>
      {/* QUEM GANHOU — 2 times: o time, o empate, o outro time; 3 ou 4: "Quem foi o campeão?" */}
      {nTimes >= 2 || !devolver ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '0 0 8px' }}>
          <div className="section-title" style={{ margin: 0 }} data-quem-ganhou>{nTimes >= 3 ? 'Quem foi o campeão?' : 'Quem ganhou?'}</div>
          {temAlgo ? <button type="button" className="btn btn--ghost btn--sm" data-limpar-resultado onClick={limpar}>Limpar</button> : null}
        </div>
      ) : null}
      {nTimes === 2 ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {[['A', nomes[0], d.campeaoIdx === 0], ['empate', 'Empate', d.empate], ['B', nomes[1], d.campeaoIdx === 1]].map(([v, label, marcado]) => (
            <button key={v} type="button" data-vencedor={v} aria-pressed={marcado} aria-disabled={decididoPorOutro || undefined} className={`btn btn--sm ${marcado ? 'btn--primary' : 'btn--ghost'}`} style={{ flex: 1, minWidth: 0, ...(decididoPorOutro ? { cursor: 'default' } : null) }} onClick={() => tocar(v)}>
              {label}
            </button>
          ))}
        </div>
      ) : nTimes >= 3 ? (
        <div style={{ display: 'grid', gap: 8 }} data-campeao>
          {times.map((t, i) => (
            <button
              key={i}
              type="button"
              data-campeao-time={i}
              aria-pressed={d.campeaoIdx === i}
              onClick={() => tocar(i)}
              style={{ textAlign: 'left', padding: 10, borderRadius: 10, cursor: 'pointer', border: `1px solid ${d.campeaoIdx === i ? 'var(--neon)' : '#222'}`, background: d.campeaoIdx === i ? 'rgba(139,92,246,0.1)' : 'transparent', color: '#fff' }}
            >
              <div style={{ fontWeight: 700 }}>{t.nome || `Time ${i + 1}`}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{(t.jogadores || []).map((p) => p.nome).join(' · ')}</div>
            </button>
          ))}
        </div>
      ) : devolver ? null : (
        <p className="muted" style={{ fontSize: 12 }}>Este jogo não tem times.</p>
      )}
      {decididoPorOutro ? <p className="texto-apoio" data-decide={d.origem} style={{ margin: '8px 0 0' }}>{d.origem === 'gols' ? FRASE_DOS_GOLS : FRASE_DO_PLACAR}</p> : null}

      {/* PLACAR — só com 2 times (o rodízio não tem). Com gols é a soma, mostrada e não digitada; sem gols, a pessoa pode digitar. */}
      {nTimes === 2 ? (
        <>
          <div className="section-title" data-placar-titulo style={TITULO_DA_PERGUNTA}>Placar <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{d.origem === 'gols' ? '(soma dos gols)' : '(opcional)'}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff', fontWeight: 700 }}>
            <span style={{ fontSize: 13 }}>{nomes[0]}</span>
            <input type="number" min="0" inputMode="numeric" placeholder="0" className="placar-input" aria-label={`Gols do ${nomes[0]}`} data-placar="a" readOnly={d.origem === 'gols'} value={d.origem === 'gols' ? d.placar.a : (estado.placarA ?? '')} onChange={(e) => mudar({ placarA: e.target.value })} style={{ ...inputPlacar, ...(d.origem === 'gols' ? { opacity: 0.7 } : null) }} />
            <span style={{ color: 'var(--text-dim)' }}>×</span>
            <input type="number" min="0" inputMode="numeric" placeholder="0" className="placar-input" aria-label={`Gols do ${nomes[1]}`} data-placar="b" readOnly={d.origem === 'gols'} value={d.origem === 'gols' ? d.placar.b : (estado.placarB ?? '')} onChange={(e) => mudar({ placarB: e.target.value })} style={{ ...inputPlacar, ...(d.origem === 'gols' ? { opacity: 0.7 } : null) }} />
            <span style={{ fontSize: 13 }}>{nomes[1]}</span>
          </div>
        </>
      ) : null}

      {/* GOLS DE CADA UM — todos os times; no rodízio valem para o artilheiro, não decidem nada. */}
      {mostraGols ? (
        <>
          <div className="section-title" style={TITULO_DA_PERGUNTA} data-gols-de-cada-um>{GOLS.titulo} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(opcional)</span></div>
          <div style={{ display: 'grid', gap: 8 }}>
            {/* key única também para o convidado sem app (user_id null): a mesma linha fantasma do DrawnTeams. */}
            {jogadores.map((j, k) => {
              const chave = chaveDoJogador(j);
              return (
                <div key={j.user_id || `convidado:${k}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MiniAvatar nome={j.nome} avatarUrl={j.avatar_url} />
                  <span style={{ flex: 1, minWidth: 0, color: '#fff', fontSize: 14, overflowWrap: 'anywhere' }}>
                    {j.nome} <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>· {j.time}</span>
                  </span>
                  <button type="button" style={stepBtn} onClick={() => setGol(chave, -1)} aria-label="Menos">−</button>
                  <span style={{ minWidth: 20, textAlign: 'center', color: '#d4a017', fontWeight: 800 }}>{estado.golsMap[chave] || 0}</span>
                  <button type="button" style={stepBtn} onClick={() => setGol(chave, 1)} aria-label="Mais">+</button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* ARTILHEIRO e DESTAQUE DO DIA — se o time os conta. */}
      {mostraArtilheiro ? (
        <Seccao titulo={ARTILHEIRO.titulo} ligado={estado.temArt} onToggle={(v) => mudar({ temArt: v })} data-artilheiro>
          <SelectJogador value={estado.artId} onChange={(v) => mudar({ artId: v })} confirmados={confirmados} />
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Nº de gols</span><input type="number" min={1} value={estado.artGols} onChange={(e) => mudar({ artGols: e.target.value })} style={inputStyle} /></label>
        </Seccao>
      ) : null}
      {mostraDestaque ? (
        <Seccao titulo={DESTAQUE.titulo} ligado={estado.temDest} onToggle={(v) => mudar({ temDest: v })} data-destaque>
          <SelectJogador value={estado.destId} onChange={(v) => mudar({ destId: v })} confirmados={confirmados} />
          <label style={{ display: 'grid', gap: 6 }}><span style={lbl}>Título</span><input value={estado.destTitulo} onChange={(e) => mudar({ destTitulo: e.target.value.slice(0, 60) })} placeholder="Ex.: Melhor em campo" style={inputStyle} /></label>
        </Seccao>
      ) : null}

      {/* FOTO DO CAMPEÃO — com o campeão escolhido, nos dois modos: no Jogo passado ela vai junto no pedido dos prêmios, no fim. */}
      {d.campeaoIdx !== null ? (
        <div style={{ display: 'grid', gap: 8, borderTop: '1px solid #222', paddingTop: 12, marginTop: 16 }} data-foto-do-campeao>
          <span style={secLbl}>Foto do campeão</span>
          <UploadComCrop onUpload={(url) => mudar({ campeaoFoto: url })} accept="image/*" aspect={4 / 3} label={estado.campeaoFoto ? 'Trocar foto' : 'Adicionar foto'} />
        </div>
      ) : null}
      {!devolver ? (
        <button type="button" className="btn btn--purple" data-salvar-resultado style={{ width: '100%', marginTop: 18 }} disabled={busy} onClick={guardar}>
          {busy ? 'Salvando…' : 'Salvar resultado'}
        </button>
      ) : null}
    </div>
  );
}
