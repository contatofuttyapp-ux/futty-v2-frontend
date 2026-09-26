// Futty v2.0 — Liga a loja (lib/loja.js) ao PerfilContext (Pagamentos P2). Só importar este módulo já
// basta (efeito de carga), o mesmo padrão do lib/alinharCard.js: quem vende — Figurinha (aba pré-carregada
// em ócio depois da 1ª tela) e Planos — o importa, e a partir daí a conta que entra configura o SDK e a
// que sai faz logOut. O SDK fica fora do arranque, que tem teto (scripts/verificar-dist.js).
import { registrarLoja } from '../context/PerfilContext';
import { iniciarLoja, sairDaLoja } from './loja';

registrarLoja((userId) => (userId ? iniciarLoja(userId) : sairDaLoja()));
