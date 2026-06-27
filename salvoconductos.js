let salvoCachePersonal = [];
let salvoCacheCalibres = [];
let salvoCacheArmamentoReal = [];
let salvoCacheMunicionStock = [];
let salvoconductosEmitidosLista = [];

function poblarDesplegablesSalvoconducto(data) {
  salvoCachePersonal = data.personal || [];
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

  // 2. Población de Lugares / Repartos desde la base de datos (REQUERIMIENTO 3)
  selectLugar.innerHTML = '<option value="">-- Seleccione Destino --</option>';
  (data.lugar || []).forEach((l) => {
    if (l.lugar)
      selectLugar.innerHTML += `<option value="${l.lugar}">${l.lugar}</option>`;
  });

  // 3. Población de Autoridades Aprobadoras (Filtro por Rol)
  selectAprobador.innerHTML =
    '<option value="">-- Seleccione Autoridad Militar Facultada --</option>';
  (data.personal || []).forEach((p) => {
    const cargoLimpio = String(p.funcion).trim().toUpperCase();
    if (
      cargoLimpio === 'COMANDANTE DEL ESCUADRÓN VIGALGO "BUITRE"' ||
      cargoLimpio === 'OFICIAL DE SEMANA ESCUADRÓN VIGALGO "BUITRE"'
    ) {
      selectAprobador.innerHTML += `<option value="${p.grado} ${p.apellidos_nombres}">${p.grado} ${p.apellidos_nombres}</option>`;
    }
  });

  // Calcular las existencias y dibujar paneles
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

  // A. Consolidación y conteo de Armamento
  let resumenArmas = {};
  salvoCacheArmamentoReal.forEach((a) => {
    const tipo = String(a.tipo).trim().toUpperCase();
    if (!resumenArmas[tipo]) resumenArmas[tipo] = { total: 0, asignados: 0 };
    resumenArmas[tipo].total += parseInt(a.cantidad_armamento) || 0;
  });

  // B. Consolidación y conteo de Munición
  let resumenMun = {};
  salvoCacheMunicionStock.forEach((m) => {
    const calibre = String(m.calibre).trim().toUpperCase();
    if (!resumenMun[calibre]) resumenMun[calibre] = { total: 0, entregado: 0 };
    resumenMun[calibre].total += parseInt(m.cantidad) || 0;
  });

  // C. Cruzar contra Salvoconductos activos ("CUSTODIA")
  salvoconductosEmitidosLista.forEach((s) => {
    if (s.estado === "CUSTODIA") {
      const tipoArma = String(s.tipo_arma).trim().toUpperCase();
      const calibre = String(s.calibre).trim().toUpperCase();
      const cantMun = parseInt(s.cantidad_municion) || 0;

      if (resumenArmas[tipoArma]) resumenArmas[tipoArma].asignados += 1; // 1 Fusil/Arma por documento físico de serie
      if (resumenMun[calibre]) resumenMun[calibre].entregado += cantMun;
    }
  });

  // D. Dibujar Tabla Resumen Armas
  Object.keys(resumenArmas).forEach((tipo) => {
    const total = resumenArmas[tipo].total;
    const asignados = resumenArmas[tipo].asignados;
    const disponible = total - asignados;
    tbodyArmas.innerHTML += `<tr><td><strong>${tipo}</strong></td><td>${total}</td><td>${asignados}</td><td style="font-weight:bold; color:${disponible > 0 ? "#18bc9c" : "#e74c3c"}">${disponible}</td></tr>`;
  });

  // E. Dibujar Tabla Resumen Munición
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
    (a) =>
      String(a.tipo).trim().toUpperCase() === String(tipoArma).toUpperCase(),
  );
  armasFiltradas.forEach((arma) => {
    const estaPrestada = salvoconductosEmitidosLista.some(
      (s) =>
        String(s.serie).trim().toUpperCase() ===
          String(arma.serie).trim().toUpperCase() && s.estado === "CUSTODIA",
    );
    if (!estaPrestada)
      selectSerie.innerHTML += `<option value="${arma.serie}">${arma.serie}</option>`;
  });
}

function vincularDetallesArma(serieSeleccionada) {
  const arma = salvoCacheArmamentoReal.find(
    (a) =>
      String(a.serie).trim().toUpperCase() ===
      String(serieSeleccionada).trim().toUpperCase(),
  );
  if (arma) {
    document.getElementById("salvo-marca").value = arma.marca || "SIN MARCA";
    const relacion = salvoCacheCalibres.find(
      (ac) =>
        String(ac.tipo_armamento).trim().toUpperCase() ===
        String(arma.tipo).trim().toUpperCase(),
    );
    document.getElementById("salvo-calibre").value = relacion
      ? relacion.calibre_reglamentario
      : "-";
  }
}

function buscarCedulaSalvoconducto(cedulaDigitada) {
  const inputInfo = document.getElementById("salvo-info-militar");
  if (!inputInfo) return;
  let cc = cedulaDigitada.trim();
  if (cc.length === 9) cc = "0" + cc;
  const tripulante = salvoCachePersonal.find(
    (p) => String(p.cedula).trim() === cc,
  );
  if (tripulante) {
    inputInfo.value = `${tripulante.grado} ${tripulante.apellidos_nombres}`;
    inputInfo.style.border = "2px solid #1abc9c";
  } else {
    inputInfo.value = "";
    inputInfo.style.border = "1px solid #ccc";
  }
}

function renderizarTablaSalvoconductos() {
  const tbody = document.getElementById("table-body-salvoconductos-activos");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (
    !salvoconductosEmitidosLista ||
    salvoconductosEmitidosLista.length === 0
  ) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#7f8c8d; padding:15px;">No hay salvoconductos registrados</td></tr>`;
    return;
  }

  salvoconductosEmitidosLista.forEach((s) => {
    const tr = document.createElement("tr");
    const esActivo = s.estado === "CUSTODIA";

    tr.innerHTML = `
        <td style="text-align:center; display: flex; align-items: center; justify-content: center; gap: 10px; height: 100%;">
            <input type="checkbox" class="salvo-row-checkbox" data-id="${s.id}"
                style="cursor: pointer; transform: scale(1.2); margin: 0;">
        </td>
        <td><small>${s.fecha}</small></td>
        <td>${s.cedula}</td>
        <td style="text-align:left;">${s.apellidos_nombres}</td>
        <td><strong>${s.tipo_arma}</strong> <br><small>${s.serie}</small></td>
        <td>${s.cantidad_municion} <br><small>${s.calibre}</small></td>
        <td><strong>${s.lugar}</strong></td>
        <td><small>${s.fecha_inicio} al ${s.fecha_fin}</small></td>
        <td><span class="badge-ord" style="background:${esActivo ? " #e67e22" : "#7f8c8d"}; font-size:11px;">${s.estado}</span>
        </td>
        <td>
            ${
              esActivo
                ? `<button type="button" class="btn-submit" style="background:#27ae60; padding:4px 8px; font-size:11px;"
                onclick="registrarDevolucionAnticipada('${s.id}')">Devolución</button>`
                : `<span
                style="color:#27ae60; font-weight:bold;">✔ En Armerillo</span>`
            }
        </td>
    `;
    tbody.appendChild(tr);
  });

  inicializarEventosImpresionMúltiple();
}

function inicializarEventosImpresionMúltiple() {
  const selectAll = document.getElementById("salvo-select-all");
  const checkboxes = document.querySelectorAll(".salvo-row-checkbox");
  const btnImprimir = document.getElementById("btn-imprimir-salvoconductos");

  if (selectAll) {
    selectAll.checked = false;
    selectAll.onchange = function () {
      checkboxes.forEach((cb) => (cb.checked = selectAll.checked));
      actualizarContadorSeleccionados();
    };
  }

  checkboxes.forEach((cb) => {
    cb.onchange = function () {
      if (!this.checked) selectAll.checked = false;
      actualizarContadorSeleccionados();
    };
  });

  if (btnImprimir) {
    btnImprimir.onclick = function () {
      const seleccionados = [];
      document.querySelectorAll(".salvo-row-checkbox:checked").forEach((cb) => {
        const item = salvoconductosEmitidosLista.find(
          (s) => String(s.id) === String(cb.dataset.id),
        );
        if (item) seleccionados.push(item);
      });

      if (seleccionados.length === 0) {
        alert(
          "⚠ Por favor, seleccione al menos un salvoconducto mediante la opción de selección para proceder con la impresión.",
        );
        return;
      }

      ejecutarImpresionFormatoOficial(seleccionados);
    };
  }
  actualizarContadorSeleccionados();
}

function actualizarContadorSeleccionados() {
  const count = document.querySelectorAll(".salvo-row-checkbox:checked").length;
  const indicador = document.getElementById("salvo-contador-seleccionados");
  if (indicador) indicador.innerText = `Seleccionados: ${count}`;
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

        .panel-izquierdo {
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
            width: 94.5mm;
            height: 68.9mm;
            border: 3px solid #000000;
            padding: 8px 10px;
            box-sizing: border-box;
            display: flex;
            margin-left:1px;
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
            margin-left:5px;
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

      // === CORRECCIÓN 1: RESOLVER MARCA REAL MEDIANTE COMPARACIÓN ROBUSTA DE SERIE ===
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

      // === CORRECCIÓN 2: FORMATEAR EXTRACTO DE FIRMA AUTORIZADA EXTRAYENDO DE LA BASE DE DATOS ===
      let firmaBloqueFormateado = r.aprobado_por; // Respaldo por defecto
      let funcionCargoAutoridad = 'COMANDANTE DEL ESCUADRÓN VIGALCO "BUITRE"'; // Respaldo por defecto

      // Buscar la ficha completa del aprobador en la caché de personal utilizando su rango y nombre
      const autorizador = salvoCachePersonal.find(
        (p) =>
          `${p.grado} ${p.apellidos_nombres}`.trim().toUpperCase() ===
          String(r.aprobado_por).trim().toUpperCase(),
      );

      if (autorizador) {
        // Formatear nombres: la base de datos viene como "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
        // Extraemos el primer nombre (índice 2) y los dos apellidos (índices 0 y 1)
        const tokens = autorizador.apellidos_nombres.trim().split(/\s+/);
        let nombreFirma = autorizador.apellidos_nombres;

        if (tokens.length >= 3) {
          const ap1 = tokens[0];
          const ap2 = tokens[1];
          const nom1 = tokens[2];
          nombreFirma = `${nom1} ${ap1} ${ap2}`;
        }

        // Abreviar la Especialidad de forma estandarizada e institucional FAE
        let espAbr = autorizador.especialidad
          ? autorizador.especialidad.trim().toUpperCase()
          : "";
        if (
          espAbr.includes("TÉCNICO") ||
          espAbr.includes("TECNICO") ||
          espAbr.includes("ARMAMENTO")
        ) {
          espAbr = "TÉC.";
        } else if (espAbr.includes("ESPECIALISTA")) {
          espAbr = "ESP.";
        } else if (espAbr.includes("PILOTO")) {
          espAbr = "PLTO.";
        } else if (espAbr.length > 0) {
          espAbr = espAbr.substring(0, 3) + ".";
        }

        // Construcción simétrica solicitada: GRADO + ESP_ABRV + AVC. + 1er NOMBRE + 2 APELLIDOS
        firmaBloqueFormateado = `${autorizador.grado} ${espAbr} AVC. ${nombreFirma}`;

        // Cargar dinámicamente la función militar de la base de datos (Comandante u Oficial de Semana)
        if (autorizador.funcion) {
          funcionCargoAutoridad = String(autorizador.funcion)
            .trim()
            .toUpperCase();
        }
      }

      htmlContenido += `
        <div class="salvoconducto-container">
          <div class="panel-izquierdo">
            <img class="marca-agua-fae" src="imagenes/sello_fae.svg" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/2/29/Escudo_de_la_Fuerza_A%C3%A9rea_Ecuatoriana.png';">
            
            <div class="header-titulo">
              FUERZA AEREA ECUATORIANA<br>
              <span style="font-size: 13px; font-weight:normal;">Salvoconducto para Portar Arma</span>
            </div>

            <div style="margin-top: 1px; margin-left:5px;">
              <div class="meta-value-text">${r.apellidos_nombres}</div>
              <div class="meta-label-block">Grado, Apellidos y Nombres</div>
            </div>

            <div class="grid-datos-armas">
              <div>
                <div class="meta-value-text">${r.cedula}</div>
                <div class="meta-label-block">Cédula</div>
                
                <div class="meta-value-text" style="margin-top: 1px;">${r.serie}</div>
                <div class="meta-label-block">Serie</div>
                
                <div class="meta-value-text" style="margin-top: 1px;">${r.calibre}</div>
                <div class="meta-label-block">Calibre</div>
                
                <div class="meta-value-text" style="margin-top: 1px;">${r.fecha_inicio}</div>
                <div class="meta-label-block">Fecha Emisión</div>
              </div>
              
              <div style="margin-left: 40px;">
                <div class="meta-value-text">${r.tipo_arma}</div>
                <div class="meta-label-block">Tipo de Arma</div>
                
                <div class="meta-value-text" style="margin-top: 1px;">${marcaCorrecta}</div>
                <div class="meta-label-block">Marca</div>
                
                <div class="meta-value-text" style="margin-top: 1px;">${r.cantidad_municion}</div>
                <div class="meta-label-block">Cantidad Munición</div>
                
                <div class="meta-value-text" style="margin-top: 1px;">${r.fecha_fin}</div>
                <div class="meta-label-block">Fecha Caducidad</div>
              </div>
            </div>

            <div class="pie-firma-autoridad">
              <div class="linea-portador"></div>
              <div class="meta-value-text" style="margin-top: 2px; font-size: 11px; font-weight:normal">${firmaBloqueFormateado}</div>
              <div class="meta-value-text" style="margin-top: 2px; font-size: 11px; font-weight: bold">${funcionCargoAutoridad}</div>
            </div>
          </div>

          <div class="panel-derecho">
            <p class="texto-legal-sub">
              EL PORTADOR DE LA PRESENTE CREDENCIAL ESTÁ AUTORIZADO POR EL RESPONSABLE PUNTO DE DESPLIEGUE "CERRO MONTECRISTI", A PORTAR EL ARMA DETALLADA PARA EL CUMPLIMIENTO DE SU MISIÓN OFICIAL DENTRO DE LA PROVINCIA DE MANABÍ. EN TAL VIRTUD, SE SOLICITA A TODA AUTORIDAD CIVIL, MILITAR Y POLICIAL SU COLABORACIÓN PARA EL DESEMPEÑO DE LA COMISIÓN.
            </p>
            
            <p class="texto-legal-footer">
              ESTE DOCUMENTO SERÁ VÁLIDO PREVIA PRESENTACIÓN DE LA TARJETA MILITAR ORIGINAL.
            </p>

            <div style="text-align: center; margin-top: auto; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              <div class="linea-portador"></div>
              <h2 style="font-size:12px; margin:0;">EL PORTADOR</h2>
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
        setTimeout(function() {
          window.print();
          window.close();
        }, 300);
      };
    </script>
    </body>
    </html>
  `;

  ventanaImpresion.document.open();
  ventanaImpresion.document.write(htmlContenido);
  ventanaImpresion.document.close();
}

document.addEventListener("DOMContentLoaded", () => {
  const modalSalvo = document.getElementById("modal-emision-salvoconducto");
  const btnAbrirModal = document.getElementById("btn-abrir-nuevo-salvo");
  const btnCerrarModal = document.getElementById("btn-cerrar-modal-salvo");
  const formSalvoconducto = document.getElementById("form-salvoconducto");

  // 1. Manejo de aperturas y cierres del Modal
  if (btnAbrirModal && modalSalvo) {
    btnAbrirModal.addEventListener("click", () => {
      // ACCESO CONCEDIDO A TODOS LOS USUARIOS SIN RESTRICCIONES
      formSalvoconducto.reset();
      document.getElementById("salvo-info-militar").value = "";
      modalSalvo.classList.remove("hidden");
    });
  }

  if (btnCerrarModal && modalSalvo) {
    btnCerrarModal.addEventListener("click", () => {
      modalSalvo.classList.add("hidden");
    });
  }

  // Cerrar si hace clic en el fondo translúcido exterior
  if (modalSalvo) {
    modalSalvo.addEventListener("click", (e) => {
      if (e.target === modalSalvo) {
        modalSalvo.classList.add("hidden");
      }
    });
  }

  // 2. Interceptor del Formulario de Envío
  if (formSalvoconducto) {
    formSalvoconducto.addEventListener("submit", async (e) => {
      e.preventDefault();
      const infoMilitar = document.getElementById("salvo-info-militar").value;
      const calibre = document.getElementById("salvo-calibre").value;
      const cantMunSolicitada =
        parseInt(document.getElementById("salvo-cant-mun").value) || 0;

      if (!infoMilitar) {
        alert("❌ Error: Cédula no válida.");
        return;
      }

      const loteMunicion = salvoCacheMunicionStock.find(
        (m) =>
          String(m.calibre).trim().toUpperCase() ===
          String(calibre).trim().toUpperCase(),
      );
      const stockDisponible = loteMunicion
        ? parseInt(loteMunicion.cantidad)
        : 0;

      if (cantMunSolicitada > stockDisponible) {
        alert(
          `❌ Abortado: Stock insuficiente en polvorín. Almacenado: ${stockDisponible}.`,
        );
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
          // REGLA DE OPTIMIZACIÓN: Ocultar modal automáticamente tras guardar con éxito
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
        () => {},
      );
    }
  }
}
