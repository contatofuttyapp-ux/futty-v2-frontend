// Futty v2.0 — Contexto do Início (11-set). Faz 1 pedido só (GET /api/inicio)
// em vez dos ~9 que a tela disparava em paralelo — motor em São Paulo, quem usa
// em Lisboa paga ~240ms por pedido, e cada um deles era um round-trip só para
// abrir a tela.
//
// Montado condicionalmente em Layout.jsx (só quando pathname === '/home'),
// envolvendo children + BottomNav — assim o próprio BottomNav (que também
// precisa de "equipas do utilizador" e do estado de votação) pode ler daqui em
// vez de disparar os seus próprios pedidos enquanto está na página do Início.
// Fora dessa página o contexto não existe (useInicio() devolve null) e tudo
// volta ao comportamento de sempre.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { usePerfil } from './PerfilContext';

const InicioContext = createContext(null);

export function InicioProvider({ children }) {
  const { hidratar: hidratarPerfil } = usePerfil();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const carregando = !dados && !erro;

  // Guarda contra corrida: uma resposta tardia (efeito de montagem ou um
  // reload() anterior) não pode pisar o estado de um pedido mais recente.
  const geracaoRef = useRef(0);

  // reload() exposto ao contexto — para consumidores chamarem a partir de
  // handlers (ex.: depois de uma ação falhar), nunca a partir de um efeito.
  const carregar = useCallback(async () => {
    const minhaGeracao = ++geracaoRef.current;
    try {
      const d = await apiFetch('/api/inicio');
      if (geracaoRef.current !== minhaGeracao) return null;
      setDados(d);
      setErro('');
      // O /api/me do AuthGuard já correu antes de qualquer rota montar (é ele
      // que decide se a conta está suspensa) — isto não evita ESSE pedido, mas
      // mantém o PerfilContext fresco com o `me` que /api/inicio acabou de
      // trazer, sem o Início disparar um /api/me próprio por cima.
      if (d?.me) hidratarPerfil(d.me);
      return d;
    } catch (e) {
      if (geracaoRef.current !== minhaGeracao) return null;
      setErro(e.message || 'Não foi possível carregar o Início.');
      return null;
    }
  }, [hidratarPerfil]);

  // Carga inicial ao montar (mesmo padrão do PerfilContext: o efeito chama a
  // API diretamente, em vez de invocar `carregar`, para o setState correr
  // dentro do .then()/.catch() e não sincronamente no corpo do efeito).
  useEffect(() => {
    let ativo = true;
    const minhaGeracao = ++geracaoRef.current;
    apiFetch('/api/inicio')
      .then((d) => {
        if (!ativo || geracaoRef.current !== minhaGeracao) return;
        setDados(d);
        setErro('');
        if (d?.me) hidratarPerfil(d.me);
      })
      .catch((e) => {
        if (!ativo || geracaoRef.current !== minhaGeracao) return;
        setErro(e.message || 'Não foi possível carregar o Início.');
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carrega 1x ao montar (o Provider só existe na rota /home); reload() explícito cobre o resto
  }, []);

  const value = { dados, carregando, erro, reload: carregar };
  return <InicioContext.Provider value={value}>{children}</InicioContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInicio() {
  // SEM throw de propósito: fora do InicioProvider isto é null, e os
  // consumidores opcionais (useTeams, BottomNav, AdCard) tratam null como
  // "não estou dentro do Início, comporta-te como sempre".
  return useContext(InicioContext);
}
