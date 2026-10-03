// Futty v2.0 — Os uniformes da figurinha (um lugar só: a Figurinha e a escolha do uniforme do
// pacote do time, Pagamentos P2). Os ids são os de KITS_IA no motor (backend/routes/auth.js).

// Kits do card. Assets em bucket PÚBLICO 'kits' (app assets, não PII — o tijolo 1C
// privatizou avatars e partia estas thumbnails). dark-gold e dark-purple ativos/livres.
export const KIT_IMG = {
  'dark-gold': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit1-dark-gold.png',
  'dark-purple': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit2-dark-purple.png',
  'white-gold': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit3-white-gold.png',
  'elite-gold': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit4-elite-gold.png',
  'royal-purple': 'https://ynzmjcvqdljffgbeqglh.supabase.co/storage/v1/object/public/kits/kit5-royal-purple.png',
};

// Os 5 kits do lançamento (31-jul, dono): mesmo design, cores diferentes. Os NOMES são em português (29I, achado 91: "Dark Gold", "White Gold"…
// eram inglês numa casa toda PT-BR); os ids continuam os de KITS_IA no motor — são chaves internas, nunca aparecem na tela. Este
// seletor só existe para quem já tem Brilhante — o cadeado de cada tile é
// DIREITO (crédito ou pacote do time, ver escolherKit), não plano; `estado`
// só distingue 'breve' (kit sem asset, nem aparece) dos demais.
export const KITS_FIGURINHA = [
  { id: 'dark-gold', nome: 'Ouro Escuro', base: '#0d0d12', acento: '#d4a017', estado: 'ativo' },
  { id: 'dark-purple', nome: 'Roxo Escuro', base: '#0d0d12', acento: '#8b5cf6', estado: 'ativo' },
  { id: 'white-gold', nome: 'Ouro e Branco', base: '#f8f5f0', acento: '#d4a017', estado: 'ativo' },
  { id: 'elite-gold', nome: 'Ouro Elite', base: '#d4a017', acento: '#0d0d12', estado: 'ativo' },
  { id: 'royal-purple', nome: 'Roxo Real', base: '#8b5cf6', acento: '#0d0d12', estado: 'ativo' },
];
