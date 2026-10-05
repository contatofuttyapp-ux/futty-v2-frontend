/* eslint-disable react-refresh/only-export-components -- página-bancada das provas no navegador, não faz parte do app */
// Bancada da prova "Gabinete · aba Times" (scripts/provas/gabinete-times.prova.mjs, Rodada 29Y): a aba Times do Gabinete DE VERDADE
// (PessoasTimes, com as sub-abas Pessoas · Times · Denúncias), sem login de super-admin. O motor é de mentira: a prova responde
// /api/** com page.route. O aviso que a tela mostra (showMsg) aparece em [data-msg], para a prova conferir o texto.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PessoasTimes from '../../src/pages/gabinete/PessoasTimes';
import '../../src/index.css';
import '../../src/styles/app.css';

function Bancada() {
  const [msg, setMsg] = useState('');
  return (
    <main style={{ padding: 16 }}>
      <PessoasTimes showMsg={(texto) => setMsg(texto)} />
      <div data-msg style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>{msg}</div>
    </main>
  );
}

createRoot(document.getElementById('raiz')).render(<Bancada />);
