// Futty v2.0 — "Recebeu um convite?" no Início de quem ainda não está em nenhum time: um campo para colar o link do convite e "Entrar no time".
//
// Por que existe: quem toca no link do convite sem o app instalado vai à loja, instala e abre o app — e o convite que o navegador guardou
// não está no app (cada um tem o seu armazenamento). A página do convite deixa o link COPIADO ao mandar para a loja (Convite.jsx); aqui ele
// volta. No app, o campo tenta vir preenchido sozinho com o que está na área de transferência (só se for um link de convite). No iPhone ler
// a área de transferência sem um toque é recusado: o campo nasce vazio e "Colar" faz a leitura no toque (o iPhone mostra o balão "Colar",
// que a pessoa confirma). No navegador do computador e do celular não se tenta ler sozinho (o Chrome abriria um pedido de permissão do
// nada); lá o "Colar" e o colar de sempre do campo bastam.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { ehNativo } from '../lib/plataforma';
import { conviteDoTextoColado, pareceConvite } from '../utils/linkColado';

const RAJ = "'Rajdhani', sans-serif";

async function lerAreaDeTransferencia() {
  try {
    return (await navigator.clipboard?.readText?.()) || '';
  } catch {
    return null; // recusado (iPhone sem toque, permissão negada) ou sem a API
  }
}

export default function CartaoConviteColado() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);
  const podeColar = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';

  // No app: o link copiado na página do convite (antes da loja) entra no campo sozinho, se a leitura for permitida e se for um convite.
  useEffect(() => {
    if (!ehNativo() || !podeColar) return undefined;
    let ativo = true;
    lerAreaDeTransferencia().then((t) => {
      if (ativo && t && pareceConvite(t)) setTexto((atual) => atual || t.trim());
    });
    return () => { ativo = false; };
  }, [podeColar]);

  async function colar() {
    setErro('');
    const t = await lerAreaDeTransferencia();
    if (t === null) {
      setErro('Não deu para colar daqui. Toque e segure no campo e escolha Colar.');
      return;
    }
    if (!t.trim()) {
      setErro('Não tem nada copiado. Copie o link do convite no grupo e volte aqui.');
      return;
    }
    setTexto(t.trim());
  }

  async function entrar(e) {
    e.preventDefault();
    if (entrando) return;
    const token = conviteDoTextoColado(texto);
    if (!token) {
      setErro('Esse link não é de um convite do Futty. Confira e cole de novo.');
      return;
    }
    setErro('');
    setEntrando(true);
    try {
      const { team, jaMembro } = await apiFetch(`/api/convite/${encodeURIComponent(token)}/aceitar`, { method: 'POST' });
      // O mesmo destino do "Entrar no time" da página do convite: a página do time, com as boas-vindas para quem acabou de entrar.
      navigate(`/time/${team.slug}`, { replace: true, state: jaMembro ? undefined : { primeiraEntrada: true } });
    } catch (err) {
      setErro(err.message || 'Não deu para entrar agora. Tente de novo.');
      setEntrando(false);
    }
  }

  return (
    <form
      className="hud-corners"
      data-cartao-convite
      onSubmit={entrar}
      style={{ marginTop: 16, padding: '16px 16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.35)', display: 'grid', gap: 10 }}
    >
      <h2 style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 19, margin: 0, color: '#fff' }}>Recebeu um convite?</h2>
      <p className="texto-apoio" style={{ margin: 0 }}>Cole aqui o link do convite do seu time.</p>
      <div style={{ display: 'grid', gridTemplateColumns: podeColar ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr)', gap: 8 }}>
        <input
          className="input input--hud"
          data-link-do-convite
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Link do convite"
          placeholder="futtyapp.com.br/c/…"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setErro(''); }}
          style={{ width: '100%', minWidth: 0 }}
        />
        {podeColar ? (
          <button type="button" className="btn btn--outline btn--hud hud-corners-s" data-colar-convite onClick={colar} style={{ padding: '0 14px' }}>
            Colar
          </button>
        ) : null}
      </div>
      {erro ? <div role="alert" style={{ fontSize: 13, color: '#f8b4b4', lineHeight: 1.45 }}>{erro}</div> : null}
      <button type="submit" className="btn btn--purple btn--hud hud-corners-s" data-entrar-pelo-link disabled={entrando || !texto.trim()}>
        {entrando ? 'Entrando…' : 'Entrar no time'}
      </button>
    </form>
  );
}
