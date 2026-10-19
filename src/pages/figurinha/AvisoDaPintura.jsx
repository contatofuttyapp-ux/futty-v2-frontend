// Futty v2.0 — Figurinha: o aviso "pintando a sua figurinha" com a barra, e os avisos de envio e erro da foto sob o card.
import { Check } from 'lucide-react';
import FuttyLoader from '../../components/FuttyLoader';

export default function AvisoDaPintura({ avisoUploadErro, fotoLocal, gerandoIA, temDireitoDeGerar, uploadFoto }) {
  return (
    <>
        {gerandoIA ? (
          // Título numa linha, com o F, e a explicação embaixo no texto de apoio da casa (≤ 34 em, 2 linhas,
          // centrada); as duas frases coladas numa linha só de 11 px quebrariam no meio, sem alinhamento.
          <div role="status" data-pintando-aviso style={{ display: 'grid', justifyItems: 'center', gap: 2, padding: '4px 0', marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '0.02em', color: '#d4a017' }}>
              <FuttyLoader size={16} label={null} /> Sua figurinha está sendo pintada…
            </span>
            <span className="texto-apoio texto-apoio--centro" style={{ marginTop: 0 }}>Pode sair da tela. A gente avisa quando ficar pronta.</span>
          </div>
        ) : uploadFoto ? (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '4px 0', marginBottom: 10, fontSize: 11, color: '#d4a017' }}>
            <FuttyLoader size={14} label={null} /> Enviando sua foto…
          </div>
        ) : avisoUploadErro ? (
          <div style={{ maxWidth: 460, margin: '0 auto 12px' }}>{avisoUploadErro}</div>
        ) : fotoLocal ? (
          // SPEC-FIGURINHA-3: trocar a foto já MUDA a figurinha comum na hora —
          // não há nada a gerar. A linha só convida a gerar a Brilhante quando
          // há direito; senão diz o que aconteceu de facto.
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '4px 0', marginBottom: 10, fontSize: 11, color: '#d4a017' }}>
            <Check size={14} /> {temDireitoDeGerar ? 'Foto trocada, gere sua figurinha' : 'Foto trocada. Seu card já mostra a nova foto.'}
          </div>
        ) : null}
    </>
  );
}
