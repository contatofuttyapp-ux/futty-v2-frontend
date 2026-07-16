// Futty v2.0 — i18n leve (PT-BR / PT-PT) para os ~15 termos que diferem.
// Sem react-i18next: só um dicionário + helper t(). A preferência fica em
// localStorage e a troca faz reload. Usar t() nas novas funcionalidades; os
// textos existentes já estão em PT-BR hardcoded (não refactorizar agora).

const TRADUCOES = {
  'pt-BR': {
    time: 'time', times: 'times',
    usuario: 'usuário', senha: 'senha',
    salvar: 'Salvar', excluir: 'Excluir',
    compartilhar: 'Compartilhar',
    ativo: 'ativo', inativo: 'inativo',
    celular: 'celular', arquivo: 'arquivo',
    carregando: 'Carregando', gerando: 'Gerando',
    criando: 'Criando', enviando: 'Enviando',
  },
  'pt-PT': {
    time: 'equipa', times: 'equipas',
    usuario: 'utilizador', senha: 'palavra-passe',
    salvar: 'Guardar', excluir: 'Apagar',
    compartilhar: 'Partilhar',
    ativo: 'activo', inativo: 'inactivo',
    celular: 'telemóvel', arquivo: 'ficheiro',
    carregando: 'A carregar', gerando: 'A gerar',
    criando: 'A criar', enviando: 'A enviar',
  },
};

export const IDIOMA_PADRAO = 'pt-BR';

// Catálogo do selector. `nome` é o idioma NA PRÓPRIA LÍNGUA — quem procura o seu
// idioma numa lista procura a palavra que conhece, não a tradução dela.
// `traduzido` diz a verdade: só o par PT tem dicionário (ver TRADUCOES). Os outros
// gravam a escolha e ficam com o texto em PT — o sheet diz isso em vez de fingir.
export const IDIOMAS = [
  { id: 'pt-BR', bandeira: '🇧🇷', nome: 'Português (Brasil)', traduzido: true },
  { id: 'pt-PT', bandeira: '🇵🇹', nome: 'Português (Portugal)', traduzido: true },
  { id: 'en', bandeira: '🇺🇸', nome: 'English', traduzido: false },
  { id: 'es', bandeira: '🇪🇸', nome: 'Español', traduzido: false },
  { id: 'ko', bandeira: '🇰🇷', nome: '한국어', traduzido: false },
  { id: 'fr', bandeira: '🇫🇷', nome: 'Français', traduzido: false },
];

export function nomeIdioma(id) {
  return IDIOMAS.find((i) => i.id === id)?.nome || IDIOMAS[0].nome;
}

export function getIdioma() {
  return localStorage.getItem('futty_idioma') || IDIOMA_PADRAO;
}

export function setIdioma(idioma) {
  localStorage.setItem('futty_idioma', idioma);
  window.location.reload(); // reload para aplicar
}

// O fallback é para o PT-BR e NÃO para a chave crua. Antes era `|| chave`, e isso
// bastava enquanto só existiam os dois PT — qualquer idioma guardado tinha
// dicionário. Com o selector a aceitar en/es/ko/fr, o `|| chave` passaria a
// devolver o identificador em vez do texto: t('salvar') dava "salvar" em minúscula,
// t('carregando') dava "carregando". Ou seja, escolher 한국어 não deixava o texto em
// PT — estragava-o. Com o fallback no padrão, a promessa do sheet ("o texto continua
// em PT até haver tradução") passa a ser verdade.
export function t(chave) {
  const idioma = getIdioma();
  return TRADUCOES[idioma]?.[chave] ?? TRADUCOES[IDIOMA_PADRAO]?.[chave] ?? chave;
}
