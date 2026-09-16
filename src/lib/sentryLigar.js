// Futty v2.0 — A casca do Sentry (VELOCIDADE 8, 16-set).
//
// Existe por uma razão só, e é de empacotamento: `await import('@sentry/react')`
// devolve o NAMESPACE inteiro do módulo, e um namespace tem de estar completo —
// o bundler deixa de poder sacudir o que não se usa. Medido: o chunk passava de
// 84 KB para 471 KB, quase 400 KB a mais dentro do pacote da loja (e a regra da
// casa é "app leve", ver AUDITORIA-TAMANHO.md).
//
// Com este módulo no meio, o import dinâmico aponta para CÁ e o @sentry/react
// entra por imports NOMEADOS — que se sacodem como sempre. O Sentry continua a
// chegar 3 s depois da 1ª pintura (lib/sentryTardio.js); só o transporte mudou.
import { captureException, init } from '@sentry/react';

export { captureException, init };
