// Futty v2.0 — no Início de quem está sem time, pergunta ao motor se a pessoa abriu um convite no navegador deste celular (o caminho
// "link → loja → instalar → cadastrar": o bilhete ficou no navegador, ver lib/conviteNoMotor.js). Um convite só = entra no time sozinho e
// abre a página do time com as boas-vindas; dois ou mais = "Qual time te convidou?". Nada achado = não desenha nada (o cartão
// "Recebeu um convite?" e o "Criar meu time" seguem embaixo). "Nenhum desses" vale para a sessão.
// Antes do motor, a Play Store (só Android): o convite que veio no referrer da instalação (lib/conviteDaLoja.js) é certeza — entra sem
// perguntar. Se não der para entrar por ele (convite vencido, rede), segue a pergunta ao motor; sem resposta do motor (rede), o convite
// fica no bilhete e o próximo Início leva a pessoa à página dele.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { convitesNoMotor } from '../lib/conviteNoMotor';
import { tomarConviteDaLoja } from '../lib/conviteDaLoja';
import { guardarConvitePendente } from '../lib/convitePendente';
import { valeTentarDeNovo } from '../utils/validarConvite';
import EscolhaDoConvite from './EscolhaDoConvite';

const CHAVE_RECUSA = 'futty_convite_motor_recusado';

function jaRecusou() {
  try { return sessionStorage.getItem(CHAVE_RECUSA) === '1'; } catch { return false; }
}

export default function ConviteDoMotor() {
  const navigate = useNavigate();
  const [convites, setConvites] = useState([]);
  const [entrando, setEntrando] = useState(null);
  const [erro, setErro] = useState('');
  const [fechado, setFechado] = useState(jaRecusou);
  // Um pedido só por Início (no dev o StrictMode monta duas vezes; aceitar duas vezes perderia as boas-vindas). A resposta vale para a
  // montagem que ficou.
  const perguntou = useRef(false);
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  async function entrar(c) {
    setErro('');
    setEntrando(c.team.slug);
    try {
      const { team, jaMembro } = await apiFetch(`/api/convite/${encodeURIComponent(c.token)}/aceitar`, { method: 'POST' });
      // O mesmo destino do "Entrar no time" da página do convite: o time, com as boas-vindas para quem acabou de entrar.
      navigate(`/time/${team.slug}`, { replace: true, state: jaMembro ? undefined : { primeiraEntrada: true } });
    } catch (e) {
      setErro(e.message || 'Não deu para entrar agora. Tente de novo.');
      setConvites((atual) => (atual.length ? atual : [c]));
      setEntrando(null);
    }
  }

  /** O convite da Play Store: true se entrou (e já navegou). */
  async function entrarPelaLoja(token) {
    try {
      const { team, jaMembro } = await apiFetch(`/api/convite/${encodeURIComponent(token)}/aceitar`, { method: 'POST' });
      if (montado.current) navigate(`/time/${team.slug}`, { replace: true, state: jaMembro ? undefined : { primeiraEntrada: true } });
      return true;
    } catch (e) {
      if (valeTentarDeNovo(e)) guardarConvitePendente(token);
      return false;
    }
  }

  useEffect(() => {
    if (fechado || perguntou.current) return;
    perguntou.current = true;
    (async () => {
      const daLoja = await tomarConviteDaLoja();
      if (daLoja && (await entrarPelaLoja(daLoja))) return;
      const lista = await convitesNoMotor();
      if (!montado.current || !lista.length) return;
      if (lista.length === 1) entrar(lista[0]);
      else setConvites(lista);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechado]);

  function nenhum() {
    try { sessionStorage.setItem(CHAVE_RECUSA, '1'); } catch { /* sem armazenamento: some só nesta tela */ }
    setFechado(true);
  }

  if (fechado || !convites.length) return null;
  return <EscolhaDoConvite convites={convites} onEscolher={entrar} onNenhum={nenhum} entrando={entrando} erro={erro} style={{ marginTop: 16 }} />;
}
