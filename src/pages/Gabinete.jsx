// Futty v2.0 — Gabinete do Dono (/gabinete). UMA página de abas, desktop primeiro (menu lateral de abas
// à esquerda, conteúdo largo à direita, tabelas sem esconder colunas). No celular as abas viram scroll
// horizontal no topo (PAINEL-E-CUSTOS.md secção 6).
//
// Um pedido só (GET /resumo) alimenta Visão geral/Dinheiro/Segurança/Registros; Pessoas & times e
// Anúncios usam os endpoints próprios (paginação e ações; campanhas com métricas ao vivo). Anúncios é
// aba própria (interruptor geral + interruptores por página + campanhas + receita), Burn & margem fica
// no fim de Dinheiro e Cobertura de venda tem aba própria. Só ficam atrás da flag MOSTRAR_AVANCADO:
// DPAs por operador e Documentos & canal do titular (aba Segurança) e MRR (sem cartão próprio, sem
// fonte real ainda).
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import LoadingFutty from '../components/LoadingFutty';
import Toast from '../components/Toast';
import PessoasTimes from './gabinete/PessoasTimes';
import ContasSemTime from './gabinete/ContasSemTime';
import Brilhantes from './gabinete/Brilhantes';
import Velocidade from './gabinete/Velocidade';
import AviseMeLista from './gabinete/AviseMe';
import { useIndicadorDeRolagem } from '../hooks/useIndicadorDeRolagem';
import { AbaVisaoGeral } from './gabinete/AbaVisaoGeral';
import { AbaDinheiro } from './gabinete/AbaDinheiro';
import { AbaAnuncios } from './gabinete/AbaAnuncios';
import { AbaSeguranca } from './gabinete/AbaSeguranca';
import { AbaRegistros } from './gabinete/AbaRegistros';
import { AbaCobertura } from './gabinete/AbaCobertura';

const ABAS = [
  { k: 'visao', label: 'Visão geral' },
  { k: 'pessoas', label: 'Pessoas & times' },
  { k: 'sem-time', label: 'Contas sem time' },
  { k: 'brilhantes', label: 'Figurinhas' },
  { k: 'velocidade', label: 'Velocidade' },
  { k: 'avise', label: 'Avise-me' },
  { k: 'dinheiro', label: 'Dinheiro' },
  { k: 'anuncios', label: 'Anúncios' },
  { k: 'seguranca', label: 'Segurança' },
  { k: 'registros', label: 'Registros & prazos' },
  { k: 'cobertura', label: 'Cobertura' },
];

export default function Gabinete() {
  const [searchParams, setSearchParams] = useSearchParams();
  const aba = ABAS.some((a) => a.k === searchParams.get('aba')) ? searchParams.get('aba') : 'visao';
  // No celular as abas viram uma faixa que rola; a borda esmaece onde há mais abas escondidas.
  const { aoMontar: montarFaixaDeAbas, esquerda: abasEscondidasEsq, direita: abasEscondidasDir } = useIndicadorDeRolagem();

  const [dados, setDados] = useState(null); // /resumo
  const [op, setOp] = useState(null); // /operacao (objeto completo, para PUT seguro)
  const [pub, setPub] = useState(null); // /publicidade (campanhas + métricas)
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(null);

  // Cópias editáveis locais (só vão ao servidor no "Salvar" de cada bloco).
  const [custos, setCustos] = useState(null);
  const [registros, setRegistros] = useState(null);
  const [acessos, setAcessos] = useState(null);
  const [segManual, setSegManual] = useState(null);
  const [cobertura, setCobertura] = useState(null);
  const [cambio, setCambio] = useState(null);

  function carregar() {
    return Promise.all([
      apiFetch('/api/super/gabinete/resumo'),
      apiFetch('/api/super/gabinete/operacao'),
      apiFetch('/api/super/gabinete/publicidade').catch(() => null),
    ]).then(([r, o, p]) => {
      setDados(r); setOp(o); setPub(p);
      setCustos(o.custos_fixos || []);
      setRegistros(o.registros || []);
      setAcessos(o.acessos || []);
      setSegManual(o.seguranca_manual || { testes_permissao: {}, npm_audit: {}, ultima_auditoria: {} });
      setCobertura(o.cobertura || { vende: [], bloqueado: [] });
      setCambio(o.cambio_usd_eur ?? 0.86);
    });
  }

  useEffect(() => {
    let vivo = true;
    carregar().catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, []);

  function irAba(k) {
    setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('aba', k); return p; });
  }
  function showMsg(mensagem, erroToast = false) {
    setToast({ tipo: erroToast ? 'error' : 'success', mensagem });
  }

  // PUT seguro: sempre manda o objeto `op` completo com só o campo alterado
  // trocado — omitir os outros no PUT apagava campanhas/toggles/proteção de
  // dados (gravar() no backend não tem memória do que já existia).
  async function salvarParcial(campo, valor) {
    const proximo = { ...op, [campo]: valor };
    try {
      const salvo = await apiFetch('/api/super/gabinete/operacao', { method: 'PUT', body: JSON.stringify(proximo) });
      setOp(salvo);
      showMsg('Salvo.');
      return salvo;
    } catch (e) {
      showMsg(e.message, true);
      return null;
    }
  }

  if (erro) return <div className="app-shell"><main className="app-main" style={{ padding: 24 }}><p className="muted">{erro}</p><Link to="/home" className="muted">← Início</Link></main></div>;
  if (!dados || !op || !custos || !registros || !acessos || !segManual || !cobertura || cambio == null) return <LoadingFutty legenda="Carregando o Gabinete…" />;

  return (
    <div className="app-shell">
      <GabCSS />
      <main className="app-main gab2-main" style={{ maxWidth: 1320, padding: 0 }}>
        {/* O bloco dos links nunca parte ao meio (cada link numa linha só) e, sem largura (em 390 px o título e
            os dois links não cabem numa linha), desce inteiro para baixo do título. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: 12, rowGap: 6, padding: '20px 20px 0' }}>
          <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 26, margin: 0, whiteSpace: 'nowrap' }}>Gabinete <span style={{ color: '#f0c94a' }}>do Dono</span></h1>
          <span data-links-do-gabinete style={{ display: 'flex', gap: 14, alignItems: 'baseline', whiteSpace: 'nowrap' }}>
            {/* A caixa-preta DESTE aparelho mora aqui, e não no Perfil de todo mundo. */}
            <Link to="/diagnostico" style={{ fontSize: 12, color: 'var(--text-dim)', textDecoration: 'none' }}>Diagnóstico deste aparelho</Link>
            <Link to="/home" style={{ fontSize: 12, color: 'var(--text-dim)', textDecoration: 'none' }}>← Início</Link>
          </span>
        </div>

        <div className="gab2">
          <nav className="gab2-side" ref={montarFaixaDeAbas} data-mais-esq={abasEscondidasEsq ? '1' : undefined} data-mais-dir={abasEscondidasDir ? '1' : undefined}>
            {ABAS.map((a) => (
              <button key={a.k} type="button" className={`gab2-tab ${aba === a.k ? 'ativa' : ''}`} onClick={() => irAba(a.k)}>
                {a.label}
              </button>
            ))}
          </nav>

          <div className="gab2-content">
            {aba === 'visao' && <AbaVisaoGeral dados={dados} />}
            {aba === 'pessoas' && <PessoasTimes showMsg={showMsg} />}
            {aba === 'sem-time' && <ContasSemTime showMsg={showMsg} />}
            {aba === 'brilhantes' && <Brilhantes showMsg={showMsg} />}
            {aba === 'velocidade' && <Velocidade />}
            {aba === 'avise' && <AviseMeLista showMsg={showMsg} />}
            {aba === 'dinheiro' && (
              <AbaDinheiro
                dados={dados}
                custos={custos} setCustos={setCustos}
                onSalvarCustos={() => salvarParcial('custos_fixos', custos)}
                cambio={cambio} setCambio={setCambio}
                onSalvarCambio={() => salvarParcial('cambio_usd_eur', cambio)}
              />
            )}
            {aba === 'anuncios' && (
              <AbaAnuncios
                op={op} pub={pub}
                onSalvarOp={async (campo, valor) => { const salvo = await salvarParcial(campo, valor); const p = await apiFetch('/api/super/gabinete/publicidade').catch(() => null); if (p) setPub(p); return salvo; }}
              />
            )}
            {aba === 'seguranca' && (
              <AbaSeguranca
                dados={dados} segManual={segManual} setSegManual={setSegManual}
                onSalvar={() => salvarParcial('seguranca_manual', segManual)}
                op={op} onSalvarOp={salvarParcial}
              />
            )}
            {aba === 'registros' && (
              <AbaRegistros
                registros={registros} setRegistros={setRegistros} onSalvarRegistros={() => salvarParcial('registros', registros)}
                acessos={acessos} setAcessos={setAcessos} onSalvarAcessos={() => salvarParcial('acessos', acessos)}
                showMsg={showMsg}
              />
            )}
            {aba === 'cobertura' && (
              <AbaCobertura cobertura={cobertura} setCobertura={setCobertura} onSalvar={() => salvarParcial('cobertura', cobertura)} />
            )}
          </div>
        </div>
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function GabCSS() {
  return (
    <style>{`
    .gab2 { display: flex; align-items: flex-start; gap: 0; padding: 16px 20px 60px; }
    .gab2-side { flex: 0 0 190px; position: sticky; top: 12px; display: flex; flex-direction: column; gap: 4px; padding-right: 14px; border-right: 1px solid rgba(255,255,255,.08); }
    .gab2-tab { text-align: left; padding: 10px 12px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text-dim); font-size: 13px; font-weight: 700; cursor: pointer; }
    .gab2-tab.ativa { background: rgba(212,160,23,.1); border-color: rgba(212,160,23,.4); color: #f0c94a; }
    .gab2-content { flex: 1; min-width: 0; padding-left: 20px; }
    @media (max-width: 820px) {
      /* Rodada 28: sem o flex: 0 0 auto abaixo, os 190px da coluna do computador viravam ALTURA no celular (abas de ~180 px). */
      .gab2 { flex-direction: column; padding: 12px 14px 50px; }
      .gab2-side { flex: 0 0 auto; flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid rgba(255,255,255,.08); padding: 0 0 10px; position: static; width: 100%; box-sizing: border-box; }
      .gab2-tab { flex: 0 0 auto; white-space: nowrap; }
      .gab2-content { padding-left: 0; padding-top: 14px; width: 100%; }
    }
    `}</style>
  );
}
