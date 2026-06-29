let salvoCachePersonal = [];
let salvoCacheCalibres = [];
let salvoCacheArmamentoReal = [];
let salvoCacheMunicionStock = [];
let salvoconductosEmitidosLista = [];

function poblarDesplegablesSalvoconducto(data) {
  salvoCachePersonal = [...(data.personal || [])];

  if (data.personal_agregado) {
    data.personal_agregado.forEach((pa) => {
      if (String(pa.estado).toUpperCase() === "ACTIVO") {
        salvoCachePersonal.push(pa); 
      }
    });
  }
  salvoCacheCalibres = data.armamento_calibre || [];
  salvoCacheArmamentoReal = data.armamento || [];
  salvoCacheMunicionStock = data.municion || [];
  salvoconductosEmitidosLista = data.control_salvoconductos || [];

  const selectTipo = document.getElementById("salvo-tipo-arma");
  const selectAprobador = document.getElementById("salvo-aprobador");
  const selectLugar = document.getElementById("salvo-lugar");

  if (!selectTipo) return;

  // 1. Población de Tipos de Armamento
  selectTipo.innerHTML = '<option value="">-- Seleccione Tipo --</option>';
  const tiposUnicos = [
    ...new Set((data.armamento_calibre || []).map((a) => a.tipo_armamento)),
  ];
  tiposUnicos.forEach((t) => {
    if (t) selectTipo.innerHTML += `<option value="${t}">${t}</option>`;
  });

  // 2. Población de Lugares / Repartos
  selectLugar.innerHTML = '<option value="">-- Seleccione Destino --</option>';
  (data.lugar || []).forEach((l) => {
    const nombreLugar = l.lugar || l.valor_unico || "";
    if (nombreLugar)
      selectLugar.innerHTML += `<option value="${nombreLugar}">${nombreLugar}</option>`;
  });

  // 3. Población de Autoridades Aprobadoras
  selectAprobador.innerHTML = '<option value="">-- Seleccione Autoridad Militar Facultada --</option>';

  salvoCachePersonal.forEach((p) => {
    const cargoLimpio = String(p.funcion).trim().toUpperCase();
    if (
      cargoLimpio === 'COMANDANTE DEL ESCUADRÓN VIGALGO "BUITRE"' ||
      cargoLimpio === 'OFICIAL DE SEMANA ESCUADRÓN VIGALGO "BUITRE"'
    ) {
      selectAprobador.innerHTML += `<option value="${p.grado} ${p.apellidos_nombres}">${p.grado} ${p.apellidos_nombres}</option>`;
    }
  });

  calcularYRenderizarExistenciasDisponibles();
  renderizarTablaSalvoconductos();
}

// === CÁLCULO ARITMÉTICO DINÁMICO DE EXISTENCIAS EN TIEMPO REAL ===
function calcularYRenderizarExistenciasDisponibles() {
  const tbodyArmas = document.getElementById("table-body-resumen-armas");
  const tbodyMun = document.getElementById("table-body-resumen-municion");
  if (!tbodyArmas || !tbodyMun) return;

  tbodyArmas.innerHTML = "";
  tbodyMun.innerHTML = "";

  let resumenArmas = {};
  salvoCacheArmamentoReal.forEach((a) => {
    const tipo = String(a.tipo).trim().toUpperCase();
    if (!resumenArmas[tipo]) resumenArmas[tipo] = { total: 0, asignados: 0 };
    resumenArmas[tipo].total += parseInt(a.cantidad_armamento) || 0;
  });

  let resumenMun = {};
  salvoCacheMunicionStock.forEach((m) => {
    const calibre = String(m.calibre).trim().toUpperCase();
    if (!resumenMun[calibre]) resumenMun[calibre] = { total: 0, entregado: 0 };
    resumenMun[calibre].total += parseInt(m.cantidad) || 0;
  });

  salvoconductosEmitidosLista.forEach((s) => {
    if (s.estado === "CUSTODIA") {
      const tipoArma = String(s.tipo_arma).trim().toUpperCase();
      const calibre = String(s.calibre).trim().toUpperCase();
      const cantMun = parseInt(s.cantidad_municion) || 0;

      if (resumenArmas[tipoArma]) resumenArmas[tipoArma].asignados += 1; 
      if (resumenMun[calibre]) resumenMun[calibre].entregado += cantMun;
    }
  });

  Object.keys(resumenArmas).forEach((tipo) => {
    const total = resumenArmas[tipo].total;
    const asignados = resumenArmas[tipo].asignados;
    const disponible = total - asignados;
    tbodyArmas.innerHTML += `<tr><td><strong>${tipo}</strong></td><td>${total}</td><td>${asignados}</td><td style="font-weight:bold; color:${disponible > 0 ? "#18bc9c" : "#e74c3c"}">${disponible}</td></tr>`;
  });

  Object.keys(resumenMun).forEach((calibre) => {
    const total = resumenMun[calibre].total;
    const entregado = resumenMun[calibre].entregado;
    const disponible = total - entregado;
    tbodyMun.innerHTML += `<tr><td><strong>${calibre}</strong></td><td>${total}</td><td>${entregado}</td><td style="font-weight:bold; color:${disponible > 0 ? "#2980b9" : "#e74c3c"}">${disponible}</td></tr>`;
  });
}

function filtrarSeriesPorTipo(tipoArma) {
  const selectSerie = document.getElementById("salvo-serie");
  document.getElementById("salvo-marca").value = "";
  document.getElementById("salvo-calibre").value = "";
  if (!selectSerie) return;
  selectSerie.innerHTML = '<option value="">-- Seleccione Serie --</option>';

  const armasFiltradas = salvoCacheArmamentoReal.filter(
    (a) => String(a.tipo).trim().toUpperCase() === String(tipoArma).toUpperCase(),
  );
  armasFiltradas.forEach((arma) => {
    const estaPrestada = salvoconductosEmitidosLista.some(
      (s) => String(s.serie).trim().toUpperCase() === String(arma.serie).trim().toUpperCase() && s.estado === "CUSTODIA",
    );
    if (!estaPrestada)
      selectSerie.innerHTML += `<option value="${arma.serie}">${arma.serie}</option>`;
  });
}

function vincularDetallesArma(serieSeleccionada) {
  const arma = salvoCacheArmamentoReal.find(
    (a) => String(a.serie).trim().toUpperCase() === String(serieSeleccionada).trim().toUpperCase(),
  );
  if (arma) {
    document.getElementById("salvo-marca").value = arma.marca || "SIN MARCA";
    const relacion = salvoCacheCalibres.find(
      (ac) => String(ac.tipo_armamento).trim().toUpperCase() === String(arma.tipo).trim().toUpperCase(),
    );
    document.getElementById("salvo-calibre").value = relacion ? relacion.calibre_reglamentario : "-";
  }
}

function buscarCedulaSalvoconducto(cedulaDigitada) {
  const inputInfo = document.getElementById("salvo-info-militar");
  if (!inputInfo) return;
  let cc = cedulaDigitada.trim();
  if (cc.length === 9) cc = "0" + cc;
  const tripulante = salvoCachePersonal.find((p) => String(p.cedula).trim() === cc);
  if (tripulante) {
    inputInfo.value = `${tripulante.grado} ${tripulante.apellidos_nombres}`;
    inputInfo.style.border = "2px solid #1abc9c";
  } else {
    inputInfo.value = "";
    inputInfo.style.border = "1px solid #ccc";
  }
}

// Variable global para mantener el texto de búsqueda activo
let filtroBusquedaActual = "";

function renderizarTablaSalvoconductos() {
  const tbody = document.getElementById("table-body-salvoconductos-activos");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!salvoconductosEmitidosLista || salvoconductosEmitidosLista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#7f8c8d; padding:15px;">No hay salvoconductos registrados</td></tr>`;
    return;
  }

  // 1. APLICAR FILTRO DE BÚSQUEDA MULTI-CRITERIO
  let listaFiltrada = [...salvoconductosEmitidosLista];
  if (filtroBusquedaActual) {
    listaFiltrada = listaFiltrada.filter((s) => {
      const cedula = String(s.cedula || "").toLowerCase();
      const apellidoNombre = String(s.apellidos_nombres || "").toLowerCase();
      const serie = String(s.serie || "").toLowerCase();
      const marca = String(s.marca || "").toLowerCase();
      
      return cedula.includes(filtroBusquedaActual) || 
             apellidoNombre.includes(filtroBusquedaActual) || 
             serie.includes(filtroBusquedaActual) || 
             marca.includes(filtroBusquedaActual);
    });
  }

  // === ANALIZADOR MULTI-FORMATO SEGURO DE FECHA Y HORA DE GOOGLE SHEETS ===
  const separarFechaYHora = (stringFechaOriginal) => {
    if (!stringFechaOriginal) return { soloFecha: "Sin Fecha", hora: "--:--" };
    
    try {
      const cadenaStr = String(stringFechaOriginal).trim();
      
      // Caso 1: Si viene en formato ISO de Google (Ej: "2026-06-25T14:35:00.000Z")
      if (cadenaStr.includes('T')) {
        const partesISO = cadenaStr.split('T');
        const f = partesISO[0].split('-');
        let soloFecha = partesISO[0];

        
        if (f.length === 3) {
          const mesesNombres = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
          const nombreMes = mesesNombres[parseInt(f[1], 10) - 1] || "JUN";
          
          soloFecha = `${f[2]}/${nombreMes}/${f[0]}`;
        }
        
        const subHora = partesISO[1].split(':');
        const hora = subHora.length >= 2 ? `${subHora[0]}:${subHora[1]}` : "00:00";
        return { soloFecha, hora };
      }
      
      // Caso 2: Si viene separado por espacios como indicas (Ej: "25/JUN/2026 14:35:22")
      const partesEspacio = cadenaStr.split(/\s+/);
      if (partesEspacio.length >= 2) {
        const soloFecha = partesEspacio[0];
        const subHora = partesEspacio[1].split(':');
        const hora = subHora.length >= 2 ? `${subHora[0]}:${subHora[1]}` : "00:00";
        return { soloFecha, hora };
      }
      
      return { soloFecha: cadenaStr, hora: "--:--" };
    } catch (err) {
      return { soloFecha: String(stringFechaOriginal), hora: "--:--" };
    }
  };

  // 2. ORDENAMIENTO COMPUESTO: FECHA REAL DESCENDENTE
  listaFiltrada.sort((a, b) => {
    const parsearFechaAms = (strFechaFull) => {
      if (!strFechaFull) return 0;
      const { soloFecha } = separarFechaYHora(strFechaFull);
      const partes = soloFecha.split('/');
      if (partes.length === 3) {
        const meses = { "ENE": "01", "FEB": "02", "MAR": "03", "ABR": "04", "MAY": "05", "JUN": "06", "JUL": "07", "AGO": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DIC": "12" };
        let mes = partes[1].toUpperCase();
        if (meses[mes]) mes = meses[mes];
        return new Date(`${partes[2]}-${mes}-${partes[0]}`).getTime();
      }
      return new Date(soloFecha).getTime() || 0;
    };

    const fechaA = parsearFechaAms(a.fecha);
    const fechaB = parsearFechaAms(b.fecha);

    if (fechaB !== fechaA) return fechaB - fechaA; 
    return parseInt(b.id) - parseInt(a.id); 
  });

  if (listaFiltrada.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#e74c3c; padding:15px;">No se encontraron registros que coincidan con la búsqueda</td></tr>`;
    return;
  }

  // 3. RENDERIZADO CON ENCABEZADOS DE FECHA INTERMEDIOS
  let ultimaFechaAgrupada = "";

  listaFiltrada.forEach((s) => {
    const esActivo = s.estado === "CUSTODIA";
    const { soloFecha, hora } = separarFechaYHora(s.fecha);

    if (soloFecha !== ultimaFechaAgrupada) {
      ultimaFechaAgrupada = soloFecha;
      const filaEncabezado = document.createElement("tr");
      filaEncabezado.className = "fila-grupo-fecha";
      filaEncabezado.innerHTML = `
        <td colspan="10" style="background: #2c3e50; color: #ffffff; font-weight: bold; text-align: left; padding: 8px 15px; font-size: 12px; letter-spacing: 0.5px;">
          <i class="fa-solid fa-calendar-days"></i> SALVOCONDUCTOS GENERADOS EL: ${soloFecha.toUpperCase()}
        </td>
      `;
      tbody.appendChild(filaEncabezado);
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td style="text-align:center; display: flex; align-items: center; justify-content: center; gap: 10px; height: 100%;">
            <input type="checkbox" class="salvo-row-checkbox" data-id="${s.id}" style="cursor: pointer; transform: scale(1.2); margin: 0;">
        </td>
        <td><strong>${soloFecha}</strong>${hora !== "--:--" ? `<br><small style="color:#2c3e50; font-weight:bold;"><i class="fa-regular fa-clock"></i> ${hora} HS</small>` : ""}</td>
        <td>${s.cedula}</td>
        <td style="text-align:left;">${s.apellidos_nombres}</td>
        <td><strong>${s.tipo_arma}</strong> <br><small>${s.serie}</small></td>
        <td>${s.cantidad_municion} <br><small>${s.calibre}</small></td>
        <td><strong>${s.lugar}</strong></td>
        <td><small>${s.fecha_inicio} al ${s.fecha_fin}</small></td>
        <td><span class="badge-ord" style="background:${esActivo ? "#e67e22" : "#7f8c8d"}; font-size:11px;">${s.estado}</span></td>
        <td>
            ${
              esActivo
                ? `<button type="button" class="btn-submit" style="background:#27ae60; padding:4px 8px; font-size:11px;" onclick="registrarDevolucionAnticipada('${s.id}')">Devolución</button>`
                : `<span style="color:#27ae60; font-weight:bold;">✔ En Armerillo</span>`
            }
        </td>
    `;
    tbody.appendChild(tr);
  });

  inicializarEventosImpresionMúltiple();
}

function actualizarContadorSeleccionados() {
  const count = document.querySelectorAll(".salvo-row-checkbox:checked").length;
  const indicador = document.getElementById("salvo-contador-seleccionados");
  if (indicador) indicador.innerText = `Seleccionados: ${count}`;
}

// ============================================================
// INICIALIZACIÓN DE EVENTOS DE IMPRESIÓN Y DESCARGA MÚLTIPLE
// Engancha: checkbox maestro, checkboxes de fila, contador,
// botón IMPRIMIR y botón DESCARGAR PDF
// ============================================================
function inicializarEventosImpresionMúltiple() {
  // --- 1. Checkbox maestro (seleccionar / deseleccionar todos) ---
  const checkboxMaestro = document.getElementById("salvo-select-all");
  if (checkboxMaestro) {
    // Clonar para eliminar listeners previos acumulados en renders anteriores
    const checkboxMaestroNuevo = checkboxMaestro.cloneNode(true);
    checkboxMaestro.parentNode.replaceChild(checkboxMaestroNuevo, checkboxMaestro);

    checkboxMaestroNuevo.addEventListener("change", function () {
      const checkboxes = document.querySelectorAll(".salvo-row-checkbox");
      checkboxes.forEach((cb) => { cb.checked = this.checked; });
      actualizarContadorSeleccionados();
    });
  }

  // --- 2. Checkboxes individuales de cada fila ---
  document.querySelectorAll(".salvo-row-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      actualizarContadorSeleccionados();
      // Si se desmarca uno, desmarcar el maestro
      const maestroActual = document.getElementById("salvo-select-all");
      if (maestroActual && !cb.checked) maestroActual.checked = false;
    });
  });

  // --- 3. Botón IMPRIMIR SALVOCONDUCTOS ---
  const btnImprimir = document.getElementById("btn-imprimir-salvoconductos");
  if (btnImprimir) {
    const btnImprimirNuevo = btnImprimir.cloneNode(true);
    btnImprimir.parentNode.replaceChild(btnImprimirNuevo, btnImprimir);

    btnImprimirNuevo.addEventListener("click", () => {
      const seleccionados = obtenerRegistrosSeleccionados();
      if (seleccionados.length === 0) {
        alert("⚠ Debe seleccionar al menos un salvoconducto para imprimir.");
        return;
      }
      ejecutarImpresionFormatoOficial(seleccionados);
    });
  }

  // --- 4. Botón DESCARGAR PDF ---
  const btnDescargar = document.getElementById("btn-descargar-salvoconductos");
  if (btnDescargar) {
    const btnDescargarNuevo = btnDescargar.cloneNode(true);
    btnDescargar.parentNode.replaceChild(btnDescargarNuevo, btnDescargar);

    btnDescargarNuevo.addEventListener("click", () => {
      const seleccionados = obtenerRegistrosSeleccionados();
      if (seleccionados.length === 0) {
        alert("⚠ Debe seleccionar al menos un salvoconducto para descargar.");
        return;
      }
      ejecutarDescargaPDFMilitar(seleccionados);
    });
  }
}

// Obtiene los objetos de salvoconducto que tienen su checkbox marcado
function obtenerRegistrosSeleccionados() {
  const checkboxesMarcados = document.querySelectorAll(".salvo-row-checkbox:checked");
  const idsSeleccionados = new Set();
  checkboxesMarcados.forEach((cb) => {
    const id = cb.getAttribute("data-id");
    if (id) idsSeleccionados.add(String(id));
  });
  return salvoconductosEmitidosLista.filter((s) => idsSeleccionados.has(String(s.id)));
}

// === CORRECCIÓN CRÍTICA DE CARGA INICIAL (DOM CONTENT LOADED SANITIZADO) ===
document.addEventListener("DOMContentLoaded", () => {
  // 1. Forzar ocultamiento de los bloques que se encimaban al cargar la app por primera vez
  const moduloSalvoconductos = document.getElementById("module-salvoconductos");
  const moduloParteDiario = document.getElementById("module-parte_diario");
  const moduloPersonal = document.getElementById("module-registro_personal");

  // Asegura que al abrir por primera vez la app no arranquen encimados en pantalla
  if (moduloParteDiario) moduloParteDiario.classList.add("hidden");
  if (moduloPersonal) moduloPersonal.classList.add("hidden");

  // El modal y formulario conservan sus oyentes perfectamente
  const modalSalvo = document.getElementById("modal-emision-salvoconducto");
  const btnAbrirModal = document.getElementById("btn-abrir-nuevo-salvo");
  const btnCerrarModal = document.getElementById("btn-cerrar-modal-salvo");
  const formSalvoconducto = document.getElementById("form-salvoconducto");

  if (btnAbrirModal && modalSalvo) {
    btnAbrirModal.addEventListener("click", () => {
      formSalvoconducto.reset();
      document.getElementById("salvo-info-militar").value = "";
      modalSalvo.classList.remove("hidden");
    });
  }

  if (btnCerrarModal && modalSalvo) {
    btnCerrarModal.addEventListener("click", () => {
      modalSalvo.classList.add("hidden");
      filtroBusquedaActual = "";
    });
  }

  if (modalSalvo) {
    modalSalvo.addEventListener("click", (e) => {
      if (e.target === modalSalvo) modalSalvo.classList.add("hidden");
    });
  }

  if (formSalvoconducto) {
    formSalvoconducto.addEventListener("submit", async (e) => {
      e.preventDefault();
      const infoMilitar = document.getElementById("salvo-info-militar").value;
      const calibre = document.getElementById("salvo-calibre").value;
      const cantMunSolicitada = parseInt(document.getElementById("salvo-cant-mun").value) || 0;

      if (!infoMilitar) {
        alert("❌ Error: Cédula no válida.");
        return;
      }

      const loteMunicion = salvoCacheMunicionStock.find(
        (m) => String(m.calibre).trim().toUpperCase() === String(calibre).trim().toUpperCase()
      );
      const stockDisponible = loteMunicion ? parseInt(loteMunicion.cantidad) : 0;

      if (cantMunSolicitada > stockDisponible) {
        alert(`❌ Abortado: Stock insuficiente en polvorín. Almacenado: ${stockDisponible}.`);
        return;
      }

      const payload = {
        target: "salvoconductos",
        action: "create",
        cedula: document.getElementById("salvo-cedula").value,
        apellidos_nombres: infoMilitar,
        tipo_arma: document.getElementById("salvo-tipo-arma").value,
        serie: document.getElementById("salvo-serie").value,
        marca: document.getElementById("salvo-marca").value,
        calibre: calibre,
        cantidad_municion: cantMunSolicitada,
        lugar: document.getElementById("salvo-lugar").value,
        fecha_inicio: document.getElementById("salvo-fecha-inicio").value,
        fecha_fin: document.getElementById("salvo-fecha-fin").value,
        aprobado_por: document.getElementById("salvo-aprobador").value,
      };

      if (typeof sendData === "function") {
        sendData(payload, () => {
          formSalvoconducto.reset();
          document.getElementById("salvo-info-militar").value = "";
          if (modalSalvo) modalSalvo.classList.add("hidden");
        });
      }
    });
  }
});

async function registrarDevolucionAnticipada(idSalvoconducto) {
  if (
    confirm(
      "¿Confirmar la entrega y reincorporación del material bélico al stock de la Unidad?",
    )
  ) {
    if (typeof sendData === "function") {
      sendData(
        { target: "salvoconductos", action: "update", id: idSalvoconducto },
        () => { },
      );
    }
  }
}

function ejecutarImpresionFormatoOficial(registros) {
  const ventanaImpresion = window.open("", "_blank");
  let htmlContenido = `
    
  <!DOCTYPE html>
<html>

<head>
    <title>Impresión de Salvoconductos - FAE</title>
    <style>
        @page {
            size: A4 vertical;
            margin: 0;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .hoja-a4 {
            width: 210mm;
            min-height: 297mm;
            padding-top: 10mm;
            padding-bottom: 10mm;
            margin: 0 auto;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            page-break-after: always;
        }

        .hoja-a4:last-child {
            page-break-after: avoid;
        }

        .salvoconducto-container {
            width: 190mm;
            height: 70mm;
            margin-bottom: 15mm;
            border: 1px solid #000000;
            box-sizing: border-box;
            display: flex;
            position: relative;
            background: #ffffff;
            overflow: hidden;
            padding: 1px;
        }

        .salvoconducto-container:nth-child(3n) {
            margin-bottom: 0;
        }

        .panel-izquierdo,
        .panel-derecho {
            width: 94.5mm;
            height: 68.9mm;
            border: 3px solid #000000;
            padding: 6px 8px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            z-index: 5;
        }

        .panel-derecho {
            padding: 8px 10px;
            margin-left: 1px;
        }

        .marca-agua-fae {
            position: absolute;
            top: 50%;
            left: 45%;
            transform: translate(-50%, -50%);
            width: 30mm;
            height: 30mm;
            opacity: 0.22;
            z-index: 1;
            pointer-events: none;
        }

        .header-titulo {
            text-align: center;
            font-size: 15px;
            font-weight: bold;
            line-height: 1.2;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .meta-label-block {
            font-size: 9px;
            text-transform: uppercase;
            margin-top: 1px;
            margin-bottom: 2px;
            font-weight: normal;
        }

        .meta-value-text {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .grid-datos-armas {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px 6px;
            margin-top: 1px;
            margin-left: 5px;
            font-weight: 400;
        }

        .texto-legal-sub {
            font-size: 11px;
            margin: 5px 0;
            text-align: justify;
            line-height: 1.4;
            font-weight: 400;
        }

        .texto-legal-footer {
            font-size: 11px;
            margin: 8px 0 2px;
            text-align: left;
            font-weight: normal;
        }

        .pie-firma-autoridad {
            text-align: center;
            font-size: 11px;
            line-height: 1.1;
            margin-top: auto;
            padding-top: 0.7px;
        }

        .linea-portador {
            width: 70%;
            margin: 0 auto 2px;
            border-bottom: 1px solid #000;
        }

        @media print {
            .hoja-a4 {
                margin: 0;
                page-break-inside: avoid;
            }
        }
    </style>
</head>

<body>
  `;

  for (let i = 0; i < registros.length; i += 3) {
    htmlContenido += `<div class="hoja-a4">`;
    for (let j = i; j < i + 3 && j < registros.length; j++) {
      const r = registros[j];
      const armaFisica = salvoCacheArmamentoReal.find(
        (a) =>
          String(a.serie).trim().toUpperCase() ===
          String(r.serie).trim().toUpperCase(),
      );
      const marcaCorrecta = armaFisica
        ? armaFisica.marca || "SIN MARCA"
        : r.marca && r.marca !== "undefined"
          ? r.marca
          : "-";

      let firmaBloqueFormateado = r.aprobado_por;
      let funcionCargoAutoridad = 'COMANDANTE DEL ESCUADRÓN VIGALGO "BUITRE"';

      const poolAutorizadoresImpresion = [
        ...salvoCachePersonal,
        ...(window.datosPersonalAgregadoGlobal || []),
      ];
      const autorizador = poolAutorizadoresImpresion.find(
        (p) =>
          `${p.grado} ${p.apellidos_nombres}`.trim().toUpperCase() ===
          String(r.aprobado_por).trim().toUpperCase(),
      );

      if (autorizador) {
        const tokens = autorizador.apellidos_nombres.trim().split(/\s+/);
        let nombreFirma = autorizador.apellidos_nombres;
        if (tokens.length >= 3)
          nombreFirma = `${tokens[2]} ${tokens[0]} ${tokens[1]}`;

        let espAbr = autorizador.especialidad
          ? autorizador.especialidad.trim().toUpperCase()
          : "";
        if (
          espAbr.includes("TÉCNICO") ||
          espAbr.includes("TECNICO") ||
          espAbr.includes("ARMAMENTO")
        )
          espAbr = "TÉC.";
        else if (espAbr.includes("ESPECIALISTA")) espAbr = "ESP.";
        else if (espAbr.includes("PILOTO")) espAbr = "PLTO.";
        else if (espAbr.length > 0) espAbr = espAbr.substring(0, 3) + ".";

        firmaBloqueFormateado = `${autorizador.grado} ${espAbr} AVC. ${nombreFirma}`;
        if (autorizador.funcion)
          funcionCargoAutoridad = String(autorizador.funcion)
            .trim()
            .toUpperCase();
      }

      htmlContenido += `
        <div class="salvoconducto-container">
          <div class="panel-izquierdo">
            <img class="marca-agua-fae" src="imagenes/sello_fae.svg" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/2/29/Escudo_de_la_Fuerza_A%C3%A9rea_Ecuatoriana.png';">
            <div class="header-titulo">FUERZA AEREA ECUATORIANA<br><span style="font-size: 13px; font-weight:normal;">Salvoconducto para Portar Arma</span></div>
            <div style="margin-top: 1px; margin-left:5px;">
              <div class="meta-value-text">${r.apellidos_nombres}</div>
              <div class="meta-label-block">Grado, Apellidos y Nombres</div>
            </div>
            <div class="grid-datos-armas">
              <div>
                <div class="meta-value-text">${r.cedula}</div><div class="meta-label-block">Cédula</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.serie}</div><div class="meta-label-block">Serie</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.calibre}</div><div class="meta-label-block">Calibre</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.fecha_inicio}</div><div class="meta-label-block">Fecha Emisión</div>
              </div>
              <div style="margin-left: 40px;">
                <div class="meta-value-text">${r.tipo_arma}</div><div class="meta-label-block">Tipo de Arma</div>
                <div class="meta-value-text" style="margin-top: 1px;">${marcaCorrecta}</div><div class="meta-label-block">Marca</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.cantidad_municion}</div><div class="meta-label-block">Cantidad Munición</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.fecha_fin}</div><div class="meta-label-block">Fecha Caducidad</div>
              </div>
            </div>
            <div class="pie-firma-autoridad">
              <div class="linea-portador"></div>
              <div class="meta-value-text" style="margin-top: 2px; font-size: 11px; font-weight:normal">${firmaBloqueFormateado}</div>
              <div class="meta-value-text" style="margin-top: 2px; font-size: 11px; font-weight: bold">${funcionCargoAutoridad}</div>
            </div>
          </div>
          <div class="panel-derecho">
            <p class="texto-legal-sub">EL PORTADOR DE LA PRESENTE CREDENCIAL ESTÁ AUTORIZADO POR EL RESPONSABLE PUNTO DE DESPLIEGUE "CERRO MONTECRISTI", A PORTAR EL ARMA DETALLADA PARA EL CUMPLIMIENTO DE SU MISIÓN OFICIAL DENTRO DE LA PROVINCIA DE MANABÍ. EN TAL VIRTUD, SE SOLICITA A TODA AUTORIDAD CIVIL, MILITAR Y POLICIAL SU COLABORACIÓN PARA EL DESEMPEÑO DE LA COMISIÓN.</p>
            <p class="texto-legal-footer">ESTE DOCUMENTO SERÁ VÁLIDO PREVIA PRESENTACIÓN DE LA TARJETA MILITAR ORIGINAL.</p>
            <div style="text-align: center; margin-top: auto; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              <div class="linea-portador"></div><h2 style="font-size:12px; margin:0;">EL PORTADOR</h2>
            </div>
          </div>
        </div>
      `;
    }
    htmlContenido += `</div>`;
  }

  htmlContenido += `
    <script>
      window.onload = function() {
        setTimeout(function() { window.print(); }, 300);
      };
    </script>
    </body></html>
  `;

  ventanaImpresion.document.open();
  ventanaImpresion.document.write(htmlContenido);
  ventanaImpresion.document.close();
}

function ejecutarDescargaPDFMilitar(registros) {
  let htmlContenido = `
    <!DOCTYPE html>
    <html>

<head>
    <title>Descarga de Salvoconductos - FAE</title>
    <style>
        @page {
            size: A4 vertical;
            margin: 0;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .hoja-a4 {
            width: 210mm;
            min-height: 295.5mm;
            padding-top: 10mm;
            padding-bottom: 5mm;
            margin: 0 auto;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            background: #ffffff;
            page-break-after: always;
        }

        .hoja-a4:last-child {
            page-break-after: avoid !important;
        }

        .salvoconducto-container {
            width: 190mm;
            height: 68mm;
            margin-bottom: 12mm;
            border: 1px solid #000000;
            box-sizing: border-box;
            display: flex;
            position: relative;
            background: #ffffff;
            overflow: hidden;
            padding: 1px;
        }

        .salvoconducto-container:last-child,
        .salvoconducto-container:nth-child(3n) {
            margin-bottom: 0 !important;
        }

        .panel-izquierdo {
            width: 94.5mm;
            height: 66.9mm;
            border: 3px solid #000000;
            padding: 5px 8px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            z-index: 5;
        }

        .panel-derecho {
            width: 94.5mm;
            height: 66.9mm;
            border: 3px solid #000000;
            padding: 7px 10px;
            box-sizing: border-box;
            display: flex;
            margin-left: 1px;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            z-index: 5;
        }

        .marca-agua-fae {
            position: absolute;
            top: 50%;
            left: 45%;
            transform: translate(-50%, -50%);
            width: 30mm;
            height: 30mm;
            opacity: 0.22;
            z-index: 1;
            pointer-events: none;
        }

        .header-titulo {
            text-align: center;
            font-size: 15px;
            font-weight: bold;
            line-height: 1.2;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .meta-label-block {
            font-size: 9px;
            text-transform: uppercase;
            margin-top: 1px;
            margin-bottom: 2px;
            font-weight: normal;
        }

        .meta-value-text {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .grid-datos-armas {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px 6px;
            margin-top: 1px;
            margin-left: 5px;
            font-weight: 400;
        }

        .texto-legal-sub {
            font-size: 11px;
            margin: 4px 0;
            text-align: justify;
            line-height: 1.35;
            font-weight: 400;
        }

        .texto-legal-footer {
            font-size: 11px;
            margin: 6px 0 2px;
            text-align: left;
            font-weight: normal;
        }

        .pie-firma-autoridad {
            text-align: center;
            font-size: 11px;
            line-height: 1.1;
            margin-top: auto;
            padding-top: 0.7px;
        }

        .linea-portador {
            width: 70%;
            margin: 0 auto 2px;
            border-bottom: 1px solid #000;
        }
    </style>
</head>

<body>
  `;

  for (let i = 0; i < registros.length; i += 3) {
    htmlContenido += `<div class="hoja-a4">`;
    for (let j = i; j < i + 3 && j < registros.length; j++) {
      const r = registros[j];
      const armaFisica = salvoCacheArmamentoReal.find(
        (a) =>
          String(a.serie).trim().toUpperCase() ===
          String(r.serie).trim().toUpperCase(),
      );
      const marcaCorrecta = armaFisica
        ? armaFisica.marca || "SIN MARCA"
        : r.marca && r.marca !== "undefined"
          ? r.marca
          : "-";

      let firmaBloqueFormateado = r.aprobado_por;
      let funcionCargoAutoridad = 'COMANDANTE DEL ESCUADRÓN VIGALGO "BUITRE"';

      const poolAutorizadoresPDF = [
        ...salvoCachePersonal,
        ...(window.datosPersonalAgregadoGlobal || []),
      ];
      const autorizador = poolAutorizadoresPDF.find(
        (p) =>
          `${p.grado} ${p.apellidos_nombres}`.trim().toUpperCase() ===
          String(r.aprobado_por).trim().toUpperCase(),
      );

      if (autorizador) {
        const tokens = autorizador.apellidos_nombres.trim().split(/\s+/);
        let nombreFirma = autorizador.apellidos_nombres;
        if (tokens.length >= 3)
          nombreFirma = `${tokens[2]} ${tokens[0]} ${tokens[1]}`;

        let espAbr =
          autorizador.especialidad
            ? autorizador.especialidad
              .trim()
              .toUpperCase()
            : "";
        if (
          espAbr.includes("TÉCNICO") ||
          espAbr.includes("TECNICO") ||
          espAbr.includes("ARMAMENTO")
        )
          espAbr = "TÉC.";
        else if (espAbr.includes("ESPECIALISTA")) espAbr = "ESP.";
        else if (espAbr.includes("PILOTO")) espAbr = "PLTO.";
        else if (espAbr.length > 0) espAbr = espAbr.substring(0, 3) + ".";

        firmaBloqueFormateado = `${autorizador.grado} ${espAbr} AVC. ${nombreFirma}`;
        if (autorizador.funcion)
          funcionCargoAutoridad = String(autorizador.funcion)
            .trim()
            .toUpperCase();
      }

      htmlContenido += `
        <div class="salvoconducto-container">
          <div class="panel-izquierdo">
            <img class="marca-agua-fae" src="imagenes/sello_fae.svg" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/2/29/Escudo_de_la_Fuerza_A%C3%A9rea_Ecuatoriana.png';">
            <div class="header-titulo">FUERZA AEREA ECUATORIANA<br><span style="font-size: 13px; font-weight:normal;">Salvoconducto para Portar Arma</span></div>
            <div style="margin-top: 1px; margin-left:5px;">
              <div class="meta-value-text">${r.apellidos_nombres}</div>
              <div class="meta-label-block">Grado, Apellidos y Nombres</div>
            </div>
            <div class="grid-datos-armas">
              <div>
                <div class="meta-value-text">${r.cedula}</div><div class="meta-label-block">Cédula</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.serie}</div><div class="meta-label-block">Serie</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.calibre}</div><div class="meta-label-block">Calibre</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.fecha_inicio}</div><div class="meta-label-block">Fecha Emisión</div>
              </div>
              <div style="margin-left: 40px;">
                <div class="meta-value-text">${r.tipo_arma}</div><div class="meta-label-block">Tipo de Arma</div>
                <div class="meta-value-text" style="margin-top: 1px;">${marcaCorrecta}</div><div class="meta-label-block">Marca</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.cantidad_municion}</div><div class="meta-label-block">Cantidad Munición</div>
                <div class="meta-value-text" style="margin-top: 1px;">${r.fecha_fin}</div><div class="meta-label-block">Fecha Caducidad</div>
              </div>
            </div>
            <div class="pie-firma-autoridad">
              <div class="linea-portador"></div>
              <div class="meta-value-text" style="margin-top: 2px; font-size: 11px; font-weight:normal">${firmaBloqueFormateado}</div>
              <div class="meta-value-text" style="margin-top: 2px; font-size: 11px; font-weight: bold">${funcionCargoAutoridad}</div>
            </div>
          </div>
          <div class="panel-derecho">
            <p class="texto-legal-sub">EL PORTADOR DE LA PRESENTE CREDENCIAL ESTÁ AUTORIZADO POR EL RESPONSABLE PUNTO DE DESPLIEGUE "CERRO MONTECRISTI", A PORTAR EL ARMA DETALLADA PARA EL CUMPLIMIENTO DE SU MISIÓN OFICIAL DENTRO DE LA PROVINCIA DE MANABÍ. EN TAL VIRTUD, SE SOLICITA A TODA AUTORIDAD CIVIL, MILITAR Y POLICIAL SU COLABORACIÓN PARA EL DESEMPEÑO DE LA COMISIÓN.</p>
            <p class="texto-legal-footer">ESTE DOCUMENTO SERÁ VÁLIDO PREVIA PRESENTACIÓN DE LA TARJETA MILITAR ORIGINAL.</p>
            <div style="text-align: center; margin-top: auto; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              <div class="linea-portador"></div><h2 style="font-size:12px; margin:0;">EL PORTADOR</h2>
            </div>
          </div>
        </div>
      `;
    }
    htmlContenido += `</div>`;
  }

  htmlContenido += `</body></html>`;

  const opcionesConfiguracion = {
    margin: 0,
    filename: `Salvoconductos_Emitidos_${registros[0].cedula}.pdf`,
    image: { type: "jpeg", quality: 1.0 },
    html2canvas: {
      scale: 4,
      useCORS: true,
      logging: false,
      letterRendering: true,
      antiAliasing: true,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compressPDF: true,
    },
    pagebreak: { mode: ["css", "legacy"] },
  };

  html2pdf().from(htmlContenido).set(opcionesConfiguracion).save();
}

function inicializarBuscadorMatrizSalvoconductos() {
  const contenedorAcciones = document.querySelector(
    ".matriz-salvo-acciones-flex",
  );
  if (!contenedorAcciones) return;

  if (document.getElementById("salvo-input-buscador")) return;

  const divBusqueda = document.createElement("div");
  divBusqueda.style.display = "flex";
  divBusqueda.style.alignItems = "center";
  divBusqueda.style.gap = "10px";
  divBusqueda.style.marginRight = "auto";

  divBusqueda.innerHTML = `
    <div style="position: relative; display: flex; align-items: center;">
      <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 10px; color: #7f8c8d;"></i>
      <input type="text" id="salvo-input-buscador" placeholder="Buscar cédula, apellido, serie o marca..." 
             style="padding: 6px 10px 6px 32px; width: 280px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px;">
    </div>
    <span id="salvo-badge-historial" style="background: #34495e; color: #fff; padding: 5px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; display: none; align-items: center; gap: 5px;">
      <i class="fa-solid fa-clock-history"></i> <span id="salvo-texto-historial">Usos: 0</span>
    </span>
  `;

  contenedorAcciones.insertBefore(divBusqueda, contenedorAcciones.firstChild);

  const inputBuscador = document.getElementById("salvo-input-buscador");
  const badgeHistorial = document.getElementById("salvo-badge-historial");
  const textoHistorial = document.getElementById("salvo-texto-historial");

  inputBuscador.addEventListener("input", function () {
    filtroBusquedaActual = this.value.trim().toLowerCase();

    if (filtroBusquedaActual.length >= 2) {
      let contadorUsos = 0;

      salvoconductosEmitidosLista.forEach((s) => {
        const cedula = String(s.cedula || "").toLowerCase();
        const nombre = String(s.apellidos_nombres || "").toLowerCase();
        const serie = String(s.serie || "").toLowerCase();
        const marca = String(s.marca || "").toLowerCase();

        if (
          cedula.includes(filtroBusquedaActual) ||
          nombre.includes(filtroBusquedaActual) ||
          serie.includes(filtroBusquedaActual) ||
          marca.includes(filtroBusquedaActual)
        ) {
          contadorUsos++;
        }
      });

      badgeHistorial.style.display = "inline-flex";
      textoHistorial.innerText = `Frecuencia / Registros en Matriz: ${contadorUsos} veces`;
    } else {
      badgeHistorial.style.display = "none";
    }

    renderizarTablaSalvoconductos();
  });
}

// Inyectar el buscador de forma automática cada vez que los datos de Sheets se carguen
const originalPoblarDesplegables = poblarDesplegablesSalvoconducto;
poblarDesplegablesSalvoconducto = function (data) {
  originalPoblarDesplegables(data);
  setTimeout(inicializarBuscadorMatrizSalvoconductos, 200);
};