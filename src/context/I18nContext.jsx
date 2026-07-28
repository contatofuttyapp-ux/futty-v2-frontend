// Futty v2.0 — Contexto i18n reativo: troca de língua SEM reload. Camada fina sobre
// lib/i18n.js (deteção, catálogo, traduzir). LEI: PT-BR é o texto-base (a chave);
// as outras 5 línguas vivem no catálogo. Deteção por navigator.language; a escolha
// do utilizador FIXA a preferência (localStorage, sobrepõe a deteção em todo boot
// seguinte). Sync entre dispositivos via servidor ficaria a um `users.idioma` (DDL)
// — não inventado aqui; regista-se como vaga futura se o dono quiser.
import { createContext, useCallback, useContext, useState } from 'react';
import { IDIOMAS, IDIOMA_PADRAO, idiomaInicial, guardarIdiomaLocal, traduzir } from '../lib/i18n';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [idioma, setIdiomaState] = useState(() => idiomaInicial());

  // Troca reativa: atualiza o estado (re-renderiza a app toda, sem reload) + guarda
  // localmente — o próximo boot já arranca nessa língua (sobrepõe a deteção).
  const mudarIdioma = useCallback((novoId) => {
    if (!IDIOMAS.some((i) => i.id === novoId)) return;
    setIdiomaState(novoId);
    guardarIdiomaLocal(novoId);
  }, []);

  const t = useCallback((chave, vars) => traduzir(idioma, chave, vars), [idioma]);

  const value = { idioma, setIdioma: mudarIdioma, t, idiomas: IDIOMAS, idiomaPadrao: IDIOMA_PADRAO };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n tem de ser usado dentro de <I18nProvider>');
  return ctx;
}
