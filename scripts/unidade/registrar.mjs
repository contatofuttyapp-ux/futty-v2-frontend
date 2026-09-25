// Futty v2.0 — carrega os módulos de src/ no Node para os testes de unidade.
// O Vite resolve `import './cacheLocal'` sem extensão; o Node não. Este gancho tenta o mesmo caminho com
// `.js` (e `.jsx`) quando o import relativo não existe — só para os testes, nunca para o app.
import { register } from 'node:module';

register(new URL('./resolver-sem-extensao.mjs', import.meta.url));
