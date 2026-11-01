(function () {
  "use strict";

  var G = window.GABARITO;
  var Q = G.questoes;
  var ALTS = G.alternativas.split("");
  var CHAVE = "falcoes-gabarito-" + G.id;

  // ---------- estado salvo no aparelho ----------
  function novoEstado() { return { nome: "", inicio: null, fim: null, resp: {} }; }
  function carregar() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE));
      if (s && typeof s === "object" && s.resp) return s;
    } catch (e) { /* sem armazenamento: segue só na memória */ }
    return novoEstado();
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) { /* ignora */ }
  }
  var st = carregar();

  // ---------- utilidades ----------
  var $ = function (id) { return document.getElementById(id); };
  function p2(n) { return String(n).padStart(2, "0"); }
  function fmtHora(t) { var d = new Date(t); return p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds()); }
  function fmtData(t) { var d = new Date(t); return p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function fmtDataHora(t) { return fmtData(t) + " às " + fmtHora(t); }
  function fmtDur(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return p2(Math.floor(s / 3600)) + ":" + p2(Math.floor((s % 3600) / 60)) + ":" + p2(s % 60);
  }
  function pct(a, t) { return (t ? (a / t) * 100 : 0).toFixed(1).replace(".", ",") + "%"; }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function faixa(lista) { return p2(lista[0].n) + "–" + p2(lista[lista.length - 1].n); }
  function porMateria() {
    var grupos = [], idx = {};
    Q.forEach(function (q) {
      if (!(q.materia in idx)) { idx[q.materia] = grupos.length; grupos.push({ nome: q.materia, qs: [] }); }
      grupos[idx[q.materia]].qs.push(q);
    });
    return grupos;
  }

  // ---------- correção ----------
  function apurar() {
    var r = { total: Q.length, certas: 0, erradas: 0, branco: 0, materias: [] };
    porMateria().forEach(function (g) {
      var m = { nome: g.nome, total: g.qs.length, certas: 0 };
      g.qs.forEach(function (q) {
        var marc = st.resp[q.n];
        if (!marc) r.branco++;
        else if (marc === q.resp) { r.certas++; m.certas++; }
        else r.erradas++;
      });
      r.materias.push(m);
    });
    r.pct = pct(r.certas, r.total);
    return r;
  }
  function situacao(q) {
    var m = st.resp[q.n];
    return !m ? "branco" : m === q.resp ? "certo" : "errado";
  }

  // ---------- telas ----------
  var relogio = null;
  function mostrar(id) {
    ["tela-inicio", "tela-prova", "tela-resultado"].forEach(function (t) { $(t).hidden = t !== id; });
    if (relogio) { clearInterval(relogio); relogio = null; }
    window.scrollTo(0, 0);
  }

  function telaInicio() {
    $("fato-total").textContent = Q.length;
    $("fato-alts").textContent = ALTS[0] + " a " + ALTS[ALTS.length - 1];
    if (st.nome) $("nome").value = st.nome;
    mostrar("tela-inicio");
  }

  $("form-inicio").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var nome = $("nome").value.replace(/\s+/g, " ").trim();
    if (nome.length < 3) {
      $("erro-nome").textContent = "Digite o seu nome completo para começar.";
      $("nome").focus();
      return;
    }
    $("erro-nome").textContent = "";
    st = novoEstado();
    st.nome = nome;
    st.inicio = Date.now();
    salvar();
    telaProva();
  });

  var montada = false;
  function montarQuestoes() {
    var raiz = $("questoes");
    raiz.textContent = "";
    porMateria().forEach(function (g) {
      var h = el("h2", "materia", g.nome);
      h.appendChild(el("small", null, faixa(g.qs)));
      raiz.appendChild(h);
      var grade = el("div", "grade");
      g.qs.forEach(function (q) {
        var linha = el("div", "q");
        linha.id = "q" + q.n;
        linha.setAttribute("role", "radiogroup");
        linha.setAttribute("aria-label", "Questão " + p2(q.n));
        linha.appendChild(el("span", "qn", p2(q.n)));
        var alts = el("div", "alts");
        ALTS.forEach(function (a) {
          var b = el("button", "alt", a);
          b.type = "button";
          b.setAttribute("role", "radio");
          b.setAttribute("aria-checked", "false");
          b.setAttribute("aria-label", "Questão " + p2(q.n) + ", alternativa " + a);
          b.dataset.n = q.n;
          b.dataset.a = a;
          alts.appendChild(b);
        });
        linha.appendChild(alts);
        grade.appendChild(linha);
      });
      raiz.appendChild(grade);
    });
    raiz.addEventListener("click", function (ev) {
      var b = ev.target.closest(".alt");
      if (!b || st.fim) return;
      var n = Number(b.dataset.n), a = b.dataset.a;
      if (st.resp[n] === a) delete st.resp[n];
      else st.resp[n] = a;
      salvar();
      pintarQuestao(n);
      atualizarContagem();
    });
    montada = true;
  }
  function pintarQuestao(n) {
    var linha = $("q" + n);
    if (!linha) return;
    linha.classList.toggle("marcada", !!st.resp[n]);
    linha.querySelectorAll(".alt").forEach(function (b) {
      b.setAttribute("aria-checked", String(st.resp[n] === b.dataset.a));
    });
  }
  function atualizarContagem() {
    var feitas = Q.filter(function (q) { return st.resp[q.n]; }).length;
    $("contagem").textContent = feitas;
    $("progresso").style.width = (feitas / Q.length) * 100 + "%";
  }
  function telaProva() {
    if (!montada) montarQuestoes();
    Q.forEach(function (q) { pintarQuestao(q.n); });
    $("barra-nome").textContent = st.nome;
    $("barra-inicio").textContent = "Início: " + fmtHora(st.inicio);
    $("contagem-total").textContent = Q.length;
    atualizarContagem();
    mostrar("tela-prova");
    var tick = function () { $("relogio").textContent = fmtDur(Date.now() - st.inicio); };
    tick();
    relogio = setInterval(tick, 1000);
  }

  // ---------- confirmação ----------
  function confirmar(titulo, texto, rotuloSim, aoConfirmar) {
    $("modal-titulo").textContent = titulo;
    $("modal-texto").textContent = texto;
    $("modal-sim").textContent = rotuloSim;
    $("modal").hidden = false;
    $("modal-sim").focus();
    var fechar = function () { $("modal").hidden = true; $("modal-sim").onclick = null; $("modal-nao").onclick = null; };
    $("modal-nao").onclick = fechar;
    $("modal-sim").onclick = function () { fechar(); aoConfirmar(); };
  }
  $("modal").addEventListener("click", function (ev) { if (ev.target === $("modal")) $("modal-nao").click(); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !$("modal").hidden) $("modal-nao").click(); });

  $("btn-finalizar").addEventListener("click", function () {
    var brancos = Q.filter(function (q) { return !st.resp[q.n]; });
    var texto = brancos.length
      ? "Você deixou " + brancos.length + (brancos.length === 1 ? " questão" : " questões") + " em branco (" +
        brancos.slice(0, 12).map(function (q) { return p2(q.n); }).join(", ") + (brancos.length > 12 ? "…" : "") +
        "). Em branco não pontua. Depois de finalizar, não dá para alterar."
      : "Você marcou as " + Q.length + " questões. Depois de finalizar, não dá para alterar.";
    confirmar("Finalizar gabarito?", texto, "Finalizar", function () {
      st.fim = Date.now();
      salvar();
      telaResultado();
    });
  });

  $("btn-refazer").addEventListener("click", function () {
    confirmar("Fazer de novo?", "Isso apaga as marcações e o resultado salvos neste aparelho. Baixe o PDF antes, se quiser guardar.", "Apagar", function () {
      var nome = st.nome;
      st = novoEstado();
      st.nome = nome;
      salvar();
      telaInicio();
    });
  });

  // ---------- resultado ----------
  function telaResultado() {
    var r = apurar();
    $("res-nome").textContent = st.nome;
    $("res-nota").innerHTML = "";
    $("res-nota").appendChild(document.createTextNode(r.certas));
    $("res-nota").appendChild(el("small", null, "/" + r.total));
    $("res-pct").textContent = r.pct + " de aproveitamento · 1 ponto por questão";
    var chips = $("res-chips");
    chips.textContent = "";
    [["certas", r.certas], ["erradas", r.erradas], ["em branco", r.branco]].forEach(function (c) {
      var s = el("span");
      s.appendChild(el("b", null, c[1]));
      s.appendChild(document.createTextNode(" " + c[0]));
      chips.appendChild(s);
    });
    $("res-inicio").textContent = fmtHora(st.inicio);
    $("res-inicio-d").textContent = fmtData(st.inicio);
    $("res-fim").textContent = fmtHora(st.fim);
    $("res-fim-d").textContent = fmtData(st.fim);
    $("res-dur").textContent = fmtDur(st.fim - st.inicio);

    var mats = $("res-materias");
    mats.textContent = "";
    r.materias.forEach(function (m) {
      var d = el("div", "mat");
      d.appendChild(el("span", null, m.nome));
      d.appendChild(el("b", null, m.certas + "/" + m.total));
      var t = el("div", "trilho");
      var i = el("i");
      i.style.width = (m.certas / m.total) * 100 + "%";
      t.appendChild(i);
      d.appendChild(t);
      mats.appendChild(d);
    });

    var grade = $("res-grade");
    grade.textContent = "";
    Q.forEach(function (q) {
      var s = situacao(q);
      var c = el("div", "cel " + s);
      var topo = el("div", "cn", p2(q.n));
      topo.appendChild(el("span", "ic", s === "certo" ? "✓" : s === "errado" ? "✕" : ""));
      c.appendChild(topo);
      var l1 = el("div", null, "Sua: ");
      l1.appendChild(el("b", null, st.resp[q.n] || "—"));
      var l2 = el("div", null, "Oficial: ");
      l2.appendChild(el("b", null, q.resp));
      c.appendChild(l1);
      c.appendChild(l2);
      c.title = "Questão " + p2(q.n) + " · " + q.materia;
      grade.appendChild(c);
    });
    mostrar("tela-resultado");
  }

  // ---------- PDF (gerado no navegador) ----------
  var FONTES = [
    ["Poppins-Regular.ttf", "Poppins", "normal"],
    ["Poppins-SemiBold.ttf", "Poppins", "bold"],
    ["Anton-Regular.ttf", "Anton", "normal"]
  ];
  var cacheFontes = null, cacheLogo = null;

  function paraBase64(buf) {
    var u = new Uint8Array(buf), s = "";
    for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function baixarFontes() {
    if (!cacheFontes) {
      cacheFontes = Promise.all(FONTES.map(function (f) {
        return fetch("assets/fonts/" + f[0]).then(function (r) {
          if (!r.ok) throw new Error("fonte " + f[0]);
          return r.arrayBuffer();
        }).then(function (b) { return [f[0], f[1], f[2], paraBase64(b)]; });
      })).catch(function (e) { cacheFontes = null; throw e; });
    }
    return cacheFontes;
  }
  function baixarLogo() {
    if (!cacheLogo) {
      cacheLogo = fetch("assets/logo-pdf.png").then(function (r) {
        if (!r.ok) throw new Error("logo");
        return r.arrayBuffer();
      }).then(function (b) { return "data:image/png;base64," + paraBase64(b); })
        .catch(function () { cacheLogo = null; return null; });
    }
    return cacheLogo;
  }

  async function montarPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("jsPDF não carregou");
    var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4", compress: true });
    var F = { r: ["helvetica", "normal"], b: ["helvetica", "bold"], t: ["helvetica", "bold"] };
    try {
      var fs = await baixarFontes();
      fs.forEach(function (f) { doc.addFileToVFS(f[0], f[3]); doc.addFont(f[0], f[1], f[2]); });
      F = { r: ["Poppins", "normal"], b: ["Poppins", "bold"], t: ["Anton", "normal"] };
    } catch (e) { /* sem as fontes da marca: usa Helvetica */ }
    var logo = await baixarLogo();
    var r = apurar();

    var W = 210, M = 14, X2 = W - M, LARG = X2 - M;
    var INK = [11, 13, 18], BLUE = [29, 78, 216], MUTED = [93, 99, 112], LINE = [228, 231, 236],
        SOFT = [245, 246, 248], BLUEL = [238, 243, 255], WHITE = [255, 255, 255];
    function fonte(f, tam, cor) { doc.setFont(f[0], f[1]); doc.setFontSize(tam); doc.setTextColor.apply(doc, cor || INK); }
    function rotulo(t, x, y, cor) { fonte(F.b, 6.8, cor || MUTED); doc.text(t.toUpperCase(), x, y, { charSpace: 0.5 }); }
    function caber(t, f, tam, max) {
      fonte(f, tam);
      while (tam > 6 && doc.getTextWidth(t) > max) { tam -= 0.5; doc.setFontSize(tam); }
      return tam;
    }

    // cabeçalho
    if (logo) doc.addImage(logo, "PNG", M, 10.5, 38, 15.6);
    fonte(F.t, 21); doc.text("GABARITO DO ALUNO", X2, 18.5, { align: "right" });
    fonte(F.r, 8.5, MUTED); doc.text(G.titulo + " · " + Q.length + " questões · alternativas " + ALTS[0] + " a " + ALTS[ALTS.length - 1], X2, 24.5, { align: "right" });
    doc.setDrawColor.apply(doc, BLUE); doc.setLineWidth(0.9); doc.line(M, 30.5, X2, 30.5);

    // dados do aluno
    var y = 35;
    doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.3);
    doc.roundedRect(M, y, LARG, 27, 2.2, 2.2, "S");
    doc.line(M, y + 13.5, X2, y + 13.5);
    rotulo("Aluno(a)", M + 5, y + 5.4);
    var tamNome = caber(st.nome, F.b, 12.5, LARG - 10);
    fonte(F.b, tamNome); doc.text(st.nome, M + 5, y + 10.8);
    var cw = (LARG - 10) / 3;
    [["Início", fmtDataHora(st.inicio)], ["Fim", fmtDataHora(st.fim)], ["Duração", fmtDur(st.fim - st.inicio)]].forEach(function (c, i) {
      var x = M + 5 + i * cw;
      rotulo(c[0], x, y + 18.6);
      fonte(F.r, 9.8); doc.text(c[1], x, y + 23.8);
    });

    // nota final
    y = 67;
    var HB = 48, LB = 64;
    doc.setFillColor.apply(doc, INK); doc.roundedRect(M, y, LB, HB, 3, 3, "F");
    rotulo("Nota final", M + 6, y + 8, [159, 182, 255]);
    fonte(F.t, 40, WHITE); var nota = String(r.certas); doc.text(nota, M + 6, y + 27);
    var wn = doc.getTextWidth(nota);
    fonte(F.t, 18, [154, 163, 181]); doc.text("/" + r.total, M + 6 + wn + 1.2, y + 27);
    fonte(F.r, 9, [219, 228, 255]); doc.text(r.pct + " de aproveitamento", M + 6, y + 34.5);
    var cont = r.certas + " certas · " + r.erradas + " erradas · " + r.branco + " em branco";
    var tc = caber(cont, F.r, 7.8, LB - 12);
    fonte(F.r, tc, [200, 206, 218]); doc.text(cont, M + 6, y + 41.5);

    // desempenho por matéria
    var xm = M + LB + 7, wm = X2 - xm;
    rotulo("Desempenho por matéria", xm, y + 3.5);
    var nm = r.materias.length, passo = Math.min(6.2, (HB - 7) / nm);
    var xBar = xm + 52, wBar = wm - 52 - 14;
    r.materias.forEach(function (m, i) {
      var yy = y + 9.6 + i * passo;
      var tm = caber(m.nome, F.r, 8.4, 50);
      fonte(F.r, tm); doc.text(m.nome, xm, yy);
      doc.setFillColor.apply(doc, BLUEL); doc.roundedRect(xBar, yy - 2.4, wBar, 2.8, 1.4, 1.4, "F");
      if (m.certas) { doc.setFillColor.apply(doc, BLUE); doc.roundedRect(xBar, yy - 2.4, Math.max(2.8, wBar * m.certas / m.total), 2.8, 1.4, 1.4, "F"); }
      fonte(F.b, 8.4); doc.text(m.certas + "/" + m.total, X2, yy, { align: "right" });
    });

    // tabela: marcações × gabarito oficial
    y = 124;
    fonte(F.t, 13); doc.text("SUAS MARCAÇÕES × GABARITO OFICIAL", M, y);
    var leg = [["Certa", BLUE, "F"], ["Errada", INK, "F"], ["Em branco", null, "S"]];
    var xl = X2;
    for (var k = leg.length - 1; k >= 0; k--) {
      fonte(F.r, 7.8, MUTED);
      var wt = doc.getTextWidth(leg[k][0]);
      doc.text(leg[k][0], xl, y - 0.4, { align: "right" });
      var xq = xl - wt - 4.6;
      if (leg[k][1]) { doc.setFillColor.apply(doc, leg[k][1]); doc.roundedRect(xq, y - 3, 3, 3, 0.7, 0.7, "F"); }
      else { doc.setDrawColor(190, 196, 206); doc.setLineWidth(0.35); doc.roundedRect(xq, y - 3, 3, 3, 0.7, 0.7, "S"); }
      xl = xq - 4;
    }

    var cols = 3, gap = 6, colW = (LARG - gap * (cols - 1)) / cols;
    var porCol = Math.ceil(Q.length / cols);
    var topoT = y + 4, rodapeT = 268;
    var rowH = Math.min(6.6, (rodapeT - topoT - 6) / porCol);
    for (var c = 0; c < cols; c++) {
      var x0 = M + c * (colW + gap);
      doc.setFillColor.apply(doc, INK); doc.roundedRect(x0, topoT, colW, 6, 1.2, 1.2, "F");
      rotulo("Nº", x0 + 3, topoT + 4, WHITE);
      rotulo("Sua", x0 + 19, topoT + 4, WHITE);
      rotulo("Oficial", x0 + 31, topoT + 4, WHITE);
      for (var i2 = 0; i2 < porCol; i2++) {
        var q = Q[c * porCol + i2];
        if (!q) break;
        var ry = topoT + 6 + i2 * rowH;
        var sit = situacao(q), marc = st.resp[q.n];
        if (i2 % 2 === 1) { doc.setFillColor.apply(doc, SOFT); doc.rect(x0, ry, colW, rowH, "F"); }
        var by = ry + rowH / 2 + 1.25;
        fonte(F.b, 9.5); doc.text(p2(q.n), x0 + 3, by);
        fonte(F.b, 10, sit === "certo" ? BLUE : sit === "errado" ? INK : MUTED);
        doc.text(marc || "—", x0 + 21.5, by, { align: "center" });
        fonte(F.b, 10); doc.text(q.resp, x0 + 36, by, { align: "center" });
        var cx = x0 + colW - 6, cy = ry + rowH / 2;
        if (sit === "branco") {
          doc.setDrawColor(190, 196, 206); doc.setLineWidth(0.35); doc.circle(cx, cy, 2, "S");
        } else {
          doc.setFillColor.apply(doc, sit === "certo" ? BLUE : INK); doc.circle(cx, cy, 2.1, "F");
          doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.55); doc.setLineCap("round");
          if (sit === "certo") { doc.line(cx - 1, cy + 0.05, cx - 0.25, cy + 0.85); doc.line(cx - 0.25, cy + 0.85, cx + 1.1, cy - 0.8); }
          else { doc.line(cx - 0.8, cy - 0.8, cx + 0.8, cy + 0.8); doc.line(cx - 0.8, cy + 0.8, cx + 0.8, cy - 0.8); }
        }
      }
      doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.3);
      doc.rect(x0, topoT + 6, colW, porCol * rowH, "S");
    }

    // observação e rodapé
    fonte(F.r, 7.6, MUTED);
    doc.text("Correção automática: 1 ponto por questão certa; questão em branco não pontua. Gabarito oficial: Falcões Preparatório.", M, 275);
    doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.3); doc.line(M, 281, X2, 281);
    fonte(F.b, 7.6, BLUE); doc.text("@falcoespreparatorio", M, 286);
    var wf = doc.getTextWidth("@falcoespreparatorio ");
    fonte(F.r, 7.6, MUTED); doc.text("· Falcões Preparatório · Carreiras Policiais", M + wf, 286);
    doc.text("Gerado em " + fmtDataHora(Date.now()), X2, 286, { align: "right" });

    doc.setProperties({ title: "Gabarito do aluno · " + G.titulo + " · " + st.nome, author: "Falcões Preparatório", creator: "Gabarito online Falcões" });
    return doc;
  }
  function nomeArquivo() {
    var limpo = st.nome.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "aluno";
    return "Gabarito " + G.titulo.replace(/^Simulado\s+/i, "") + " - " + limpo + ".pdf";
  }

  $("btn-pdf").addEventListener("click", async function () {
    var b = this, rot = b.textContent;
    b.disabled = true;
    b.textContent = "Gerando PDF…";
    try {
      var doc = await montarPdf();
      doc.save(nomeArquivo());
    } catch (e) {
      console.error(e);
      alert("Não foi possível gerar o PDF agora. Confira a internet e toque de novo em Baixar gabarito.");
    } finally {
      b.disabled = false;
      b.textContent = rot;
    }
  });

  // usado nos testes e para depuração
  window.FalcoesGabarito = { apurar: apurar, montarPdf: montarPdf, estado: function () { return st; } };

  // ---------- abrir na tela certa ----------
  if (st.fim && st.inicio) telaResultado();
  else if (st.inicio) telaProva();
  else telaInicio();
})();
