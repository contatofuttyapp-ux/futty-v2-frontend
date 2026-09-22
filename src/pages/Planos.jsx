// Futty v2.0 — Brilhantes (/planos): os três produtos da Figurinha Brilhante.
//
// SPEC-FIGURINHA-3 (22-set): Free/Pro/Elite saíram — nunca chegaram a cobrar
// nada e prometiam "avatares IA por mês" num modelo que a casa abandonou. No
// lugar ficam três compras de uma vez só (pacote do time, manto próprio, minha
// Brilhante), cuja tabela vive em lib/planos.js.
//
// Enquanto o pagamento da loja não existe, o botão NÃO diz "em breve" nem fica
// desativado: cria um pedido de ativação de verdade, que o dono resolve no
// Gabinete. A regra da casa é que o botão diga a verdade — e "a gente ativa e
// avisa" é verdade.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import Topbar from '../components/Topbar';
import { PRODUTOS } from '../lib/planos';
import { estadoBrilhantes, pedirAtivacao, pedidoDoProduto } from '../lib/brilhantes';
import '../styles/app.css';

// FASE A — durações do sway por card. Não partilham divisores comuns úteis, por isso as
// três oscilações nunca caem em fase: a página respira em vez de pulsar em bloco.
const SWAY_DUR = { pacote: '7.1s', manto: '9.7s', minha: '8.3s' };

// Atmosfera: partículas douradas de fundo. Valores fixos por partícula → nunca sincronizam.
//
// A 3.56 inflou isto (6 → 12, tamanho +50%, #f5e070 dominante, tecto de opacidade
// ~0.5 → 0.75) porque os cards eram opacos e a chuva não se via por trás. Com o véu
// a 3% o pressuposto caiu: o que era compensação passou a grito. AFINAÇÃO — volta ao
// base da Figurinha: 6 partículas, tamanhos 2-4, rotação equilibrada das três cores
// (dourado-claro / dourado / branco-quente, 2+2+2 — sem dominante) e o tecto de volta
// a ~0.5 (ver o opacity do container).
// A FÍSICA NÃO MEXE: os dur/delay são os mesmos que a 3.57 recalibrou (as 6 que ficam
// mantêm os seus valores ao centésimo) e os `left` também — as que sobram são uma sim,
// uma não, para a largura continuar coberta por igual.
// Régua: sentir-se através dos cards, nunca disputar com preços/CTAs.
const PLANOS_PARTICULAS = [
  { left: 6, size: 3, cor: '#f5e070', dur: 13.8, delay: 0 },
  { left: 23, size: 2, cor: '#d4a017', dur: 12.8, delay: 5.4 },
  { left: 40, size: 4, cor: '#fff8dc', dur: 14.9, delay: 4.2 },
  { left: 57, size: 2, cor: '#f5e070', dur: 15.8, delay: 3.1 },
  { left: 74, size: 3, cor: '#d4a017', dur: 17, delay: 1.9 },
  { left: 89, size: 2, cor: '#fff8dc', dur: 18, delay: 0.8 },
];

export default function Planos() {
  const [estado, setEstado] = useState(null); // null = a carregar
  const [aPedir, setAPedir] = useState(null); // id do produto com pedido em voo
  const [aviso, setAviso] = useState(null); // { tipo, texto }
  const [timeEscolhido, setTimeEscolhido] = useState(null); // só quando há mais de um
  // Chegada de um uniforme trancado na Figurinha (?destaque=minha): rola até o
  // card certo e realça-o, em vez de largar a pessoa numa lista de três sem
  // dizer qual resolve o que ela veio resolver — nunca um beco.
  const [searchParams] = useSearchParams();
  const destaque = searchParams.get('destaque');
  const refDestaque = useRef(null);

  useEffect(() => {
    let vivo = true;
    estadoBrilhantes().then((e) => { if (vivo) setEstado(e); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (destaque && estado) refDestaque.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [destaque, estado]);

  // Os times onde a pessoa é dona — é deles que falam o pacote e o manto.
  // BLOCO 2: com mais de um, ela escolhe (o pedido leva o teamId certo, senão o
  // dono de dois times pagava o pacote do time errado). Com um só, nada muda:
  // seletor nenhum, que seria uma pergunta sem alternativa.
  const meusTimes = (estado?.times || []).filter((t) => t.sou_dono);
  const meuTime = meusTimes.find((t) => t.id === timeEscolhido) || meusTimes[0] || null;

  async function pedir(produto) {
    const teamId = produto === 'minha' ? null : meuTime?.id;
    setAPedir(produto);
    const r = await pedirAtivacao(produto, teamId);
    setAPedir(null);
    if (r.ok) {
      setAviso({ tipo: 'ok', texto: 'Pedido enviado — a gente ativa e avisa.' });
      setEstado(await estadoBrilhantes()); // o cartão passa a mostrar "pedido enviado"
    } else {
      setAviso({ tipo: 'erro', texto: r.erro });
    }
  }

  return (
    <div className="app-shell">
      {/* Linguagem da Figurinha: topbar HUD (wordmark dourado + linha com degrau 45°).
          `back` mantido — esta página não está na bottom nav. */}
      <Topbar hud="BRILHANTES" back="/perfil" />
      {/* paddings do .app-main apertados (default 32/64 = 96px de espaço morto): os 3
          cards + CTAs passam a caber sem scroll em 390×844 e 430×932. O padding
          inferior mantém folga para a bottom nav fixa (75px). */}
      {/* ATMOSFERA — partículas douradas atrás dos cards. Reusa .fig-particle/futtyFall
          da figurinha; o container leva containerType:size (o keyframe usa cqh).
          FASE 3.57 — durações ×1.45 (média 10.3s → 15.0s, ~86 → ~59 px/s): com o dobro
          das partículas e +50% de tamanho, a mesma velocidade lia-se agitada.
          AFINAÇÃO — a contagem e o tamanho recuaram, mas as durações FICAM: a queda
          lenta é o que faz isto ler-se como atmosfera e não como confete. */}
      <div
        aria-hidden="true"
        // AFINAÇÃO — opacity 1 → 0.66, desfazendo a subida da 3.56. O keyframe futtyFall
        // faz pico a 0.75, por isso o tecto real das partículas é o produto dos dois:
        // 0.66 × 0.75 ≈ 0.5. O tecto vive aqui e não no keyframe porque o futtyFall é
        // partilhado com a Figurinha — mexer lá mexia na carta.
        style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', containerType: 'size', opacity: 0.66 }}
      >
        {PLANOS_PARTICULAS.map((p, i) => (
          <span
            key={i}
            className="fig-particle"
            style={{ position: 'absolute', left: `${p.left}%`, top: '-5%', width: p.size, height: p.size, borderRadius: '50%', background: p.cor, boxShadow: `0 0 6px ${p.cor}`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}
          />
        ))}
      </div>
      <main className="app-main" style={{ position: 'relative', zIndex: 1, paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 12 }}>
        {/* Topbar → cards, directo. Cards EMPILHADOS, ordem pacote → manto → minha.
            Layout compacto para caber sem scroll em viewports normais. */}
        <div style={{ display: 'grid', gap: 10, maxWidth: 460, margin: '0 auto' }}>
          {/* Cabeçalho curto: o que estas três coisas são, em uma linha. */}
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.72)', textAlign: 'center', margin: '0 0 2px' }}>
            Sua figurinha comum é grátis, sempre. A <b style={{ color: '#f0c94a' }}>Brilhante</b> é a versão em arte,
            feita por IA no uniforme do Futty.
          </p>
          {aviso ? (
            <div
              className="hud-corners-s"
              role="status"
              style={{
                padding: '10px 12px', fontSize: 13, lineHeight: 1.45, textAlign: 'center',
                color: aviso.tipo === 'ok' ? '#f0c94a' : '#f8b4b4',
                background: aviso.tipo === 'ok' ? 'rgba(212,160,23,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1px solid ${aviso.tipo === 'ok' ? 'rgba(212,160,23,0.5)' : 'rgba(248,113,113,0.5)'}`,
              }}
            >
              {aviso.texto}
            </div>
          ) : null}
          {PRODUTOS.map((p) => {
            // Pacote e manto são do dono do time; sem time próprio, o cartão
            // aparece na mesma (é o que faz a pessoa querer criar um) mas com o
            // botão a explicar o que falta, em vez de um botão morto.
            const pedido = pedidoDoProduto(estado?.pedidos, p.id, p.id === 'minha' ? null : meuTime?.id);
            const pendente = pedido?.estado === 'pendente';
            const recusado = pedido?.estado === 'recusado' ? pedido : null;
            const jaAtivo = p.id === 'pacote' ? !!meuTime?.brilhante_ativo : p.id === 'manto' ? !!meuTime?.manto_proprio : false;
            const faltaTime = p.soDono && !meuTime;
            const faltaPacote = p.exigePacote && !meuTime?.brilhante_ativo;
            const atual = jaAtivo;
            const destacado = p.id === destaque && !atual;
            const heroi = p.id === 'pacote'; // herói da página → levitação subtil
            const card = (
              <div
                ref={destacado ? refDestaque : undefined}
                className="hud-corners"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 16,
                  // FASE 3.63 — MATERIAL DE CARD DO CÂNONE: o véu do Perfil, extraído
                  // dos valores computados reais dessa página. Não é escuro translúcido
                  // (era rgba(13,13,18,0.45) + blur 4px até à 3.57) — é um VÉU BRANCO a
                  // 3%, sem blur nenhum: o card não tapa o fundo, tinge-o. As partículas
                  // passam a ver-se mais, não menos.
                  // O radius 12px do Perfil NÃO vem junto: os cantos são os 45° do
                  // .hud-corners. O Perfil é candidato a vaga; o que se herda dele é o
                  // material, não o que nele viola o cânone.
                  background: 'rgba(255, 255, 255, 0.03)',
                  // Destaque a DOURADO (era roxo) — mesma leitura do tile activo da
                  // figurinha. INTOCADO pela 3.63: a borda/glow do plano actual é
                  // hierarquia, não material. Só a borda NEUTRA adopta a do Perfil.
                  border: atual ? '2px solid #d4a017' : destacado ? '2px solid rgba(212,160,23,0.6)' : '1.2px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: atual ? '0 0 14px rgba(212,160,23,0.45)' : destacado ? '0 0 14px rgba(212,160,23,0.3)' : 'none',
                }}
              >
                {/* Realce de chegada (?destaque=): não é "já é seu", só "é este". */}
                {destacado ? (
                  <div className="hud-corners-s" role="status" style={{ padding: '7px 10px', fontSize: 11.5, lineHeight: 1.35, textAlign: 'center', color: '#f0c94a', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.4)' }}>
                    Escolher o uniforme é aqui
                  </div>
                ) : null}
                {/* Losango decorativo discreto no card destacado. */}
                {atual ? (
                  <span aria-hidden="true" style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 1, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, #f5e070, #d4a017)' }} />
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{p.nome}</span>
                  </span>
                  {atual || pendente ? (
                    // FASE 3.49 — cantos 45° (.hud-corners-s) em vez do radius-pill:
                    // era o último elemento redondo órfão da linguagem HUD.
                    <span className="hud-corners-s" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#d4a017', border: '1px solid rgba(212,160,23,0.5)', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                      {atual ? 'Já é seu' : 'Pedido enviado'}
                    </span>
                  ) : null}
                </div>

                {/* FASE 3.63 — text-shadow SÓ no preço. O véu de 3% quase não escurece,
                    por isso o texto assenta no fundo variável da página. Medido: features
                    (branco 0.8) e nome passam em todos os cenários (mín. 5.88); o preço
                    #d4a017 sobre o pico do blob DOURADO cai a 3.42 — dourado sobre
                    dourado, abaixo do AA 4.5. A sombra devolve-lhe a leitura sem mexer na
                    opacidade do card. */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 17, fontWeight: 700, color: '#d4a017', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{p.preco}</span>
                  {/* Os DOIS números no pacote (spec §2): o total assusta, o por
                      jogador explica. R$2 por cabeça é a conta que a pessoa faz. */}
                  {p.porJogador ? (
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>· {p.porJogador}</span>
                  ) : null}
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.78)' }}>{p.resumo}</p>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 5, flex: 1 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, lineHeight: 1.25, color: 'rgba(255,255,255,0.8)' }}>
                      <Check size={15} color="#8b5cf6" style={{ flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>

                {/* Dona de mais de um time: qual deles leva o pacote. O cartão
                    inteiro segue a escolha (o "Já é seu" e o "Pedido enviado"
                    são do time selecionado, não de um qualquer). */}
                {p.soDono && meusTimes.length > 1 && !atual ? (
                  <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>
                    Para qual time?
                    <select
                      value={meuTime?.id || ''}
                      onChange={(e) => setTimeEscolhido(e.target.value)}
                      style={{ fontSize: 16, color: '#e8e8ef', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.16)', padding: '7px 8px', borderRadius: 6 }}
                    >
                      {meusTimes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </label>
                ) : null}
                {/* Recusado: o motivo que o dono escreveu no Gabinete. Uma recusa
                    sem explicação é uma porta batida na cara. */}
                {!pendente && recusado ? (
                  <div className="hud-corners-s" role="status" style={{ padding: '9px 11px', fontSize: 12, lineHeight: 1.4, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.14)' }}>
                    {recusado.motivo || 'Este pedido não seguiu.'}
                  </div>
                ) : null}

                {/* O BOTÃO FAZ UMA COISA VERDADEIRA (spec §2): cria o pedido que
                    o dono resolve no Gabinete. Só fica sem ação quando falta um
                    passo anterior — e aí diz QUAL, em vez de "em breve". */}
                {atual ? null : pendente ? (
                  <div className="hud-corners" style={{ width: '100%', textAlign: 'center', padding: '10px 12px', fontSize: 12.5, lineHeight: 1.4, color: '#f0c94a', border: '1.2px solid rgba(212,160,23,0.4)', background: 'rgba(212,160,23,0.08)' }}>
                    Pedido enviado — a gente ativa e avisa
                  </div>
                ) : faltaTime || faltaPacote ? (
                  <div className="hud-corners" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.4, color: 'rgba(255,255,255,0.6)', border: '1.2px dashed rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.02)' }}>
                    <Lock size={14} style={{ flexShrink: 0 }} />
                    {faltaTime ? 'Só para quem criou um time' : 'Precisa do pacote do time primeiro'}
                  </div>
                ) : (
                  <span className="cta-gold-glow" style={{ display: 'flex' }}>
                    <button
                      type="button"
                      className="btn hud-corners cta-gold"
                      style={{ flex: 1, fontSize: 13 }}
                      disabled={aPedir === p.id}
                      onClick={() => pedir(p.id)}
                    >
                      {aPedir === p.id ? 'Enviando…' : p.botao}
                    </button>
                  </span>
                )}
              </div>
            );
            // FASE A — SUSPENSÃO. Os três cards ganham sombra no chão + sway; só o Pro
            // faz bob, e só a sombra dele responde em contra-fase.
            //
            // A ordem das camadas mudou face à 3.40, por física: antes a sombra vivia
            // DENTRO do .planos-bob e subia com o card — uma sombra que acompanha o
            // objecto não é sombra, é decalque. Agora o wrapper exterior é estático, a
            // sombra fica no chão, e só o card sobe por cima dela.
            return (
              <div key={p.id} style={{ position: 'relative' }}>
                <div
                  className={heroi ? 'planos-shadow' : undefined}
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '14%', bottom: -7, width: '72%', height: 10, background: 'radial-gradient(ellipse, rgba(0,0,0,0.4), transparent 70%)', filter: 'blur(10px)', pointerEvents: 'none', zIndex: 0 }}
                />
                <div className={heroi ? 'planos-bob' : undefined} style={{ position: 'relative', zIndex: 1 }}>
                  <div className="planos-sway" style={{ animationDuration: SWAY_DUR[p.id] }}>{card}</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
