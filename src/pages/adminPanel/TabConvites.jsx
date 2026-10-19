// Futty v2.0 — Os convites e os pedidos para entrar, na aba ELENCO do admin.

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { ORIGEM_DO_SITE } from '../../lib/linkDoSite';
import { contar } from '../../utils/plural';
import LoadingFutty from '../../components/LoadingFutty';
import { inputStyle } from '../../components/camposDoAdmin';
import { linkDoConvite } from '../../utils/convite';
import { CARD, diasAte, haQuantoTempo, textoDeApoio } from './comum';
import { ConfirmModal } from './pecas';

// ─── TAB: CONVITES ───────────────────────────────────────────────────────────
function TabConvites({ slug, nomeTime = null, showToast, semBotao = false }) {
  const [convites, setConvites] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [novoLink, setNovoLink] = useState('');
  const [revogar, setRevogar] = useState(null);

  function recarregar() {
    return apiFetch(`/api/teams/${slug}/convites`)
      .then((d) => setConvites(d.convites || []))
      .catch((e) => {
        setConvites([]);
        showToast(e.message, 'error');
      });
  }

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/convites`)
      .then((d) => ativo && setConvites(d.convites || []))
      .catch((e) => ativo && (setConvites([]), showToast(e.message, 'error')));
    return () => {
      ativo = false;
    };
  }, [slug, showToast]);

  // O link curto com o nome do time (/c/<nome>-<código>) quando o motor deu um código; senão o longo.
  function linkDe(token, codigo) {
    return linkDoConvite({ origem: ORIGEM_DO_SITE, token, codigo, nomeTime });
  }

  async function gerar() {
    if (gerando) return;
    setGerando(true);
    try {
      const { token, codigo } = await apiFetch(`/api/teams/${slug}/convite`, { method: 'POST' });
      setNovoLink(linkDe(token, codigo));
      await recarregar();
      showToast('Convite gerado.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setGerando(false);
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      showToast('Link copiado.');
    } catch {
      showToast('Não deu para copiar. Copie o link à mão.', 'error');
    }
  }

  async function confirmarRevogar(c) {
    try {
      await apiFetch(`/api/teams/${slug}/convites/${c.id}`, { method: 'DELETE' });
      setConvites((cur) => cur.filter((x) => x.id !== c.id));
      showToast('Convite revogado.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (convites === null) return <LoadingFutty />;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {semBotao ? null : (
        <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={gerando} onClick={gerar}>
          {gerando ? 'Gerando…' : '＋ Gerar novo convite'}
        </button>
      )}

      {novoLink ? (
        <div style={{ ...CARD, padding: 12, borderColor: 'rgba(139,92,246,0.4)' }}>
          <div style={{ fontSize: 11, color: 'var(--neon)', fontWeight: 800, marginBottom: 6 }}>NOVO LINK</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input readOnly value={novoLink} onFocus={(e) => e.target.select()} style={{ ...inputStyle, flex: 1 }} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => copiar(novoLink)}>Copiar</button>
          </div>
        </div>
      ) : null}

      {convites.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Nenhum link de convite ativo.</p>
      ) : (
        convites.map((c) => (
          <div key={c.id} style={{ ...CARD, padding: 12, display: 'grid', gap: 8 }}>
            <div style={textoDeApoio}>
              Criado por <b style={{ color: '#fff' }}>{c.criado_por_nome || 'alguém'}</b> · {haQuantoTempo(c.created_at)}
            </div>
            <div style={textoDeApoio}>Expira em {contar(diasAte(c.expires_at), 'dia', 'dias')}</div>
            <div style={textoDeApoio}>
              {c.usos > 0 ? `${c.usos} ${c.usos === 1 ? 'entrou' : 'entraram'} por este link` : 'ninguém entrou ainda'}
            </div>
            {/* O link curto leva o nome do time na frente e o código no fim: quebra a linha em vez de cortar — o código é o que difere. */}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
              {c.codigo ? linkDe(c.token, c.codigo).replace(/^https?:\/\//, '') : `${linkDe(c.token).slice(0, 20)}…`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => copiar(linkDe(c.token, c.codigo))}>Copiar link</button>
              <button type="button" className="btn btn--ghost btn--sm" style={{ borderColor: 'var(--danger)', color: '#fda4af' }} onClick={() => setRevogar(c)}>Revogar</button>
            </div>
          </div>
        ))
      )}

      {revogar ? (
        <ConfirmModal
          texto="Revogar este convite? O link deixa de funcionar."
          perigo
          confirmarLabel="Revogar"
          onConfirm={() => { const c = revogar; setRevogar(null); confirmarRevogar(c); }}
          onCancel={() => setRevogar(null)}
        />
      ) : null}
    </div>
  );
}

export { TabConvites };
