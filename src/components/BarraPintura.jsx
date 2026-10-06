// Futty v2.0 — A barra de progresso honesta da pintura (vive dentro do card da figurinha).
// Só apresenta o que utils/progressoPintura.js#situacaoDaPintura calculou: nada de tempo, rede ou estado
// aqui.
// Estilo INLINE de propósito: CSS de página lazy entra no mapa de pré-carga do arranque (teto de 320 KiB).
export default function BarraPintura({ situacao, estimativaSegundos }) {
  if (!situacao) return null;
  return (
    <div
      data-pintura="barra"
      data-etapa={situacao.etapa}
      style={{ display: 'grid', justifyItems: 'center', gap: 8, width: 'min(80%, 240px)', textAlign: 'center' }}
    >
      <div
        role="progressbar"
        aria-label="Pintando sua figurinha"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={situacao.percentual}
        style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}
      >
        <div
          data-pintura="enchimento"
          style={{ height: '100%', width: `${situacao.percentual}%`, borderRadius: 3, background: 'linear-gradient(90deg, #d4a017, #f5e070)', transition: 'width 300ms linear' }}
        />
      </div>
      <span
        data-pintura="rotulo"
        role="status"
        style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: situacao.demorando ? 12 : 14, fontWeight: 700, lineHeight: 1.3, color: situacao.demorando ? '#f0c94a' : '#fff' }}
      >
        {situacao.rotulo}
      </span>
      {/* As quatro etapas, como pontos: feita = dourado cheio, atual = dourado com anel, depois = apagado. */}
      <div aria-hidden="true" style={{ display: 'flex', gap: 6 }}>
        {situacao.etapas.map((e) => (
          <span
            key={e.id}
            data-etapa-estado={e.estado}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: e.estado === 'depois' ? 'rgba(255,255,255,0.2)' : '#d4a017',
              boxShadow: e.estado === 'atual' ? '0 0 0 2px rgba(212,160,23,0.35)' : 'none',
            }}
          />
        ))}
      </div>
      {estimativaSegundos && !situacao.demorando ? (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
          Leva uns {estimativaSegundos} segundos · pode sair da tela, a gente avisa
        </span>
      ) : null}
    </div>
  );
}
