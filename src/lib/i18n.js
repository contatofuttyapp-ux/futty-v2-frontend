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

export function getIdioma() {
  return localStorage.getItem('futty_idioma') || IDIOMA_PADRAO;
}

export function setIdioma(idioma) {
  localStorage.setItem('futty_idioma', idioma);
  window.location.reload(); // reload para aplicar
}

export function t(chave) {
  const idioma = getIdioma();
  return TRADUCOES[idioma]?.[chave] || chave;
}
