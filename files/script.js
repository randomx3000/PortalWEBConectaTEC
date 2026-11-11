(function () {
  var raiz = document.documentElement;
  var boton = document.getElementById("tema");

  // Mostrar solo las áreas permitidas para el usuario que inició sesión
  document.querySelectorAll(".btn").forEach(function (b) {
    if (!Auth.puede(b.dataset.destino)) b.hidden = true;
  });

  // ¿Está activo el modo oscuro?
  function oscuro() {
    var t = raiz.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function etiqueta() {
    boton.textContent = oscuro() ? "Modo claro" : "Modo oscuro";
  }

  // Recuperar el tema guardado
  try {
    var guardado = localStorage.getItem("conectatec-tema");
    if (guardado) raiz.setAttribute("data-theme", guardado);
  } catch (e) {}
  etiqueta();

  // Cambiar entre claro y oscuro
  boton.addEventListener("click", function () {
    var nuevo = oscuro() ? "light" : "dark";
    raiz.setAttribute("data-theme", nuevo);
    try { localStorage.setItem("conectatec-tema", nuevo); } catch (e) {}
    etiqueta();
  });

  // Rutas de cada módulo (cambiar cuando existan las páginas)
  var rutas = {
    "servicio-social": "servicio-social.html",
    "residencias": "residencias.html",
    "visitas-academicas": "visitas-academicas.html",
    "convenios": "convenios.html"
  };

  document.querySelectorAll(".btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var destino = rutas[b.dataset.destino];
      if (destino && b.dataset.destino !== "convenios") {
        window.location.href = destino;
      } else {
        alert("Aquí irá el módulo: " + b.querySelector("strong").textContent + " (" + destino + ")");
      }
    });
  });
})();
