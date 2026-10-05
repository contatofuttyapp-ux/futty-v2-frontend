// Futty v2.0 — Rodada 29Z (item 3e): a RÉGUA do celular estreito, uma só para a varredura (scripts/varrer-estreito.mjs, contra o servidor local
// com a conta demo) e para a prova do navegador (scripts/provas/rodada-29z.prova.mjs, com o motor de mentira). Roda DENTRO da página
// (page.evaluate(medir, larguraDaJanela)) e por isso não pode usar nada de fora dela: tudo que precisa mora dentro da função.
//
// Devolve a lista de defeitos que a pessoa sentiria: rolagem para o lado, texto com reticências, campo/botão/texto cortado por um cartão,
// elemento que passa da borda da janela, e número com PONTO decimal no texto (a lei de números em PT-BR da 29Z).


export function medir(larguraJanela) {
  const achados = [];
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const rotulo = (el) => {
    const t = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return `<${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}>${t ? ` "${t}"` : ''}`;
  };
  const rolaDeProposito = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
    }
    return false;
  };

  const doc = document.documentElement;
  if (doc.scrollWidth > larguraJanela + 1) achados.push({ tipo: 'rola-para-o-lado', detalhe: `a página tem ${doc.scrollWidth} px numa janela de ${larguraJanela}` });

  const todos = [...document.body.querySelectorAll('*')].filter(visivel);
  for (const el of todos) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const tag = el.tagName;
    if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'CANVAS', 'IMG', 'VIDEO'].includes(tag.toUpperCase())) continue;

    // 1 · reticências: o texto não cabe e a caixa o apara com "…"
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) achados.push({ tipo: 'reticencias', detalhe: `${rotulo(el)} (${el.scrollWidth} px de texto numa caixa de ${el.clientWidth})` });
    // (o corte de linhas — -webkit-line-clamp — fica de fora de propósito: é a prévia do "Sobre o time" e da bio, que a casa aceita aparada;
    //  o que não se aceita é cortar NOME, CAMPO ou BOTÃO)

    // 2 · contêiner que corta: tem overflow escondido e o conteúdo é mais largo que a caixa (e não é uma faixa que rola de propósito)
    const corta = ['hidden', 'clip'].includes(cs.overflowX) && cs.textOverflow !== 'ellipsis';
    if (corta && el.scrollWidth > el.clientWidth + 1 && !rolaDeProposito(el)) {
      // só interessa se o que passa é conteúdo (texto, campo, botão) e não decoração posicionada de propósito
      const filhos = [...el.children].filter(visivel).filter((f) => getComputedStyle(f).position !== 'absolute' && getComputedStyle(f).position !== 'fixed');
      const passam = filhos.filter((f) => f.getBoundingClientRect().right > r.right + 1);
      if (passam.length) achados.push({ tipo: 'contêiner-corta', detalhe: `${rotulo(el)} corta ${Math.round(el.scrollWidth - el.clientWidth)} px à direita; passa: ${passam.slice(0, 2).map(rotulo).join(' | ')}` });
    }

    // 3 · campo, botão ou texto que passa da borda da janela
    const interativo = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(tag);
    if (interativo && (r.right > larguraJanela + 1 || r.left < -1) && !rolaDeProposito(el)) achados.push({ tipo: 'passa-da-janela', detalhe: `${rotulo(el)} vai de ${Math.round(r.left)} a ${Math.round(r.right)} numa janela de ${larguraJanela}` });

    // 4 · campo ou botão que passa da borda de um contêiner que CORTA — por overflow, por clip-path (os cantos 45° da casa) ou por contain.
    //     É o defeito do Novo jogo: o cartão não tem overflow escondido, mas o recorte do cartão apara o que passa da borda.
    if (interativo && !rolaDeProposito(el)) { // (as faixas de chips e os seletores que rolam de lado são de propósito)
      for (let pai = el.parentElement; pai && pai !== document.body; pai = pai.parentElement) {
        const ps = getComputedStyle(pai);
        const recorta = ['hidden', 'clip'].includes(ps.overflowX) || (ps.clipPath && ps.clipPath !== 'none') || /paint|strict|content/.test(ps.contain || '');
        if (!recorta) continue;
        const pr = pai.getBoundingClientRect();
        if (r.right > pr.right + 1 || r.left < pr.left - 1) {
          achados.push({ tipo: 'cortado-pelo-cartao', detalhe: `${rotulo(el)} vai de ${Math.round(r.left)} a ${Math.round(r.right)}; o cartão ${rotulo(pai)} vai de ${Math.round(pr.left)} a ${Math.round(pr.right)}` });
          break;
        }
      }
    }
  }

  // 4 · número com ponto decimal no TEXTO que a pessoa lê (texto visível + rótulos de acessibilidade, títulos e dicas de campo)
  const textos = [];
  const andador = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = andador.nextNode(); n; n = andador.nextNode()) {
    const pai = n.parentElement;
    if (pai && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(pai.tagName) && visivel(pai)) textos.push(n.nodeValue);
  }
  for (const el of document.body.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) {
    for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v) textos.push(v); }
  }
  const PONTO = /(^|[^\d.:/])\d+\.\d+(?![\d.:/]|\s*(?:km|MB|KB))/; // 77.9, 9.10 — fora horas (20:00), datas, versões e IPs
  for (const t of textos) if (PONTO.test(t)) achados.push({ tipo: 'numero-com-ponto', detalhe: `"${t.replace(/\s+/g, ' ').trim().slice(0, 70)}"` });

  return achados;
}
