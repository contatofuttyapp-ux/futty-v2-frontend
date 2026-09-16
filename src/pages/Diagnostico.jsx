// Futty v2.0 — Diagnóstico: o que o app mediu de si próprio (VELOCIDADE 4).
//
// Existe para trocar "está lento" por números, e sobretudo para separar as duas
// coisas que toda gente confunde:
//
//   MOTOR — quanto o servidor levou a responder (header Server-Timing, que o
//           backend põe em todo pedido). Se for alto, o problema é nosso, no
//           código do servidor.
//   REDE  — o que sobra. É a distância a cobrar: de Lisboa a São Paulo são
//           ~250 ms de ida e volta, e nenhum código nosso encurta isso.
//
// Fica visível para toda gente durante o teste, de propósito: quem sente a
// lentidão é quem tem o aparelho na mão, e é de lá que o número tem de vir.
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { lerDiagnostico, limparDiagnostico } from '../lib/diagnostico';
import { lerUltimoErro, limparUltimoErro } from '../lib/ultimoErro';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import '../styles/app.css';

const CARTAO = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-subtle)',
  padding: '12px 14px',
};

function Numero({ rotulo, stat, sufixo = 'ms' }) {
  return (
    <div className="hud-corners-s" style={{ ...CARTAO, flex: '1 1 140px', minWidth: 130 }}>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        {rotulo}
      </div>
      {stat ? (
        <>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, fontWeight: 700, color: '#f0c94a', lineHeight: 1.1, marginTop: 2 }}>
            {stat.media}
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{sufixo}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            pior {stat.pior}{sufixo} · {stat.n} medições
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>sem medições</div>
      )}
    </div>
  );
}

// Rodada 8A: os instantes finos de uma tela, numa linha só
// ("lista 12 · 1º quadro 30 · maior quadro 1800@40 · imagem 850").
const NOMES_MARCAS = [
  ['lista', 'lista'],
  ['listaNova', 'lista nova'],
  ['loaderSaiu', 'loader saiu'],
  ['efeito', 'efeito'],
  ['quadro1', '1º quadro'],
  ['imagem', '1ª imagem'],
];
function linhaDeMarcas(marcas) {
  if (!marcas) return '';
  const partes = NOMES_MARCAS.filter(([k]) => marcas[k] != null).map(([k, rotulo]) => `${rotulo} ${marcas[k]}`);
  if (marcas.quadroMaior != null) partes.push(`maior quadro ${marcas.quadroMaior}@${marcas.quadroMaiorEm}`);
  return partes.join(' · ');
}

// Velocidade 8 — "travadas >100 ms: n (pior x ms, fase y)".
function linhaDeTravadas(t) {
  if (!t) return null;
  if (!t.leves) return 'Travadas: nenhuma (nenhum quadro passou de 50 ms)';
  const pior = t.pior ? ` (pior ${t.pior.ms} ms, ${t.pior.fase})` : '';
  return `Travadas >100 ms: ${t.graves}${pior} · >50 ms: ${t.leves}`;
}

// As fases por ordem de gravidade — é onde o conserto tem de ir.
function linhaDeFases(t) {
  const fases = Object.entries(t?.porFase || {}).sort((a, b) => b[1] - a[1]);
  return fases.length ? fases.map(([nome, n]) => `${nome} ${n}`).join(' · ') : null;
}

// Velocidade 8 — "arranque: compilação a ms, React b ms, Início c ms".
function linhaDeArranque(a) {
  if (!a || a.compilacaoMs == null) return null;
  const partes = [`compilação ${a.compilacaoMs} ms`];
  if (a.reactMs != null) partes.push(`React ${a.reactMs} ms`);
  if (a.inicioMs != null) partes.push(`Início ${a.inicioMs} ms`);
  return `Arranque: ${partes.join(', ')}`;
}

// Rota sem a query, e encurtada pela ponta ESQUERDA: o que distingue
// /api/teams/<slug>/ranking de /api/teams/<slug>/jogos está no fim.
function rotaCurta(rota) {
  const limpa = String(rota).split('?')[0];
  return limpa.length > 34 ? `…${limpa.slice(-33)}` : limpa;
}

export default function Diagnostico() {
  const [dados, setDados] = useState(() => lerDiagnostico());
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState(null);
  const [ultimoErro, setUltimoErro] = useState(() => lerUltimoErro());

  const { aparelho, resumo, chamadas, navegacoes, falhas, preaquecimento } = dados;

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    try {
      await apiFetch('/api/diagnostico', { method: 'POST', body: JSON.stringify(lerDiagnostico()) });
      setToast({ msg: 'Relatório enviado. Obrigado!', tipo: 'success' });
    } catch (e) {
      setToast({ msg: e.message || 'Não deu para enviar.', tipo: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  function limpar() {
    limparDiagnostico();
    setDados(lerDiagnostico());
    setToast({ msg: 'Medições zeradas. Navegue um pouco e volte aqui.', tipo: 'success' });
  }

  function limparErro() {
    limparUltimoErro();
    setUltimoErro(null);
  }

  return (
    <div className="app-shell page-reveal">
      <Topbar hud="DIAGNÓSTICO" back="/perfil" />
      <main className="app-main" style={{ paddingLeft: 16, paddingRight: 16, display: 'grid', gap: 16 }}>
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          O que este aparelho mediu nesta sessão. <b style={{ color: '#f0c94a' }}>Motor</b> é o tempo do
          servidor; <b style={{ color: '#b69cff' }}>rede</b> é o que a distância cobra.
        </p>

        {/* ─── Último erro fatal (build 10) ─── */}
        {ultimoErro ? (
          <div>
            <div className="games-label">Último erro (crash)</div>
            <div className="hud-corners-s" style={{ ...CARTAO, display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {new Date(ultimoErro.data).toLocaleString('pt-BR')} · rota {ultimoErro.rota || '—'}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#f8b4b4', wordBreak: 'break-word' }}>
                {ultimoErro.mensagem}
              </div>
              {ultimoErro.stackCurto ? (
                <pre style={{ fontSize: 10.5, lineHeight: 1.5, color: 'var(--text-dim)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'monospace' }}>
                  {ultimoErro.stackCurto}
                </pre>
              ) : null}
              <button type="button" className="btn btn--purple-outline hud-corners-s" style={{ height: 34, fontSize: 12, marginTop: 4 }} onClick={limparErro}>
                Limpar
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Numero rotulo="Chamada total" stat={resumo.total} />
          <Numero rotulo="Motor" stat={resumo.motor} />
          <Numero rotulo="Rede" stat={resumo.rede} />
          <Numero rotulo="Tela na frente" stat={resumo.pintura} />
        </div>

        {/* ─── Fluidez (VELOCIDADE 8) ───
            Uma travada é um quadro que demorou mais do que devia: acima de 50 ms
            a rolagem sente-se aos solavancos, acima de 100 ms a pessoa vê a tela
            parar. A FASE é o que aponta para o conserto — travar no arranque, no
            pré-aquecimento ou ao trocar de tela são três problemas diferentes. */}
        <div className="hud-corners-s" style={CARTAO}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
            Fluidez
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: '#c9c2d6', wordBreak: 'break-word' }}>
            {linhaDeTravadas(resumo.travadas)}
            {linhaDeFases(resumo.travadas) ? (
              <>
                <br />
                <span style={{ color: 'var(--text-dim)' }}>Por fase: {linhaDeFases(resumo.travadas)}</span>
              </>
            ) : null}
            {linhaDeArranque(resumo.arranque) ? (
              <>
                <br />
                {linhaDeArranque(resumo.arranque)}
              </>
            ) : null}
          </div>
          {resumo.travadas?.piores?.length ? (
            <div style={{ marginTop: 8, display: 'grid', gap: 3 }}>
              {resumo.travadas.piores.slice(0, 6).map((t, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  <span style={{ color: t.ms >= 250 ? '#f8b4b4' : '#f0c94a', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>{t.ms} ms</span>
                  {' · '}{t.fase}{' · aos '}{(t.em / 1000).toFixed(1)}s
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="hud-corners-s" style={CARTAO}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
            Aparelho
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: '#c9c2d6', wordBreak: 'break-word' }}>
            {aparelho.plataforma}{aparelho.nativo ? ' (app)' : ' (navegador)'}
            {aparelho.appVersao ? ` · versão ${aparelho.appVersao} (build ${aparelho.appBuild})` : ''}
            <br />
            {aparelho.ligacao
              ? `Ligação: ${aparelho.ligacao.tipo || '?'}${aparelho.ligacao.rttMs != null ? ` · rtt ${aparelho.ligacao.rttMs}ms` : ''}`
              : 'Ligação: o aparelho não informa'}
            <br />
            Telas abertas: {resumo.navegacoes} · pintaram do cache: {resumo.pinturasDoCache}
            {/* Velocidade 6B: quantas imagens o app mostrou e quantas nem foram
                à rede. É o número que diz se o ganho é real no aparelho. */}
            {resumo.imagens ? (
              <>
                <br />
                Imagens: {resumo.imagens.n} · média {resumo.imagens.mediaMs}ms · {resumo.imagens.pctDoCache}% do cache
              </>
            ) : null}
            {/* Velocidade 7B: se a maior largura vista passar da do aparelho, a página encolheu. */}
            {resumo.largura ? (
              <>
                <br />
                Largura: aparelho {resumo.largura.aparelho}px · maior vista {Math.max(resumo.largura.maiorViewport, resumo.largura.maiorRolavel)}px
                {Math.max(resumo.largura.maiorViewport, resumo.largura.maiorRolavel) > resumo.largura.aparelho ? (
                  <span style={{ color: '#f8b4b4' }}> · passou em {rotaCurta(resumo.largura.rota)}</span>
                ) : null}
              </>
            ) : null}
            {preaquecimento ? (
              <>
                <br />
                Adiantou em segundo plano: {preaquecimento.itens} telas e {preaquecimento.imagens} imagens ({(preaquecimento.ms / 1000).toFixed(1)}s)
              </>
            ) : null}
          </div>
        </div>

        {/* ─── Falhas silenciosas (VELOCIDADE 5) ─── */}
        {falhas.length > 0 ? (
          <div>
            <div className="games-label">Não apareceu ({falhas.length})</div>
            <div className="hud-corners-s" style={{ ...CARTAO, display: 'grid', gap: 6 }}>
              {[...falhas].reverse().map((f, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.5, color: '#f8b4b4', wordBreak: 'break-word' }}>
                  <b>{f.area}</b> · {f.causa}
                  {f.detalhe ? <span style={{ color: 'var(--text-dim)' }}> — {f.detalhe}</span> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ─── Chamadas ─── */}
        <div>
          <div className="games-label">Chamadas ({chamadas.length})</div>
          {chamadas.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Nada medido ainda. Navegue pelo app e volte aqui.</p>
          ) : (
            <div className="hud-corners-s" style={{ ...CARTAO, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--text-dim)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Rota</th>
                    <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Motor</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Rede</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chamadas].reverse().map((c, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '7px 10px', color: c.status >= 400 ? '#f8b4b4' : '#fff' }}>
                        {c.metodo !== 'GET' ? `${c.metodo} ` : ''}{rotaCurta(c.rota)}
                        {c.status >= 400 ? <span style={{ color: '#f8b4b4' }}> ({c.status})</span> : null}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>{c.ms}</td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', color: '#f0c94a', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>
                        {c.motorMs == null ? '—' : c.motorMs}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#b69cff', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>
                        {c.redeMs == null ? '—' : c.redeMs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Navegações ─── */}
        {navegacoes.length > 0 ? (
          <div>
            <div className="games-label">Telas ({navegacoes.length})</div>
            <div className="hud-corners-s" style={{ ...CARTAO, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--text-dim)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Tela</th>
                    <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Na frente</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Dados</th>
                  </tr>
                </thead>
                <tbody>
                  {[...navegacoes].reverse().map((n, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '7px 10px' }}>
                        {rotaCurta(n.rota)}
                        {n.doCache ? <span style={{ color: '#7bd88f', fontSize: 11 }}> · cache</span> : null}
                        {/* Velocidade 7B: que loader a pintura esperou (código da tela, sessão, a própria tela). */}
                        {n.esperou?.length ? <span style={{ color: '#f0c94a', fontSize: 11 }}> · esperou {n.esperou.join(', ')}</span> : null}
                        {linhaDeMarcas(n.marcas) ? (
                          <div style={{ color: 'var(--text-dim)', fontSize: 10.5, lineHeight: 1.4, marginTop: 2 }}>{linhaDeMarcas(n.marcas)}</div>
                        ) : null}
                      </td>
                      <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>{n.msPintura}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-dim)', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>
                        {n.msDados == null ? '—' : n.msDados}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 10, marginBottom: 8 }}>
          <div className="cta-gold-glow" style={{ display: 'flex' }}>
            <button type="button" className="btn hud-corners cta-gold" style={{ flex: 1 }} disabled={enviando} onClick={enviar}>
              {enviando ? 'Enviando…' : 'Enviar relatório'}
            </button>
          </div>
          <button type="button" className="btn btn--purple-outline hud-corners" onClick={() => setDados(lerDiagnostico())}>
            Atualizar
          </button>
          <button type="button" className="btn btn--purple-outline hud-corners" onClick={limpar}>
            Zerar medições
          </button>
        </div>
      </main>

      {toast ? <Toast mensagem={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
