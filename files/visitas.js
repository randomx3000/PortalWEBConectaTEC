(function () {
  "use strict";

  var CARRERAS = ["INGENIERÍA INDUSTRIAL", "INGENIERÍA EN SISTEMAS COMPUTACIONALES", "INGENIERÍA ELECTRÓNICA",
    "INGENIERÍA ELECTROMECÁNICA", "INGENIERÍA EN INDUSTRIAS ALIMENTARIAS", "INGENIERÍA EN GESTIÓN EMPRESARIAL",
    "INGENIERÍA BIOQUÍMICA", "INGENIERÍA CIVIL", "INGENIERÍA MECATRÓNICA"];
  var MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  function fechaLarga(iso) { var p = iso.split("-"); return parseInt(p[2], 10) + " de " + MESES[parseInt(p[1], 10) - 1] + " de " + p[0]; }
  function fechaHora(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) + ", " +
      d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }) + " h";
  }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function correoValido(c) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c); }

  /* ====== Estados y revisiones ====== */
  var ESTADOS = {
    PENDIENTE: { t: "Pendiente", c: "pend" },
    "VISTO BUENO": { t: "Con visto bueno", c: "visto" },
    AUTORIZADA: { t: "Autorizada", c: "ok" },
    RECHAZADA: { t: "Rechazada", c: "no" }
  };
  function revisionVacia() { return { estado: "PENDIENTE", por: "", correo: "", fecha: null, comentario: "" }; }
  function estadoDe(s) {
    var j = s.revisiones.jefatura.estado, sd = s.revisiones.subdireccion.estado;
    if (j === "RECHAZADA" || sd === "RECHAZADA") return "RECHAZADA";
    if (sd === "APROBADA") return "AUTORIZADA";
    if (j === "APROBADA") return "VISTO BUENO";
    return "PENDIENTE";
  }
  function normalizar(s) {
    if (!s) return s;
    s.revisiones = s.revisiones || {};
    s.revisiones.jefatura = Object.assign(revisionVacia(), s.revisiones.jefatura || {});
    s.revisiones.subdireccion = Object.assign(revisionVacia(), s.revisiones.subdireccion || {});
    s.estudiantes = s.estudiantes || [];
    s.correoJefatura = s.correoJefatura || "";
    s.correoSubdireccion = s.correoSubdireccion || "";
    s.estado = estadoDe(s);
    return s;
  }
  function chip(estado) {
    var d = ESTADOS[estado] || ESTADOS.PENDIENTE;
    return '<span class="chip ' + d.c + '">' + d.t + '</span>';
  }

  /* ====== PDF de la solicitud ====== */
  function construirPDF(s) {
    normalizar(s);
    var jsPDF = window.jspdf.jsPDF, doc = new jsPDF({ unit: "pt", format: "letter" });
    var M = 54, W = 504, y = 58;
    function salto(h) { if (y + h > 735) { doc.addPage(); y = 58; } }
    function titulo(t) {
      salto(34); doc.setFillColor(25, 32, 128); doc.rect(M, y - 12, W, 18, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text(t, M + 6, y + 1);
      doc.setTextColor(0); y += 22;
    }
    function campo(etiqueta, valor) {
      var lineas = doc.splitTextToSize(String(valor), W - 160);
      salto(lineas.length * 12.5 + 4);
      doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.text(etiqueta, M, y);
      doc.setFont("helvetica", "normal"); doc.text(lineas, M + 160, y);
      y += lineas.length * 12.5 + 4;
    }
    function firmaTexto(r) {
      if (r.estado === "PENDIENTE") return "Pendiente de firma.";
      var t = (r.estado === "APROBADA" ? "Aprobado / Visto bueno" : "Rechazado") + " por " + r.por +
        " (" + r.correo + ") el " + fechaHora(r.fecha) + ".";
      if (r.comentario) t += " Comentario: " + r.comentario;
      return t;
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("INSTITUTO TECNOLÓGICO SUPERIOR DE XALAPA", 306, y, { align: "center" }); y += 16;
    doc.setFontSize(11); doc.text("SOLICITUD DE VISITA ACADÉMICA", 306, y, { align: "center" }); y += 10;
    doc.setDrawColor(212, 160, 23); doc.setLineWidth(2); doc.line(M, y, M + W, y); y += 18;
    doc.setFontSize(9.5); doc.setFont("helvetica", "bold"); doc.text("Folio: " + s.folio, M, y);
    doc.setFont("helvetica", "normal"); doc.text("Fecha de solicitud: " + fechaLarga(s.creada.slice(0, 10)), M + W, y, { align: "right" }); y += 14;
    doc.setFont("helvetica", "bold"); doc.text("Estado: " + (ESTADOS[s.estado] || ESTADOS.PENDIENTE).t, M, y); y += 8;

    titulo("1. DATOS DEL DOCENTE Y ADSCRIPCIÓN");
    campo("Docente solicitante:", s.docente); campo("Jefatura de División:", s.jefatura);
    campo("Academia:", s.academia); campo("Asignatura:", s.asignatura); campo("Programa educativo:", s.programa);
    y += 6; titulo("2. JUSTIFICACIÓN ACADÉMICA Y CUMPLIMIENTO NORMATIVO");
    campo("Objetivo de la visita:", s.objetivo); campo("Impacto curricular:", s.impacto + " %");
    campo("Justificación del impacto:", s.justificacion);
    campo("Límite semestral:", "Declara que la visita no excede el máximo de dos visitas por semestre por academia." + (s.adicional ? " Visita adicional (imparte clase en otra academia)." : ""));
    y += 6; titulo("3. LOGÍSTICA Y DATOS DE LA EMPRESA DESTINO");
    campo("Empresa u organización:", s.empresa); campo("Ubicación / dirección:", s.ubicacion);
    campo("Modalidad:", s.modalidad); campo("Duración:", s.duracion === "2" ? "2 días" : "1 día");
    campo("Día 1:", fechaLarga(s.f1) + ", de " + s.h1i + " a " + s.h1f + " h");
    if (s.duracion === "2") campo("Día 2:", fechaLarga(s.f2) + ", de " + s.h2i + " a " + s.h2f + " h");
    y += 6; titulo("4. ESTUDIANTES ASISTENTES (" + s.estudiantes.length + ")");
    function fila(a, b, c, enc) {
      salto(18); doc.setFont("helvetica", enc ? "bold" : "normal"); doc.setFontSize(9.5);
      if (enc) { doc.setFillColor(235, 237, 250); doc.rect(M, y - 11, W, 16, "F"); }
      doc.text(a, M + 6, y); doc.text(b, M + 40, y); doc.text(c, M + 150, y);
      doc.setDrawColor(210); doc.setLineWidth(0.5); doc.line(M, y + 5, M + W, y + 5); y += 16;
    }
    fila("No.", "Núm. de control", "Nombre completo", true);
    s.estudiantes.forEach(function (e, i) { fila(String(i + 1), e.control, e.nombre, false); });

    y += 6; titulo("5. FLUJO DIGITAL DE VISTOS BUENOS Y AUTORIZACIÓN");
    campo("Correo Jefatura de División:", s.correoJefatura || "—");
    campo("Correo Subdirección Académica:", s.correoSubdireccion || "—");
    campo("Visto bueno (Jefatura):", firmaTexto(s.revisiones.jefatura));
    campo("Autorización (Subdirección):", firmaTexto(s.revisiones.subdireccion));
    if (s.enviadaEn) campo("Envío a Residencias Profesionales:", fechaHora(s.enviadaEn));

    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120);
      doc.text("ConectaTEC · Página " + i + " de " + n, 306, 765, { align: "center" }); doc.setTextColor(0);
    }
    doc.setProperties({ title: "Solicitud de visita académica " + s.folio, author: "ConectaTEC" });
    return doc;
  }
  window.VisitasPDF = { construir: construirPDF };

  /* ====== Página ====== */
  function $(id) { return document.getElementById(id); }
  if (!$("form-solicitud")) return;

  var usuario = window.Auth && window.Auth.usuario ? window.Auth.usuario() : null;
  var rol = usuario ? usuario.rol : "";
  var esJefatura = rol === "JEFATURA DE DIVISIÓN";
  var esSubdireccion = rol === "SUBDIRECCIÓN ACADÉMICA";
  var esControl = rol === "CONTROL DE RESIDENCIAS";
  var esDocente = rol === "DOCENTE";

  /* Tema */
  var raiz = document.documentElement, botonTema = $("tema");
  function oscuro() { var t = raiz.getAttribute("data-theme"); if (t) return t === "dark"; return window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function etiquetaTema() { botonTema.textContent = oscuro() ? "Modo claro" : "Modo oscuro"; }
  try { var g = localStorage.getItem("conectatec-tema"); if (g) raiz.setAttribute("data-theme", g); } catch (e) {}
  etiquetaTema();
  botonTema.addEventListener("click", function () {
    var n = oscuro() ? "light" : "dark"; raiz.setAttribute("data-theme", n);
    try { localStorage.setItem("conectatec-tema", n); } catch (e) {} etiquetaTema();
  });

  /* Vistas */
  var vistas = ["vista-menu", "vista-solicitud", "vista-revisiones", "vista-listo"];
  function mostrar(id) { vistas.forEach(function (v) { $(v).hidden = (v !== id); }); window.scrollTo(0, 0); }
  document.querySelectorAll("[data-volver]").forEach(function (b) { b.addEventListener("click", function () { mostrar("vista-menu"); }); });

  /* Menú según el rol */
  var puedeSolicitar = esDocente || esControl || (!esJefatura && !esSubdireccion);
  var puedeRevisar = esJefatura || esSubdireccion || esControl;
  $("ir-solicitud").hidden = !puedeSolicitar;
  $("ir-revisiones").hidden = !puedeRevisar;

  /* Listas de carreras */
  ["s-jefatura", "s-programa"].forEach(function (id) {
    var s = $(id); s.innerHTML = '<option value="">Selecciona…</option>';
    CARRERAS.forEach(function (c) { var o = document.createElement("option"); o.value = c; o.textContent = c; s.appendChild(o); });
  });

  /* Duración: mostrar el día 2 */
  function valorDuracion() { return document.querySelector('input[name="duracion"]:checked').value; }
  document.querySelectorAll('input[name="duracion"]').forEach(function (r) {
    r.addEventListener("change", function () { $("dia2").hidden = valorDuracion() !== "2"; });
  });

  /* Estudiantes (filas dinámicas) */
  var cuerpo = $("est-cuerpo");
  function renumerar() {
    var filas = cuerpo.rows;
    for (var i = 0; i < filas.length; i++) {
      filas[i].cells[0].textContent = i + 1;
      filas[i].querySelector(".quitar").disabled = filas.length === 1;
    }
    $("est-total").textContent = filas.length + " fila(s)";
  }
  function agregarFila() {
    var tr = document.createElement("tr");
    var td0 = document.createElement("td");
    var td1 = document.createElement("td"), c = document.createElement("input");
    c.className = "est-control"; c.placeholder = "Número de control"; c.autocomplete = "off"; c.setAttribute("aria-label", "Número de control");
    td1.appendChild(c);
    var td2 = document.createElement("td"), n = document.createElement("input");
    n.className = "est-nombre"; n.placeholder = "Nombre completo"; n.autocomplete = "off"; n.setAttribute("aria-label", "Nombre completo");
    td2.appendChild(n);
    var td3 = document.createElement("td"), q = document.createElement("button");
    q.type = "button"; q.className = "quitar"; q.textContent = "✕"; q.setAttribute("aria-label", "Quitar estudiante");
    q.addEventListener("click", function () { tr.remove(); renumerar(); });
    td3.appendChild(q);
    [td0, td1, td2, td3].forEach(function (t) { tr.appendChild(t); });
    // Enter en la última fila agrega otra
    [c, n].forEach(function (inp) {
      inp.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (tr === cuerpo.lastElementChild) { agregarFila(); cuerpo.lastElementChild.querySelector(".est-control").focus(); }
      });
    });
    cuerpo.appendChild(tr); renumerar();
    return tr;
  }
  $("est-agregar").addEventListener("click", function () { agregarFila().querySelector(".est-control").focus(); });

  /* Formulario nuevo */
  function hoyISO() { var h = new Date(); return h.getFullYear() + "-" + String(h.getMonth() + 1).padStart(2, "0") + "-" + String(h.getDate()).padStart(2, "0"); }
  function nuevaSolicitud() {
    $("form-solicitud").reset();
    cuerpo.innerHTML = ""; agregarFila();
    $("dia2").hidden = true; $("s-errores").hidden = true;
    ["s-f1", "s-f2"].forEach(function (id) { $(id).min = hoyISO(); });
  }
  $("ir-solicitud").addEventListener("click", function () { nuevaSolicitud(); mostrar("vista-solicitud"); });

  /* Base de datos local */
  function abrirDB() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open("conectatec-visitas", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("solicitudes", { keyPath: "folio" }); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function guardarSolicitud(s) {
    return abrirDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("solicitudes", "readwrite"), st = tx.objectStore("solicitudes");
        var q = st.count();
        q.onsuccess = function () {
          s.folio = "VA-" + new Date().getFullYear() + "-" + String(q.result + 1).padStart(4, "0");
          st.put(s);
        };
        tx.oncomplete = function () { res(s); }; tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function listarSolicitudes() {
    return abrirDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("solicitudes", "readonly"), q = tx.objectStore("solicitudes").getAll();
        q.onsuccess = function () { res(q.result || []); }; q.onerror = function () { rej(q.error); };
      });
    });
  }
  function actualizarSolicitud(s) {
    return abrirDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("solicitudes", "readwrite");
        tx.objectStore("solicitudes").put(s);
        tx.oncomplete = function () { res(s); }; tx.onerror = function () { rej(tx.error); };
      });
    });
  }

  /* Aviso flotante */
  var temporizadorAviso = null;
  function aviso(texto) {
    var el = $("aviso"); el.textContent = texto; el.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { el.hidden = true; }, 5000);
  }

  /* Validación */
  function v(id) { return $(id).value.trim(); }
  function recolectar() {
    var errores = [];
    function req(id, msg) { if (!v(id)) errores.push({ id: id, msg: msg }); }
    req("s-docente", "Nombre completo del docente"); req("s-jefatura", "Jefatura de División de Carrera");
    req("s-academia", "Academia"); req("s-asignatura", "Nombre de la asignatura"); req("s-programa", "Programa educativo");
    req("s-objetivo", "Objetivo de la visita"); req("s-justificacion", "Justificación de impacto curricular");
    var imp = parseFloat($("s-impacto").value);
    if (isNaN(imp) || imp < 50 || imp > 100) errores.push({ id: "s-impacto", msg: "El porcentaje de impacto curricular debe ser de 50 a 100" });
    if (!$("s-limite").checked) errores.push({ id: "s-limite", msg: "Debes confirmar el límite de dos visitas por semestre por academia" });
    req("s-empresa", "Nombre o razón social de la empresa"); req("s-ubicacion", "Ubicación o dirección"); req("s-modalidad", "Modalidad (presencial o virtual)");
    var dur = valorDuracion();
    req("s-f1", "Fecha del día 1"); req("s-h1i", "Hora de inicio del día 1"); req("s-h1f", "Hora de fin del día 1");
    if (v("s-h1i") && v("s-h1f") && v("s-h1f") <= v("s-h1i")) errores.push({ id: "s-h1f", msg: "La hora de fin del día 1 debe ser posterior a la de inicio" });
    if (dur === "2") {
      req("s-f2", "Fecha del día 2"); req("s-h2i", "Hora de inicio del día 2"); req("s-h2f", "Hora de fin del día 2");
      if (v("s-f1") && v("s-f2") && v("s-f2") < v("s-f1")) errores.push({ id: "s-f2", msg: "El día 2 no puede ser anterior al día 1" });
      if (v("s-h2i") && v("s-h2f") && v("s-h2f") <= v("s-h2i")) errores.push({ id: "s-h2f", msg: "La hora de fin del día 2 debe ser posterior a la de inicio" });
    }
    req("s-correo-jefatura", "Correo institucional de la Jefatura de División");
    if (v("s-correo-jefatura") && !correoValido(v("s-correo-jefatura"))) errores.push({ id: "s-correo-jefatura", msg: "El correo de la Jefatura de División no es válido" });
    req("s-correo-subdireccion", "Correo institucional de la Subdirección Académica");
    if (v("s-correo-subdireccion") && !correoValido(v("s-correo-subdireccion"))) errores.push({ id: "s-correo-subdireccion", msg: "El correo de la Subdirección Académica no es válido" });
    var est = [], vistos = {}, huboError = false;
    Array.prototype.forEach.call(cuerpo.rows, function (tr, i) {
      var c = tr.querySelector(".est-control"), n = tr.querySelector(".est-nombre");
      var cv = c.value.trim().toUpperCase(), nv = n.value.trim().toUpperCase().replace(/\s+/g, " ");
      if (!cv && !nv) return;
      if (!cv || !nv) { if (!huboError) errores.push({ el: !cv ? c : n, msg: "Completa número de control y nombre en la fila " + (i + 1) + " de estudiantes" }); huboError = true; return; }
      if (vistos[cv]) { errores.push({ el: c, msg: "El número de control " + cv + " está repetido" }); return; }
      vistos[cv] = true; est.push({ control: cv, nombre: nv });
    });
    if (!est.length && !huboError) errores.push({ el: cuerpo.querySelector(".est-control"), msg: "Agrega al menos un estudiante asistente" });

    return { errores: errores, datos: {
      docente: v("s-docente"), jefatura: v("s-jefatura"), academia: v("s-academia"), asignatura: v("s-asignatura"), programa: v("s-programa"),
      objetivo: v("s-objetivo"), justificacion: v("s-justificacion"), impacto: imp, limite: $("s-limite").checked, adicional: $("s-adicional").checked,
      empresa: v("s-empresa"), ubicacion: v("s-ubicacion"), modalidad: $("s-modalidad").value, duracion: dur,
      f1: v("s-f1"), h1i: v("s-h1i"), h1f: v("s-h1f"), f2: v("s-f2"), h2i: v("s-h2i"), h2f: v("s-h2f"),
      correoJefatura: v("s-correo-jefatura"), correoSubdireccion: v("s-correo-subdireccion"),
      revisiones: { jefatura: revisionVacia(), subdireccion: revisionVacia() },
      estado: "PENDIENTE", enviadaEn: null,
      estudiantes: est, creada: new Date().toISOString()
    } };
  }

  var ultima = null;
  $("s-enviar").addEventListener("click", function () {
    var r = recolectar(), box = $("s-errores");
    if (r.errores.length) {
      box.innerHTML = "<strong>Revisa lo siguiente:</strong>";
      var ul = document.createElement("ul");
      r.errores.forEach(function (e) { var li = document.createElement("li"); li.textContent = e.msg; ul.appendChild(li); });
      box.appendChild(ul); box.hidden = false;
      var primero = r.errores[0].el || $(r.errores[0].id);
      if (primero) { primero.scrollIntoView({ block: "center" }); primero.focus(); }
      return;
    }
    box.hidden = true;
    guardarSolicitud(r.datos).then(function (s) {
      ultima = s;
      $("listo-texto").textContent = "Tu solicitud quedó registrada con el folio " + s.folio + " (" + s.estudiantes.length +
        " estudiante(s), " + s.empresa + "). Está pendiente del visto bueno de la Jefatura de División y de la autorización de la Subdirección Académica. Descarga el PDF para entregarlo o conservarlo.";
      mostrar("vista-listo");
    }).catch(function () { box.textContent = "No se pudo guardar la solicitud en el navegador."; box.hidden = false; });
  });

  $("listo-pdf").addEventListener("click", function () {
    if (!ultima) return;
    if (typeof window.jspdf === "undefined") { alert("No se pudo cargar la librería de PDF. Revisa tu conexión a internet."); return; }
    construirPDF(ultima).save("Solicitud_visita_" + ultima.folio + ".pdf");
  });
  $("listo-nueva").addEventListener("click", function () { nuevaSolicitud(); mostrar("vista-solicitud"); });

  /* ====== Revisiones (Jefatura / Subdirección / Control) ====== */
  var listaRevisiones = [], folioAbierto = null;

  function visibleParaRol(s) {
    if (esSubdireccion) return s.revisiones.jefatura.estado === "APROBADA";
    return true;
  }

  function cargarRevisiones() {
    return listarSolicitudes().then(function (lista) {
      listaRevisiones = lista.map(normalizar).sort(function (a, b) { return String(b.creada || "").localeCompare(String(a.creada || "")); });
      pintarRevisiones();
    }).catch(function () {
      $("rev-cuerpo").innerHTML = "";
      $("rev-vacio").textContent = "No se pudieron leer las solicitudes guardadas en este navegador.";
      $("rev-vacio").hidden = false;
    });
  }

  function pintarRevisiones() {
    var filtro = $("rev-filtro").value, filas = $("rev-cuerpo");
    filas.innerHTML = "";
    var visibles = listaRevisiones.filter(visibleParaRol).filter(function (s) { return !filtro || s.estado === filtro; });
    $("rev-contador").textContent = visibles.length + " solicitud(es)";
    $("rev-vacio").hidden = visibles.length > 0;
    visibles.forEach(function (s) {
      var tr = document.createElement("tr");
      var fechas = fechaLarga(s.f1) + (s.duracion === "2" ? " y " + fechaLarga(s.f2) : "");
      tr.innerHTML = "<td><strong>" + esc(s.folio) + "</strong></td>" +
        "<td>" + esc(s.docente) + "</td>" +
        "<td>" + esc(s.asignatura) + "</td>" +
        "<td>" + esc(s.empresa) + "</td>" +
        "<td>" + esc(fechas) + "</td>" +
        "<td>" + s.estudiantes.length + "</td>" +
        "<td>" + chip(s.estado) + "</td>";
      var td = document.createElement("td"), b = document.createElement("button");
      b.type = "button"; b.className = "secundario"; b.textContent = "Revisar";
      b.addEventListener("click", function () { abrirDetalle(s.folio); });
      td.appendChild(b); tr.appendChild(td);
      filas.appendChild(tr);
    });
  }

  function dato(etiqueta, valor) {
    return "<div><dt>" + etiqueta + "</dt><dd>" + esc(valor) + "</dd></div>";
  }

  function bloqueFirma(titulo, r) {
    var clase = r.estado === "APROBADA" ? "ok" : r.estado === "RECHAZADA" ? "no" : "";
    var cuerpoFirma = r.estado === "PENDIENTE"
      ? '<p class="ayuda">Sin firma registrada.</p>'
      : "<p><strong>" + esc(r.por) + "</strong><br><span class=\"ayuda\">" + esc(r.correo) + " · " + esc(fechaHora(r.fecha)) + "</span></p>";
    return '<div class="firma ' + clase + '"><h4>' + titulo + "</h4>" +
      "<p>" + chip(r.estado === "APROBADA" ? (titulo.indexOf("Subdirección") > -1 ? "AUTORIZADA" : "VISTO BUENO") : r.estado === "RECHAZADA" ? "RECHAZADA" : "PENDIENTE") + "</p>" +
      cuerpoFirma +
      (r.comentario ? '<p class="ayuda">«' + esc(r.comentario) + "»</p>" : "") +
      "</div>";
  }

  function formularioRevision(s) {
    var tipo = null, etiqueta = "";
    if (esJefatura && s.revisiones.jefatura.estado === "PENDIENTE") { tipo = "jefatura"; etiqueta = "Aprobar / Visto Bueno"; }
    else if (esSubdireccion && s.revisiones.jefatura.estado === "APROBADA" && s.revisiones.subdireccion.estado === "PENDIENTE") { tipo = "subdireccion"; etiqueta = "Autorizar"; }
    if (!tipo) return "";
    return '<div class="acciones-rev" data-tipo="' + tipo + '">' +
      "<h4>" + etiqueta + "</h4>" +
      '<div class="form-grid">' +
        '<div><label for="rev-por">Nombre completo de quien firma</label><input id="rev-por" autocomplete="name"></div>' +
        '<div><label for="rev-correo">Correo institucional</label><input id="rev-correo" type="email" autocomplete="email" placeholder="nombre@dominio.edu.mx"></div>' +
        '<div class="completo"><label for="rev-comentario">Comentario (obligatorio si se rechaza)</label><textarea id="rev-comentario" rows="2"></textarea></div>' +
      "</div>" +
      '<p id="rev-error" class="error" hidden></p>' +
      '<div class="dlg-botones izq">' +
        '<button class="accion" type="button" data-accion="aprobar">' + etiqueta + "</button>" +
        '<button class="secundario" type="button" data-accion="rechazar">Rechazar</button>' +
      "</div>" +
    "</div>";
  }

  function detalleHTML(s) {
    var d = s;
    var estudiantes = d.estudiantes.map(function (e, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(e.control) + "</td><td>" + esc(e.nombre) + "</td></tr>";
    }).join("");
    return "<h3>" + esc(d.folio) + " " + chip(d.estado) + "</h3>" +
      '<p class="ayuda">Registrada el ' + esc(fechaHora(d.creada)) + ".</p>" +
      "<h4>1. Docente y adscripción</h4><dl class=\"datos-rev\">" +
        dato("Docente", d.docente) + dato("Jefatura", d.jefatura) + dato("Academia", d.academia) +
        dato("Asignatura", d.asignatura) + dato("Programa", d.programa) +
      "</dl>" +
      "<h4>2. Justificación académica</h4><dl class=\"datos-rev\">" +
        dato("Objetivo", d.objetivo) + dato("Impacto curricular", d.impacto + " %") +
        dato("Justificación", d.justificacion) +
        dato("Límite semestral", "No excede dos visitas por semestre por academia." + (d.adicional ? " Visita adicional (otra academia)." : "")) +
      "</dl>" +
      "<h4>3. Logística y empresa destino</h4><dl class=\"datos-rev\">" +
        dato("Empresa", d.empresa) + dato("Ubicación", d.ubicacion) + dato("Modalidad", d.modalidad) +
        dato("Duración", d.duracion === "2" ? "2 días" : "1 día") +
        dato("Día 1", fechaLarga(d.f1) + ", " + d.h1i + " a " + d.h1f + " h") +
        (d.duracion === "2" ? dato("Día 2", fechaLarga(d.f2) + ", " + d.h2i + " a " + d.h2f + " h") : "") +
      "</dl>" +
      "<h4>4. Estudiantes asistentes (" + d.estudiantes.length + ")</h4>" +
      '<div class="tabla-wrap"><table><thead><tr><th>No.</th><th>Número de control</th><th>Nombre completo</th></tr></thead><tbody>' + estudiantes + "</tbody></table></div>" +
      "<h4>5. Vistos buenos y autorización</h4>" +
      '<div class="firmas">' + bloqueFirma("Jefatura de División", d.revisiones.jefatura) +
        bloqueFirma("Subdirección Académica", d.revisiones.subdireccion) + "</div>" +
      (d.enviadaEn ? '<p class="ayuda">Enviada al Departamento de Residencias Profesionales y Servicio Social el ' + esc(fechaHora(d.enviadaEn)) + ".</p>" : "") +
      '<p class="ayuda">Correos registrados: Jefatura ' + esc(d.correoJefatura || "—") + " · Subdirección " + esc(d.correoSubdireccion || "—") + ".</p>" +
      formularioRevision(d) +
      '<div class="dlg-botones izq"><button class="secundario" type="button" data-accion="pdf">Descargar PDF</button>' +
        '<button class="secundario" type="button" data-accion="cerrar">Cerrar</button></div>';
  }

  function abrirDetalle(folio) {
    var s = listaRevisiones.filter(function (x) { return x.folio === folio; })[0];
    if (!s) return;
    folioAbierto = folio;
    var panel = $("rev-detalle");
    panel.innerHTML = detalleHTML(s);
    panel.hidden = false;
    panel.scrollIntoView({ block: "start" });
  }

  function registrarRevision(tipo, decision) {
    var s = listaRevisiones.filter(function (x) { return x.folio === folioAbierto; })[0];
    if (!s) return;
    var por = $("rev-por").value.trim(), correo = $("rev-correo").value.trim(), comentario = $("rev-comentario").value.trim();
    var err = $("rev-error"), errores = [];
    if (!por) errores.push("Escribe el nombre completo de quien firma.");
    if (!correoValido(correo)) errores.push("Escribe un correo institucional válido.");
    if (decision === "RECHAZADA" && !comentario) errores.push("Explica el motivo del rechazo.");
    if (errores.length) { err.innerHTML = errores.join("<br>"); err.hidden = false; return; }
    err.hidden = true;
    s.revisiones[tipo] = { estado: decision, por: por, correo: correo, fecha: new Date().toISOString(), comentario: comentario };
    s.estado = estadoDe(s);
    if (tipo === "subdireccion" && decision === "APROBADA") s.enviadaEn = new Date().toISOString();
    actualizarSolicitud(s).then(function () {
      aviso(decision === "RECHAZADA" ? "La solicitud " + s.folio + " fue rechazada." :
        tipo === "jefatura" ? "Visto bueno registrado para " + s.folio + "." :
        "Solicitud " + s.folio + " autorizada y enviada a Residencias Profesionales.");
      pintarRevisiones();
      abrirDetalle(s.folio);
    }).catch(function () { err.textContent = "No se pudo guardar la revisión en el navegador."; err.hidden = false; });
  }

  $("ir-revisiones").addEventListener("click", function () {
    $("rev-rol").textContent = "Sesión: " + rol + ". " + (esJefatura ? "Registra el visto bueno de las solicitudes pendientes." :
      esSubdireccion ? "Autoriza las solicitudes que ya tienen el visto bueno de la Jefatura." :
      "Consulta todas las solicitudes y descarga su PDF.");
    $("rev-detalle").hidden = true; folioAbierto = null;
    mostrar("vista-revisiones");
    cargarRevisiones();
  });

  $("rev-filtro").addEventListener("change", pintarRevisiones);

  $("rev-detalle").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-accion]");
    if (!b) return;
    var accion = b.getAttribute("data-accion");
    if (accion === "cerrar") { $("rev-detalle").hidden = true; folioAbierto = null; return; }
    if (accion === "pdf") {
      var s = listaRevisiones.filter(function (x) { return x.folio === folioAbierto; })[0];
      if (!s) return;
      if (typeof window.jspdf === "undefined") { alert("No se pudo cargar la librería de PDF. Revisa tu conexión a internet."); return; }
      construirPDF(s).save("Solicitud_visita_" + s.folio + ".pdf");
      return;
    }
    var caja = b.closest(".acciones-rev");
    if (!caja) return;
    registrarRevision(caja.getAttribute("data-tipo"), accion === "aprobar" ? "APROBADA" : "RECHAZADA");
  });
})();
