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
import { marcarNavegacao, agendarPintura, definirInfoApp } from '../lib/diagnostico';

export default function MedidorNavegacao() {
  const { pathname } = useLocation();

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
