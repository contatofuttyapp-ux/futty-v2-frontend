// Futty v2.0 — /super é só um redirect. O conteúdo (usuários, times, denúncias) vive na aba
// "Pessoas & times" de /gabinete — ver src/pages/gabinete/PessoasTimes.jsx. Esta rota fica para não
// quebrar links/favoritos antigos.
import { Navigate } from 'react-router-dom';

export default function Super() {
  return <Navigate to="/gabinete?aba=pessoas" replace />;
}
