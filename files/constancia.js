(function () {
  "use strict";

  var LH = 13.9;      // alto de línea (pt)
  var X0 = 63.9, ANCHO = 482;  // margen izquierdo y ancho del texto
  var MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  /* Posiciones medidas de tus dos formatos Word (carta, en puntos) */
  var FORMATOS = {
    actual: {
      fondo: "actual", archivoTxt: "los archivos", conC: false, conDesempeno: true,
      subtitulo: "LIBERACIÓN DE SERVICIO SOCIAL",
      yT1: 97.2, yT2: 111.1, yFolio: 150.5, folioBold: true, folioDer: 511.9,
      yQuien: 162.6, yPor: 190.4, yP1: 218.2, gap: 13.9, gapAten: 36.3, dyFirma: 120.6,
      izq: { x0: 78, x1: 284, lineas: ["JEFA DEL DEPARTAMENTO DE", "RESIDENCIAS PROFESIONALES Y SERVICIO", "SOCIAL"] },
      der: { x0: 340, x1: 553 }
    },
    f147: {
      fondo: "f147", archivoTxt: "archivos", conC: true, conDesempeno: false,
      subtitulo: "CONSTANCIA DE LIBERACIÓN DE SERVICIO SOCIAL",
      yT1: 97.2, yT2: 109.3, yFolio: 147.4, folioBold: false, folioDer: 545.8,
      yQuien: 171.6, yPor: 207.9, yP1: 244.2, gap: 27.8, gapAten: 38.0, dyFirma: 107.1,
      izq: { x0: 78, x1: 291, lineas: ["JEFA DEL DEPARTAMENTO DE", "RESIDENCIAS PROFESIONALES Y", "SERVICIO SOCIAL"] },
      der: { x0: 305, x1: 553 }
    }
  };

  function fechaCorta(iso) {            // 2026-03-01 -> 01 de marzo de 2026
    var p = iso.split("-");
    return (p[2] + " de " + MESES[parseInt(p[1], 10) - 1] + " de " + p[0]).toUpperCase();
  }
  function fechaElaboracion(iso) {      // 2026-11-10 -> 10 días del mes de noviembre de 2026
    var p = iso.split("-"), d = parseInt(p[2], 10);
    return { prefijo: d === 1 ? "al" : "a los",
             texto: (d + (d === 1 ? " día" : " días") + " del mes de " + MESES[parseInt(p[1], 10) - 1] + " de " + p[0]).toUpperCase() };
  }

  /* ====== Generador del PDF (jsPDF) ====== */
  function construir(d, cfg) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "pt", format: "letter" });
    doc.addImage(window.FONDOS_CONSTANCIA[cfg.fondo], "JPEG", 0, 0, 612, 792);
    doc.setFontSize(10);

    function texto(t, x, top, bold, align) {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(t, x, top + 9.3, { align: align || "left" });
    }

    // Párrafo justificado con partes en negritas
    function parrafo(piezas, top) {
      var palabras = [], act = [];
      piezas.forEach(function (p) {
        p.t.split(/(\s+)/).forEach(function (tr) {
          if (tr === "") return;
          if (/^\s+$/.test(tr)) { if (act.length) { palabras.push(act); act = []; } }
          else act.push({ t: tr, b: p.b });
        });
      });
      if (act.length) palabras.push(act);
      doc.setFontSize(10);
      function medir(runs) {
        var w = 0;
        runs.forEach(function (r) { doc.setFont("helvetica", r.b ? "bold" : "normal"); w += doc.getTextWidth(r.t); });
        return w;
      }
      doc.setFont("helvetica", "normal");
      var esp = doc.getTextWidth(" ");
      var lineas = [], cur = [], curW = 0;
      palabras.forEach(function (runs) {
        var w = medir(runs);
        if (cur.length && curW + esp + w > ANCHO) { lineas.push(cur); cur = []; curW = 0; }
        curW += (cur.length ? esp : 0) + w;
        cur.push({ runs: runs, w: w });
      });
      if (cur.length) lineas.push(cur);
      lineas.forEach(function (l, i) {
        var y = top + i * LH + 9.3, gap = esp;
        if (i < lineas.length - 1 && l.length > 1) {
          var suma = 0; l.forEach(function (w) { suma += w.w; });
          gap = (ANCHO - suma) / (l.length - 1);
        }
        var x = X0;
        l.forEach(function (w) {
          w.runs.forEach(function (r) {
            doc.setFont("helvetica", r.b ? "bold" : "normal");
            doc.text(r.t, x, y);
            x += doc.getTextWidth(r.t);
          });
          x += gap;
        });
      });
      return lineas.length;
    }

    // Encabezado
    texto("INSTITUTO TECNOLÓGICO SUPERIOR DE XALAPA", 304.75, cfg.yT1, true, "center");
    texto(cfg.subtitulo, 304.75, cfg.yT2, false, "center");
    texto("Folio No. " + d.folio, cfg.folioDer, cfg.yFolio, cfg.folioBold, "right");
    texto("A QUIEN CORRESPONDA:", X0, cfg.yQuien, true);
    texto("Por medio de la presente se hace constar que:", X0, cfg.yPor, false);

    // Cuerpo
    var p1 = [
      { t: "Según documentos que obran en " + cfg.archivoTxt + " de esta Institución, el (la) " + (cfg.conC ? "C. " : ""), b: false },
      { t: d.nombre, b: true }, { t: ", con número de control ", b: false },
      { t: d.control, b: true }, { t: " de la carrera de ", b: false },
      { t: d.carrera, b: true }, { t: ", realizó su Servicio Social en el (la) ", b: false },
      { t: d.dependencia, b: true }, { t: ", desempeñando actividades ", b: false },
      { t: d.actividades, b: true }
    ].concat(cfg.conDesempeno ? [
      { t: ", con un desempeño ", b: false }, { t: d.desempeno, b: true }
    ] : []).concat([
      { t: ", cubriendo un total de ", b: false },
      { t: d.horas, b: true }, { t: " horas durante el periodo comprendido del ", b: false },
      { t: fechaCorta(d.inicio), b: true }, { t: " al ", b: false },
      { t: fechaCorta(d.termino), b: true }, { t: ".", b: false }
    ]);
    var p2 = [{ t: "Este Servicio Social fue realizado de acuerdo con lo establecido en el reglamento de la Ley Reglamentaria del Artículo 5º Constitucional, relativo al ejercicio de las profesiones y los reglamentos que rigen el Sistema Nacional de Institutos Tecnológicos.", b: false }];
    var fe = fechaElaboracion(d.elaboracion);
    var p3 = [
      { t: "Se extiende la presente para los fines legales que al interesado (a) convengan, en la ciudad de Xalapa, Ver., " + fe.prefijo + " ", b: false },
      { t: fe.texto, b: true }, { t: ".", b: false }
    ];

    var y = cfg.yP1;
    var n1 = parrafo(p1, y);  y += n1 * LH + cfg.gap;
    var n2 = parrafo(p2, y);  y += n2 * LH + cfg.gap;
    var n3 = parrafo(p3, y);  y += n3 * LH + cfg.gapAten;
    texto("A T E N T A M E N T E", 304.85, y, true, "center");

    // Firmas
    var yLinea = y + cfg.dyFirma;
    var yFin = yLinea + 2.3 + 12.1 * cfg.izq.lineas.length + 12;
    if (yFin > 690) throw new Error("El texto de actividades es demasiado largo para que quepa en la hoja. Resúmelo un poco.");
    doc.setLineWidth(0.75);
    doc.line(cfg.izq.x0, yLinea, cfg.izq.x1, yLinea);
    doc.line(cfg.der.x0, yLinea, cfg.der.x1, yLinea);
    var cI = (cfg.izq.x0 + cfg.izq.x1) / 2, cD = (cfg.der.x0 + cfg.der.x1) / 2;
    texto("ING. VIRIDIANA CASTRO MORALES", cI, yLinea + 2.3, true, "center");
    cfg.izq.lineas.forEach(function (t, i) { texto(t, cI, yLinea + 2.3 + 12.1 * (i + 1), true, "center"); });
    texto("DR. SIDNEY RENÉ TOLEDO MARTÍNEZ", cD, yLinea + 2.3, true, "center");
    texto("DIRECTOR GENERAL", cD, yLinea + 2.3 + 12.1, true, "center");
    doc.setProperties({ title: "Constancia de liberación de servicio social - " + d.control, subject: "Motivo: " + (d.motivo || ""), author: "ConectaTEC" });
    return doc;
  }

  window.ConstanciaPDF = { construir: construir, FORMATOS: FORMATOS };

  /* ====== Formulario ====== */
  function $(id) { return document.getElementById(id); }
  if (!$("c-generar")) return;   // (permite probar el generador fuera de la página)

  function norm(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  function msg(t, error) { var m = $("c-msg"); m.textContent = t; m.className = error ? "error" : ""; }

  // El desempeño solo aplica al formato actual
  function ajustarFormato() { $("c-desempeno-wrap").hidden = !FORMATOS[$("c-formato").value].conDesempeno; }
  $("c-formato").addEventListener("change", ajustarFormato);
  ajustarFormato();

  // Hoy como valor por defecto de la fecha de elaboración
  var hoy = new Date();
  $("c-elaboracion").value = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");

  // El folio copia el número de control (como en tu formato) hasta que lo edites
  var folioManual = false;
  $("c-folio").addEventListener("input", function () { folioManual = true; });
  $("c-control").addEventListener("input", function () { if (!folioManual) $("c-folio").value = $("c-control").value; });

  // Autollenar con los registros cargados en Servicio social
  function leerRegistros() {
    return new Promise(function (res) {
      var r = indexedDB.open("conectatec-servicio-social", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("servicio", { keyPath: "id" }); };
      r.onerror = function () { res([]); };
      r.onsuccess = function () {
        var q = r.result.transaction("servicio").objectStore("servicio").getAll();
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { res([]); };
      };
    });
  }
  function valorDe(datos, claves) {
    var ks = Object.keys(datos);
    for (var i = 0; i < ks.length; i++) {
      var n = norm(ks[i]);
      for (var j = 0; j < claves.length; j++) if (n.indexOf(claves[j]) > -1 && datos[ks[i]]) return datos[ks[i]];
    }
    return "";
  }
  function elegir(id, valor) {   // selecciona la opción que coincide (sin importar acentos/mayúsculas)
    var sel = $(id), v = norm(valor), ok = false;
    sel.value = "";
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value && norm(o.value) === v) { sel.value = o.value; ok = true; } });
    return ok;
  }
  $("c-buscar-btn").addEventListener("click", function () {
    var q = norm($("c-buscar").value);
    if (!q) { msg("Escribe la matrícula a buscar.", true); return; }
    leerRegistros().then(function (regs) {
      var r = regs.filter(function (x) { return norm(x.matricula) === q; })
                  .sort(function (a, b) { return b.actualizado - a.actualizado; })[0];
      if (!r) { msg("No se encontró esa matrícula en los registros cargados. Puedes capturar los datos a mano.", true); return; }
      $("c-control").value = r.matricula;
      if (!folioManual) $("c-folio").value = r.matricula;
      $("c-nombre").value = r.nombre || "";
      var carreraOk = elegir("c-carrera", r.carrera || "");
      var dep = valorDe(r.datos, ["dependencia", "razon social", "empresa"]);
      if (dep) $("c-dependencia").value = dep;
      var act = valorDe(r.datos, ["actividad"]);
      if (act) elegir("c-actividades", act);
      msg("Datos cargados desde el periodo «" + r.periodo + "»." + (carreraOk ? "" : " La carrera de ese registro no está en la lista: selecciónala a mano.") + " Completa lo que falte.", !carreraOk);
    });
  });

  // Generar PDF
  $("c-generar").addEventListener("click", function () {
    var d = {
      motivo: $("c-motivo").value.trim(), desempeno: $("c-desempeno").value,
      folio: $("c-folio").value.trim(), control: $("c-control").value.trim(),
      nombre: $("c-nombre").value.trim(), carrera: $("c-carrera").value.trim(),
      dependencia: $("c-dependencia").value.trim(), actividades: $("c-actividades").value,
      horas: $("c-horas").value.trim(), inicio: $("c-inicio").value, termino: $("c-termino").value,
      elaboracion: $("c-elaboracion").value
    };
    var faltan = [];
    var cfg = FORMATOS[$("c-formato").value];
    [["motivo", "motivo"], ["control", "número de control"], ["nombre", "nombre"], ["carrera", "carrera"], ["dependencia", "dependencia"],
     ["actividades", "actividades"], ["horas", "horas"], ["inicio", "fecha de inicio"], ["termino", "fecha de término"],
     ["elaboracion", "fecha de elaboración"]].forEach(function (c) { if (!d[c[0]]) faltan.push(c[1]); });
    if (cfg.conDesempeno && !d.desempeno) faltan.push("desempeño");
    if (faltan.length) { msg("Falta capturar: " + faltan.join(", ") + ".", true); return; }
    if (!d.folio) d.folio = d.control;
    if (d.termino < d.inicio) { msg("La fecha de término no puede ser anterior a la de inicio.", true); return; }
    if (typeof window.jspdf === "undefined") { msg("No se pudo cargar la librería de PDF. Revisa tu conexión a internet.", true); return; }
    try {
      var doc = window.ConstanciaPDF.construir(d, cfg);
      var nombreArchivo = "Constancia_liberacion_" + d.control.replace(/[^\w-]/g, "") + ".pdf";
      var f = $("c-vista");
      f.src = doc.output("bloburl"); f.hidden = false;
      doc.save(nombreArchivo);
      msg("PDF generado: " + nombreArchivo);
    } catch (e) { msg(e.message, true); }
  });
})();
