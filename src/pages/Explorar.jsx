// Futty v2.0 — Explorar peladas (/explorar) no cânone: busca por cidade + lista de
// equipas abertas com escudo/estado. CICLO DO PEDIDO v1 (sem push): pedir → PENDENTE
// visível (✓ + cancelar) → admin decide no hub → o desfecho aparece no Início.
// Raio/geolocalização: UI presente mas DORMENTE — as distâncias chegam quando as
// equipas declararem o ponto aproximado (opt-in do admin, fase Segurança; a posição
// do utilizador nunca sai do dispositivo). Regra na SPEC-EQUIPAS §b.
import { Search, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import Topbar from '../components/Topbar';
import EscudoEquipa from '../components/EscudoEquipa';
import Toast from '../components/Toast';
import { plural } from '../utils/plural';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };

function SkeletonCard() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', clipPath: CLIP, height: 68, marginBottom: 8 }}>
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

export default function Explorar() {
  const navigate = useNavigate();
  const [equipas, setEquipas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [geoPedida, setGeoPedida] = useState(false);
  const [posUser, setPosUser] = useState(null); // {lat,lng} SÓ em memória — nunca enviada/guardada
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

  const filtradasTexto = equipas.filter(
    (e) =>
      e.nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
      (e.localizacao || '').toLowerCase().includes(pesquisa.toLowerCase())
  );
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
      setToast({ tipo: 'info', mensagem: 'Seu dispositivo não expõe localização.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        // A posição fica SÓ em memória (React state) — nunca é enviada ao servidor nem guardada.
        setPosUser({ lat: p.coords.latitude, lng: p.coords.longitude });
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
    const cidade = pesquisa.trim();
    if (!cidade) { setToast({ tipo: 'info', mensagem: 'Escreva sua cidade na busca acima.' }); return; }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cidade)}`, { headers: { Accept: 'application/json' } });
      const arr = await r.json();
      if (Array.isArray(arr) && arr[0]) {
        setPosUser({ lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) });
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
      setEquipas((cur) => cur.map((t) => (t.slug === equipa.slug ? { ...t, ja_membro: entrou || t.ja_membro, pedido_pendente: !entrou } : t)));
      setToast({ tipo: 'success', mensagem: entrou ? 'Você entrou no time!' : 'Pedido enviado! O admin vai decidir e você vê o desfecho no Início.' });
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
      <Topbar hud="EXPLORAR PELADAS" back="/home" />
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
            <span style={{ fontSize: 10, color: '#9a8fc0' }}>opt-in: se recusar, você busca por cidade; sua posição nunca sai do celular</span>
          </span>
        </button>

        {/* Alternativa à permissão do browser: usar a cidade escrita (geocodificada NO
            browser, nunca no nosso servidor). */}
        <button type="button" onClick={usarCidade} style={{ width: '100%', marginTop: 8, padding: '9px 12px', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', clipPath: CLIP_S, color: '#c9c2d6', fontFamily: RAJ, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
          …ou usar a cidade escrita acima como minha zona
        </button>

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
          Times abertos · {filtradas.length}
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
            <div
              key={equipa.id}
              style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, cursor: equipa.ja_membro ? 'pointer' : undefined }}
              onClick={equipa.ja_membro ? () => navigate(`/equipa/${equipa.slug}`) : undefined}
            >
              <EscudoEquipa team={equipa} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{equipa.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {equipa.dist != null ? <b style={{ color: '#b69cff' }}>a {equipa.dist < 1 ? '<1' : Math.round(equipa.dist)} km · </b> : ''}
                  {equipa.cidade ? `${equipa.cidade} · ` : equipa.localizacao ? `${equipa.localizacao} · ` : ''}
                  {equipa.membro_count} {plural(equipa.membro_count, 'membro', 'membros')} · {equipa.modo_visibilidade === 'publico_aberto' ? 'aberto' : 'com aprovação'}
                </div>
              </div>
              {equipa.ja_membro ? (
                <span style={{ flexShrink: 0, fontFamily: RAJ, fontSize: 11, fontWeight: 800, color: '#7bd88f', letterSpacing: '0.06em' }}>Você já é membro</span>
              ) : equipa.pedido_pendente ? (
                <div style={{ display: 'grid', gap: 4, justifyItems: 'end', flexShrink: 0 }}>
                  <span style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 800, color: '#b69cff', letterSpacing: '0.06em' }}>Pedido enviado ✓</span>
                  {/* P3-16 — alvo mínimo 44px para o polegar (antes 10px sem padding). */}
                  <button type="button" disabled={busy === equipa.slug} onClick={() => cancelarPedido(equipa)} style={{ background: 'none', border: 'none', color: '#8a8398', fontFamily: RAJ, fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 6px', margin: '-6px -6px -6px 0' }}>
                    cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy === equipa.slug}
                  onClick={() => pedirEntrada(equipa)}
                  style={{ flexShrink: 0, fontFamily: RAJ, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 14px', cursor: 'pointer', clipPath: CLIP_S, color: equipa.modo_visibilidade === 'publico_aberto' ? '#7bd88f' : '#f0c94a', border: equipa.modo_visibilidade === 'publico_aberto' ? '1.5px solid rgba(123,216,143,0.5)' : '1.5px solid #d4a017', background: equipa.modo_visibilidade === 'publico_aberto' ? 'rgba(123,216,143,0.06)' : 'rgba(30,24,8,0.9)' }}
                >
                  {equipa.modo_visibilidade === 'publico_aberto' ? 'Entrar' : 'Pedir entrada'}
                </button>
              )}
            </div>
          ))
        )}

        <p style={{ fontSize: 10, color: '#8a8a98', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          a distância será sempre do TIME (ponto aproximado declarado pelo admin), nunca de pessoas
        </p>
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
