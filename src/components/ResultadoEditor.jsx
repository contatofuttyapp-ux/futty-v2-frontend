// Futty v2.0 — Editor do resultado do jogo (admin): 4 níveis de detalhe.
// Dois modos. `salvar` (o de sempre, no Jogo): escolhe o nível, salva em PATCH /api/games/:id/resultado.
// `devolver` (o passo "Como terminou?" do Jogo passado): o jogo ainda não existe, então nada é salvo aqui
// — a cada toque o editor devolve o que foi preenchido (`aoMudar`) e quem usa grava tudo no fim. Em
// `devolver` não há seletor de nível: é UMA pergunta (quem ganhou); o placar é opcional e os gols de cada
// um aparecem depois dela; o nível sai das contas de utils/resultadoDoJogo.js.
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { urlAsset, urlImagem, iniciaisNome } from '../utils/avatar';
import { avatarQuadrado, enquadroAvatar } from '../lib/enquadroAvatar';
import { GOLS } from './golsEPremios';
import { corpoDoResultadoDoJogo, placarEfetivo } from '../utils/resultadoDoJogo';

const NIVEIS = [
  { n: 0, label: 'Sem resultado' },
  { n: 1, label: 'Quem ganhou' },
  { n: 2, label: 'Placar' },
  { n: 3, label: 'Stats' },
];

// A borda se vê sobre o #0c0c0c (com #222 eram duas caixas pretas, sem forma) e o "0" apagado mostra o que
// se escreve ali (class placar-input, app.css).
const inputPlacar = { width: 48, textAlign: 'center', padding: '8px 6px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.32)', background: '#0c0c0c', color: '#fff', fontSize: 18, fontWeight: 800 };
const stepBtn = { width: 28, height: 28, borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1 };
// O título de cada pergunta do modo "devolver": o .section-title da casa (18 px, caixa normal: é pergunta, não letreiro — VOZ-FUTTY §5).
const TITULO_DA_PERGUNTA = { margin: '18px 0 8px' };

// Sem resultado antes do jogo acontecer — exceto jogo histórico (criado pelo "Jogo passado"), que não tem
// essa trava.
function jaComecouJogo(game) {
  return !!game.data && new Date(game.data).getTime() <= Date.now();
}

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

/**
 * @param {object} props
 * @param {'salvar'|'devolver'} [props.modo]
 * @param {Array<{ user_id: string, nome: string, avatar_url?: string|null, time?: string, timeIndex?: number }>} props.jogadores quem entra na lista de gols
 * @param {{ vencedor: string|null, placarA: string|null, placarB: string|null, golsMap: object }} [props.inicial] só `devolver`: de onde retomar (a pessoa voltou a este passo)
 * @param {(estado: { vencedor: string|null, placarA: string|null, placarB: string|null, golsMap: object }) => void} [props.aoMudar] só `devolver`
 * @param {boolean} [props.comGols] só `devolver`: o time conta "Gols de cada um" (mostrar_gols)
 */
export default function ResultadoEditor({ gameId, game, gols, jogadores, nomeA, nomeB, onSaved, showToast, modo = 'salvar', inicial = null, aoMudar = null, comGols = true }) {
  const devolver = modo === 'devolver';
  const podeSalvar = devolver || jaComecouJogo(game) || game.historico;

  const [nivel, setNivel] = useState(game?.resultado_nivel || 0);
  const [estado, setEstado] = useState(() => {
    if (devolver) return { vencedor: inicial?.vencedor ?? null, placarA: inicial?.placarA ?? null, placarB: inicial?.placarB ?? null, golsMap: inicial?.golsMap || {} };
    const m = {};
    (gols || []).forEach((g) => { m[g.user_id] = g.gols || 0; });
    return { vencedor: game.time_vencedor || null, placarA: game.placar_a ?? 0, placarB: game.placar_b ?? 0, golsMap: m };
  });
  const { vencedor, golsMap } = estado;
  const [busy, setBusy] = useState(false);

  function mudar(parcial) {
    const novo = { ...estado, ...parcial };
    setEstado(novo);
    if (devolver) aoMudar?.(novo);
  }
  function setGol(uid, delta) {
    mudar({ golsMap: { ...golsMap, [uid]: Math.max(0, (golsMap[uid] || 0) + delta) } });
  }

  async function guardar() {
    if (busy) return;
    if (nivel >= 1 && !vencedor) {
      showToast('Indique quem venceu.', 'error');
      return;
    }
    setBusy(true);
    try {
      const body = corpoDoResultadoDoJogo({ nivel, ...estado }, jogadores);
      await apiFetch(`/api/games/${gameId}/resultado`, { method: 'PATCH', body: JSON.stringify(body) });
      showToast('Resultado salvo.');
      onSaved();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!podeSalvar) {
    return (
      <p className="muted" style={{ marginTop: 8 }}>
        O resultado só pode ser registrado depois do início do jogo.
      </p>
    );
  }

  // O que cada bloco mostra: no `salvar`, pelo nível escolhido; no `devolver`, assim que alguém ganhou (o placar e os gols vêm depois da pergunta).
  const mostraVencedor = devolver || nivel >= 1;
  const mostraPlacar = devolver ? !!vencedor : nivel >= 2;
  const mostraGols = devolver ? !!vencedor && comGols && jogadores.length > 0 : nivel === 3;
  const placar = devolver ? placarEfetivo(estado, jogadores) : { a: estado.placarA, b: estado.placarB };

  return (
    <div style={{ marginTop: devolver ? 0 : 8 }} data-resultado-editor={modo}>
      {/* Selector de nível (só `salvar`) */}
      {!devolver ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {NIVEIS.map((x) => (
            <button key={x.n} type="button" className={`btn btn--sm ${nivel === x.n ? 'btn--purple' : 'btn--ghost'}`} aria-pressed={nivel === x.n} onClick={() => setNivel(x.n)}>
              {x.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Quem venceu */}
      {mostraVencedor ? (
        <>
          {devolver ? <div className="section-title" style={{ ...TITULO_DA_PERGUNTA, marginTop: 0 }} data-quem-ganhou>Quem ganhou?</div> : null}
          <div style={{ display: 'flex', gap: 8, marginTop: devolver ? 0 : 12 }}>
            {[['A', devolver ? nomeA : `${nomeA} ganhou`], ['empate', 'Empate'], ['B', devolver ? nomeB : `${nomeB} ganhou`]].map(([v, label]) => (
              <button key={v} type="button" data-vencedor={v} aria-pressed={vencedor === v} className={`btn btn--sm ${vencedor === v ? 'btn--primary' : 'btn--ghost'}`} style={{ flex: 1, minWidth: 0 }} onClick={() => mudar({ vencedor: v })}>
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {/* Placar (níveis 2-3; no `devolver`, opcional) */}
      {mostraPlacar ? (
        <>
          {devolver ? <div className="section-title" style={TITULO_DA_PERGUNTA}>Placar <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(opcional)</span></div> : null}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: devolver ? 0 : 12, color: '#fff', fontWeight: 700 }}>
            <span style={{ fontSize: 13 }}>{nomeA}</span>
            <input type="number" min="0" inputMode="numeric" placeholder="0" className="placar-input" aria-label={`Gols do ${nomeA}`} data-placar="a" value={placar.a} onChange={(e) => mudar({ placarA: e.target.value })} style={inputPlacar} />
            <span style={{ color: 'var(--text-dim)' }}>×</span>
            <input type="number" min="0" inputMode="numeric" placeholder="0" className="placar-input" aria-label={`Gols do ${nomeB}`} data-placar="b" value={placar.b} onChange={(e) => mudar({ placarB: e.target.value })} style={inputPlacar} />
            <span style={{ fontSize: 13 }}>{nomeB}</span>
          </div>
        </>
      ) : null}

      {/* Gols por jogador (nível 3; no `devolver`, só se o time conta gols) */}
      {mostraGols ? (
        <>
          {devolver ? <div className="section-title" style={TITULO_DA_PERGUNTA} data-gols-de-cada-um>{GOLS.titulo}</div> : null}
          <div style={{ display: 'grid', gap: 8, marginTop: devolver ? 0 : 12 }}>
            {jogadores.map((j) => (
              <div key={j.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MiniAvatar nome={j.nome} avatarUrl={j.avatar_url} />
                <span style={{ flex: 1, minWidth: 0, color: '#fff', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {j.nome} <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>· {j.time}</span>
                </span>
                <button type="button" style={stepBtn} onClick={() => setGol(j.user_id, -1)} aria-label="Menos">−</button>
                <span style={{ minWidth: 20, textAlign: 'center', color: '#d4a017', fontWeight: 800 }}>{golsMap[j.user_id] || 0}</span>
                <button type="button" style={stepBtn} onClick={() => setGol(j.user_id, 1)} aria-label="Mais">+</button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {!devolver ? (
        <button type="button" className="btn btn--purple btn--sm" style={{ marginTop: 14 }} disabled={busy} onClick={guardar}>
          {busy ? 'Salvando…' : 'Salvar resultado'}
        </button>
      ) : null}
    </div>
  );
}
