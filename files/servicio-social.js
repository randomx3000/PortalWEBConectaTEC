(function () {
  "use strict";

  /* ====== Configuración ====== */
  // Documentos que se revisan en el check list (edita esta lista a tu gusto)
  var CHECKLIST = [
    "Solicitud de servicio social",
    "Carta de presentación",
    "Carta de aceptación",
    "Plan de trabajo",
    "Reporte bimestral 1",
    "Reporte bimestral 2",
    "Reporte bimestral 3",
    "Reporte final",
    "Carta de terminación"
  ];
  var DB_NAME = "conectatec-servicio-social", STORE = "servicio";

  /* ====== Utilidades ====== */
  function $(id) { return document.getElementById(id); }
  function norm(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  function aviso(msg) {
    var a = $("aviso");
    a.textContent = msg; a.hidden = false;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(function () { a.hidden = true; }, 3500);
  }

  /* ====== Tema claro / oscuro ====== */
  var raiz = document.documentElement, botonTema = $("tema");
  function oscuro() {
    var t = raiz.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function etiquetaTema() { botonTema.textContent = oscuro() ? "Modo claro" : "Modo oscuro"; }
  try { var g = localStorage.getItem("conectatec-tema"); if (g) raiz.setAttribute("data-theme", g); } catch (e) {}
  etiquetaTema();
  botonTema.addEventListener("click", function () {
    var n = oscuro() ? "light" : "dark";
    raiz.setAttribute("data-theme", n);
    try { localStorage.setItem("conectatec-tema", n); } catch (e) {}
    etiquetaTema();
  });

  /* ====== Base de datos (IndexedDB) ====== */
  var db = null;
  function abrirDB() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: "id" }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function leerTodos() {
    return new Promise(function (res, rej) {
      var q = db.transaction(STORE).objectStore(STORE).getAll();
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error); };
    });
  }
  function guardar(lista) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(STORE, "readwrite"), s = tx.objectStore(STORE);
      lista.forEach(function (r) { s.put(r); });
      tx.oncomplete = function () { res(); };
      tx.onerror = function () { rej(tx.error); };
    });
  }

  /* ====== Navegación entre vistas ====== */
  var vistas = ["vista-menu", "vista-anadir", "vista-tabla", "vista-constancia"];
  function mostrar(id) {
    vistas.forEach(function (v) { $(v).hidden = (v !== id); });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("[data-volver]").forEach(function (b) {
    b.addEventListener("click", function () { mostrar("vista-menu"); });
  });
  $("ir-anadir").addEventListener("click", function () { llenarPeriodosLista(); mostrar("vista-anadir"); });
  $("ir-visualizar").addEventListener("click", function () { mostrar("vista-tabla"); abrirTabla(); });
  $("ir-constancia").addEventListener("click", function () { mostrar("vista-constancia"); });

  /* ====== Añadir periodo ====== */
  function buscarColumna(cols, claves) {
    for (var i = 0; i < cols.length; i++) {
      var n = norm(cols[i]);
      for (var j = 0; j < claves.length; j++) if (n.indexOf(claves[j]) > -1) return cols[i];
    }
    return null;
  }
  function llenarPeriodosLista() {
    leerTodos().then(function (regs) {
      var dl = $("lista-periodos"); dl.innerHTML = "";
      unicos(regs.map(function (r) { return r.periodo; })).forEach(function (p) {
        var o = document.createElement("option"); o.value = p; dl.appendChild(o);
      });
    });
  }
  function unicos(arr) {
    return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }).sort();
  }

  $("btn-cargar").addEventListener("click", function () {
    var periodo = $("periodo").value.trim();
    var archivo = $("archivo").files[0];
    var out = $("resultado");
    out.textContent = "";
    if (!periodo) { out.textContent = "Escribe el nombre del periodo."; return; }
    if (!archivo) { out.textContent = "Selecciona un archivo de Excel."; return; }
    if (typeof XLSX === "undefined") { out.textContent = "No se pudo cargar la librería de Excel. Revisa tu conexión a internet."; return; }

    archivo.arrayBuffer().then(function (buf) {
      var libro = XLSX.read(buf, { type: "array" });
      var hoja = libro.Sheets[libro.SheetNames[0]];
      // Se lee como matriz para poder saltar filas de título (ej. "GetX - Instituto...")
      var matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "", raw: false, blankrows: false });
      var CLAVES_MAT = ["matricula", "no. control", "numero de control", "n. control", "control"];
      var filaEnc = -1;
      for (var i = 0; i < Math.min(matriz.length, 20); i++) {
        if (buscarColumna(matriz[i], CLAVES_MAT)) { filaEnc = i; break; }
      }
      if (filaEnc < 0) throw new Error("No se encontró la fila de encabezados con la columna Control / Matrícula.");
      var encabezados = matriz[filaEnc].map(function (h) { return String(h).trim(); });
      var filas = matriz.slice(filaEnc + 1).map(function (fila) {
        var o = {};
        encabezados.forEach(function (h, idx) { if (h) o[h] = fila[idx] == null ? "" : fila[idx]; }); // ignora columnas sin encabezado
        return o;
      });
      if (!filas.length) throw new Error("El archivo no tiene registros.");
      var colMat = buscarColumna(encabezados, CLAVES_MAT);
      var colCar = buscarColumna(encabezados, ["carrera", "programa"]);
      var colNom = buscarColumna(encabezados, ["nombre", "alumno", "estudiante"]);

      return leerTodos().then(function (existentes) {
        var mapa = {};
        existentes.forEach(function (r) { mapa[r.id] = r; });
        var nuevos = 0, actualizados = 0, iguales = 0, omitidos = 0, aGuardar = [];

        filas.forEach(function (f) {
          var mat = String(f[colMat]).trim();
          if (!mat) { omitidos++; return; }
          var datos = {};
          Object.keys(f).forEach(function (k) { datos[k] = String(f[k]).trim(); });
          var id = periodo + "|" + mat, reg = mapa[id];

          if (reg) {
            var cambio = false;
            Object.keys(datos).forEach(function (k) {
              if (datos[k] !== "" && reg.datos[k] !== datos[k]) { reg.datos[k] = datos[k]; cambio = true; }
            });
            if (cambio) {
              reg.carrera = colCar ? (reg.datos[colCar] || reg.carrera) : reg.carrera;
              reg.nombre = colNom ? (reg.datos[colNom] || reg.nombre) : reg.nombre;
              reg.actualizado = Date.now();
              aGuardar.push(reg); actualizados++;
            } else iguales++;
          } else {
            var nuevo = {
              id: id, periodo: periodo, matricula: mat,
              nombre: colNom ? datos[colNom] : "", carrera: colCar ? datos[colCar] : "",
              datos: datos, checklist: {}, estado: "Activo", motivoBaja: "", actualizado: Date.now()
            };
            mapa[id] = nuevo; aGuardar.push(nuevo); nuevos++;
          }
        });

        return guardar(aGuardar).then(function () {
          out.textContent = "Listo: " + nuevos + " nuevos, " + actualizados + " actualizados, " +
            iguales + " sin cambios" + (omitidos ? ", " + omitidos + " omitidos (sin matrícula)." : ".");
          $("archivo").value = "";
          llenarPeriodosLista();
        });
      });
    }).catch(function (e) { out.textContent = "Error: " + e.message; });
  });

  /* ====== Visualizar registros ====== */
  var registros = [], periodoSel = "", filtroCarrera = "", seleccion = {};

  function abrirTabla() {
    leerTodos().then(function (regs) {
      registros = regs;
      var periodos = unicos(regs.map(function (r) { return r.periodo; }));
      var sp = $("sel-periodo"); sp.innerHTML = "";
      periodos.forEach(function (p) {
        var o = document.createElement("option"); o.value = p; o.textContent = p; sp.appendChild(o);
      });
      if (periodos.indexOf(periodoSel) < 0) periodoSel = periodos[0] || "";
      sp.value = periodoSel;
      filtroCarrera = ""; seleccion = {}; $("buscar").value = "";
      llenarCarreras();
      pintar();
    });
  }
  function recargar() {
    return leerTodos().then(function (regs) { registros = regs; pintar(); });
  }
  function delPeriodo() {
    return registros.filter(function (r) { return r.periodo === periodoSel; });
  }
  function llenarCarreras() {
    var s = $("sel-carrera"); s.innerHTML = "";
    var t = document.createElement("option"); t.value = ""; t.textContent = "Todas las carreras"; s.appendChild(t);
    unicos(delPeriodo().map(function (r) { return r.carrera; })).forEach(function (c) {
      var o = document.createElement("option"); o.value = c; o.textContent = c; s.appendChild(o);
    });
    s.value = filtroCarrera;
  }

  function pintar() {
    var regs = delPeriodo();
    var hay = regs.length > 0;
    $("herramientas").hidden = !hay;
    $("tabla-wrap").hidden = !hay;
    $("vacio").hidden = hay;
    if (!hay) return;

    // Columnas = todas las del Excel + estado + check list
    var cols = [];
    regs.forEach(function (r) { Object.keys(r.datos).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });

    var q = norm($("buscar").value);
    var vis = regs.filter(function (r) {
      return (!filtroCarrera || r.carrera === filtroCarrera) && (!q || norm(r.matricula).indexOf(q) > -1);
    });
    var idsVis = vis.map(function (r) { return r.id; });
    Object.keys(seleccion).forEach(function (id) { if (idsVis.indexOf(id) < 0) delete seleccion[id]; });

    // Encabezado
    var thead = $("tabla").tBodies.length ? $("tabla").tHead : $("tabla").tHead;
    thead.innerHTML = "";
    var trh = document.createElement("tr");
    var thSel = document.createElement("th");
    var todos = document.createElement("input"); todos.type = "checkbox"; todos.setAttribute("aria-label", "Seleccionar todos");
    todos.checked = vis.length > 0 && vis.every(function (r) { return seleccion[r.id]; });
    todos.addEventListener("change", function () {
      vis.forEach(function (r) { if (todos.checked) seleccion[r.id] = true; else delete seleccion[r.id]; });
      pintar();
    });
    thSel.appendChild(todos); trh.appendChild(thSel);
    cols.concat(["Estado", "Check list"]).forEach(function (c) {
      var th = document.createElement("th"); th.textContent = c; trh.appendChild(th);
    });
    thead.appendChild(trh);

    // Filas
    var tbody = $("tabla").tBodies[0]; tbody.innerHTML = "";
    vis.forEach(function (r) {
      var tr = document.createElement("tr");
      if (r.estado === "Baja") tr.className = "baja";
      if (seleccion[r.id]) tr.className += " sel";
      var td0 = document.createElement("td");
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!seleccion[r.id];
      cb.setAttribute("aria-label", "Seleccionar " + r.matricula);
      cb.addEventListener("change", function () {
        if (cb.checked) seleccion[r.id] = true; else delete seleccion[r.id];
        pintar();
      });
      td0.appendChild(cb); tr.appendChild(td0);
      cols.forEach(function (c) {
        var td = document.createElement("td"); td.textContent = r.datos[c] || ""; td.title = r.datos[c] || ""; tr.appendChild(td);
      });
      var tdE = document.createElement("td");
      var ins = document.createElement("span");
      ins.className = "insignia " + (r.estado === "Baja" ? "baja" : "activo");
      ins.textContent = r.estado;
      if (r.estado === "Baja") ins.title = "Motivo: " + r.motivoBaja;
      tdE.appendChild(ins);
      if (r.estado === "Baja") tdE.appendChild(document.createTextNode(" " + r.motivoBaja));
      tr.appendChild(tdE);
      var tdC = document.createElement("td");
      var n = CHECKLIST.filter(function (it) { return r.checklist[it]; }).length;
      tdC.textContent = n + " / " + CHECKLIST.length;
      tr.appendChild(tdC);
      tbody.appendChild(tr);
    });

    $("contador").textContent = "Mostrando " + vis.length + " de " + regs.length + " registros" +
      (Object.keys(seleccion).length ? " · " + Object.keys(seleccion).length + " seleccionado(s)" : "") + ".";
  }

  $("sel-periodo").addEventListener("change", function () {
    periodoSel = this.value; filtroCarrera = ""; seleccion = {}; $("buscar").value = "";
    llenarCarreras(); pintar();
  });
  $("sel-carrera").addEventListener("change", function () { filtroCarrera = this.value; pintar(); });
  $("buscar").addEventListener("input", pintar);

  function seleccionados() {
    return registros.filter(function (r) { return seleccion[r.id]; });
  }

  /* ====== Botón 1: Check list ====== */
  var regCheck = null;
  $("btn-check").addEventListener("click", function () {
    var sel = seleccionados();
    if (sel.length !== 1) { aviso("Selecciona un solo estudiante para el check list."); return; }
    regCheck = sel[0];
    $("check-titulo").textContent = "Check list – " + (regCheck.nombre || "") + " (" + regCheck.matricula + ")";
    var cont = $("check-items"); cont.innerHTML = "";
    CHECKLIST.forEach(function (item, i) {
      var l = document.createElement("label");
      var c = document.createElement("input"); c.type = "checkbox"; c.id = "chk" + i; c.checked = !!regCheck.checklist[item];
      l.appendChild(c); l.appendChild(document.createTextNode(item));
      cont.appendChild(l);
    });
    $("dlg-check").showModal();
  });
  $("check-cancelar").addEventListener("click", function () { $("dlg-check").close(); });
  $("check-guardar").addEventListener("click", function () {
    CHECKLIST.forEach(function (item, i) { regCheck.checklist[item] = $("chk" + i).checked; });
    regCheck.actualizado = Date.now();
    guardar([regCheck]).then(function () { $("dlg-check").close(); aviso("Check list guardado."); return recargar(); });
  });

  /* ====== Botón 2: Dar de baja ====== */
  var motivo = "", paraBaja = [];
  $("btn-baja").addEventListener("click", function () {
    paraBaja = seleccionados().filter(function (r) { return r.estado !== "Baja"; });
    if (!paraBaja.length) { aviso("Selecciona al menos un estudiante activo."); return; }
    $("baja-detalle").textContent = paraBaja.length === 1
      ? "Estudiante: " + (paraBaja[0].nombre || "") + " (" + paraBaja[0].matricula + ")"
      : paraBaja.length + " estudiantes seleccionados.";
    $("baja-motivo").value = ""; $("baja-error").textContent = "";
    $("dlg-baja").showModal();
  });
  $("baja-cancelar").addEventListener("click", function () { $("dlg-baja").close(); });
  $("baja-aceptar").addEventListener("click", function () {
    motivo = $("baja-motivo").value.trim();
    if (!motivo) { $("baja-error").textContent = "Escribe el motivo de la baja."; return; }
    $("dlg-baja").close();
    $("confirmar-texto").textContent = "Se dará de baja a " + paraBaja.length +
      " estudiante(s). Motivo: " + motivo + ". ¿Deseas confirmar los cambios?";
    $("dlg-confirmar").showModal();
  });
  $("confirmar-no").addEventListener("click", function () { $("dlg-confirmar").close(); });
  $("confirmar-si").addEventListener("click", function () {
    paraBaja.forEach(function (r) { r.estado = "Baja"; r.motivoBaja = motivo; r.fechaBaja = new Date().toISOString(); r.actualizado = Date.now(); });
    guardar(paraBaja).then(function () {
      $("dlg-confirmar").close(); seleccion = {};
      aviso("Baja registrada."); return recargar();
    });
  });

  /* ====== Inicio ====== */
  abrirDB().then(function (d) { db = d; }).catch(function () {
    aviso("No se pudo abrir la base de datos del navegador.");
  });
})();
