let turnos = [];
let calendar = null;
let fechaSeleccionada = "";
let installPromptEvent = null;
const anotacionesPorFecha = new Map();

const ANOTACION_TIPOS = {
  PAGO: "pago",
  FERIADO: "feriado",
  OTROS: "otros",
};

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
  agregarAnotacionBtn: document.getElementById("agregarAnotacionBtn"),
  gananciaDesde: document.getElementById("gananciaDesde"),
  gananciaHasta: document.getElementById("gananciaHasta"),
  totalTurnosRango: document.getElementById("totalTurnosRango"),
  totalGananciaRango: document.getElementById("totalGananciaRango"),
  detalleGanancias: document.getElementById("detalleGanancias"),
  instalarAppBtn: document.getElementById("instalarAppBtn"),
};

function obtenerClaseTipoAnotacion(tipo) {
  if (tipo === ANOTACION_TIPOS.PAGO) return "tipo-pago";
  if (tipo === ANOTACION_TIPOS.FERIADO) return "tipo-feriado";
  if (tipo === ANOTACION_TIPOS.OTROS) return "tipo-otros";
  return "";
}

function actualizarEstadoBotonAnotacion() {
  if (!refs.agregarAnotacionBtn) return;

  if (!fechaSeleccionada) {
    refs.agregarAnotacionBtn.disabled = true;
    refs.agregarAnotacionBtn.textContent = "Añadir anotaciones";
    return;
  }

  refs.agregarAnotacionBtn.disabled = false;
  refs.agregarAnotacionBtn.textContent = `Añadir anotaciones (${fechaSeleccionada})`;
}

function actualizarEstiloDiaSeleccionado() {
  if (!refs.calendarEl) return;

  refs.calendarEl.querySelectorAll(".fc-daygrid-day").forEach((cell) => {
    cell.classList.remove("fc-dia-seleccionado", "tipo-pago", "tipo-feriado", "tipo-otros");
  });

  if (!fechaSeleccionada) return;

  const selectedCell = refs.calendarEl.querySelector(`.fc-daygrid-day[data-date="${fechaSeleccionada}"]`);
  if (!selectedCell) return;

  selectedCell.classList.add("fc-dia-seleccionado");
  const anotacion = obtenerAnotacionPorFecha(fechaSeleccionada);
  const claseTipo = obtenerClaseTipoAnotacion(anotacion?.tipo);
  if (claseTipo) {
    selectedCell.classList.add(claseTipo);
  }
}

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

function adaptarAnotacionDesdeServidor(anotacion) {
  if (!anotacion || typeof anotacion !== "object") return anotacion;

  return {
    ...anotacion,
    fecha: normalizarFecha(anotacion.fecha),
    tipo: String(anotacion.tipo || "").toLowerCase(),
    totalCobrado: normalizarNumero(anotacion.total_cobrado),
    adelantos: normalizarNumero(anotacion.adelantos),
    propinas: normalizarNumero(anotacion.propinas),
    totalNeto: normalizarNumero(anotacion.total_neto),
  };
}

function dateToISO(date) {
  if (!(date instanceof Date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function obtenerRangoCalendario() {
  if (!calendar?.view?.activeStart || !calendar?.view?.activeEnd) {
    return null;
  }

  const desde = dateToISO(calendar.view.activeStart);
  const hastaDate = new Date(calendar.view.activeEnd);
  hastaDate.setDate(hastaDate.getDate() - 1);
  const hasta = dateToISO(hastaDate);

  if (!desde || !hasta) return null;
  return { desde, hasta };
}

function obtenerAnotacionPorFecha(fecha) {
  return anotacionesPorFecha.get(normalizarFecha(fecha)) || null;
}

function nombreTipoAnotacion(tipo) {
  if (tipo === ANOTACION_TIPOS.PAGO) return "Pago";
  if (tipo === ANOTACION_TIPOS.FERIADO) return "Feriado";
  if (tipo === ANOTACION_TIPOS.OTROS) return "Otros";
  return "Anotación";
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

async function sincronizarAnotacionesCalendario({ silent = false } = {}) {
  const rango = obtenerRangoCalendario();
  if (!rango) return;

  if (!silent && refs.lista) {
    mostrarEstadoLista("Cargando anotaciones del calendario...");
  }

  try {
    const query = `?desde=${encodeURIComponent(rango.desde)}&hasta=${encodeURIComponent(rango.hasta)}`;
    const resultado = await apiFetch(`/anotaciones${query}`);
    const items = Array.isArray(resultado?.data)
      ? resultado.data.map(adaptarAnotacionDesdeServidor)
      : [];

    anotacionesPorFecha.clear();
    items.forEach((item) => {
      if (item?.fecha) {
        anotacionesPorFecha.set(item.fecha, item);
      }
    });

    refrescarCalendario();

    if (fechaSeleccionada) {
      mostrarTurnosPorFecha(fechaSeleccionada);
    }
  } catch (error) {
    console.error("Error al sincronizar anotaciones", error);
    if (!silent) {
      Swal.fire({
        icon: "error",
        title: "No se pudieron cargar las anotaciones",
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
            <div><strong>Ganancia:</strong> ${formatearDinero(t.ganancia)}</div>
            ${t.detalles ? `<div><strong>Descripción:</strong> ${escapeHtml(t.detalles)}</div>` : ""}
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

function pintarMarcadorAnotacionDia(cellEl, anotacion) {
  if (!cellEl) return;

  const markerContainer = cellEl.querySelector(".fc-daygrid-day-frame") || cellEl;

  cellEl.classList.remove("fc-dia-pago", "fc-dia-feriado", "fc-dia-otros");
  markerContainer
    .querySelectorAll(".dia-anotacion-badge, .dia-pago-corner")
    .forEach((node) => node.remove());

  if (!anotacion) return;

  if (anotacion.tipo === ANOTACION_TIPOS.PAGO) {
    cellEl.classList.add("fc-dia-pago");
  }

  if (anotacion.tipo === ANOTACION_TIPOS.FERIADO) {
    cellEl.classList.add("fc-dia-feriado");
  }

  if (anotacion.tipo === ANOTACION_TIPOS.OTROS) {
    cellEl.classList.add("fc-dia-otros");
  }

  if (anotacion.tipo === ANOTACION_TIPOS.PAGO) {
    const corner = document.createElement("div");
    corner.className = "dia-pago-corner";
    corner.title = "Día de pago";
    markerContainer.appendChild(corner);
    return;
  }

  const badge = document.createElement("span");
  badge.className = `dia-anotacion-badge tipo-${anotacion.tipo}`;
  badge.textContent = anotacion.tipo === ANOTACION_TIPOS.FERIADO ? "F" : "O";
  badge.title = nombreTipoAnotacion(anotacion.tipo);
  markerContainer.appendChild(badge);
}

function iniciarCalendario() {
  calendar = new FullCalendar.Calendar(refs.calendarEl, {
    initialView: "dayGridMonth",
    locale: "es",
    height: "auto",
    showNonCurrentDates: false,
    fixedWeekCount: false,
    events: obtenerEventosCalendar(),
    dayCellClassNames(arg) {
      const fecha = dateToISO(arg.date);
      const anotacion = obtenerAnotacionPorFecha(fecha);
      if (!anotacion) return [];
      if (anotacion.tipo === ANOTACION_TIPOS.PAGO) return ["fc-dia-pago"];
      if (anotacion.tipo === ANOTACION_TIPOS.FERIADO) return ["fc-dia-feriado"];
      if (anotacion.tipo === ANOTACION_TIPOS.OTROS) return ["fc-dia-otros"];
      return [];
    },
    dayCellDidMount(arg) {
      const fecha = dateToISO(arg.date);
      const anotacion = obtenerAnotacionPorFecha(fecha);
      pintarMarcadorAnotacionDia(arg.el, anotacion);
      if (fechaSeleccionada && fecha === fechaSeleccionada) {
        arg.el.classList.add("fc-dia-seleccionado");
        const claseTipo = obtenerClaseTipoAnotacion(anotacion?.tipo);
        if (claseTipo) {
          arg.el.classList.add(claseTipo);
        }
      }
    },
    dateClick(info) {
      fechaSeleccionada = info.dateStr;
      actualizarEstadoBotonAnotacion();
      actualizarEstiloDiaSeleccionado();
      mostrarTurnosPorFecha(fechaSeleccionada);
    },
    datesSet() {
      sincronizarAnotacionesCalendario({ silent: true });
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
  setTimeout(() => {
    actualizarEstiloDiaSeleccionado();
  }, 10);
}

function abrirModalAnotacionFechaSeleccionada() {
  if (!fechaSeleccionada) {
    Swal.fire({
      icon: "info",
      title: "Selecciona una fecha",
      text: "Primero toca un día del calendario para añadir una anotación.",
      confirmButtonColor: "#f2499a",
    });
    return;
  }

  abrirModalAnotacion(fechaSeleccionada);
}

function mostrarTurnosPorFecha(fecha) {
  const lista = turnos.filter((t) => t.fecha === fecha);
  const anotacion = obtenerAnotacionPorFecha(fecha);
  pintarLista(lista, `Turnos del ${fecha}`, anotacion);
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

function renderBloqueAnotacion(anotacion) {
  if (!anotacion) return "";

  const lineasPago = anotacion.tipo === ANOTACION_TIPOS.PAGO
    ? `
      <div class="mt-2"><strong>Total cobrado:</strong> ${formatearDinero(anotacion.totalCobrado)}</div>
      <div><strong>Adelantos:</strong> ${formatearDinero(anotacion.adelantos)}</div>
      <div><strong>Propinas:</strong> ${formatearDinero(anotacion.propinas)}</div>
      <div><strong>Total:</strong> ${formatearDinero(anotacion.totalNeto)}</div>
    `
    : "";

  return `
    <article class="turno-item anotacion-dia-item tipo-${anotacion.tipo}">
      <div class="turno-top">
        <div>
          <strong>${nombreTipoAnotacion(anotacion.tipo)}</strong><br>
          <small>${anotacion.fecha}</small>
        </div>
        <div class="turno-actions">
          <button class="btn-mini btn-editar" onclick="abrirModalAnotacion('${anotacion.fecha}')">Editar</button>
          <button class="btn-mini btn-eliminar" onclick="eliminarAnotacion('${anotacion.fecha}')">Eliminar</button>
        </div>
      </div>
      ${anotacion.descripcion ? `<div class="mt-1"><strong>Descripción:</strong> ${escapeHtml(anotacion.descripcion)}</div>` : ""}
      ${lineasPago}
    </article>
  `;
}

function pintarLista(items, titulo = "Turnos", anotacion = null) {
  const lista = Array.isArray(items) ? items : [];
  const bloqueAnotacion = renderBloqueAnotacion(anotacion);

  if (!lista.length) {
    refs.lista.innerHTML = `
      ${bloqueAnotacion}
      <div class="turno-item">
        <strong>${titulo}</strong>
        <div class="mt-1 text-muted">No hay turnos para mostrar.</div>
      </div>
    `;
    return;
  }

  refs.lista.innerHTML = `
    ${bloqueAnotacion}
    ${lista
      .map(
        (t) => `
      <article class="turno-item" id="turno-${t.id}">
        <div class="turno-top">
          <div>
            <small>${t.fecha}</small>
          </div>
          <div class="turno-actions">
            <button class="btn-mini btn-editar" onclick="editarTurno('${t.id}')">Editar</button>
            <button class="btn-mini btn-eliminar" onclick="eliminarTurno('${t.id}')">Eliminar</button>
          </div>
        </div>
        <div class="mt-2">
          ${t.nombre ? `<div><strong>Clienta:</strong> ${escapeHtml(t.nombre)}</div>` : ""}
          ${t.hora ? `<div><strong>Hora:</strong> ${escapeHtml(t.hora)}</div>` : ""}
          <div><strong>Ganancia:</strong> ${formatearDinero(t.ganancia)}</div>
          ${t.detalles ? `<div><strong>Detalles:</strong> ${escapeHtml(t.detalles)}</div>` : ""}
        </div>
      </article>
    `
      )
      .join("")}
  `;
}

function construirFormularioAnotacion({ fecha, anotacion }) {
  const tipo = anotacion?.tipo || ANOTACION_TIPOS.PAGO;
  const titulo = anotacion?.titulo || "";
  const descripcion = anotacion?.descripcion || "";
  const totalCobrado = anotacion?.totalCobrado ?? 0;
  const adelantos = anotacion?.adelantos ?? 0;
  const propinas = anotacion?.propinas ?? 0;
  const totalNeto = anotacion?.totalNeto ?? totalCobrado - adelantos + propinas;

  return `
    <div class="anotacion-modal">
      <div class="swal2-field-wrap">
        <label for="swal-anotacion-fecha">Fecha</label>
        <input id="swal-anotacion-fecha" type="date" class="swal2-input" value="${fecha}" disabled>
      </div>

      <div class="swal2-field-wrap">
        <label for="swal-anotacion-tipo">Tipo de anotación</label>
        <select id="swal-anotacion-tipo" class="swal2-select">
          <option value="${ANOTACION_TIPOS.PAGO}" ${tipo === ANOTACION_TIPOS.PAGO ? "selected" : ""}>Pago</option>
          <option value="${ANOTACION_TIPOS.FERIADO}" ${tipo === ANOTACION_TIPOS.FERIADO ? "selected" : ""}>Feriado</option>
          <option value="${ANOTACION_TIPOS.OTROS}" ${tipo === ANOTACION_TIPOS.OTROS ? "selected" : ""}>Otros</option>
        </select>
      </div>

      <div id="swal-descripcion-wrap" class="swal2-field-wrap" ${tipo === ANOTACION_TIPOS.PAGO ? "style=\"display:none\"" : ""}>
        <label for="swal-anotacion-descripcion">Descripción</label>
        <textarea id="swal-anotacion-descripcion" class="swal2-textarea" placeholder="Describe la anotación...">${escapeHtml(descripcion)}</textarea>
      </div>

      <div id="swal-pago-fields" ${tipo === ANOTACION_TIPOS.PAGO ? "" : "style=\"display:none\""}>
        <div class="swal2-field-wrap">
          <label for="swal-anotacion-total-cobrado">Total cobrado</label>
          <input id="swal-anotacion-total-cobrado" type="number" min="0" class="swal2-input" value="${totalCobrado}">
        </div>

        <div class="swal2-field-wrap">
          <label for="swal-anotacion-adelantos">Adelantos</label>
          <input id="swal-anotacion-adelantos" type="number" min="0" class="swal2-input" value="${adelantos}">
        </div>

        <div class="swal2-field-wrap">
          <label for="swal-anotacion-propinas">Propinas</label>
          <input id="swal-anotacion-propinas" type="number" min="0" class="swal2-input" value="${propinas}">
        </div>

        <div class="swal2-field-wrap">
          <label for="swal-anotacion-total">Total</label>
          <input id="swal-anotacion-total" type="number" class="swal2-input" value="${totalNeto}" disabled>
        </div>
      </div>
    </div>
  `;
}

function configurarEventosFormularioAnotacion() {
  const tipoEl = document.getElementById("swal-anotacion-tipo");
  const pagoFields = document.getElementById("swal-pago-fields");
  const descripcionWrap = document.getElementById("swal-descripcion-wrap");

  const totalCobradoEl = document.getElementById("swal-anotacion-total-cobrado");
  const adelantosEl = document.getElementById("swal-anotacion-adelantos");
  const propinasEl = document.getElementById("swal-anotacion-propinas");
  const totalEl = document.getElementById("swal-anotacion-total");

  const actualizarVisibilidad = () => {
    if (!tipoEl || !pagoFields || !descripcionWrap) return;
    pagoFields.style.display = tipoEl.value === ANOTACION_TIPOS.PAGO ? "block" : "none";
    descripcionWrap.style.display =
      tipoEl.value === ANOTACION_TIPOS.PAGO ? "none" : "flex";
  };

  const recalcularTotal = () => {
    if (!totalEl) return;
    const totalCobrado = normalizarNumero(totalCobradoEl?.value);
    const adelantos = normalizarNumero(adelantosEl?.value);
    const propinas = normalizarNumero(propinasEl?.value);
    totalEl.value = String(totalCobrado - adelantos + propinas);
  };

  tipoEl?.addEventListener("change", actualizarVisibilidad);
  totalCobradoEl?.addEventListener("input", recalcularTotal);
  adelantosEl?.addEventListener("input", recalcularTotal);
  propinasEl?.addEventListener("input", recalcularTotal);

  actualizarVisibilidad();
  recalcularTotal();
}

async function abrirModalAnotacion(fecha) {
  const fechaKey = normalizarFecha(fecha);
  const anotacion = obtenerAnotacionPorFecha(fechaKey);

  const result = await Swal.fire({
    title: `Anotación · ${fechaKey}`,
    html: construirFormularioAnotacion({ fecha: fechaKey, anotacion }),
    width: 620,
    showCancelButton: true,
    confirmButtonText: "Guardar anotación",
    cancelButtonText: "Cerrar",
    confirmButtonColor: "#f2499a",
    didOpen: () => {
      configurarEventosFormularioAnotacion();
    },
    preConfirm: () => {
      const tipo = document.getElementById("swal-anotacion-tipo")?.value;
      const descripcion = document.getElementById("swal-anotacion-descripcion")?.value?.trim() || "";

      const totalCobrado = normalizarNumero(
        document.getElementById("swal-anotacion-total-cobrado")?.value
      );
      const adelantos = normalizarNumero(document.getElementById("swal-anotacion-adelantos")?.value);
      const propinas = normalizarNumero(document.getElementById("swal-anotacion-propinas")?.value);

      if (!tipo) {
        Swal.showValidationMessage("Selecciona el tipo de anotación");
        return null;
      }

      if ((tipo === ANOTACION_TIPOS.FERIADO || tipo === ANOTACION_TIPOS.OTROS) && !descripcion) {
        Swal.showValidationMessage("La descripción es obligatoria para feriado y otros");
        return null;
      }

      if (tipo === ANOTACION_TIPOS.PAGO && (totalCobrado < 0 || adelantos < 0 || propinas < 0)) {
        Swal.showValidationMessage("Los valores de pago no pueden ser negativos");
        return null;
      }

      return {
        fecha: fechaKey,
        tipo,
  descripcion: tipo === ANOTACION_TIPOS.PAGO ? "" : descripcion,
        totalCobrado: tipo === ANOTACION_TIPOS.PAGO ? totalCobrado : null,
        adelantos: tipo === ANOTACION_TIPOS.PAGO ? adelantos : null,
        propinas: tipo === ANOTACION_TIPOS.PAGO ? propinas : null,
      };
    },
  });

  if (!result.isConfirmed || !result.value) {
    return;
  }

  try {
    const payload = result.value;
    const response = await apiFetch("/anotaciones", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const anotacionActualizada = adaptarAnotacionDesdeServidor(response?.data);
    if (anotacionActualizada?.fecha) {
      anotacionesPorFecha.set(anotacionActualizada.fecha, anotacionActualizada);
    }

    refrescarCalendario();
    actualizarEstiloDiaSeleccionado();
    if (fechaSeleccionada === fechaKey) {
      mostrarTurnosPorFecha(fechaSeleccionada);
    }

    Swal.fire({
      icon: "success",
      title: "Anotación guardada",
      timer: 1100,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo guardar la anotación",
      text: error.message,
      confirmButtonColor: "#f2499a",
    });
  }
}

async function eliminarAnotacion(fecha) {
  const fechaKey = normalizarFecha(fecha);
  const anotacion = obtenerAnotacionPorFecha(fechaKey);
  if (!anotacion) {
    Swal.fire({
      icon: "info",
      title: "No hay anotación",
      text: "No se encontró una anotación para esa fecha.",
      confirmButtonColor: "#f2499a",
    });
    return;
  }

  const confirm = await Swal.fire({
    icon: "warning",
    title: "¿Eliminar anotación?",
    text: `Se eliminará la anotación del ${fechaKey}.`,
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#d63583",
  });

  if (!confirm.isConfirmed) {
    return;
  }

  try {
    await apiFetch(`/anotaciones/${encodeURIComponent(fechaKey)}`, {
      method: "DELETE",
    });

    anotacionesPorFecha.delete(fechaKey);
    refrescarCalendario();
    actualizarEstiloDiaSeleccionado();

    if (fechaSeleccionada === fechaKey) {
      mostrarTurnosPorFecha(fechaSeleccionada);
    }

    Swal.fire({
      icon: "success",
      title: "Anotación eliminada",
      timer: 1000,
      showConfirmButton: false,
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo eliminar",
      text: error.message,
      confirmButtonColor: "#f2499a",
    });
  }
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
actualizarEstadoBotonAnotacion();
mostrarEstadoLista("Cargando turnos...");
renderResumenGanancias([], "Resumen general (todos los turnos)");
inicializarFechaPorDefecto();
sincronizarTurnos();
sincronizarAnotacionesCalendario({ silent: true });
registrarServiceWorker();
registrarEventosPWA();