// Futty v2.0 — Rodada 29A (D): o enquadramento de um avatar numa moldura pequena, numa função só.
//
// A figurinha de IA leva a cabeça no topo da imagem, com folga: `objectPosition: 'top'` é o certo. A foto
// crua do card grátis (a pessoa como ela é, com o fundo dela) tem o rosto mais para o meio: com 'top' o corte
// come o rosto. Quem diz o que é cada coisa é o NOME do arquivo — a mesma regra do motor
// (backend/utils/figurinhaRegra.js): figurinha nossa mora no bucket `avatars` e leva `-ai-<kit>` no nome.
// No app a URL chega pelo proxy (`/api/media/<token>`), e o token é `base64url(JSON {b: bucket, p: caminho})`
// + assinatura: dá para LER o caminho sem chave nenhuma (a assinatura só serve para o servidor confiar).
//
// O recorte 2:3 do CARD (Rodada 28) já vai assado no arquivo do avatar (PUT /api/me/avatar/recorte); o zoom
// (−/+) do card só vive na tela da Figurinha. RODADA 29B (bloco 3, E): a MINIATURA tem recorte próprio —
// a janela quadrada {x, y, escala} que a pessoa escolhe no editor (components/EnquadroMiniatura.jsx), gravada em
// users.avatar_recorte. O motor a aplica em todas as miniaturas quadradas (`sq=1`) e a deixa na URL do proxy
// como `?rc=x,y,escala` — por isso aqui basta LER a URL: quem a recebe sabe se há recorte, de quem for o avatar.

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
 * foto crua. Para a foto, o app pede o derivado inteiro (2:3) e o `enquadroAvatar` escolhe a janela. Com recorte
 * escolhido (`?rc=`), o quadrado vem do motor JÁ na janela da pessoa — também para a foto crua (Rodada 29B, E).
 */
export const avatarQuadrado = (url) => tipoDoAvatar(url) !== 'foto' || temRecorte(url);

// ─── O recorte da miniatura (Rodada 29B, bloco 3, E) ──────────────────────────────────────────────────────────
// ATENÇÃO: `validarRecorte` e `janelaDoRecorte` são cópias de backend/utils/recorteAvatar.js — a ÚNICA definição da
// janela que o motor corta. Os dois lados são provados contra a MESMA tabela de casos (scripts/unidade/enquadro-recorte.test.mjs
// ↔ backend/tests/recorte-avatar.test.js): o que a pessoa vê ao arrastar a miniatura é o que o proxy entrega depois.
//   x, y    o CENTRO da janela, em fração da imagem (0–1)
//   escala  o zoom: 1 = a janela tem a largura da imagem (o maior quadrado que cabe); até ESCALA_MAX_RECORTE

export const ESCALA_MAX_RECORTE = 3;

const arredonda3 = (n) => Math.round(n * 1000) / 1000;
const entre = (n, min, max) => Math.min(max, Math.max(min, n));

/** { x, y, escala } válido (3 casas) ou null. Nunca lança. */
export function validarRecorte(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;
  const x = Number(bruto.x);
  const y = Number(bruto.y);
  const escala = Number(bruto.escala);
  if (![x, y, escala].every(Number.isFinite)) return null;
  if (escala < 1 || escala > ESCALA_MAX_RECORTE || x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x: arredonda3(x), y: arredonda3(y), escala: arredonda3(escala) };
}

/** A janela quadrada em pixels da imagem de `largura` × `altura`; o centro é puxado para dentro da borda. */
export function janelaDoRecorte(largura, altura, recorte) {
  const r = validarRecorte(recorte);
  if (!r || !(largura > 0) || !(altura > 0)) return null;
  const lado = Math.max(1, Math.min(Math.round(Math.min(largura, altura) / r.escala), largura, altura));
  const left = Math.round(entre(r.x * largura - lado / 2, 0, largura - lado));
  const top = Math.round(entre(r.y * altura - lado / 2, 0, altura - lado));
  return { left, top, lado };
}

/** O recorte de quem não escolheu nada: o quadrado do TOPO (o que o motor corta com `sq=1` sem `rc`). */
export function recortePadrao(largura, altura) {
  return { x: 0.5, y: arredonda3(Math.min(largura, altura) / 2 / altura), escala: 1 };
}

/** O mesmo recorte com o centro trocado pelo da janela JÁ puxada para dentro — o que o arrasto grava, para nunca "sobrar" além da borda. */
export function normalizarRecorte(largura, altura, recorte) {
  const j = janelaDoRecorte(largura, altura, recorte);
  const r = validarRecorte(recorte);
  if (!j || !r) return null;
  return validarRecorte({ x: (j.left + j.lado / 2) / largura, y: (j.top + j.lado / 2) / altura, escala: r.escala });
}

/** O recorte que o motor deixou na URL do proxy (`?rc=`), ou null. */
export function recorteDaUrl(url) {
  const m = /[?&]rc=([^&#]*)/.exec(String(url ?? ''));
  if (!m) return null;
  let texto;
  try {
    texto = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  const partes = texto.split(',');
  if (partes.length !== 3) return null;
  const [x, y, escala] = partes.map((p) => (p.trim() === '' ? NaN : Number(p)));
  return validarRecorte({ x, y, escala });
}

export const temRecorte = (url) => recorteDaUrl(url) !== null;

/** A URL sem o `rc` — é o que o editor pede, para receber a imagem inteira (2:3) e não a janela já cortada. */
export function urlSemRecorte(url) {
  return String(url ?? '').replace(/([?&])rc=[^&#]*&?/, '$1').replace(/[?&]$/, '');
}

/**
 * O estilo de uma `<img>` dentro de uma caixa QUADRADA (position: relative; overflow: hidden) para mostrar a janela
 * do recorte: a imagem inteira, escalada e deslocada, em % da caixa — a mesma janela que o motor corta.
 */
export function estiloDaJanela(largura, altura, recorte) {
  const j = janelaDoRecorte(largura, altura, recorte);
  if (!j) return null;
  return {
    position: 'absolute',
    maxWidth: 'none',
    width: `${(largura / j.lado) * 100}%`,
    height: `${(altura / j.lado) * 100}%`,
    left: `${(-j.left / j.lado) * 100}%`,
    top: `${(-j.top / j.lado) * 100}%`,
  };
}
