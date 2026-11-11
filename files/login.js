(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }

  // Si ya hay sesión, pasa directo al inicio
  if (Auth.usuario()) { location.replace("index.html"); return; }

  /* Tema claro / oscuro */
  var raiz = document.documentElement, botonTema = $("tema");
  function oscuro() {
    var t = raiz.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function etiqueta() { botonTema.textContent = oscuro() ? "Modo claro" : "Modo oscuro"; }
  try { var g = localStorage.getItem("conectatec-tema"); if (g) raiz.setAttribute("data-theme", g); } catch (e) {}
  etiqueta();
  botonTema.addEventListener("click", function () {
    var n = oscuro() ? "light" : "dark";
    raiz.setAttribute("data-theme", n);
    try { localStorage.setItem("conectatec-tema", n); } catch (e) {}
    etiqueta();
  });

  /* Mostrar / ocultar contraseña */
  $("ver").addEventListener("change", function () { $("clave").type = this.checked ? "text" : "password"; });

  /* Entrar */
  $("form-login").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var err = $("error"); err.textContent = "";
    var usuario = $("usuario").value, clave = $("clave").value;
    if (!usuario.trim() || !clave) { err.textContent = "Escribe tu usuario y tu contraseña."; return; }
    if (Auth.iniciar(usuario, clave)) { location.replace("index.html"); }
    else { err.textContent = "Usuario o contraseña incorrectos."; $("clave").value = ""; $("clave").focus(); }
  });
  $("usuario").focus();
})();
