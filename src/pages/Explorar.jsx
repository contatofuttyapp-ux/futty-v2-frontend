// Futty v2.0 — Explorar peladas (/explorar) no cânone: busca por cidade + lista de
// equipas abertas com escudo/estado. CICLO DO PEDIDO v1 (sem push): pedir → PENDENTE
// visível (✓ + cancelar) → admin decide no hub → o desfecho aparece no Início.
// Raio/geolocalização: UI presente mas DORMENTE — as distâncias chegam quando as
// equipas declararem o ponto aproximado (opt-in do admin, fase Segurança; a posição
// do utilizador nunca sai do dispositivo). Regra na SPEC-EQUIPAS §b.
import { Search, MapPin, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Topbar from '../components/Topbar';
import EscudoEquipa from '../components/EscudoEquipa';
import Toast from '../components/Toast';
import { plural } from '../utils/plural';
import CampoCidadeLazy from '../components/CampoCidadeLazy';
import { timeCasaPorCidade } from '../utils/cidades';
import { SEM_SOBRE_NO_POPUP, depoisDePedirEntrada, localDoTime, rotuloDoModo, tituloDoRadar } from '../utils/radar';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };

function SkeletonCard() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', clipPath: CLIP, height: 104, marginBottom: 8 }}>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', animation: 'rankShimmer 2.0s ease-in-out infinite' }} />
    </div>
  );
}

const RAIOS = [5, 10, 25, 50];
// Distância aproximada entre 2 pontos (Haversine), em km. Corre no CLIENTE — a posição
// do utilizador nunca é enviada ao servidor.
function distanciaKm(a, b) {
  const R = 6371; const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat); const dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const MEMBROS = (e) => `${e.membro_count} ${plural(e.membro_count, 'membro', 'membros')} · ${rotuloDoModo(e.modo_visibilidade)}`;

// O que fica à direita do time, no card e no pop-up (29T, achado 157): o botão Entrar / Pedir entrada, o pedido enviado (com cancelar), o
// "Você entrou!" (com "Ver o time", achado 159) ou o "Você já é membro". `larga`: no pop-up o botão ocupa a linha inteira.
function AcaoDoTime({ equipa, busy, aoPedir, aoCancelar, larga = false }) {
  const aberta = equipa.modo_visibilidade === 'publico_aberto';
  if (equipa.entrou_agora) {
    return (
      <div data-entrou-agora style={{ display: 'grid', gap: 4, justifyItems: larga ? 'center' : 'end', flexShrink: 0 }}>
        <span style={{ fontFamily: RAJ, fontSize: 12, fontWeight: 800, color: '#7bd88f', letterSpacing: '0.06em' }}>Você entrou!</span>
        <Link to={`/time/${equipa.slug}`} state={{ primeiraEntrada: true }} onClick={(e) => e.stopPropagation()} style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#f0c94a', textDecoration: 'underline', textUnderlineOffset: 3, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 6px', margin: larga ? 0 : '-6px -6px -6px 0' }}>
          Ver o time
        </Link>
      </div>
    );
  }
  if (equipa.ja_membro) {
    return <span style={{ flexShrink: 0, fontFamily: RAJ, fontSize: 11, fontWeight: 800, color: '#7bd88f', letterSpacing: '0.06em' }}>Você já é membro</span>;
  }
  if (equipa.pedido_pendente) {
    return (
      <div style={{ display: 'grid', gap: 4, justifyItems: larga ? 'center' : 'end', flexShrink: 0 }}>
        <span style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 800, color: '#b69cff', letterSpacing: '0.06em' }}>Pedido enviado ✓</span>
        {/* P3-16 — alvo mínimo 44px para o polegar (antes 10px sem padding). */}
        <button type="button" disabled={busy === equipa.slug} onClick={() => aoCancelar(equipa)} style={{ background: 'none', border: 'none', color: '#8a8398', fontFamily: RAJ, fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 6px', margin: larga ? 0 : '-6px -6px -6px 0' }}>
          cancelar
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={busy === equipa.slug}
      onClick={() => aoPedir(equipa)}
      style={{ flexShrink: 0, width: larga ? '100%' : undefined, minHeight: larga ? 48 : undefined, fontFamily: RAJ, fontWeight: 800, fontSize: larga ? 13 : 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 14px', cursor: 'pointer', clipPath: CLIP_S, color: aberta ? '#7bd88f' : '#f0c94a', border: aberta ? '1.5px solid rgba(123,216,143,0.5)' : '1.5px solid #d4a017', background: aberta ? 'rgba(123,216,143,0.06)' : 'rgba(30,24,8,0.9)' }}
    >
      {aberta ? 'Entrar' : 'Pedir entrada'}
    </button>
  );
}

// O card do time (29T, achado 157): embaixo do nome, "Bairro · Cidade" e o "Sobre o time" em até 2 linhas, cortado com "…". Tocar no card (fora do botão)
// abre o pop-up com tudo; quem já é membro vai direto ao time, como sempre foi.
function CardDoTime({ equipa, busy, aoTocar, aoPedir, aoCancelar }) {
  const local = localDoTime(equipa);
  return (
    <div
      data-card-do-time={equipa.slug}
      style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, cursor: 'pointer' }}
      onClick={() => aoTocar(equipa)}
    >
      <EscudoEquipa team={equipa} size={44} />
      <button type="button" data-abrir-time aria-label={`${equipa.nome}: ver sobre o time`} style={{ flex: 1, minWidth: 0, display: 'block', padding: 0, border: 'none', background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <span style={{ display: 'block', fontFamily: RAJ, fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{equipa.nome}</span>
        {local || equipa.dist != null ? (
          <span data-local-do-time style={{ display: 'block', fontSize: 12, color: '#c9c2d6', marginTop: 2, overflowWrap: 'break-word' }}>
            {equipa.dist != null ? <b style={{ color: '#b69cff' }}>a {equipa.dist < 1 ? '<1' : Math.round(equipa.dist)} km{local ? ' · ' : ''}</b> : null}
            {local}
          </span>
        ) : null}
        {equipa.descricao ? (
          <span data-sobre-do-time style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 12, lineHeight: 1.35, color: 'var(--text-dim)', marginTop: 3 }}>{equipa.descricao}</span>
        ) : null}
        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{MEMBROS(equipa)}</span>
      </button>
      <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <AcaoDoTime equipa={equipa} busy={busy} aoPedir={aoPedir} aoCancelar={aoCancelar} />
      </div>
    </div>
  );
}

// O pop-up do time (29T, achado 157): escudo, nome, bairro e cidade, membros, aberto ou com aprovação, o "Sobre o time" inteiro e o mesmo botão.
// Portal para o body (overlay fixo nunca dentro do [data-page], ver LoadingFutty.jsx). Esc, o X e o toque fora fecham.
function PopupDoTime({ equipa, busy, aoPedir, aoCancelar, aoFechar }) {
  useEffect(() => {
    const teclar = (e) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', teclar);
    return () => document.removeEventListener('keydown', teclar);
  }, [aoFechar]);
  const local = localDoTime(equipa);
  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={aoFechar}>
      <div className="modal-card modal-card--hud" role="dialog" aria-modal="true" aria-labelledby="popup-do-time-nome" data-popup-do-time={equipa.slug} onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__inner" style={{ position: 'relative' }}>
          <button type="button" aria-label="Fechar" data-fechar-popup onClick={aoFechar} style={{ position: 'absolute', top: 4, right: 4, width: 44, height: 44, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} aria-hidden="true" />
          </button>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
            <EscudoEquipa team={equipa} size={72} />
            <h2 id="popup-do-time-nome" style={{ margin: '8px 0 0', fontFamily: RAJ, fontWeight: 800, fontSize: 22, lineHeight: 1.15 }}>{equipa.nome}</h2>
            {local ? <div data-local-do-time style={{ fontSize: 14, color: '#c9c2d6' }}>{local}</div> : null}
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{MEMBROS(equipa)}</div>
          </div>
          <div style={{ margin: '16px 0', textAlign: 'left' }}>
            <div style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#9a8fc0', textTransform: 'uppercase', marginBottom: 6 }}>Sobre o time</div>
            <p data-sobre-do-time style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: equipa.descricao ? '#fff' : 'var(--text-dim)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{equipa.descricao || SEM_SOBRE_NO_POPUP}</p>
          </div>
          <AcaoDoTime equipa={equipa} busy={busy} aoPedir={aoPedir} aoCancelar={aoCancelar} larga />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Explorar() {
  const navigate = useNavigate();
  const [equipas, setEquipas] = useState([]);
  const [aberto, setAberto] = useState(null); // o slug do time cujo pop-up está aberto
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [geoPedida, setGeoPedida] = useState(false);
  const [zona, setZona] = useState(''); // Rodada 29B (D): a cidade da pessoa, escolhida na lista (ou digitada)
  const [zonaEscolhida, setZonaEscolhida] = useState(false);
  const [posUser, setPosUser] = useState(null); // {lat,lng} SÓ em memória — nunca enviada/guardada
  // 29T (achado 161): de onde veio a posição decide o título da lista ("Perto de você" só com a localização; "Em <cidade>" com a cidade).
  const [origemPos, setOrigemPos] = useState(null); // 'localizacao' | 'cidade' | null
  const [cidadeDaPos, setCidadeDaPos] = useState(''); // a cidade como a pessoa a escolheu (não o que ela digita depois)
  const [raio, setRaio] = useState(null); // km (null = sem filtro de distância)
  const [busy, setBusy] = useState(null); // slug em processamento
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ativo = true;
    // /explorar traz o estado do candidato (ja_membro + pedido_pendente).
    apiFetch('/api/teams/explorar')
      .then((d) => {
        if (!ativo) return;
        setEquipas(d.teams || []);
        setLoading(false);
      })
      .catch((e) => {
        if (!ativo) return;
        setToast({ tipo: 'error', mensagem: e.message });
        setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Rodada 29B (D): time SEM coordenada (a cidade dele nenhuma lista nem o Nominatim achou) aparece para quem escreve
  // a cidade EXATAMENTE — sem acento, maiúscula nem espaço sobrando (mesma regra do motor).
  const filtradasTexto = equipas.filter(
    (e) =>
      e.nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
      (e.localizacao || '').toLowerCase().includes(pesquisa.toLowerCase()) ||
      timeCasaPorCidade(e, pesquisa)
  );
  // O time do pop-up é sempre o da lista de agora: entrar, pedir e cancelar mudam o pop-up na hora.
  const equipaAberta = aberto ? equipas.find((e) => e.slug === aberto) || null : null;
  // Camada de distância (client-side): só entra se houver posição do utilizador + raio.
  // Equipas sem geo ficam de FORA da busca por distância, mas visíveis no modo normal.
  const comDist = filtradasTexto.map((e) => ({
    ...e,
    dist: posUser && e.geo_lat != null && e.geo_lng != null ? distanciaKm(posUser, { lat: e.geo_lat, lng: e.geo_lng }) : null,
  }));
  const filtradas = posUser && raio
    ? comDist.filter((e) => e.dist != null && e.dist <= raio).sort((a, b) => a.dist - b.dist)
    : comDist;

  // Geolocalização OPT-IN: pede permissão no momento do toque; a posição fica no
  // dispositivo (não é enviada) — só servirá para ORDENAR quando houver pontos
  // aproximados das equipas (fase Segurança).
  function pedirGeo() {
    if (!navigator.geolocation) {
      setToast({ tipo: 'info', mensagem: 'Seu celular não informa a localização.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        // A posição fica SÓ em memória (React state) — nunca é enviada ao servidor nem guardada.
        setPosUser({ lat: p.coords.latitude, lng: p.coords.longitude });
        setOrigemPos('localizacao');
        setGeoPedida(true);
        if (!raio) setRaio(10);
        setToast({ tipo: 'success', mensagem: 'Localização ativa (só neste celular).' });
      },
      () => setToast({ tipo: 'info', mensagem: 'Sem problema, escreva sua cidade abaixo.' })
    );
  }

  // Alternativa: a cidade do UTILIZADOR, geocodificada NO BROWSER (não passa pelo nosso
  // servidor). A posição resultante fica só em memória.
  async function usarCidade() {
    const cidade = zona.trim();
    if (!cidade) { setToast({ tipo: 'info', mensagem: 'Escreva sua cidade no campo acima.' }); return; }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cidade)}`, { headers: { Accept: 'application/json' } });
      const arr = await r.json();
      if (Array.isArray(arr) && arr[0]) {
        setPosUser({ lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) });
        setOrigemPos('cidade');
        setCidadeDaPos(cidade);
        setGeoPedida(true);
        if (!raio) setRaio(10);
        setToast({ tipo: 'success', mensagem: `Sua zona: ${cidade}` });
      } else setToast({ tipo: 'info', mensagem: 'Cidade não encontrada.' });
    } catch { setToast({ tipo: 'error', mensagem: 'Não deu para localizar a cidade.' }); }
  }

  // Entrar (aberta) / pedir (aprovação) — o estado PENDENTE fica visível.
  async function pedirEntrada(equipa) {
    if (busy) return;
    setBusy(equipa.slug);
    try {
      const r = await apiFetch(`/api/teams/${equipa.slug}/pedir-entrada`, { method: 'POST', body: JSON.stringify({}) });
      const entrou = !!r?.entrou;
      // 29T (achado 159): quem acabou de entrar não é "já era membro": o card comemora ("Você entrou!" + "Ver o time") e a contagem sobe 1.
      setEquipas((cur) => depoisDePedirEntrada(cur, equipa.slug, entrou));
      setToast({ tipo: 'success', mensagem: entrou ? `Você entrou no time ${equipa.nome}!` : 'Pedido enviado. O admin decide e você vê o desfecho no Início.' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(null);
    }
  }

  // Cancelar o meu pedido pendente.
  async function cancelarPedido(equipa) {
    if (busy) return;
    setBusy(equipa.slug);
    try {
      await apiFetch(`/api/teams/${equipa.slug}/pedir-entrada`, { method: 'DELETE' });
      setEquipas((cur) => cur.map((t) => (t.slug === equipa.slug ? { ...t, pedido_pendente: false } : t)));
      setToast({ tipo: 'info', mensagem: 'Pedido cancelado.' });
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app-shell">
      <Topbar hud="RADAR DE PELADAS" back="/home" />
      <main className="app-main page-reveal">
        {/* BUSCA por cidade/nome */}
        <div style={{ ...VIDRO, clipPath: CLIP_S, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <Search size={16} color="#8a8a98" />
          <input
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Cidade ou nome do time…"
            style={{ flex: 1, border: 'none', background: 'transparent', color: '#fff', outline: 'none', fontFamily: RAJ, fontSize: 16, fontWeight: 600 }}
          />
        </div>

        {/* GEO opt-in */}
        <button type="button" onClick={pedirGeo} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '11px 14px', border: '1.5px solid rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.06)', cursor: 'pointer', clipPath: CLIP_S, textAlign: 'left', color: 'inherit' }}>
          <MapPin size={16} color="#b69cff" />
          <span style={{ flex: 1 }}>
            <b style={{ fontFamily: RAJ, fontSize: 13, color: '#e4d9ff', letterSpacing: '0.04em', display: 'block' }}>
              {geoPedida ? 'Localização ativa' : 'Usar minha localização'}
            </b>
            <span className="texto-apoio" style={{ marginTop: 2 }}>Opcional. Se recusar, você busca pela cidade. Sua posição nunca sai do celular.</span>
          </span>
        </button>

        {/* Alternativa à permissão do browser: a MINHA cidade (Rodada 29B, D). Da lista (Brasil e Portugal) o ponto vem
            da própria lista, na hora, sem chamada externa; fora dela o botão abaixo a geocodifica NO browser (nunca no
            nosso servidor). A posição resultante fica só em memória. */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: RAJ, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#c9c2d6', marginBottom: 6 }}>…ou escolha sua cidade</div>
          <CampoCidadeLazy
            valor={zona}
            aoMudar={(texto, escolha) => {
              setZona(texto);
              setZonaEscolhida(!!escolha);
              if (escolha) {
                setPosUser({ lat: escolha.lat, lng: escolha.lng });
                setOrigemPos('cidade');
                setCidadeDaPos(texto);
                setGeoPedida(true);
                if (!raio) setRaio(10);
                setToast({ tipo: 'success', mensagem: `Sua zona: ${texto}` });
              }
            }}
            placeholder="Sua cidade (Brasil ou Portugal)"
          />
          {zona.trim() && !zonaEscolhida ? (
            <button type="button" onClick={usarCidade} style={{ width: '100%', marginTop: 8, padding: '9px 12px', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', clipPath: CLIP_S, color: '#c9c2d6', fontFamily: RAJ, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
              Não está na lista? Usar "{zona.trim()}" como minha zona
            </button>
          ) : null}
        </div>

        {/* Raio real — só aparece quando há posição (do browser ou da cidade). */}
        {posUser ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: RAJ, fontSize: 11, letterSpacing: '0.1em', color: '#9a8fc0', textTransform: 'uppercase', marginBottom: 8 }}>
              <span>Raio de busca</span>
              <b style={{ color: '#f0c94a', cursor: 'pointer' }} onClick={() => setRaio(null)}>{raio ? `${raio} km · limpar ✕` : 'sem filtro'}</b>
            </div>
            <div className="chips-row">
              {RAIOS.map((r) => (
                <button key={r} type="button" className={`chip ${raio === r ? 'chip--active' : ''}`} onClick={() => setRaio(r)}>{r} km</button>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 12, letterSpacing: '0.14em', color: '#9a8fc0', textTransform: 'uppercase', margin: '20px 2px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 29I (achado 106): a lista traz times de entrada aberta E times com aprovação (com o botão PEDIR ENTRADA); o título antigo prometia só os abertos. */}
          {tituloDoRadar({ origem: origemPos, cidade: cidadeDaPos })} · {filtradas.length}
          <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(139,92,246,0.4), transparent)' }} />
        </div>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtradas.length === 0 ? (
          <div style={{ ...VIDRO, clipPath: CLIP, textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
            {pesquisa ? 'Nenhum time encontrado.' : 'Ainda não há times públicos.'}
          </div>
        ) : (
          filtradas.map((equipa) => (
            <CardDoTime
              key={equipa.id}
              equipa={equipa}
              busy={busy}
              // Quem já é membro vai direto ao time (como sempre foi); quem ainda não é abre o pop-up com tudo (29T, achado 157).
              aoTocar={(e) => (e.ja_membro ? navigate(`/time/${e.slug}`) : setAberto(e.slug))}
              aoPedir={pedirEntrada}
              aoCancelar={cancelarPedido}
            />
          ))
        )}

        <p className="texto-apoio" style={{ marginTop: 16 }}>
          Distância medida do ponto aproximado do time, nunca de pessoas.
        </p>
      </main>
      {equipaAberta ? <PopupDoTime equipa={equipaAberta} busy={busy} aoPedir={pedirEntrada} aoCancelar={cancelarPedido} aoFechar={() => setAberto(null)} /> : null}
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
