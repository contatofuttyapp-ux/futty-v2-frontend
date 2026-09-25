// Futty v2.0 — Liga o alinhamento dos caches ao PerfilContext (RODADA 27). Só importar este módulo já
// basta (efeito de carga): quem muda o card — Figurinha, Início, Perfil — o importa, e a partir daí cada
// perfil confirmado alinha o Início, o Ranking e o Feed guardados (ver lib/cacheCard.js). Fica num módulo
// à parte porque cacheCard.js é lógica pura (testada no Node) e o PerfilContext puxa React.
import { registrarAlinhador } from '../context/PerfilContext';
import { aoAceitarPerfil } from './cacheCard';

registrarAlinhador(aoAceitarPerfil);
