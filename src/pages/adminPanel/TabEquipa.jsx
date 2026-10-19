// Futty v2.0 — Os dados do time (nome, escudo, cidade, visibilidade, sobre), na aba AJUSTES do admin.

import { useEffect, useRef, useState } from 'react';
import { apiFetch, apiUpload } from '../../lib/api';
import EscudoEquipa from '../../components/EscudoEquipa';
import EditorEscudo from '../../components/EditorEscudo';
import { inputStyle, lbl } from '../../components/camposDoAdmin';
import NumberStepper from '../../components/NumberStepper';
import CampoCidadeLazy from '../../components/CampoCidadeLazy';
import { EscolhaPapel, TEXTO_ADMIN_E_POSICAO } from '../../components/EscolhaLinhaGol';
import { ARTILHEIRO, DESTAQUE, GOLS, alternarArtilheiro, alternarGols } from '../../components/golsEPremios';
import CampoBairro from '../../components/CampoBairro';
import { avisoDaCidade } from '../../utils/cidades';
import { useBairrosDaCidade } from '../../hooks/useBairrosDaCidade';
import { TEXTO_APOIO_BAIRRO, avisoDoBairro } from '../../utils/freguesias';
import { EXEMPLO_SOBRE_O_TIME, FALTA_SOBRE_NOS_AJUSTES, MAX_SOBRE_O_TIME, faltaSobre, precisaDeSobre } from '../../utils/sobreOTime';
import { CARD, rotuloECampo, textoDeApoio, VIS_DESC, VIS_OPCOES } from './comum';
import { ConfirmModal, Interruptor } from './pecas';

// ─── TAB: EQUIPA ─────────────────────────────────────────────────────────────
function TabEquipa({ slug, team, showToast, onMudou }) {
  const [nome, setNome] = useState(team.nome || '');
  const [localizacao, setLocalizacao] = useState(team.localizacao || '');
  const [cidade, setCidade] = useState(team.cidade || '');
  // Escolha da lista (null enquanto digita), o último texto GUARDADO (só se manda a cidade quando mudou)
  // e o que o motor disse da cidade depois de salvar ({ tipo: 'ok' | 'aviso', texto }).
  const [cidadeEscolha, setCidadeEscolha] = useState(null);
  const [cidadeGuardada, setCidadeGuardada] = useState(team.cidade || '');
  const [avisoCidade, setAvisoCidade] = useState(null);
  // O bairro (opcional). `bairroEscolha` = a freguesia da lista (Portugal) com a coordenada; null enquanto digita.
  const [bairro, setBairro] = useState(team.bairro || '');
  const [bairroGuardado, setBairroGuardado] = useState(team.bairro || '');
  const [bairroEscolha, setBairroEscolha] = useState(null);
  const [avisoBairro, setAvisoBairro] = useState(null);
  // O bairro é de LISTA (IBGE no Brasil, freguesias em Portugal) — o campo só existe quando a cidade tem lista.
  const bairros = useBairrosDaCidade(cidade, cidadeEscolha);
  // O "Sobre o time" (era "Descrição"): obrigatório no time aberto ao público. `pedindoSobre` = a política que a pessoa tocou sem ter o texto
  // (a pergunta abre, o motor só é chamado com o texto na mão); `sobreRascunho` = o que ela escreve na pergunta.
  const [descricao, setDescricao] = useState(team.descricao || '');
  const [pedindoSobre, setPedindoSobre] = useState(null);
  const [sobreRascunho, setSobreRascunho] = useState('');
  const [logoUrl, setLogoUrl] = useState(team.logo_url || null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [modo, setModo] = useState(team.modo_visibilidade || 'privado');
  const [mostrarGols, setMostrarGols] = useState(team.mostrar_gols !== false);
  // "Artilheiro do dia" / "Destaque do dia" — ligados, o editor de resultado oferece a seção.
  // O artilheiro depende dos gols — com os gols desligados ele aparece desligado (um time antigo que ficou com a
  // combinação incoerente é mostrado como o motor a trata: sem artilheiro).
  const [mostrarArtilheiro, setMostrarArtilheiro] = useState(team.mostrar_gols !== false && team.mostrar_artilheiro !== false);
  const [mostrarDestaque, setMostrarDestaque] = useState(team.mostrar_destaque !== false);
  const [joga, setJoga] = useState(team.joga !== false); // "Eu jogo" / "Só organizo o time"
  const [jogaOcupado, setJogaOcupado] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Sem isto não há volta — quem sobe um logo errado fica preso, e o
  // editor de escudo (864 combinações) fica inalcançável em qualquer time com logo.
  const [removendoLogo, setRemovendoLogo] = useState(false);
  const [confirmRemoverLogo, setConfirmRemoverLogo] = useState(false);
  const logoInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  // Jogadores por time é UM padrão do time — o "Novo jogo" já vem com ele. Grava sozinho, um instante depois do
  // último toque no seletor (sem um pedido por toque); sem a migração 079 o motor diz "ainda não está disponível" e o número volta.
  const [porTime, setPorTime] = useState(team.jogadores_por_time || 5);
  const porTimeTimer = useRef(null);
  useEffect(() => () => clearTimeout(porTimeTimer.current), []);
  function mudarPorTime(n) {
    setPorTime(n);
    clearTimeout(porTimeTimer.current);
    porTimeTimer.current = setTimeout(async () => {
      try {
        await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ jogadores_por_time: Number(n) }) });
        showToast(`Padrão do time: ${n} por time.`);
        onMudou?.();
      } catch (err) {
        setPorTime(team.jogadores_por_time || 5);
        showToast(err.message, 'error');
      }
    }, 700);
  }

  // Carrega o logo escolhido (preview imediato) e envia para o backend.
  async function aoEscolherLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreviewLogo(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      const { logo_url } = await apiUpload(`/api/teams/${slug}/logo`, file, 'logo');
      setLogoUrl(logo_url);
      showToast('Logo atualizado.');
    } catch (err) {
      setPreviewLogo(null);
      showToast(err.message, 'error');
    } finally {
      setUploadingLogo(false);
    }
  }

  // Remove o logo — o escudo do time (EditorEscudo) volta a aparecer.
  async function removerLogo() {
    setConfirmRemoverLogo(false);
    setRemovendoLogo(true);
    try {
      await apiFetch(`/api/teams/${slug}/logo`, { method: 'DELETE' });
      setLogoUrl(null);
      setPreviewLogo(null);
      showToast('Logo removido. O escudo do time volta a aparecer.');
      onMudou?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRemovendoLogo(false);
    }
  }

  // Modo de visibilidade (guarda logo ao selecionar; reverte em erro).
  // Tornar o time aberto ao público sem "Sobre o time" pede o texto ANTES de salvar (a pergunta abaixo); com ele, o texto vai junto
  // no mesmo pedido, então um time público nunca fica sem apresentação no motor.
  async function guardarModo(novoModo, sobreNovo = null) {
    const sobre = sobreNovo ?? descricao;
    if (faltaSobre({ modo: novoModo, sobre })) {
      setSobreRascunho('');
      setPedindoSobre(novoModo);
      return;
    }
    const anterior = modo;
    setModo(novoModo);
    const corpo = { modo_visibilidade: novoModo };
    if (precisaDeSobre(novoModo)) corpo.descricao = sobre.trim().slice(0, MAX_SOBRE_O_TIME);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify(corpo) });
      if (corpo.descricao !== undefined) setDescricao(corpo.descricao);
      showToast('Visibilidade atualizada.');
    } catch (err) {
      setModo(anterior);
      showToast(err.message, 'error');
    }
  }

  // Meu papel: guarda logo ao tocar, como a visibilidade; reverte em erro (o motor diz o porquê).
  async function guardarJoga(novo) {
    if (jogaOcupado || novo === joga) return;
    const anterior = joga;
    setJoga(novo);
    setJogaOcupado(true);
    try {
      await apiFetch(`/api/equipas/${slug}/membros/joga`, { method: 'PATCH', body: JSON.stringify({ joga: novo }) });
      showToast(novo ? 'Você voltou a jogar.' : 'Agora você só organiza o time.');
    } catch (err) {
      setJoga(anterior);
      showToast(err.message, 'error');
    } finally {
      setJogaOcupado(false);
    }
  }

  // "Gols de cada um": desligar leva o artilheiro junto, no mesmo pedido (o motor recusa "gols desligados, artilheiro ligado").
  // Religar os gols NÃO religa o artilheiro: quem decide é a pessoa.
  async function guardarMostrarGols(v) {
    const golsAntes = mostrarGols;
    const artilheiroAntes = mostrarArtilheiro;
    const novo = alternarGols(artilheiroAntes, v);
    const desligaArtilheiroJunto = artilheiroAntes && !novo.mostrarArtilheiro;
    setMostrarGols(novo.mostrarGols);
    setMostrarArtilheiro(novo.mostrarArtilheiro);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ mostrar_gols: v, ...(desligaArtilheiroJunto ? { mostrar_artilheiro: false } : {}) }) });
      showToast(v ? 'Gols de cada um ligados.' : desligaArtilheiroJunto ? 'Gols de cada um desligados. O artilheiro do dia foi desligado junto.' : 'Gols de cada um desligados.');
    } catch (err) {
      setMostrarGols(golsAntes);
      setMostrarArtilheiro(artilheiroAntes);
      showToast(err.message, 'error');
    }
  }

  // Ligar o artilheiro liga os gols junto, no mesmo pedido (o motor recusa "gols desligados, artilheiro ligado").
  async function guardarArtilheiro(v) {
    const golsAntes = mostrarGols;
    const artilheiroAntes = mostrarArtilheiro;
    const novo = alternarArtilheiro(golsAntes, v);
    const ligaGolsJunto = novo.mostrarGols !== golsAntes;
    setMostrarGols(novo.mostrarGols);
    setMostrarArtilheiro(novo.mostrarArtilheiro);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ mostrar_artilheiro: v, ...(ligaGolsJunto ? { mostrar_gols: true } : {}) }) });
      showToast(v ? (ligaGolsJunto ? 'Gols de cada um e artilheiro do dia ligados.' : 'Artilheiro do dia ligado.') : 'Artilheiro do dia desligado.');
    } catch (err) {
      setMostrarGols(golsAntes);
      setMostrarArtilheiro(artilheiroAntes);
      showToast(err.message, 'error');
    }
  }

  async function guardarDestaque(v) {
    const anterior = mostrarDestaque;
    setMostrarDestaque(v);
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify({ mostrar_destaque: v }) });
      showToast(v ? 'Destaque do dia ligado.' : 'Destaque do dia desligado.');
    } catch (err) {
      setMostrarDestaque(anterior);
      showToast(err.message, 'error');
    }
  }

  async function guardar() {
    if (saving) return;
    // Time aberto ao público se apresenta — sem o "Sobre o time" não salva.
    if (faltaSobre({ modo, sobre: descricao })) {
      showToast(FALTA_SOBRE_NOS_AJUSTES, 'error');
      return;
    }
    setSaving(true);
    try {
      // A cidade só vai no corpo quando MUDOU (a cada "Salvar" geocodificaria de novo).
      // Da lista: o pacote todo (o motor usa a coordenada da lista); digitada: só o texto; vazia: sai da busca.
      const corpo = { nome: nome.trim(), localizacao: localizacao.trim(), descricao: descricao.trim() };
      const mudouCidade = cidade.trim() !== cidadeGuardada.trim();
      if (mudouCidade) Object.assign(corpo, cidade.trim() ? (cidadeEscolha || { cidade: cidade.trim() }) : { cidade: '' });
      // O bairro vai quando mudou, e SÓ o da lista (leva a coordenada). Apagado, sai ('' — também quando a CIDADE
      // mudou: o bairro é da cidade antiga e o campo foi limpo). Texto que ninguém escolheu não vai; o bairro antigo escrito à mão fica como está.
      const textoDoBairro = bairro.trim();
      const bairroDaLista = textoDoBairro && bairroEscolha && bairroEscolha.bairro === textoDoBairro ? bairroEscolha : null;
      const mandaBairro = textoDoBairro === '' ? bairroGuardado.trim() !== '' : !!bairroDaLista && textoDoBairro !== bairroGuardado.trim();
      if (mandaBairro) Object.assign(corpo, bairroDaLista || { bairro: '' });
      const r = await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify(corpo) });
      if (mudouCidade) {
        setAvisoCidade(avisoDaCidade(r?.geo, cidade.trim()));
        const guardada = r?.team?.cidade ?? cidade.trim();
        setCidade(guardada || '');
        setCidadeGuardada(guardada || '');
        setCidadeEscolha(null);
      }
      if (mandaBairro) {
        setAvisoBairro(avisoDoBairro(r?.bairro));
        const guardado = r?.team?.bairro ?? bairro.trim();
        setBairro(guardado || '');
        setBairroGuardado(guardado || '');
        setBairroEscolha(null);
      }
      showToast('Time atualizado.');
      onMudou?.();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
    <div style={{ ...CARD, padding: 14, display: 'grid', gap: 14 }}>
      <div style={rotuloECampo}>
        <span style={lbl}>Você também joga?</span>
        <EscolhaPapel joga={joga} ocupado={jogaOcupado} aoTrocar={guardarJoga} />
        {/* "admin" e "posição em campo" são coisas separadas. */}
        <p className="texto-apoio" data-texto-admin-posicao style={{ marginTop: 0 }}>{TEXTO_ADMIN_E_POSICAO}</p>
      </div>

      <label style={rotuloECampo}>
        <span style={lbl}>Nome do time</span>
        <input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 60))} style={inputStyle} />
      </label>

      <label style={rotuloECampo}>
        <span style={lbl}>Localização</span>
        <input value={localizacao} onChange={(e) => setLocalizacao(e.target.value.slice(0, 100))} placeholder="Ex.: São Paulo · Campo do Zé" style={inputStyle} />
      </label>

      {/* GEO — opt-in implícito (preencher = consentir). Texto obrigatório junto ao campo.
          O nome da cidade é guardado + mostrado; do ponto guarda-se só o arredondado. */}
      <div style={rotuloECampo}>
        <span style={lbl}>Cidade <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }}>· busca por proximidade</span></span>
        <CampoCidadeLazy valor={cidade} aoMudar={(texto, escolha) => { if (texto !== cidade) { setBairro(''); setBairroEscolha(null); } setCidade(texto); setCidadeEscolha(escolha); setAvisoCidade(null); }} placeholder="Ex.: Brasília" className="" style={inputStyle} />
        {avisoCidade ? (
          <span role="status" data-aviso-cidade={avisoCidade.tipo} style={{ fontSize: 12, lineHeight: 1.5, color: avisoCidade.tipo === 'ok' ? '#7bd88f' : '#f0c94a' }}>{avisoCidade.texto}</span>
        ) : null}
        <span style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Aparece na busca por proximidade. O endereço exato nunca é mostrado, só a zona aproximada. Apague para sair da busca por distância.
        </span>
      </div>

      {/* O bairro, opcional, é de LISTA — os do IBGE no Brasil, as freguesias em Portugal — e põe o time no ponto do
          bairro (e não no centro da cidade). Cidade sem bairros na lista: o campo não aparece; o bairro antigo escrito à mão fica salvo até alguém editar. */}
      {bairros.estado === 'lista' ? (
        <div style={rotuloECampo}>
          <span style={lbl}>Bairro <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 0 }}>· opcional</span></span>
          <CampoBairro
            key={bairros.chave}
            valor={bairro}
            aoMudar={(texto, escolha) => { setBairro(texto); setBairroEscolha(escolha); setAvisoBairro(null); }}
            itens={bairros.itens}
            className=""
            style={inputStyle}
          />
          {avisoBairro ? (
            <span role="status" data-aviso-bairro={avisoBairro.tipo} style={{ fontSize: 12, lineHeight: 1.5, color: avisoBairro.tipo === 'ok' ? '#7bd88f' : '#f0c94a' }}>{avisoBairro.texto}</span>
          ) : null}
          <span style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{TEXTO_APOIO_BAIRRO}</span>
        </div>
      ) : null}

      {/* "Sobre o time" é o que o time diz de si no Radar de peladas; obrigatório no time aberto ao público. */}
      <label style={rotuloECampo}>
        <span style={lbl}>Sobre o time</span>
        <textarea data-sobre-o-time value={descricao} onChange={(e) => setDescricao(e.target.value.slice(0, MAX_SOBRE_O_TIME))} rows={3} maxLength={MAX_SOBRE_O_TIME} placeholder={EXEMPLO_SOBRE_O_TIME} style={{ ...inputStyle, resize: 'vertical' }} />
        <span style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{descricao.length}/{MAX_SOBRE_O_TIME}</span>
      </label>

      {/* LOGO */}
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={lbl}>Logo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <EscudoEquipa team={{ ...team, nome, logo_url: previewLogo || logoUrl }} size={64} />
          <div style={rotuloECampo}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={uploadingLogo || removendoLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {uploadingLogo ? 'Carregando…' : 'Enviar logo'}
              </button>
              {previewLogo || logoUrl ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={uploadingLogo || removendoLogo}
                  onClick={() => setConfirmRemoverLogo(true)}
                >
                  {removendoLogo ? 'Removendo…' : 'Remover logo'}
                </button>
              ) : null}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>PNG, JPG ou WEBP · máx 2MB</span>
          </div>
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={aoEscolherLogo} style={{ display: 'none' }} />
        </div>
      </div>

      {/* ESCUDO DO TIME: só para o time sem logo — com logo, é o logo que aparece. */}
      {previewLogo || logoUrl ? (
        <span style={textoDeApoio}>Com logo, o escudo não aparece: o app mostra o logo em todo lugar.</span>
      ) : (
        <EditorEscudo slug={slug} team={{ ...team, nome }} showToast={showToast} onMudou={() => onMudou?.()} />
      )}

      {/* VISIBILIDADE */}
      <div style={rotuloECampo}>
        <span style={lbl}>Visibilidade</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {VIS_OPCOES.map((o) => {
            const ativa = modo === o.k;
            return (
              <button
                key={o.k}
                type="button"
                aria-pressed={ativa}
                onClick={() => guardarModo(o.k)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: `1px solid ${ativa ? 'var(--neon)' : '#1a1a1a'}`,
                  background: ativa ? 'rgba(139,92,246,0.08)' : '#080808',
                  color: '#fff',
                }}
              >
                <o.icon size={15} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{o.label}</span>
              </button>
            );
          })}
        </div>
        <span style={textoDeApoio}>{VIS_DESC[modo]}</span>
      </div>

      {/* GOLS: os mesmos títulos e frases do passo 2 do Criar time (golsEPremios.js). */}
      <Interruptor ligado={mostrarGols} aoTrocar={guardarMostrarGols} rotulo={GOLS.titulo} apoio={GOLS.apoio} />

      {/* PRÊMIOS DO DIA: o editor de resultado só oferece o artilheiro / o destaque quando ligados. */}
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={lbl}>Prêmios do dia</span>
        <Interruptor ligado={mostrarArtilheiro} aoTrocar={guardarArtilheiro} rotulo={ARTILHEIRO.titulo} apoio={ARTILHEIRO.apoio} />
        <Interruptor ligado={mostrarDestaque} aoTrocar={guardarDestaque} rotulo={DESTAQUE.titulo} apoio={DESTAQUE.apoio} />
        <span style={textoDeApoio}>Desligado: o editor de resultado não oferece o troféu nem o destaque. O que já foi premiado continua no histórico.</span>
      </div>

      {/* JOGADORES POR TIME (item 68): o padrão do time; cada jogo ainda pode mudar só para ele, no "Novo jogo". */}
      <div style={rotuloECampo} data-padrao-por-time>
        <span style={lbl}>Jogadores por time</span>
        <NumberStepper value={porTime} onChange={mudarPorTime} min={2} max={11} />
        <span style={textoDeApoio}>O padrão do time: todo jogo novo já nasce com ele. Dá para mudar só num jogo, na hora de criar.</span>
      </div>

      <button type="button" className="btn btn--primary" style={{ width: '100%' }} disabled={saving} onClick={guardar}>
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </div>

    {pedindoSobre ? (
      <ConfirmModal
        texto={'Antes de abrir o time, conte como ele é. É o que quem achar o time no "Radar de peladas" vai ler.'}
        confirmarLabel="Salvar"
        confirmarDesabilitado={!sobreRascunho.trim()}
        onConfirm={() => { const novo = pedindoSobre; const texto = sobreRascunho; setPedindoSobre(null); guardarModo(novo, texto); }}
        onCancel={() => setPedindoSobre(null)}
      >
        <textarea
          data-sobre-o-time-pergunta
          autoFocus
          value={sobreRascunho}
          onChange={(e) => setSobreRascunho(e.target.value.slice(0, MAX_SOBRE_O_TIME))}
          rows={4}
          maxLength={MAX_SOBRE_O_TIME}
          placeholder={EXEMPLO_SOBRE_O_TIME}
          aria-label="Sobre o time"
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </ConfirmModal>
    ) : null}

    {confirmRemoverLogo ? (
      <ConfirmModal
        texto="Remover o logo do time? O escudo volta a aparecer no lugar."
        confirmarLabel="Remover logo"
        perigo
        onConfirm={removerLogo}
        onCancel={() => setConfirmRemoverLogo(false)}
      />
    ) : null}

    </div>
  );
}

export { TabEquipa };
