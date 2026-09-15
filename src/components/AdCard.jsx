// Futty v2.0 — Card de publicidade REAL: consome /api/ads?pagina=X (serving do Gabinete,
// com filtro etário fail-closed + toggle por página no servidor). Conta impressão (ao
// aparecer) e clique (ao tocar) via /api/ads/evento. Sem campanha elegível OU página OFF
// → não renderiza nada. Variants: 'native' (Início/feed) e 'banner' (sorteio).
//
// Dentro do Início (pagina='inicio', InicioProvider montado — ver Layout.jsx),
// o anúncio já veio dentro de GET /api/inicio (11-set, "1 pedido só") — lê de lá
// em vez de disparar o seu próprio GET /api/ads. O POST /api/ads/evento de
// impressão/clique mantém-se sempre, para qualquer origem do anúncio.
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useInicio } from '../context/InicioContext';
import { urlImagem } from '../utils/avatar';
import Icon from './Icon';

const BASE = {
  position: 'relative', width: '100%', overflow: 'hidden', background: '#0d0d12',
  border: '1px solid rgba(212,160,23,0.06)', borderLeft: '2px solid rgba(212,160,23,0.3)',
};

/**
 * `ad`/`prontoExterno` (Velocidade 6B, 15-set): quando a tela já pediu o anúncio
 * no seu topo — em paralelo com os dados dela, em vez de esperar por eles — passa-o
 * por prop e este componente não pede nada. Sem prop, mantém o comportamento
 * antigo (pede sozinho ao montar).
 */
export default function AdCard({ pagina = 'inicio', variant = 'native', ad: adProp = undefined, prontoExterno = undefined }) {
  const inicio = useInicio(); // não-null só dentro do /home (ver Layout.jsx)
  const vemDeFora = adProp !== undefined;
  const usaDoInicio = !vemDeFora && inicio !== null && pagina === 'inicio';

  const [adProprio, setAdProprio] = useState(null);
  const [prontoProprio, setProntoProprio] = useState(false);
  const impRef = useRef(null);

  useEffect(() => {
    if (usaDoInicio || vemDeFora) return undefined; // já há anúncio — não duplica o pedido
    let vivo = true;
    apiFetch(`/api/ads?pagina=${encodeURIComponent(pagina)}`)
      .then((r) => { if (vivo) { setAdProprio(r?.ad || null); setProntoProprio(true); } })
      .catch(() => { if (vivo) setProntoProprio(true); });
    return () => { vivo = false; };
  }, [pagina, usaDoInicio, vemDeFora]);

  const ad = vemDeFora ? adProp : usaDoInicio ? inicio.dados?.ad?.ad ?? null : adProprio;
  const pronto = vemDeFora ? (prontoExterno ?? true) : usaDoInicio ? !inicio.carregando : prontoProprio;

  useEffect(() => {
    if (ad && ad.id && impRef.current !== ad.id) {
      impRef.current = ad.id; // conta 1 impressão por anúncio servido
      apiFetch('/api/ads/evento', { method: 'POST', body: JSON.stringify({ id: ad.id, tipo: 'imp' }) }).catch(() => {});
    }
  }, [ad]);

  if (!pronto || !ad) return null; // página OFF ou sem campanha → nada

  const box = variant === 'banner'
    ? { ...BASE, height: 72, borderRadius: 10, boxShadow: '0 -4px 20px rgba(0,0,0,0.6)' }
    : { ...BASE, height: 100, borderRadius: 8 };

  const clicar = () => {
    apiFetch('/api/ads/evento', { method: 'POST', body: JSON.stringify({ id: ad.id, tipo: 'cli' }) }).catch(() => {});
    if (ad.link) window.open(ad.link, '_blank', 'noopener');
  };

  const conteudo = ad.imagem_url ? (
    // A imagem da campanha costuma ser de outra origem — urlImagem devolve-a
    // intacta, mas se um dia a campanha vier do nosso Storage já pede o tamanho certo.
    <img src={urlImagem(ad.imagem_url, 512)} alt={ad.texto || ''} width={390} height={100} decoding="async" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: '100%', padding: '0 14px', boxSizing: 'border-box' }}>
      <Icon name="anuncio" size={22} color="#d4a017" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 14, color: '#f0e6c8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.texto}</div>
        <div style={{ fontSize: 11, color: '#8a8a98', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.sub}</div>
      </div>
      {ad.cta ? <span style={{ flexShrink: 0, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, color: '#f0c94a', border: '1px solid rgba(212,160,23,.5)', padding: '6px 11px', borderRadius: 6 }}>{ad.cta}</span> : null}
    </div>
  );

  return (
    <div style={box}>
      <button type="button" onClick={clicar} style={{ display: 'block', width: '100%', height: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
        {conteudo}
      </button>
      <span style={{ position: 'absolute', top: 0, right: 0, fontSize: 8, letterSpacing: '.08em', color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '0 8px 0 4px', textTransform: 'uppercase' }}>
        Publicidade
      </span>
    </div>
  );
}
