// Futty v2.0 — Rodada 29A (D): o enquadramento de um avatar numa moldura pequena, numa função só.
//
// A figurinha de IA leva a cabeça no topo da imagem, com folga: `objectPosition: 'top'` é o certo. A foto
// crua do card grátis (a pessoa como ela é, com o fundo dela) tem o rosto mais para o meio: com 'top' o corte
// come o rosto. Quem diz o que é cada coisa é o NOME do arquivo — a mesma regra do motor
// (backend/utils/figurinhaRegra.js): figurinha nossa mora no bucket `avatars` e leva `-ai-<kit>` no nome.
// No app a URL chega pelo proxy (`/api/media/<token>`), e o token é `base64url(JSON {b: bucket, p: caminho})`
// + assinatura: dá para LER o caminho sem chave nenhuma (a assinatura só serve para o servidor confiar).
//
// O recorte que a pessoa escolheu no editor do card (Rodada 28) já vai assado no arquivo do avatar
// (PUT /api/me/avatar/recorte troca a foto pelo recorte 2:3); o zoom (−/+) só vive na tela da Figurinha e
// não é gravado. Se um dia houver um recorte guardado à parte, ele entra pelo 2º argumento e manda.

export const ENQUADRO_FIGURINHA = 'top';
export const ENQUADRO_FOTO = '50% 35%';

const MARCA_BUCKET = '/storage/v1/object/public/';

function lerToken(url) {
  try {
    const corpo = url.split('/api/media/')[1].split(/[?#]/)[0].split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const { b, p } = JSON.parse(atob(corpo));
    return b && p ? { bucket: b, caminho: p } : null;
  } catch {
    return null;
  }
}

function lerUrlPublica(url) {
  const i = url.indexOf(MARCA_BUCKET);
  if (i < 0) return null;
  const resto = url.slice(i + MARCA_BUCKET.length).split(/[?#]/)[0];
  const barra = resto.indexOf('/');
  return barra < 0 ? null : { bucket: resto.slice(0, barra), caminho: resto.slice(barra + 1) };
}

/**
 * 'figurinha' (arquivo `-ai-` nosso) | 'foto' (a foto crua da pessoa) | 'outro' (genérico, silhueta, não deu
 * para ler). Só 'foto' muda o enquadramento; todo o resto segue como sempre foi (topo).
 */
export function tipoDoAvatar(url) {
  const s = String(url ?? '').trim();
  if (!s) return 'outro';
  if (s.startsWith('blob:') || s.startsWith('data:') || s.includes('googleusercontent.com')) return 'foto';
  if (s.includes('/avatares/')) return 'outro';
  const alvo = s.includes('/api/media/') ? lerToken(s) : lerUrlPublica(s);
  if (!alvo || alvo.bucket !== 'avatars') return 'outro';
  return /^public\/[^/]+-ai-[^/]+$/.test(alvo.caminho) ? 'figurinha' : 'foto';
}

/** O `objectPosition` do avatar. `recorte` (opcional) é o enquadramento guardado pela pessoa e manda. */
export function enquadroAvatar(url, { recorte = null } = {}) {
  if (recorte) return recorte;
  return tipoDoAvatar(url) === 'foto' ? ENQUADRO_FOTO : ENQUADRO_FIGURINHA;
}

/**
 * Pedir ao motor o quadrado (`sq=1`) corta SEMPRE a partir do topo — o que serve à figurinha e come o rosto da
 * foto crua. Para a foto, o app pede o derivado inteiro (2:3) e o `enquadroAvatar` escolhe a janela.
 */
export const avatarQuadrado = (url) => tipoDoAvatar(url) !== 'foto';
