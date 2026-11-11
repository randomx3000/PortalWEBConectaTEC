/* ConectaTEC – inicio de sesión y permisos por usuario.
   OJO: es una protección del lado del navegador (sirve para ordenar qué ve cada persona,
   no para proteger información delicada). Para seguridad real se necesita un servidor. */
(function () {
  "use strict";

  // === Usuarios (cambia aquí los usuarios y contraseñas) ===
  var USUARIOS = [
    { usuario: "docente", clave: "docente2026", nombre: "Docente", rol: "DOCENTE",
      modulos: ["visitas-academicas"] },
    { usuario: "control", clave: "residencias2026", nombre: "Personal de control de residencias", rol: "CONTROL DE RESIDENCIAS",
      modulos: ["servicio-social", "residencias", "visitas-academicas", "convenios"] },
    { usuario: "jefatura", clave: "jefatura2026", nombre: "Jefatura de División de Carrera", rol: "JEFATURA DE DIVISIÓN",
      modulos: ["visitas-academicas"] },
    { usuario: "subdireccion", clave: "subdireccion2026", nombre: "Subdirección Académica", rol: "SUBDIRECCIÓN ACADÉMICA",
      modulos: ["visitas-academicas"] }
  ];
  var CLAVE_SESION = "conectatec-sesion";

  function usuarioActual() {
    try {
      var nombre = sessionStorage.getItem(CLAVE_SESION);
      if (!nombre) return null;
      for (var i = 0; i < USUARIOS.length; i++) if (USUARIOS[i].usuario === nombre) return USUARIOS[i];
    } catch (e) {}
    return null;
  }
  function iniciar(usuario, clave) {
    var u = String(usuario || "").trim().toLowerCase();
    for (var i = 0; i < USUARIOS.length; i++) {
      if (USUARIOS[i].usuario === u && USUARIOS[i].clave === clave) {
        try { sessionStorage.setItem(CLAVE_SESION, u); } catch (e) { return null; }
        return USUARIOS[i];
      }
    }
    return null;
  }
  function salir() {
    try { sessionStorage.removeItem(CLAVE_SESION); } catch (e) {}
    location.replace("login.html");
  }
  function puede(modulo) {
    var u = usuarioActual();
    return !!u && u.modulos.indexOf(modulo) > -1;
  }

  window.Auth = { usuario: usuarioActual, iniciar: iniciar, salir: salir, puede: puede };

  // === Guardia de página: se activa con <html data-modulo="..."> ===
  var modulo = document.documentElement.getAttribute("data-modulo");
  if (modulo) {
    var u = usuarioActual();
    if (!u) { document.documentElement.style.visibility = "hidden"; location.replace("login.html"); return; }
    if (modulo !== "inicio" && u.modulos.indexOf(modulo) < 0) {
      document.documentElement.style.visibility = "hidden"; location.replace("index.html"); return;
    }
    // Etiqueta del usuario y botón «Cerrar sesión» en la barra superior
    document.addEventListener("DOMContentLoaded", function () {
      var cont = document.querySelector("header .acciones");
      if (!cont) return;
      var et = document.createElement("span");
      et.className = "usuario-etiqueta"; et.textContent = u.rol;
      cont.insertBefore(et, cont.firstChild);
      var b = document.createElement("button");
      b.type = "button"; b.className = "salir"; b.textContent = "Cerrar sesión";
      b.addEventListener("click", salir);
      cont.appendChild(b);
    });
  }
})();
