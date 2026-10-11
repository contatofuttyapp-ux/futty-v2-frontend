// Futty v2.0 — A escolha do formato do campeonato: os três, cada um com a linha que o explica.
// Uma peça só para os dois lugares onde o admin escolhe (criar do zero e criar a partir do sorteio de um jogo).
// `nTimes` é quantos times o campeonato tem agora: a linha de cada formato fecha com a conta de jogos para esse número, e com 2
// times "Todos contra todos + final" nem aparece (precisa de 3).
import { explicacaoDoFormato, formatosParaOTime, nomeDoFormato } from '../utils/formatoCampeonato';

export default function SeletorDeFormato({ valor, onChange, nTimes }) {
  return (
    <div data-seletor-de-formato>
      {formatosParaOTime(nTimes).map((f) => (
        <div
          key={f}
          className={`camp-fopt ${valor === f ? 'on' : ''}`}
          data-formato={f}
          onClick={() => onChange(f)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(f); } }}
          role="button"
          aria-pressed={valor === f}
          tabIndex={0}
        >
          <div>
            <div className="camp-fopt__t">{nomeDoFormato(f)}</div>
            <div className="camp-fopt__d">{explicacaoDoFormato(f, nTimes)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
