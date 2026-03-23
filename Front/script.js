let turnos = [];
let calendar = null;
let fechaSeleccionada = "";
let installPromptEvent = null;

const APP_CONFIG = window.APP_CONFIG || {};
const isFileProtocol = window.location.protocol === "file:";
const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
const DEFAULT_API_BASE = isFileProtocol || isLocalhost ? "http://localhost:4000/api" : "/api";
const API_BASE = APP_CONFIG.API_BASE || DEFAULT_API_BASE;

const refs = {
  fecha: document.getElementById("fecha"),
  fechaActualTexto: document.getElementById("fechaActualTexto"),
  hora: document.getElementById("hora"),
  nombre: document.getElementById("nombre"),
  valor: document.getElementById("valor"),
  ganancia: document.getElementById("ganancia"),
  detalles: document.getElementById("detalles"),
  lista: document.getElementById("listaTurnos"),
  buscar: document.getElementById("buscarInput"),
  calendarEl: document.getElementById("calendar"),
  gananciaDesde: document.getElementById("gananciaDesde"),
  gananciaHasta: document.getElementById("gananciaHasta"),
  totalTurnosRango: document.getElementById("totalTurnosRango"),
  totalGananciaRango: document.getElementById("totalGananciaRango"),
  detalleGanancias: document.getElementById("detalleGanancias"),
  instalarAppBtn: document.getElementById("instalarAppBtn"),
};

function actualizarBotonInstalacion(disponible) {
  if (!refs.instalarAppBtn) return;
  refs.instalarAppBtn.hidden = !disponible;
}

async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error("No se pudo registrar el service worker", error);
  }
}

function registrarEventosPWA() {
  if (!window) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    actualizarBotonInstalacion(true);

    Swal.fire({
      icon: "info",
      title: "Instalación disponible",
      text: "Puedes añadir Juli's Agenda a tu pantalla de inicio.",
      confirmButtonColor: "#f2499a",
    });
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    actualizarBotonInstalacion(false);
    Swal.fire({
      icon: "success",
      title: "App instalada",
      timer: 1500,
      showConfirmButton: false,
    });
  });

  actualizarBotonInstalacion(false);
}

async function solicitarInstalacionPWA() {
  if (!installPromptEvent) {
    Swal.fire({
      icon: "info",
      title: "Instalar manualmente",
      text: "Busca la opción \"Agregar a pantalla de inicio\" en el menú de tu navegador.",
      confirmButtonColor: "#f2499a",
    });
    return;
  }

  installPromptEvent.prompt();
  const { outcome } = await installPromptEvent.userChoice;
  installPromptEvent = null;
  actualizarBotonInstalacion(false);

  if (outcome === "accepted") {
    Swal.fire({
      icon: "success",
      title: "Gracias",
      text: "Ahora puedes abrir la app desde la pantalla de inicio.",
      confirmButtonColor: "#f2499a",
    });
  }
}

function normalizarFecha(fecha) {
  if (!fecha) return "";
  return fecha.includes("T") ? fecha.split("T")[0] : fecha;
}

function normalizarHora(hora) {
  if (!hora) return "";
  if (hora.includes(":")) {
    const [h = "", m = ""] = hora.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }
  return hora;
}

function adaptarTurnoDesdeServidor(turno) {
  if (!turno || typeof turno !== "object") return turno;
  return {
    ...turno,
    fecha: normalizarFecha(turno.fecha),
    hora: normalizarHora(turno.hora),
  };
}

function mostrarEstadoLista(mensaje) {
  if (!refs.lista) return;
  refs.lista.innerHTML = `
    <div class="turno-item">
      <div class="text-muted">${mensaje}</div>
    </div>
  `;
}

function mostrarEstadoGanancias(mensaje) {
  if (!refs.detalleGanancias) return;
  refs.detalleGanancias.innerHTML = `
    <div class="turno-item">
      <div class="text-muted">${mensaje}</div>
    </div>
  `;
}

async function apiFetch(path, options = {}) {
  const config = {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  };

  const response = await fetch(`${API_BASE}${path}`, config);
  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error ||
      (Array.isArray(data?.errors) && data.errors.join(", ")) ||
      "No se pudo completar la operación.";
    throw new Error(message);
  }

  return data;
}

async function sincronizarTurnos({ silent = false } = {}) {
  if (!silent) {
    mostrarEstadoLista("Cargando turnos desde el servidor...");
  }

  try {
    const resultado = await apiFetch("/turnos");
    turnos = Array.isArray(resultado?.data)
      ? resultado.data.map(adaptarTurnoDesdeServidor)
      : [];
    ordenarTurnos();
    renderTodo();
  } catch (error) {
    console.error("Error al sincronizar turnos", error);
    mostrarEstadoLista("No se pudieron cargar los turnos.");
    if (!silent) {
      Swal.fire({
        icon: "error",
        title: "No se pudieron cargar los turnos",
        text: error.message,
        confirmButtonColor: "#f2499a",
      });
    }
  }
}

function fechaISOHoy() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatearFechaLarga(fechaISO) {
  if (!fechaISO) return "";
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  if (!anio || !mes || !dia) return "";
  const fecha = new Date(anio, mes - 1, dia);
  const diaTexto = new Intl.DateTimeFormat("es-CO", { day: "numeric" }).format(fecha);
  const mesTexto = new Intl.DateTimeFormat("es-CO", { month: "long" }).format(fecha);
  const anioTexto = new Intl.DateTimeFormat("es-CO", { year: "numeric" }).format(fecha);
  return `${diaTexto} de ${mesTexto} del ${anioTexto}`;
}

function actualizarFechaVisible() {
  if (!refs.fechaActualTexto) return;
  const texto = formatearFechaLarga(refs.fecha.value);
  refs.fechaActualTexto.textContent = texto ? `Fecha seleccionada: ${texto}` : "";
}

function inicializarFechaPorDefecto() {
  if (!refs.fecha.value) {
    refs.fecha.value = fechaISOHoy();
  }
  actualizarFechaVisible();
  refs.fecha.addEventListener("change", actualizarFechaVisible);
}

function limpiarFormulario() {
  refs.fecha.value = "";
  refs.hora.value = "";
  refs.nombre.value = "";
  refs.valor.value = "";
  refs.ganancia.value = "";
  refs.detalles.value = "";
  refs.fecha.focus();
}

function normalizarNumero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

async function guardarTurno() {
  const fecha = refs.fecha.value;
  const hora = refs.hora.value;
  const nombre = refs.nombre.value.trim();
  const valor = normalizarNumero(refs.valor.value);
  const ganancia = normalizarNumero(refs.ganancia.value);
  const detalles = refs.detalles.value.trim();

  if (!fecha || !hora || !nombre) {
    Swal.fire({
      icon: "warning",
      title: "Faltan datos",
      text: "Completa fecha, hora y nombre.",
      confirmButtonColor: "#f2499a",
    });
    return;
  }

  try {
    await apiFetch("/turnos", {
      method: "POST",
      body: JSON.stringify({ fecha, hora, nombre, valor, ganancia, detalles }),
    });

    await sincronizarTurnos({ silent: true });

    Swal.fire({
      icon: "success",
      title: "Turno guardado",
      timer: 1200,
      showConfirmButton: false,
    });

    limpiarFormulario();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo guardar",
      text: error.message,
      confirmButtonColor: "#f2499a",
    });
  }
}

function ordenarTurnos() {
  turnos.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
}

function mostrarSeccion(id, boton = null) {
  document.querySelectorAll(".seccion").forEach((s) => s.classList.add("oculto"));
  document.getElementById(id).classList.remove("oculto");

  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  if (boton) {
    boton.classList.add("active");
  } else {
    const objetivo = document.querySelector(`.nav-btn[data-seccion="${id}"]`);
    if (objetivo) objetivo.classList.add("active");
  }

  if (id === "turnos" && calendar) {
    setTimeout(() => calendar.updateSize(), 30);
  }

  if (id === "ganancias") {
    renderResumenGanancias(turnos, "Resumen general (todos los turnos)");
  }
}

function formatearDinero(valor) {
  const numero = normalizarNumero(valor);
  const decimales = Number.isInteger(numero) ? 0 : 2;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(numero);
}

function renderResumenGanancias(items, titulo = "Detalle", resumen = null) {
  const lista = Array.isArray(items) ? items : [];
  const totalTurnos = resumen?.totalTurnos ?? lista.length;
  const totalGanancia =
    resumen?.totalGanancia ?? lista.reduce((acc, t) => acc + normalizarNumero(t.ganancia), 0);

  refs.totalTurnosRango.textContent = String(totalTurnos);
  refs.totalGananciaRango.textContent = formatearDinero(totalGanancia);

  if (!lista.length) {
    refs.detalleGanancias.innerHTML = `
      <div class="turno-item">
        <strong>${titulo}</strong>
        <div class="mt-1 text-muted">No hay turnos en ese rango.</div>
      </div>
    `;
    return;
  }

  refs.detalleGanancias.innerHTML = `
    <div class="turno-item">
      <strong>${titulo}</strong>
      <div class="mt-1 text-muted">Mostrando ${lista.length} turno(s).</div>
    </div>
    ${lista
      .map(
        (t) => `
      <article class="turno-item">
        <div class="turno-top">
          <div>
            <strong>${t.hora} · ${escapeHtml(t.nombre)}</strong><br>
            <small>${t.fecha}</small>
          </div>
          <div>
            <div><strong>Cobrado:</strong> ${formatearDinero(t.valor)}</div>
            <div><strong>Ganancia:</strong> ${formatearDinero(t.ganancia)}</div>
          </div>
        </div>
      </article>
    `
      )
      .join("")}
  `;
}

async function calcularGananciasPorRango() {
  const desde = refs.gananciaDesde.value;
  const hasta = refs.gananciaHasta.value;

  if (!desde || !hasta) {
    Swal.fire({
      icon: "warning",
      title: "Faltan fechas",
      text: "Selecciona una fecha desde y hasta para calcular.",
      confirmButtonColor: "#f2499a",
    });
    return;
  }

  if (desde > hasta) {
    Swal.fire({
      icon: "warning",
      title: "Rango inválido",
      text: "La fecha Desde no puede ser mayor que Hasta.",
      confirmButtonColor: "#f2499a",
    });
    return;
  }

  mostrarEstadoGanancias("Calculando ganancias...");

  try {
    const respuesta = await apiFetch(
      `/ganancias?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
    );
    const resumen = respuesta?.data || {};
    const detalle = Array.isArray(resumen.detalle)
      ? resumen.detalle.map(adaptarTurnoDesdeServidor)
      : [];
    renderResumenGanancias(detalle, `Ganancias desde ${desde} hasta ${hasta}`, {
      totalTurnos: resumen.totalTurnos,
      totalGanancia: resumen.totalGanancia,
    });

    Swal.fire({
      icon: "success",
      title: "Cálculo actualizado",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch (error) {
    mostrarEstadoGanancias("No se pudo calcular el rango. Intenta nuevamente.");
    Swal.fire({
      icon: "error",
      title: "No se pudo calcular",
      text: error.message,
      confirmButtonColor: "#f2499a",
    });
  }
}

function limpiarFiltroGanancias() {
  refs.gananciaDesde.value = "";
  refs.gananciaHasta.value = "";
  renderResumenGanancias(turnos, "Resumen general (todos los turnos)");
}

function obtenerEventosCalendar() {
  return turnos.map((t) => ({
    id: t.id,
    title: t.nombre,
    date: t.fecha,
    display: "block",
  }));
}

function iniciarCalendario() {
  calendar = new FullCalendar.Calendar(refs.calendarEl, {
    initialView: "dayGridMonth",
    locale: "es",
    height: "auto",
    showNonCurrentDates: false,
    fixedWeekCount: false,
    events: obtenerEventosCalendar(),
    dateClick(info) {
      fechaSeleccionada = info.dateStr;
      mostrarTurnosPorFecha(fechaSeleccionada);
    },
    eventContent() {
      const dot = document.createElement("div");
      dot.className = "pink-dot";
      return { domNodes: [dot] };
    },
  });

  calendar.render();
}

function refrescarCalendario() {
  if (!calendar) return;
  calendar.removeAllEvents();
  calendar.addEventSource(obtenerEventosCalendar());
}

function mostrarTurnosPorFecha(fecha) {
  const lista = turnos.filter((t) => t.fecha === fecha);
  pintarLista(lista, `Turnos del ${fecha}`);
}

function buscar(texto) {
  const query = texto.trim().toLowerCase();
  if (!query) {
    if (fechaSeleccionada) {
      mostrarTurnosPorFecha(fechaSeleccionada);
    } else {
      pintarLista(turnos, "Todos los turnos");
    }
    return;
  }

  const filtrados = turnos.filter((t) => t.nombre.toLowerCase().includes(query));
  pintarLista(filtrados, `Resultados para "${texto}"`);
}

function pintarLista(items, titulo = "Turnos") {
  const lista = Array.isArray(items) ? items : [];

  if (!lista.length) {
    refs.lista.innerHTML = `
      <div class="turno-item">
        <strong>${titulo}</strong>
        <div class="mt-1 text-muted">No hay turnos para mostrar.</div>
      </div>
    `;
    return;
  }

  refs.lista.innerHTML = lista
    .map(
      (t) => `
      <article class="turno-item" id="turno-${t.id}">
        <div class="turno-top">
          <div>
            <strong>${t.hora} · ${escapeHtml(t.nombre)}</strong><br>
            <small>${t.fecha}</small>
          </div>
          <div class="turno-actions">
            <button class="btn-mini btn-editar" onclick="editarTurno('${t.id}')">Editar</button>
            <button class="btn-mini btn-eliminar" onclick="eliminarTurno('${t.id}')">Eliminar</button>
          </div>
        </div>
        <div class="mt-2">
          <div><strong>Valor:</strong> ${formatearDinero(t.valor)}</div>
          <div><strong>Ganancia:</strong> ${formatearDinero(t.ganancia)}</div>
          ${t.detalles ? `<div><strong>Detalles:</strong> ${escapeHtml(t.detalles)}</div>` : ""}
        </div>
      </article>
    `
    )
    .join("");
}

async function editarTurno(id) {
  const turno = turnos.find((t) => t.id === id);
  if (!turno) return;

  const { value: formValues } = await Swal.fire({
    title: "Editar turno",
    html: `
      <input id="swal-fecha" type="date" class="swal2-input" value="${turno.fecha}">
      <input id="swal-hora" type="time" class="swal2-input" value="${turno.hora}">
      <input id="swal-nombre" type="text" class="swal2-input" value="${escapeAttr(turno.nombre)}" placeholder="Clienta">
      <input id="swal-valor" type="number" class="swal2-input" value="${turno.valor}" placeholder="Valor">
      <input id="swal-ganancia" type="number" class="swal2-input" value="${turno.ganancia}" placeholder="Ganancia">
      <textarea id="swal-detalles" class="swal2-textarea" placeholder="Detalles">${escapeHtml(turno.detalles || "")}</textarea>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Guardar cambios",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#f2499a",
    preConfirm: () => {
      const fecha = document.getElementById("swal-fecha").value;
      const hora = document.getElementById("swal-hora").value;
      const nombre = document.getElementById("swal-nombre").value.trim();
      const valor = normalizarNumero(document.getElementById("swal-valor").value);
      const ganancia = normalizarNumero(document.getElementById("swal-ganancia").value);
      const detalles = document.getElementById("swal-detalles").value.trim();

      if (!fecha || !hora || !nombre) {
        Swal.showValidationMessage("Fecha, hora y nombre son obligatorios");
        return null;
      }

      return { fecha, hora, nombre, valor, ganancia, detalles };
    },
  });

  if (!formValues) return;

  try {
    await apiFetch(`/turnos/${id}`, {
      method: "PUT",
      body: JSON.stringify(formValues),
    });

    await sincronizarTurnos({ silent: true });

    Swal.fire({
      icon: "success",
      title: "Turno actualizado",
      timer: 1100,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo actualizar",
      text: error.message,
      confirmButtonColor: "#f2499a",
    });
  }
}

async function eliminarTurno(id) {
  const confirm = await Swal.fire({
    icon: "warning",
    title: "¿Eliminar turno?",
    text: "Esta acción no se puede deshacer.",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#d63583",
  });

  if (!confirm.isConfirmed) return;

  const card = document.getElementById(`turno-${id}`);
  if (card) {
    card.classList.add("removing");
    await new Promise((resolve) => setTimeout(resolve, 320));
  }

  try {
    await apiFetch(`/turnos/${id}`, { method: "DELETE" });
    await sincronizarTurnos({ silent: true });

    Swal.fire({
      icon: "success",
      title: "Turno eliminado",
      timer: 900,
      showConfirmButton: false,
    });
  } catch (error) {
    if (card) {
      card.classList.remove("removing");
    }

    Swal.fire({
      icon: "error",
      title: "No se pudo eliminar",
      text: error.message,
      confirmButtonColor: "#f2499a",
    });
  }
}

function renderTodo() {
  refrescarCalendario();

  const busquedaActiva = refs.buscar.value.trim();
  if (busquedaActiva) {
    buscar(busquedaActiva);
  } else if (fechaSeleccionada) {
    mostrarTurnosPorFecha(fechaSeleccionada);
  } else {
    pintarLista(turnos, "Todos los turnos");
  }

  renderResumenGanancias(turnos, "Resumen general (todos los turnos)");
}

function escapeHtml(texto = "") {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(texto = "") {
  return escapeHtml(texto).replaceAll("`", "&#096;");
}

iniciarCalendario();
mostrarEstadoLista("Cargando turnos...");
renderResumenGanancias([], "Resumen general (todos los turnos)");
inicializarFechaPorDefecto();
sincronizarTurnos();
registrarServiceWorker();
registrarEventosPWA();