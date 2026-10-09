// Bancada da prova do "Ajustar times" com convidados sem app (scripts/provas/editor-de-times.prova.mjs): o TimesEditor de
// verdade com dois convidados em times diferentes; o que ele grava fica em window.__salvo.
import { createRoot } from 'react-dom/client';
import TimesEditor from '../../src/components/TimesEditor';
import '../../src/index.css';
import '../../src/styles/app.css';

const j = (id, nome) => ({ user_id: id, nome, avatar_url: null, rating: 3 });
const g = (nome) => ({ user_id: null, convidado: true, nome, avatar_url: null, rating: 3 });
const resultado = {
  seed: 7,
  num_times: 2,
  times: [{ nome: 'Time A', jogadores: [j('u1', 'Magrão'), g('Convidado Teste')] }, { nome: 'Time B', jogadores: [j('u2', 'Zé'), g('Convidado Dois')] }],
  reservas: [],
};
window.__salvo = null;
window.__toasts = [];
createRoot(document.getElementById('raiz')).render(
  <div style={{ maxWidth: 390, padding: 16 }}>
    <TimesEditor
      gameId="g1"
      resultadoInicial={resultado}
      confirmados={[{ user_id: 'u1', nome: 'Magrão' }, { user_id: 'u2', nome: 'Zé' }]}
      showToast={(m, tipo) => window.__toasts.push([m, tipo || 'success'])}
      onCancel={() => {}}
      onSaved={(tr) => { window.__salvo = tr; }}
    />
  </div>,
);
