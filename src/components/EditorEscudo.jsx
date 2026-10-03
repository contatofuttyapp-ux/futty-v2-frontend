// Futty v2.0 — "Escudo do time" (Rodada 29I, bloco 3, achado 102): UM controle no lugar dos dois de antes ("Cor" e "Cor de fundo do
// avatar", sem dizer a diferença). Cor principal + padrão + segunda cor, da paleta fixa (utils/escudo.js), com a prévia ao vivo nos
// três tamanhos em que o escudo aparece no app (84, 36 e 20 px — os das bancadas do dono). Cada toque grava na hora, como a
// visibilidade do time; se o motor recusar (sem a migração 077: "Essa opção ainda não está disponível."), volta ao que era.
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { PALETA, PADROES, chaveDaCor, segundaCorSugerida } from '../utils/escudo';
import EscudoEquipa from './EscudoEquipa';

const rotulo = { fontSize: 12, color: 'var(--text-dim)' };

// A chave 'roxo' vai como 'verde' (a antiga, que o app sempre mostrou como roxo): assim o roxo grava mesmo antes da migração 077,
// cuja regra nova aceita as duas.
const chaveParaGravar = (chave) => (chave === 'roxo' ? 'verde' : chave);

function Amostra({ cor, ativa, desligada = false, onClick }) {
  return (
    <button
      type="button"
      aria-label={cor.nome}
      aria-pressed={ativa}
      title={cor.nome}
      disabled={desligada}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        padding: 0,
        cursor: desligada ? 'not-allowed' : 'pointer',
        background: cor.hex,
        opacity: desligada ? 0.25 : 1,
        border: 'none',
        boxShadow: ativa ? '0 0 0 2px #0b0b10, 0 0 0 4px #f0c94a' : '0 0 0 1.5px rgba(255,255,255,.14)',
      }}
    />
  );
}

export default function EditorEscudo({ slug, team, showToast, onMudou }) {
  const [escudo, setEscudo] = useState(() => ({
    cor: chaveDaCor(team.cor),
    escudo_cor2: team.escudo_cor2 || null,
    escudo_padrao: team.escudo_cor2 ? team.escudo_padrao || 'solido' : 'solido',
  }));
  const [ocupado, setOcupado] = useState(false);

  async function gravar(novo) {
    if (ocupado) return;
    const anterior = escudo;
    setEscudo(novo);
    setOcupado(true);
    const corpo = {
      cor: chaveParaGravar(novo.cor),
      escudo_cor2: novo.escudo_padrao === 'solido' ? null : novo.escudo_cor2,
      escudo_padrao: novo.escudo_padrao,
    };
    try {
      await apiFetch(`/api/teams/${slug}`, { method: 'PATCH', body: JSON.stringify(corpo) });
      onMudou?.({ cor: corpo.cor, escudo_cor2: corpo.escudo_cor2, escudo_padrao: corpo.escudo_padrao === 'solido' ? null : corpo.escudo_padrao });
    } catch (e) {
      setEscudo(anterior);
      showToast(e.message, 'error');
    } finally {
      setOcupado(false);
    }
  }

  const solido = escudo.escudo_padrao === 'solido';
  const previa = { nome: team.nome, ...escudo, escudo_cor2: solido ? null : escudo.escudo_cor2 };

  function escolherCor(chave) {
    if (chave === escudo.cor) return;
    // A segunda cor nunca fica igual à principal (o padrão sumiria): troca pela sugerida.
    const cor2 = escudo.escudo_cor2 === chave ? segundaCorSugerida(chave) : escudo.escudo_cor2;
    gravar({ ...escudo, cor: chave, escudo_cor2: cor2 });
  }
  function escolherPadrao(chave) {
    if (chave === escudo.escudo_padrao) return;
    gravar({ ...escudo, escudo_padrao: chave, escudo_cor2: chave === 'solido' ? escudo.escudo_cor2 : escudo.escudo_cor2 || segundaCorSugerida(escudo.cor) });
  }

  return (
    <div style={{ display: 'grid', gap: 12 }} data-editor-escudo>
      <span style={rotulo}>Escudo do time</span>

      {/* A prévia nos três tamanhos do app: card do time, listas, chips. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} data-previa-escudo>
        <EscudoEquipa team={previa} size={84} />
        <EscudoEquipa team={previa} size={36} />
        <EscudoEquipa team={previa} size={20} />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={rotulo}>Cor</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {PALETA.map((c) => (
            <Amostra key={c.chave} cor={c} ativa={escudo.cor === c.chave} onClick={() => escolherCor(c.chave)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={rotulo}>Padrão</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
          {PADROES.map((p) => {
            const ativo = escudo.escudo_padrao === p.chave;
            const exemplo = { nome: team.nome, cor: escudo.cor, escudo_padrao: p.chave, escudo_cor2: p.chave === 'solido' ? null : escudo.escudo_cor2 || segundaCorSugerida(escudo.cor) };
            return (
              <button
                key={p.chave}
                type="button"
                aria-pressed={ativo}
                onClick={() => escolherPadrao(p.chave)}
                style={{ display: 'grid', justifyItems: 'center', gap: 5, padding: '8px 2px', borderRadius: 8, cursor: 'pointer', color: '#fff', border: `1px solid ${ativo ? 'var(--border-accent, #8b5cf6)' : 'rgba(255,255,255,0.08)'}`, background: ativo ? 'rgba(139,92,246,0.14)' : 'transparent' }}
              >
                <EscudoEquipa team={exemplo} size={36} />
                <span style={{ fontSize: 10.5, fontWeight: 700 }}>{p.nome}</span>
              </button>
            );
          })}
        </div>
      </div>

      {solido ? null : (
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={rotulo}>Segunda cor</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {PALETA.map((c) => (
              <Amostra
                key={c.chave}
                cor={c}
                ativa={escudo.escudo_cor2 === c.chave}
                desligada={c.chave === escudo.cor}
                onClick={() => c.chave !== escudo.escudo_cor2 && gravar({ ...escudo, escudo_cor2: c.chave })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
