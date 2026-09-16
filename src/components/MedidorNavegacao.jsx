// Futty v2.0 — Cronómetro das navegações (VELOCIDADE 4).
//
// Não desenha nada. Existe para responder, com número, à pergunta que o dono
// fez de outra forma ("surreal de devagar"): entre tocar numa aba e ver a tela,
// quanto tempo passa — e quanto desse tempo é esperar dados.
//
// O relógio parte na mudança de rota e para quando a tela REAL está desenhada
// (não o loader: ver loaderEntrou/loaderSaiu em lib/diagnostico.js). A leitura
// sai na tela Perfil → Diagnóstico.
import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { marcarNavegacao, agendarPintura, definirInfoApp, marcarReactMontado } from '../lib/diagnostico';

export default function MedidorNavegacao() {
  const { pathname } = useLocation();

  // VELOCIDADE 8 — o 1º commit da árvore inteira. Os efeitos de layout correm
  // de baixo para cima depois do commit, e este componente está na raiz (App.jsx,
  // dentro do BrowserRouter): quando esta linha corre, o React já montou tudo.
  // É o "b ms" do resumo do arranque — o que a compilação custou fica antes
  // dele (marcarArranque, no main.jsx), e o que a 1ª tela custa vem depois.
  useLayoutEffect(() => {
    marcarReactMontado();
  }, []);

  // useLayoutEffect: corre depois do render da rota nova e ANTES de o browser
  // desenhar — é o ponto mais próximo do "toque" que dá para marcar aqui.
  useLayoutEffect(() => {
    marcarNavegacao(pathname);
  }, [pathname]);

  useEffect(() => {
    agendarPintura();
  }, [pathname]);

  // Versão e build do app, uma vez. Só existe no nativo; na web fica vazio e o
  // relatório diz "web", que já é a informação que interessa.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let vivo = true;
    import('@capacitor/app')
      .then(({ App }) => App.getInfo())
      .then((info) => {
        if (vivo) definirInfoApp({ version: info?.version, build: info?.build });
      })
      .catch(() => {
        /* sem info do pacote — o relatório segue sem ela */
      });
    return () => {
      vivo = false;
    };
  }, []);

  return null;
}
