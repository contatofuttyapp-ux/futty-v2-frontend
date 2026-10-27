// Futty v2.0 — O cartão "Mensalidade" do Painel do time (só o admin). Desligada por padrão. Ligada, o admin escreve o valor (texto livre,
// ex.: "R$ 60"), o dia do vencimento, o jeito de pagar (um link vira o botão "Pagar"; qualquer outro texto ganha o "Copiar"), se a lista
// aparece para o time e se sai o lembrete no vencimento. O app não mexe em dinheiro: nada aqui é chave Pix nem integração com banco.
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { jeitoDePagar } from '../../utils/mensalidade';
import { CARD, rotuloECampo, textoDeApoio } from '../adminPanel/comum';
import { Interruptor } from '../adminPanel/pecas';

const LIMITE_VALOR = 40;
const LIMITE_COMO_PAGAR = 300;
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);
const lbl = { fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' };
const campo = { width: '100%', boxSizing: 'border-box' };

export default function AjustesDaMensalidade({ slug, showToast, onMudou }) {
  const [cfg, setCfg] = useState(null);
  const [disponivel, setDisponivel] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    apiFetch(`/api/teams/${slug}/mensalidade`)
      .then((d) => { if (ativo) { setCfg(d.config); setDisponivel(d.disponivel !== false); } })
      .catch((e) => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [slug]);

  // Quem chega pelo convite "Controle a mensalidade do time" (…?aba=ajustes#mensalidade) cai direto aqui, depois de o cartão existir.
  useEffect(() => {
    if (cfg && window.location.hash === '#mensalidade') document.getElementById('mensalidade')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [cfg]);

  if (erro) return <div className="alert alert--error">{erro}</div>;
  if (!cfg) return <div style={{ ...CARD, padding: 14 }} className="texto-apoio">Carregando…</div>;
  if (!disponivel) return <div style={{ ...CARD, padding: 14, fontSize: 13 }} data-mensalidade-indisponivel>A mensalidade ainda não está disponível. Tente de novo mais tarde.</div>;

  async function salvar(mudancas) {
    setSalvando(true);
    try {
      const r = await apiFetch(`/api/teams/${slug}/mensalidade/ajustes`, { method: 'PUT', body: JSON.stringify(mudancas) });
      const ligouOuDesligou = 'ativa' in mudancas && mudancas.ativa !== cfg.ativa;
      setCfg(r.config);
      showToast(ligouOuDesligou ? (r.config.ativa ? 'Mensalidade ligada: a aba já aparece no time.' : 'Mensalidade desligada.') : 'Mensalidade salva.');
      if (ligouOuDesligou) onMudou?.(); // a aba Mensalidade aparece/some na página do time
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSalvando(false);
    }
  }

  const jeito = jeitoDePagar(cfg.como_pagar);

  return (
    <div data-ajustes-mensalidade style={{ ...CARD, padding: 14, display: 'grid', gap: 14 }}>
      <Interruptor ligado={cfg.ativa} rotulo="Controlar a mensalidade pelo app" apoio="Uma lista de quem pagou e quem não pagou, por mês. O app não cobra nem recebe dinheiro." aoTrocar={(v) => salvar({ ativa: v })} />
      {cfg.ativa ? (
        <>
          <label style={rotuloECampo}>
            <span style={lbl}>Valor</span>
            <input className="input input--hud" data-campo-valor value={cfg.valor || ''} maxLength={LIMITE_VALOR} placeholder="Ex.: R$ 60" onChange={(e) => setCfg((c) => ({ ...c, valor: e.target.value.slice(0, LIMITE_VALOR) }))} style={campo} />
          </label>
          <label style={rotuloECampo}>
            <span style={lbl}>Dia do vencimento</span>
            <select className="input input--hud" data-campo-vencimento value={cfg.dia_vencimento ?? ''} onChange={(e) => setCfg((c) => ({ ...c, dia_vencimento: e.target.value === '' ? null : Number(e.target.value) }))} style={campo}>
              <option value="">Sem dia fixo</option>
              {DIAS.map((d) => <option key={d} value={d}>Dia {d}</option>)}
            </select>
            <span style={textoDeApoio}>No mês que não tem esse dia, vence no último dia do mês.</span>
          </label>
          <label style={rotuloECampo}>
            <span style={lbl}>Como pagar</span>
            <textarea className="input input--hud" data-campo-como-pagar value={cfg.como_pagar || ''} rows={3} maxLength={LIMITE_COMO_PAGAR} placeholder="Ex.: link do PicPay ou do Mercado Pago, ou: Pix para o Zé (11) 99999-9999" onChange={(e) => setCfg((c) => ({ ...c, como_pagar: e.target.value.slice(0, LIMITE_COMO_PAGAR) }))} style={{ ...campo, resize: 'vertical', fontFamily: 'inherit' }} />
            <span style={textoDeApoio} data-previa-como-pagar>
              {jeito?.link
                ? `O time vê o botão "Pagar", que abre ${jeito.link.dominio} fora do app.`
                : jeito
                  ? 'O time vê este texto com o botão "Copiar". Um endereço começando com https:// vira o botão "Pagar".'
                  : 'Um endereço começando com https:// vira o botão "Pagar"; qualquer outro texto aparece com o botão "Copiar".'}
            </span>
          </label>
          <Interruptor ligado={cfg.lista_publica} rotulo="Mostrar a lista para o time" apoio={cfg.lista_publica ? 'Todo mundo vê quem pagou.' : 'Só você vê a lista. Cada jogador vê só o próprio status.'} aoTrocar={(v) => setCfg((c) => ({ ...c, lista_publica: v }))} />
          <Interruptor ligado={cfg.lembrete} rotulo="Lembrete no vencimento" apoio="No dia do vencimento, às 10h, quem está em aberto recebe um aviso no celular." aoTrocar={(v) => setCfg((c) => ({ ...c, lembrete: v }))} />
          <button type="button" data-salvar-mensalidade className="btn btn--primary" style={{ width: '100%' }} disabled={salvando}
            onClick={() => salvar({ valor: cfg.valor, dia_vencimento: cfg.dia_vencimento, como_pagar: cfg.como_pagar, lista_publica: cfg.lista_publica, lembrete: cfg.lembrete })}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      ) : null}
    </div>
  );
}
