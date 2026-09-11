// Futty v2.0 — /super vira só um redirect (Gabinete 2.0, 11-set). O conteúdo
// (usuários, times, denúncias) mudou-se para a aba "Pessoas & times" de
// /gabinete — ver src/pages/gabinete/PessoasTimes.jsx. Esta rota fica para não
// quebrar links/favoritos antigos.
import { Navigate } from 'react-router-dom';

export default function Super() {
  return <Navigate to="/gabinete?aba=pessoas" replace />;
}
