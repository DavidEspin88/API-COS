// ============================================================
// VARIABLES CONTROLADORAS DE ESTADO (DECLARACIÓN ÚNICA SEGURA)
// ============================================================
if (typeof estadosDisponibles === "undefined") {
  var estadosDisponibles = [];
}
if (typeof mapaEstadosPersonal === "undefined") {
  var mapaEstadosPersonal = {}; // { cedula: { id_estado, fecha_presentacion, fecha_reincorporacion, dias_falto, observacion } }
}
if (typeof filasDesbloqueadasSoloEstado === "undefined") {
  var filasDesbloqueadasSoloEstado = {}; // { cedula: true/false } -> Controla el botón "Editar Estado"
}

// ============================================================
// INICIALIZACIÓN INTEGRADA CON PERSONAL AGREGADO Y ANTIGÜEDAD
// ============================================================
function inicializarControlOperacional(data) {
  estadosDisponibles = data.estado.map((e) => e.estado);
  mapaEstadosPersonal = {};

  // 1. Cargar estados históricos persistidos del polvorín/control vivo
  if (data.control_estado && data.control_estado.length > 0) {
    data.control_estado.forEach((c) => {
      mapaEstadosPersonal[c.cedula] = {
        id_estado: c.id_estado,
        apellidos_nombres: c.apellidos_nombres || "",
        fecha_presentacion: c.fecha_presentacion || "",
        fecha_reincorporacion: c.fecha_reincorporacion || "",
        dias_falto: parseInt(c.dias_falto) || 0,
        observacion: c.observacion || "",
      };
    });
  }

  // 2. Pool Unificado de Personal (Planta + Agregados Activos)
  let poolPersonalTotal = [];

  // A. Insertar Personal de Planta
  if (data.personal) {
    data.personal.forEach((p) => {
      poolPersonalTotal.push({
        cedula: p.cedula,
        grado: p.grado,
        especialidad: p.especialidad,
        ant: p.ant,
        apellidos_nombres: p.apellidos_nombres,
        funcion: p.funcion || "-",
        esAgregado: false,
      });
    });
  }

  // B. Insertar Personal Agregado únicamente si su estado es "ACTIVO"
  if (data.personal_agregado) {
    data.personal_agregado.forEach((pa) => {
      if (String(pa.estado).toUpperCase() === "ACTIVO") {
        poolPersonalTotal.push({
          cedula: pa.cedula,
          grado: pa.grado,
          especialidad: pa.especialidad,
          ant: pa.ant,
          apellidos_nombres: pa.apellidos_nombres + " (AGREGADO)",
          funcion: pa.funcion || "-",
          esAgregado: true,
        });
      }
    });
  }

  // 3. ORDENACIÓN MILITAR ESTRICTA POR ANTIGÜEDAD (Menor número = Más antiguo primero)
  poolPersonalTotal.sort((a, b) => {
    let antA =
      a.ant === null || a.ant === "" || isNaN(a.ant) ? 999999 : parseInt(a.ant);
    let antB =
      b.ant === null || b.ant === "" || isNaN(b.ant) ? 999999 : parseInt(b.ant);
    return antA - antB;
  });

  // 4. Mapear y asegurar estructura operacional para cada tripulante del pool ordenado
  poolPersonalTotal.forEach((p) => {
    if (!mapaEstadosPersonal[p.cedula]) {
      mapaEstadosPersonal[p.cedula] = {
        id_estado: estadosDisponibles[0] || "DISPONIBLE",
        apellidos_nombres: p.apellidos_nombres,
        fecha_presentacion: "",
        fecha_reincorporacion: "",
        dias_falto: 0,
        observacion: p.esAgregado ? "PERSONAL AGREGADO TEMPORAL" : "",
      };
    }
    filasDesbloqueadasSoloEstado[p.cedula] = false;
  });

  // Renderizar el panel operacional con la lista combinada y ordenada por antigüedad
  renderizarPanelOperacional(poolPersonalTotal);
}

function renderizarPanelOperacional(personal) {
  const tbodyControl = document.getElementById(
    "table-body-control-operacional",
  );
  if (!tbodyControl) return;
  tbodyControl.innerHTML = "";

  const mesesEspanol = [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ];
  const ahora = new Date();

  personal.forEach((p) => {
    const registro = mapaEstadosPersonal[p.cedula];
    let estadoActual = registro.id_estado;
    let diasFalto = 0;

    // --- REGLA 7: CONSIDERACIÓN ESPECIAL PARA FALTOS ---
    if (estadoActual !== "DISPONIBLE" && registro.fecha_reincorporacion) {
      const stringFechaFinalVerificar = String(
        registro.fecha_reincorporacion,
      ).trim();

      if (
        stringFechaFinalVerificar !== "" &&
        stringFechaFinalVerificar !== "-"
      ) {
        const partes = stringFechaFinalVerificar.split("-");
        if (partes.length === 3) {
          const diaF = parseInt(partes[0]);
          const mesF = mesesEspanol.indexOf(partes[1].toUpperCase());
          const anioF = parseInt(partes[2]);

          if (mesF !== -1 && !isNaN(diaF) && !isNaN(anioF)) {
            const fechaLimiteFalto = new Date(anioF, mesF, diaF + 1, 9, 0, 0);

            if (ahora >= fechaLimiteFalto) {
              const d1 = new Date(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate(),
              );
              const d2 = new Date(anioF, mesF, diaF + 1);

              const diferenciaTiempo = d1.getTime() - d2.getTime();
              const diasDiferencia = Math.floor(
                diferenciaTiempo / (1000 * 60 * 60 * 24),
              );

              diasFalto = diasDiferencia + 1;

              if (registro.id_estado !== "FALTO") {
                registro.id_estado = "FALTO";
                estadoActual = "FALTO";
              }
            }
          }
        }
      }
    }

    let diasCalculados =
      estadoActual === "FALTO" ? diasFalto : parseInt(registro.dias_falto) || 0;

    // --- EVALUACIÓN TEMPORAL DE COMPROBACIÓN DE FECHAS ---
    let dentroDelPeriodo = false;
    if (registro.fecha_presentacion && registro.fecha_reincorporacion) {
      const strP1 = String(registro.fecha_presentacion).trim();
      const strP2 = String(registro.fecha_reincorporacion).trim();

      if (strP1 !== "-" && strP2 !== "-" && strP1 !== "" && strP2 !== "") {
        const p1 = strP1.split("-");
        const p2 = strP2.split("-");

        if (p1.length === 3 && p2.length === 3) {
          const m1 = mesesEspanol.indexOf(p1[1].toUpperCase());
          const m2 = mesesEspanol.indexOf(p2[1].toUpperCase());

          if (m1 !== -1 && m2 !== -1) {
            const fInicio = new Date(
              parseInt(p1[2]),
              m1,
              parseInt(p1[0]),
              0,
              0,
              0,
            );
            const fFin = new Date(
              parseInt(p2[2]),
              m2,
              parseInt(p2[0]),
              23,
              59,
              59,
            );

            if (ahora >= fInicio && ahora <= fFin) {
              dentroDelPeriodo = true;
            }
          }
        }
      }
    }

    // --- REGLAS DE ACCESO DIARIO ABIERTAS ---
    let selectEstadoDeshabilitado = false;
    let inputsFechasDeshabilitados = false;
    let campoObservacionDeshabilitado = "";

    if (estadoActual !== "DISPONIBLE") {
      if (!filasDesbloqueadasSoloEstado[p.cedula]) {
        selectEstadoDeshabilitado = true;
        inputsFechasDeshabilitados = true;
        campoObservacionDeshabilitado = "disabled";
      }

      if (!dentroDelPeriodo && registro.fecha_reincorporacion) {
        const strP2 = String(registro.fecha_reincorporacion).trim();
        if (strP2 !== "-" && strP2 !== "") {
          const partesP2 = strP2.split("-");
          if (partesP2.length === 3) {
            const mesF = mesesEspanol.indexOf(partesP2[1].toUpperCase());
            if (mesF !== -1) {
              const fFin = new Date(
                parseInt(partesP2[2]),
                mesF,
                parseInt(partesP2[0]),
                23,
                59,
                59,
              );
              if (ahora > fFin) {
                selectEstadoDeshabilitado = false;
              }
            }
          }
        }
      }
    }

    const tr = document.createElement("tr");
    if (estadoActual === "FALTO") tr.className = "row-funcionario-falto";

    let optionsSelect = estadosDisponibles
      .map(
        (est) =>
          `<option value="${est}" ${est === estadoActual ? "selected" : ""}>${est}</option>`,
      )
      .join("");

    let stringFechaInicio = "";
    if (
      registro.fecha_presentacion &&
      String(registro.fecha_presentacion).trim() !== "-"
    ) {
      const partes = String(registro.fecha_presentacion).split("-");
      if (partes.length === 3) {
        const mesNum = String(
          mesesEspanol.indexOf(partes[1].toUpperCase()) + 1,
        ).padStart(2, "0");
        stringFechaInicio = `${partes[2]}-${mesNum}-${partes[0]}`;
      }
    }

    let stringFechaFinal = "";
    if (
      registro.fecha_reincorporacion &&
      String(registro.fecha_reincorporacion).trim() !== "-"
    ) {
      const partes = String(registro.fecha_reincorporacion).split("-");
      if (partes.length === 3) {
        const mesNum = String(
          mesesEspanol.indexOf(partes[1].toUpperCase()) + 1,
        ).padStart(2, "0");
        stringFechaFinal = `${partes[2]}-${mesNum}-${partes[0]}`;
      }
    }

    let valorObservacionActual = registro.observacion || "";
    if (estadoActual === "DISPONIBLE" && valorObservacionActual === "") {
      valorObservacionActual = "SIN NOVEDAD";
      registro.observacion = "SIN NOVEDAD";
    }

    let campoObservacion = `<input type="text" value="${valorObservacionActual}" placeholder="Ej: Memoria / Alta médica" style="padding:6px; border-radius:4px; border:1px solid #ccc; width:100%; font-weight:500;" onchange="actualizarObservacion('${p.cedula}', this.value)" ${campoObservacionDeshabilitado}>`;

    let botonAccionHTML = "-";
    if (estadoActual !== "DISPONIBLE") {
      if (!filasDesbloqueadasSoloEstado[p.cedula]) {
        botonAccionHTML = `<button type="button" class="btn-edit" style="padding:6px 10px; font-size:12px; margin:0; background:#9b59b6;" onclick="solicitarEdicionEstado('${p.cedula}', '${estadoActual}')">Editar Estado</button>`;
      } else {
        botonAccionHTML = `<button type="button" class="btn-submit" style="padding:6px 10px; font-size:11px; margin:0; background:#27ae60;" onclick="cerrarEdicionEstado('${p.cedula}')">Listo</button>`;
      }
    }

    tr.innerHTML = `
            <td><strong>${p.cedula}</strong></td>
            <td>${p.grado}</td>
            <td>${p.apellidos_nombres}</td>
            <td>
                <select class="select-table-embed" onchange="cambiarEstadoOperacional('${p.cedula}', this.value, '${estadoActual}')" style="padding:6px; border-radius:8px; width:100%;" ${selectEstadoDeshabilitado ? "disabled" : ""}>
                    ${optionsSelect}
                </select>
            </td>
            <td>
                <input type="date" value="${stringFechaInicio}" style="padding:6px; border-radius:8px; border:1px solid #ccc;" onchange="cambiarFechaRango('${p.cedula}', 'inicio', this.value)" ${inputsFechasDeshabilitados ? "disabled" : ""}>
            </td>
            <td>
                <input type="date" value="${stringFechaFinal}" style="padding:6px; border-radius:4px; border:1px solid #ccc;" onchange="cambiarFechaRango('${p.cedula}', 'final', this.value)" ${inputsFechasDeshabilitados ? "disabled" : ""}>
            </td>
            <td>
                <span class="${diasCalculados > 0 ? "badge-ord" : ""}" style="background:${diasCalculados > 0 ? (estadoActual === "FALTO" ? "#e74c3c" : "#2980b9") : "transparent"}; color:${diasCalculados > 0 ? "#fff" : "#000"};  padding:4px 8px; white-space: nowrap;">
                    ${diasCalculados} DÍAS
                </span>
            </td>
            <td>${campoObservacion}</td>
            <td>${botonAccionHTML}</td>
        `;
    tbodyControl.appendChild(tr);
  });

  calcularYRenderizarMatrices(personal);
}

// --- AUDITORÍA DIRECTA E INSTANTÁNEA EN BITÁCORA ---
async function solicitarEdicionEstado(cedula, estadoAnterior) {
  const observacionBitacora = prompt(
    `Para auditar el cambio de "Editar Estado", ingrese la AUTORIZACIÓN ADMINISTRATIVA u Observación:`,
  );

  if (observacionBitacora === null || observacionBitacora.trim() === "") {
    alert(
      `Operación cancelada. Es obligatorio ingresar una autorización administrativa para auditar.`,
    );
    return;
  }

  const registro = mapaEstadosPersonal[cedula];

  const payloadAuditoriaDirecta = {
    target: "control_operacional",
    action: "save_matrix",
    registros: [
      {
        cedula: String(cedula),
        grado: registro.grado || "",
        apellidos_nombres: registro.apellidos_nombres,
        id_estado: registro.id_estado,
        fecha_presentacion: registro.fecha_presentacion || "-",
        fecha_reincorporacion: registro.fecha_reincorporacion || "-",
        dias_falto: parseInt(registro.dias_falto) || 0,
        observacion: registro.observacion || "SIN NOVEDAD",
        audit_realizado: true,
        audit_anterior: estadoAnterior,
        audit_nuevo: "SOLICITUD EDICIÓN (DESBLOQUEO)",
        audit_observacion: observacionBitacora.toUpperCase(),
      },
    ],
  };

  filasDesbloqueadasSoloEstado[cedula] = true;
  registro.observacion_auditoria = observacionBitacora;

  if (typeof sendData === "function") {
    sendData(payloadAuditoriaDirecta, () => {
      console.log(
        `✔ Auditoría directa registrada en la nube para la CC: ${cedula}`,
      );
      if (window.datosPersonalGlobal) {
        // Recargar con la memoria global unificada de inicializarControlOperacional
        loadAllData();
      }
    });
  }
}

function cerrarEdicionEstado(cedula) {
  filasDesbloqueadasSoloEstado[cedula] = false;
  if (mapaEstadosPersonal[cedula]) {
    delete mapaEstadosPersonal[cedula].audit_estado_anterior;
    delete mapaEstadosPersonal[cedula].audit_estado_nuevo;
    delete mapaEstadosPersonal[cedula].observacion_auditoria;
  }
  if (window.datosPersonalGlobal) {
    loadAllData();
  }
}

function cambiarFechaRango(cedula, tipo, valorFecha) {
  if (!valorFecha) return;
  const mesesEspanol = [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ];
  const partes = valorFecha.split("-");
  const fechaFormateada = `${partes[2]}-${mesesEspanol[parseInt(partes[1]) - 1]}-${partes[0]}`;

  const registro = mapaEstadosPersonal[cedula];
  if (tipo === "inicio") {
    registro.fecha_presentacion = fechaFormateada;
  } else {
    registro.fecha_reincorporacion = fechaFormateada;
  }

  if (registro.fecha_presentacion && registro.fecha_reincorporacion) {
    const p1 = String(registro.fecha_presentacion).split("-");
    const p2 = String(registro.fecha_reincorporacion).split("-");

    if (p1.length === 3 && p2.length === 3) {
      const d1 = new Date(
        parseInt(p1[2]),
        mesesEspanol.indexOf(p1[1].toUpperCase()),
        parseInt(p1[0]),
      );
      const d2 = new Date(
        parseInt(p2[2]),
        mesesEspanol.indexOf(p2[1].toUpperCase()),
        parseInt(p2[0]),
      );

      const diferenciaTiempo = d2.getTime() - d1.getTime();
      if (diferenciaTiempo >= 0) {
        registro.dias_falto =
          Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24)) + 1;
      } else {
        alert(
          "Error: La fecha de finalización no puede ser menor a la de inicio.",
        );
        registro.fecha_reincorporacion = "";
        registro.dias_falto = 0;
      }
    }
  }

  if (window.datosPersonalGlobal) {
    inicializarControlOperacional({
      estado: estadosDisponibles.map((e) => ({ estado: e })),
      control_estado: Object.keys(mapaEstadosPersonal).map((k) => ({
        cedula: k,
        ...mapaEstadosPersonal[k],
      })),
      personal: window.datosPersonalGlobal,
      personal_agregado:
        typeof datosPersonalAgregadoGlobal !== "undefined"
          ? datosPersonalAgregadoGlobal
          : [],
    });
  }
}

function cambiarEstadoOperacional(cedula, nuevoEstado, estadoAnterior) {
  const registro = mapaEstadosPersonal[cedula];
  registro.audit_estado_anterior = estadoAnterior;
  registro.audit_estado_nuevo = nuevoEstado;

  if (nuevoEstado === "DISPONIBLE") {
    registro.id_estado = "DISPONIBLE";
    registro.fecha_presentacion = "";
    registro.fecha_reincorporacion = "";
    registro.dias_falto = 0;
    registro.observacion = "PRESENTADO SIN NOVEDAD";
    filasDesbloqueadasSoloEstado[cedula] = false;
  } else {
    registro.id_estado = nuevoEstado;
    filasDesbloqueadasSoloEstado[cedula] = false;
    alert(
      `Se ha cambiado la condición a [${nuevoEstado}]. Complete o verifique las fechas del período y la observación.`,
    );
  }

  if (window.datosPersonalGlobal) {
    inicializarControlOperacional({
      estado: estadosDisponibles.map((e) => ({ estado: e })),
      control_estado: Object.keys(mapaEstadosPersonal).map((k) => ({
        cedula: k,
        ...mapaEstadosPersonal[k],
      })),
      personal: window.datosPersonalGlobal,
      personal_agregado:
        typeof datosPersonalAgregadoGlobal !== "undefined"
          ? datosPersonalAgregadoGlobal
          : [],
    });
  }
}

function actualizarObservacion(cedula, texto) {
  if (mapaEstadosPersonal[cedula]) {
    mapaEstadosPersonal[cedula].observacion = texto.toUpperCase();
  }
}

function calcularYRenderizarMatrices(personal) {
  const totalPersonal = personal.length;
  let conteoEstados = {};
  estadosDisponibles.forEach((e) => (conteoEstados[e] = 0));
  let conteoCruzado = {};

  personal.forEach((p) => {
    const reg = mapaEstadosPersonal[p.cedula];
    const est = reg ? reg.id_estado : estadosDisponibles[0];
    if (conteoEstados[est] !== undefined) conteoEstados[est]++;

    const gradoLimpio = p.grado
      ? String(p.grado).trim().toUpperCase()
      : "SIN GRADO";

    if (!conteoCruzado[gradoLimpio]) {
      conteoCruzado[gradoLimpio] = {};
      estadosDisponibles.forEach((e) => (conteoCruzado[gradoLimpio][e] = 0));
    }
    if (conteoCruzado[gradoLimpio][est] !== undefined)
      conteoCruzado[gradoLimpio][est]++;
  });

  const tbodyResumen = document.getElementById("table-body-matriz-resumen");
  if (!tbodyResumen) return;
  tbodyResumen.innerHTML = "";
  let sumaEstadosVerificacion = 0;

  estadosDisponibles.forEach((est) => {
    sumaEstadosVerificacion += conteoEstados[est];

    const trResumen = document.createElement("tr");
    trResumen.innerHTML = `<td>${est}</td><td><strong>${conteoEstados[est]}</strong></td>`;
    trResumen.onclick = () => desplegarModalPersonalPorEstado(est, personal);
    tbodyResumen.appendChild(trResumen);
  });

  const trTotal = document.createElement("tr");
  trTotal.innerHTML = `<td><strong>TOTAL PERSONAL</strong></td><td><strong>${sumaEstadosVerificacion}</strong></td>`;
  tbodyResumen.appendChild(trTotal);

  const theadCruzado = document.getElementById("thead-matriz-cruzada");
  const tbodyCruzado = document.getElementById("table-body-matriz-cruzada");

  if (theadCruzado && tbodyCruzado) {
    theadCruzado.innerHTML = `<tr><th>Grado</th>${estadosDisponibles.map((e) => `<th>${e}</th>`).join("")}<th>Total</th></tr>`;
    tbodyCruzado.innerHTML = "";

    let totalesColumnas = {};
    estadosDisponibles.forEach((est) => (totalesColumnas[est] = 0));
    let granTotalGeneral = 0;

    Object.keys(conteoCruzado).forEach((grado) => {
      let totalFilaGrado = 0;
      let celdasResultantes = estadosDisponibles
        .map((est) => {
          const val = conteoCruzado[grado][est] || 0;
          totalFilaGrado += val;
          totalesColumnas[est] += val;
          return `<td>${val}</td>`;
        })
        .join("");

      granTotalGeneral += totalFilaGrado;
      tbodyCruzado.innerHTML += `<tr><td><strong>${grado}</strong></td>${celdasResultantes}<td style="font-weight:bold; background:#f8fafc;">${totalFilaGrado}</td></tr>`;
    });

    let celdasTotalesVerticales = estadosDisponibles
      .map((est) => {
        const sumaColumna = totalesColumnas[est];
        return `<td style="font-weight: bold; background-color: #e2e8f0; color: #2c3e50;">${sumaColumna}</td>`;
      })
      .join("");

    tbodyCruzado.innerHTML += `
      <tr style="background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td style="background: #e2e8f0; color: #2c3e50; font-weight: bold; position: sticky; left: 0; z-index: 2;">TOTAL</td>
        ${celdasTotalesVerticales}
        <td style="background-color: #cbd5e1; color: #2c3e50; font-weight: bold;">${granTotalGeneral}</td>
      </tr>
    `;
  }

  const badge = document.getElementById("validation-status-badge");
  if (badge) {
    if (sumaEstadosVerificacion === totalPersonal) {
      badge.className = "validation-badge success";
      badge.textContent = `✔ Sincronizado: ${sumaEstadosVerificacion} / ${totalPersonal}`;
      const btnGuardar = document.getElementById(
        "btn-guardar-control-operacional",
      );
      if (btnGuardar) btnGuardar.disabled = false;
    } else {
      badge.className = "validation-badge danger";
      badge.textContent = `⚠ Error: ${sumaEstadosVerificacion} de ${totalPersonal}`;
      const btnGuardar = document.getElementById(
        "btn-guardar-control-operacional",
      );
      if (btnGuardar) btnGuardar.disabled = true;
    }
  }
}

async function guardarControlOperacional() {
  let registrosPayload = [];
  if (window.datosPersonalGlobal) {
    // Generar el payload usando la lista unificada
    const personalCombinado = [];
    if (window.datosPersonalGlobal) {
      window.datosPersonalGlobal.forEach((p) => personalCombinado.push(p));
    }
    if (
      typeof datosPersonalAgregadoGlobal !== "undefined" &&
      datosPersonalAgregadoGlobal
    ) {
      datosPersonalAgregadoGlobal.forEach((pa) => {
        if (String(pa.estado).toUpperCase() === "ACTIVO") {
          personalCombinado.push({
            cedula: pa.cedula,
            grado: pa.grado,
            apellidos_nombres: pa.apellidos_nombres + " (AGREGADO)",
          });
        }
      });
    }

    personalCombinado.forEach((p) => {
      const r = mapaEstadosPersonal[p.cedula] || {
        id_estado: estadosDisponibles[0],
        fecha_presentacion: "",
        fecha_reincorporacion: "",
        dias_falto: 0,
        observacion: "",
      };

      registrosPayload.push({
        cedula: String(p.cedula),
        grado: p.grado,
        apellidos_nombres: p.apellidos_nombres,
        id_estado: r.id_estado,
        fecha_presentacion: r.fecha_presentacion || "-",
        fecha_reincorporacion: r.fecha_reincorporacion || "-",
        dias_falto: parseInt(r.dias_falto) || 0,
        observacion: r.observacion || "SIN NOVEDAD",
        audit_realizado: r.audit_estado_nuevo ? true : false,
        audit_anterior: r.audit_estado_anterior || r.id_estado,
        audit_nuevo: r.audit_estado_nuevo || r.id_estado,
        audit_observacion:
          r.observacion_auditoria || "ACTUALIZACIÓN SISTEMÁTICA EN LÍNEA",
      });
    });
  }

  const payload = {
    target: "control_operacional",
    action: "save_matrix",
    registros: registrosPayload,
  };

  if (typeof sendData === "function") {
    sendData(payload, () => {
      alert("Parte Diario y Bitácora de Auditoría guardados con éxito.");
      loadAllData();
    });
  }
}

function desplegarModalPersonalPorEstado(
  estadoSeleccionado,
  listaPersonalCompleto,
) {
  const modal = document.getElementById("modal-desglose-operacional");
  const titulo = document.getElementById("modal-titulo-estado");
  const tbodyModal = document.getElementById("table-body-modal-desglose");
  const theadModal = modal ? modal.querySelector("thead") : null;

  if (!modal || !tbodyModal || !theadModal) return;

  const personalFiltrado = listaPersonalCompleto.filter((p) => {
    const registro = mapaEstadosPersonal[p.cedula];
    const estadoActualMilitar = registro
      ? registro.id_estado
      : estadosDisponibles[0];
    return (
      String(estadoActualMilitar).trim().toUpperCase() ===
      String(estadoSeleccionado).trim().toUpperCase()
    );
  });

  if (personalFiltrado.length === 0) return;

  const esDiferenteADisponible =
    String(estadoSeleccionado).trim().toUpperCase() !== "DISPONIBLE";

  if (esDiferenteADisponible) {
    theadModal.innerHTML = `
      <tr>
        <th>ORD.</th>
        <th>GRADO</th>
        <th>APELLIDOS Y NOMBRES</th>
        <th>FECHA INICIO</th>
        <th>FECHA FINAL</th>
        <th>OBSERVACIÓN / NOVEDAD</th>
      </tr>
    `;
  } else {
    theadModal.innerHTML = `
      <tr>
        <th>ORD.</th>
        <th>GRADO</th>
        <th>APELLIDOS Y NOMBRES</th>
      </tr>
    `;
  }

  titulo.innerText = `PERSONAL EN CONDICIÓN DE: ${estadoSeleccionado.toUpperCase()} (${personalFiltrado.length})`;
  tbodyModal.innerHTML = "";

  personalFiltrado.forEach((m, index) => {
    const tr = document.createElement("tr");
    const registro = mapaEstadosPersonal[m.cedula] || {};

    if (esDiferenteADisponible) {
      tr.innerHTML = `
        <td><span class="badge-ord">${index + 1}</span></td>
        <td><strong>${m.grado}</strong></td>
        <td style="text-align:left;">${m.apellidos_nombres}</td>
        <td><small>${registro.fecha_presentacion || "-"}</small></td>
        <td><small>${registro.fecha_reincorporacion || "-"}</small></td>
        <td style="text-align:left; font-weight:500; font-size:12px; color:var(--danger-color);">${registro.observacion || "SIN NOVEDAD"}</td>
      `;
    } else {
      tr.innerHTML = `
        <td><span class="badge-ord">${index + 1}</span></td>
        <td><strong>${m.grado}</strong></td>
        <td style="text-align:left;">${m.apellidos_nombres}</td>
      `;
    }
    tbodyModal.appendChild(tr);
  });

  modal.classList.remove("hidden");

  modal.onclick = function (evento) {
    if (evento.target === modal) {
      cerrarModalDesglose();
    }
  };
}

function cerrarModalDesglose() {
  const modal = document.getElementById("modal-desglose-operacional");
  if (modal) {
    modal.classList.add("hidden");
    modal.onclick = null;
  }
}

function filtrarTablaParteDiario(textoBusqueda) {
  const query = String(textoBusqueda).trim().toLowerCase();
  const tbodyControl = document.getElementById(
    "table-body-control-operacional",
  );
  if (!tbodyControl) return;

  const filas = tbodyControl.getElementsByTagName("tr");

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const celdaCedula = fila.cells[0]
      ? fila.cells[0].textContent.toLowerCase()
      : "";
    const celdaGrado = fila.cells[1]
      ? fila.cells[1].textContent.toLowerCase()
      : "";
    const celdaNombres = fila.cells[2]
      ? fila.cells[2].textContent.toLowerCase()
      : "";

    if (
      celdaCedula.includes(query) ||
      celdaGrado.includes(query) ||
      celdaNombres.includes(query)
    ) {
      fila.style.display = "";
    } else {
      fila.style.display = "none";
    }
  }
}
