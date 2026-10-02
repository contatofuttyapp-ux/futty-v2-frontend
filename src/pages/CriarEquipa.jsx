// Futty v2.0 — Criar equipa: o WIZARD do admin (4 passos, SPEC-EQUIPAS v2).
// A página antiga (formulário único com selector de cor) morreu: a cor é fallback
// automático interno (o backend cai para 'verde'; muda-se nas definições do admin).
// Passos: (1) nome + preview do escudo-iniciais ao vivo → POST /api/teams ·
// (2) toggles "como funciona" (mostrar_gols, artilheiro e destaque do dia persistem — 29H, item 44: antes os dois últimos
// eram chaves apagadas) · (3) política de entrada → PATCH modo_visibilidade · (4) convites (link curto + WhatsApp).
// 29H: o texto do papel acompanha a opção (43); textos de entrada aprovados pelo dono (45); o aviso do "só organizo" que
// ficava num toast de 2 s ilegível (46) virou texto fixo na tela do passo 4; bairro opcional (42); a frase do WhatsApp (47)
// e o link curto /c/<código> (49).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiUpload } from '../lib/api';
import Topbar from '../components/Topbar';
import Toast from '../components/Toast';
import { avisoLogoRecusado, motivoDoLogo } from '../utils/logoTime';
import { copiarTexto } from '../utils/clipboard';
import { enderecoDoWhatsapp, linkDoConvite } from '../utils/convite';
import CampoCidadeLazy from '../components/CampoCidadeLazy';
import { EscolhaPapel } from '../components/EscolhaLinhaGol';
import CampoBairro from '../components/CampoBairro';
import { avisoDaCidade } from '../utils/cidades';
import { TEXTO_APOIO_BAIRRO, avisoDoBairro, concelhoDePortugal } from '../utils/freguesias';
import '../styles/app.css';

const RAJ = "'Rajdhani', sans-serif";
const CLIP_S = 'polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px)';
const CLIP = 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)';
const VIDRO = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' };

const iniciais = (s) => s.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

function Cta({ children, cheio, sec, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: RAJ, fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '13px 20px', cursor: 'pointer', width: '100%', clipPath: CLIP_S,
        color: cheio ? '#1a1408' : sec ? '#c9c2d6' : '#f0c94a',
        background: cheio ? 'linear-gradient(180deg,#f0c94a,#d4a017)' : sec ? 'rgba(255,255,255,0.03)' : 'rgba(30,24,8,0.9)',
        border: cheio ? '1px solid #f4dd6a' : sec ? '1.5px solid rgba(255,255,255,0.25)' : '1.5px solid #d4a017',
        opacity: rest.disabled ? 0.5 : 1,
        ...(rest.style || {}),
      }}
    >
      {children}
    </button>
  );
}

function Lbl({ children }) {
  return <span style={{ fontFamily: RAJ, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#9a8fc0', textTransform: 'uppercase', display: 'block', margin: '14px 0 6px' }}>{children}</span>;
}

// Mini-radar do preview (5 ou 3 eixos) — o efeito do toggle mostrar_gols.
function MiniRadar({ n }) {
  const R = 20, cx = 27, cy = 27;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    return [cx + Math.cos(a) * R, cy + Math.sin(a) * R].join(',');
  }).join(' ');
  return (
    <svg viewBox="0 0 54 54" style={{ width: 54, height: 54, flexShrink: 0 }}>
      <polygon points={pts} fill="rgba(139,92,246,0.25)" stroke="#8b5cf6" strokeWidth="1.5" />
    </svg>
  );
}

function Toggle({ on, onClick, disabled, rotulo }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} aria-label={rotulo} style={{ width: 38, height: 20, borderRadius: 20, background: on ? 'rgba(212,160,23,0.55)' : 'rgba(255,255,255,0.12)', position: 'relative', flexShrink: 0, cursor: disabled ? 'default' : 'pointer', border: 'none', opacity: disabled ? 0.45 : 1 }}>
      <i style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: on ? '#f0c94a' : '#fff', transition: 'left .2s' }} />
    </button>
  );
}

export default function CriarEquipa() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  // Rodada 29B (D): a escolha da lista ({ cidade, uf, pais, lat, lng, origem: 'lista' }) — null enquanto a pessoa digita.
  const [cidadeEscolha, setCidadeEscolha] = useState(null);
  const [avisoCidade, setAvisoCidade] = useState(null); // depois de criar: { tipo: 'ok' | 'aviso', texto } sobre a cidade
  // 29H (item 12): o bairro opcional. `bairroEscolha` é a freguesia da lista (Portugal), com a coordenada; null enquanto digita.
  const [bairro, setBairro] = useState('');
  const [bairroEscolha, setBairroEscolha] = useState(null);
  const [avisoBairro, setAvisoBairro] = useState(null); // depois de criar: "Encontramos: <bairro>, <cidade>" ou o aviso
  const [mostrarGols, setMostrarGols] = useState(true);
  const [mostrarArtilheiro, setMostrarArtilheiro] = useState(true); // 29H (item 44): "Artilheiro do dia"
  const [mostrarDestaque, setMostrarDestaque] = useState(true); // 29H (item 44): "Destaque do dia"
  const [avisoPapel, setAvisoPapel] = useState(''); // depois de criar: o que não pôde ser gravado (texto fixo, não toast)
  const [joga, setJoga] = useState(true); // Rodada 29B (E): "Eu jogo" (padrão) / "Só organizo o time"
  const [modo, setModo] = useState('privado'); // privado | publico_aprovacao | publico_aberto
  const [team, setTeam] = useState(null); // criada no fim do passo 3
  const [logoArquivo, setLogoArquivo] = useState(null);
  const [logoPrevia, setLogoPrevia] = useState(null);
  const [avisoLogo, setAvisoLogo] = useState(''); // depois de criar: a moderação recusou o logo (o time nasceu igual)
  const [logoEnviado, setLogoEnviado] = useState(false);
  const logoInputRef = useRef(null);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!logoArquivo) return undefined;
    const url = URL.createObjectURL(logoArquivo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a prévia é um object URL: nasce e é solto aqui
    setLogoPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [logoArquivo]);

  function aoEscolherLogo(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const motivo = motivoDoLogo(arquivo);
    if (motivo) {
      setToast({ tipo: 'error', mensagem: motivo });
      return;
    }
    setLogoArquivo(arquivo);
  }

  function tirarLogo() {
    setLogoArquivo(null);
    setLogoPrevia(null);
  }

  // Passo 3 → cria a equipa de uma vez (nome+cidade → POST; flags → PATCH) e segue p/ convites.
  async function criarESeguir() {
    if (busy) return;
    // Cidade é obrigatória em times públicos (14-set): é como jogadores perto
    // encontram o time no Explorar/distância. No privado fica opcional. Manda
    // de volta ao passo 1 (onde fica o campo) com um toast claro.
    if (modo !== 'privado' && !cidade.trim()) {
      setToast({ tipo: 'error', mensagem: 'Times públicos precisam de uma cidade. É assim que jogadores perto encontram o seu.' });
      setPasso(1);
      return;
    }
    setBusy(true);
    try {
      // Sem cor no body: o backend cai para o fallback interno ('verde'); muda-se
      // depois nas definições do admin (decisão: cor despromovida, SPEC-EQUIPAS).
      const bodyCriar = { nome: nome.trim() };
      // Cidade da lista: manda o pacote todo (o motor guarda a coordenada da lista, sem Nominatim). Digitada: só o texto.
      if (cidade.trim()) Object.assign(bodyCriar, cidadeEscolha || { cidade: cidade.trim() });
      // O bairro só existe dentro de uma cidade; freguesia da lista leva a coordenada, texto digitado o motor geocodifica.
      if (cidade.trim() && bairro.trim()) Object.assign(bodyCriar, bairroEscolha && bairroEscolha.bairro === bairro.trim() ? bairroEscolha : { bairro: bairro.trim() });
      if (!joga) bodyCriar.joga = false;
      if (!mostrarArtilheiro) bodyCriar.mostrar_artilheiro = false;
      if (!mostrarDestaque) bodyCriar.mostrar_destaque = false;
      const { team: t, geo, bairro: bairroResposta, joga: jogaGravado, premios_salvos: premiosSalvos } = await apiFetch('/api/teams', { method: 'POST', body: JSON.stringify(bodyCriar) });
      setAvisoCidade(avisoDaCidade(geo, cidade.trim()));
      setAvisoBairro(avisoDoBairro(bairroResposta));
      // O motor sem a migração 067 cria o time com o criador jogando: a tela não finge que gravou o outro papel. Um toast de
      // 2 s não dava para ler uma frase assim (item 46): vira texto fixo no passo 4, junto dos outros avisos.
      const avisos = [];
      if (!joga && jogaGravado !== false) avisos.push('"Só organizo" não pôde ser salvo agora: você entrou jogando. Dá para mudar nas configurações do time.');
      if (premiosSalvos === false) avisos.push('A escolha de artilheiro e destaque do dia não pôde ser salva agora. Dá para ajustar no painel do time.');
      setAvisoPapel(avisos.join(' '));
      // P2-12: a equipa já existe aqui. Se o PATCH das definições falhar, NÃO
      // dizer "erro a criar" — a equipa nasceu; segue-se para convites e avisa-se
      // que a definição ficou por aplicar (ajusta-se no admin).
      const patch = {};
      if (!mostrarGols) patch.mostrar_gols = false;
      if (modo !== 'privado') patch.modo_visibilidade = modo;
      if (Object.keys(patch).length) {
        try {
          await apiFetch(`/api/teams/${t.slug}`, { method: 'PATCH', body: JSON.stringify(patch) });
        } catch {
          setToast({ tipo: 'error', mensagem: 'Time criado, mas a definição (gols/visibilidade) falhou. Ajuste no admin.' });
        }
      }
      // Logo (opcional): só depois de o time existir. Se a moderação recusar, o time fica criado do mesmo jeito
      // e o passo 4 avisa — o logo se troca depois no painel do time.
      if (logoArquivo) {
        try {
          await apiUpload(`/api/teams/${t.slug}/logo`, logoArquivo, 'logo');
          setLogoEnviado(true);
        } catch (err) {
          setAvisoLogo(avisoLogoRecusado(err?.message));
        }
      }
      setTeam(t);
      setPasso(4);
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function gerarConvite() {
    if (busy || !team) return;
    setBusy(true);
    try {
      const { token, codigo } = await apiFetch(`/api/teams/${team.slug}/convite`, { method: 'POST' });
      setInviteLink(linkDoConvite({ origem: window.location.origin, token, codigo }));
    } catch (e) {
      setToast({ tipo: 'error', mensagem: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    const ok = await copiarTexto(inviteLink);
    setCopied(ok);
    if (!ok) setToast({ tipo: 'error', mensagem: 'Não deu para copiar. Copie o link à mão.' });
  }

  const waHref = inviteLink ? enderecoDoWhatsapp({ nomeTime: nome, link: inviteLink }) : null;

  return (
    <div className="app-shell">
      <Topbar hud="CRIAR TIME" back="/home" />
      <main className="app-main page-reveal" style={{ maxWidth: 480 }}>
        {/* barra de progresso 1-4 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 20px' }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ flex: 1, height: 3, background: n <= passo ? 'linear-gradient(90deg,#d4a017,#f0c94a)' : 'rgba(255,255,255,0.10)', boxShadow: n <= passo ? '0 0 8px rgba(212,160,23,0.5)' : 'none' }} />
          ))}
          <span style={{ fontFamily: RAJ, fontSize: 11, color: '#9a8fc0', letterSpacing: '0.08em' }}>{passo}/4</span>
        </div>

        {passo === 1 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Dê nome ao seu time</h1>
            <p className="texto-apoio" style={{ marginBottom: 14 }}>O escudo nasce das iniciais. Veja-o se formar enquanto você escreve.</p>
            <Lbl>Nome do time</Lbl>
            <input className="input input--hud" value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Domingueira FC" style={{ width: '100%', fontFamily: RAJ, fontSize: 16 }} />
            <Lbl>Cidade</Lbl>
            <CampoCidadeLazy valor={cidade} aoMudar={(texto, escolha) => { setCidade(texto); setCidadeEscolha(escolha); setBairroEscolha(null); }} placeholder="Ex: Brasília" />
            <p className="texto-apoio">
              É assim que jogadores perto de você encontram o time. Só a cidade, nunca o endereço.
            </p>
            {/* 29H (item 12): o bairro, opcional. Em Portugal sugere as freguesias do concelho; no resto é texto livre. */}
            <Lbl>Bairro (opcional)</Lbl>
            <CampoBairro
              valor={bairro}
              aoMudar={(texto, escolha) => { setBairro(texto); setBairroEscolha(escolha); }}
              concelho={concelhoDePortugal(cidade, cidadeEscolha)}
              desabilitado={!cidade.trim()}
            />
            <p className="texto-apoio">{TEXTO_APOIO_BAIRRO}</p>
            <Lbl>Logo do time (opcional)</Lbl>
            {/* Prévia REDONDA do logo; sem logo, o escudo com as iniciais (nasce enquanto você escreve o nome). */}
            {logoPrevia ? (
              <img src={logoPrevia} alt="Prévia do logo do time" width={110} height={110} style={{ display: 'block', width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', margin: '8px auto 6px', border: '2.5px solid #8b5cf6', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }} />
            ) : (
              <div style={{ width: 110, height: 110, display: 'grid', placeItems: 'center', fontFamily: RAJ, fontWeight: 800, fontSize: 38, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '2.5px solid #8b5cf6', margin: '8px auto 6px', clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
                {iniciais(nome)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <button type="button" className="chip" onClick={() => logoInputRef.current?.click()} style={{ color: '#f0c94a', borderColor: 'rgba(212,160,23,0.5)', background: 'rgba(212,160,23,0.08)' }}>
                {logoArquivo ? 'Trocar logo' : 'Escolher logo'}
              </button>
              {logoArquivo ? <button type="button" className="chip" onClick={tirarLogo}>Tirar</button> : null}
            </div>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={aoEscolherLogo} style={{ display: 'none' }} />
            <p className="texto-apoio texto-apoio--centro" style={{ maxWidth: 300 }}>
              PNG, JPG ou WEBP, até 2 MB. Passa por uma conferência. Sem logo, o escudo usa as iniciais.
            </p>
            <div style={{ marginTop: 24 }}>
              <Cta cheio disabled={!nome.trim()} onClick={() => setPasso(2)}>Continuar</Cta>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Como funciona o seu time?</h1>
            <p className="texto-apoio" style={{ marginBottom: 14 }}>Cada escolha mostra o efeito. Você pode mudar tudo depois no painel de admin.</p>
            <div data-papel style={{ ...VIDRO, clipPath: CLIP, padding: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Seu papel no time</div>
              <EscolhaPapel joga={joga} aoTrocar={setJoga} />
            </div>
            <div style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <MiniRadar n={mostrarGols ? 5 : 3} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Mostrar gols</div>
                <div className="texto-apoio" style={{ marginTop: 2 }}>
                  {mostrarGols ? 'radar de 5 eixos, bloco de Gols e troféu de Artilheiro' : 'radar cai para 3: presença · vitórias · destaque'}
                </div>
              </div>
              <Toggle on={mostrarGols} onClick={() => setMostrarGols(!mostrarGols)} />
            </div>
            {/* 29H (item 44): eram chaves apagadas (<Toggle on disabled />, "em breve") — o dono tocava e nada acontecia. Agora
                cada uma é uma escolha do time (teams.mostrar_artilheiro / mostrar_destaque): ligada, o editor de resultado
                oferece o troféu; desligada, esconde a seção. A frase embaixo diz o efeito da escolha de agora. */}
            <div data-premio="artilheiro" style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Artilheiro do dia</div>
                <div className="texto-apoio" style={{ marginTop: 2 }}>{mostrarArtilheiro ? 'troféu no fim de cada jogo' : 'sem troféu de artilheiro nos jogos'}</div>
              </div>
              <Toggle on={mostrarArtilheiro} onClick={() => setMostrarArtilheiro(!mostrarArtilheiro)} rotulo="Artilheiro do dia" />
            </div>
            <div data-premio="destaque" style={{ ...VIDRO, clipPath: CLIP, display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: RAJ, fontWeight: 700, fontSize: 14 }}>Destaque do dia</div>
                <div className="texto-apoio" style={{ marginTop: 2 }}>{mostrarDestaque ? 'o MVP escolhido no fim de cada jogo' : 'sem destaque do dia nos jogos'}</div>
              </div>
              <Toggle on={mostrarDestaque} onClick={() => setMostrarDestaque(!mostrarDestaque)} rotulo="Destaque do dia" />
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Cta cheio onClick={() => setPasso(3)}>Continuar</Cta>
              <Cta sec onClick={() => setPasso(1)}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Aceita novos membros?</h1>
            <p className="texto-apoio" style={{ marginBottom: 14 }}>Como se entra no seu time.</p>
            {[
              // 29H (item 45): textos aprovados pelo dono (2-out). "Fechado" segue a mesma linha da casa.
              { k: 'privado', t: 'Fechado', d: 'Só entra quem receber o seu link de convite.' },
              { k: 'publico_aprovacao', t: 'Só com a sua aprovação', d: 'Quem achar o time no Explorar pede para entrar; você aceita ou não.' },
              { k: 'publico_aberto', t: 'Aberto', d: 'Qualquer um que achar o time no Explorar entra na hora.' },
            ].map((o) => (
              <button key={o.k} type="button" onClick={() => setModo(o.k)} style={{ ...VIDRO, clipPath: CLIP, display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 8, cursor: 'pointer', borderColor: modo === o.k ? 'rgba(212,160,23,0.65)' : 'rgba(255,255,255,0.10)', background: modo === o.k ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)', color: 'inherit' }}>
                <span style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 14, display: 'block', color: modo === o.k ? '#f0c94a' : '#fff' }}>{o.t}</span>
                <span className="texto-apoio" style={{ marginTop: 2 }}>{o.d}</span>
              </button>
            ))}
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              <Cta cheio onClick={criarESeguir} disabled={busy}>{busy ? 'Criando…' : 'Criar o time'}</Cta>
              <Cta sec onClick={() => setPasso(2)} disabled={busy}>← voltar</Cta>
            </div>
          </>
        )}

        {passo === 4 && team && (
          <>
            <h1 style={{ fontFamily: RAJ, fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>Chame o seu time</h1>
            <p className="texto-apoio" style={{ marginBottom: 14 }}>O <b style={{ color: '#f0c94a' }}>{team.nome}</b> está criado. Manda no grupo do seu time: o link vale 30 dias. Você pode pular este passo.</p>
            {avisoCidade ? (
              avisoCidade.tipo === 'ok' ? (
                <p className="texto-apoio" data-aviso-cidade="ok" style={{ marginTop: 0, marginBottom: 14 }}>{avisoCidade.texto}</p>
              ) : (
                <div role="status" data-aviso-cidade="aviso" className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                  {avisoCidade.texto}
                </div>
              )
            ) : null}
            {avisoBairro ? (
              avisoBairro.tipo === 'ok' ? (
                <p className="texto-apoio" data-aviso-bairro="ok" style={{ marginTop: 0, marginBottom: 14 }}>{avisoBairro.texto}</p>
              ) : (
                <div role="status" data-aviso-bairro="aviso" className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                  {avisoBairro.texto}
                </div>
              )
            ) : null}
            {avisoPapel ? (
              <div role="status" data-aviso-papel className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                {avisoPapel}
              </div>
            ) : null}
            {avisoLogo ? (
              <div role="status" className="hud-corners-s" style={{ margin: '0 0 14px', padding: '10px 12px', fontSize: 13, lineHeight: 1.45, color: '#f0c94a', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.45)' }}>
                {avisoLogo}
              </div>
            ) : logoEnviado ? (
              <p className="texto-apoio" style={{ marginTop: 0, marginBottom: 14 }}>Logo do time enviado ✓</p>
            ) : null}
            {inviteLink ? (
              <>
                <Lbl>Link do convite</Lbl>
                <input className="input input--hud" readOnly value={inviteLink} onFocus={(e) => e.target.select()} style={{ width: '100%', color: '#f0c94a' }} />
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <Cta onClick={copiar}>{copied ? 'Copiado' : 'Copiar link'}</Cta>
                  <a href={waHref} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                    <Cta sec style={{ color: '#7bd88f', borderColor: 'rgba(123,216,143,0.45)', background: 'rgba(123,216,143,0.06)' }}>Compartilhar no WhatsApp</Cta>
                  </a>
                </div>
              </>
            ) : (
              <Cta onClick={gerarConvite} disabled={busy}>{busy ? 'Gerando…' : 'Gerar link do convite'}</Cta>
            )}
            <div style={{ marginTop: 22 }}>
              {/* Rodada 29C: `criouAgora` abre as boas-vindas do criador na página do time (uma vez por time). */}
              <Cta cheio onClick={() => navigate(`/equipa/${team.slug}`, { state: { criouAgora: true } })}>Ir para o time</Cta>
            </div>
          </>
        )}
      </main>
      {toast ? <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
