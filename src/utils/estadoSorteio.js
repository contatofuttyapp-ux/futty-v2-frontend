// Futty v2.0 — o que a tela do sorteio mostra, dado o que a API devolveu. Um erro de rede/sessão não pode
// cair no MESMO "ainda não foi realizado" do sorteio nunca feito: a tela diria isso com o sorteio intacto
// no banco, só porque a ida à API falhou.
// Usado por SorteioShow (com login) e SorteioPublico (link /p/): as duas leem de `useApi`, as duas
// precisam do MESMO critério — 'erro' nunca se confunde com 'nao_feito'.

/**
 * @param {{ loading: boolean, error: string, resultado: object|null|undefined }} args
 * @returns {'carregando'|'erro'|'nao_feito'|'pronto'}
 */
export function estadoSorteio({ loading, error, resultado }) {
  if (loading) return 'carregando';
  if (error) return 'erro';
  if (!resultado) return 'nao_feito';
  return 'pronto';
}
