let estadosDisponibles = [];
let mapaEstadosPersonal = {}; // { cedula: { id_estado, fecha_presentacion, fecha_reincorporacion, dias_falto, observacion } }
let filasDesbloqueadasSoloEstado = {}; // { cedula: true/false } -> Regla 4: Controla el botón "Editar Estado"

function inicializarControlOperacional(data) {
  estadosDisponibles = data.estado.map((e) => e.estado);

  mapaEstadosPersonal = {};
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

  if (data.personal) {
    data.personal.forEach((p) => {
      if (!mapaEstadosPersonal[p.cedula]) {
        mapaEstadosPersonal[p.cedula] = {
          id_estado: estadosDisponibles[0] || "DISPONIBLE",
          apellidos_nombres: p.apellidos_nombres,
          fecha_presentacion: "",
          fecha_reincorporacion: "",
          dias_falto: 0,
          observacion: "",
        };
      }
      filasDesbloqueadasSoloEstado[p.cedula] = false;
    });
  }

  renderizarPanelOperacional(data.personal);
}

function renderizarPanelOperacional(personal) {
  const tbodyControl = document.getElementById(
    "table-body-control-operacional",
  );
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
    if (!mapaEstadosPersonal[p.cedula]) {
      mapaEstadosPersonal[p.cedula] = {
        id_estado: estadosDisponibles[0] || "DISPONIBLE",
        apellidos_nombres: p.apellidos_nombres,
        fecha_presentacion: "",
        fecha_reincorporacion: "",
        dias_falto: 0,
        observacion: "",
      };
    }

    const registro = mapaEstadosPersonal[p.cedula];
    let estadoActual = registro.id_estado;
    let diasFalto = 0;
    let esFalto = false;

    // --- REGLA 7: CONSIDERACIÓN ESPECIAL PARA FALTOS ---
    if (estadoActual !== "DISPONIBLE" && registro.fecha_reincorporacion) {
      const stringFechaFinalVerificar = String(
        registro.fecha_reincorporacion,
      ).trim();

      if (
        stringFechaFinalVerificar !== "" &&
        stringFechaFinalVerificar !== "-"
      ) {
        const partes = stringFechaFinalVerificar.split("-"); // DD-MMM-YYYY
        if (partes.length === 3) {
          const diaF = parseInt(partes[0]);
          const mesF = mesesEspanol.indexOf(partes[1].toUpperCase());
          const anioF = parseInt(partes[2]);

          if (mesF !== -1 && !isNaN(diaF) && !isNaN(anioF)) {
            const fechaLimiteFalto = new Date(anioF, mesF, diaF, 9, 0, 0);

            if (ahora >= fechaLimiteFalto) {
              const d1 = new Date(
                ahora.getFullYear(),
                ahora.getMonth(),
                ahora.getDate(),
              );
              const d2 = new Date(anioF, mesF, diaF);

              const diferenciaTiempo = d1.getTime() - d2.getTime();
              const diasDiferencia = Math.floor(
                diferenciaTiempo / (1000 * 60 * 60 * 24),
              );

              diasFalto = diasDiferencia + 1;
              esFalto = true;

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

    // --- REGLA 3 Y 5: EVALUACIÓN TEMPORAL DE COMPROBACIÓN DE FECHAS ---
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

    // --- REGLAS DE ACCESO Y BLOQUEO DE CONTROLES (REGLA 1, 2, 3 y 5) ---
    let selectEstadoDeshabilitado = true;
    let inputsFechasDeshabilitados = true;

    if (estadoActual === "DISPONIBLE") {
      selectEstadoDeshabilitado = false;
      inputsFechasDeshabilitados = false;
    } else {
      if (filasDesbloqueadasSoloEstado[p.cedula]) {
        selectEstadoDeshabilitado = false;
      }

      if (!dentroDelPeriodo && registro.fecha_reincorporacion) {
        const strP2 = String(registro.fecha_reincorporacion).trim();
        if (strP2 !== "-" && strP2 !== "") {
          const p2 = strP2.split("-");
          if (p2.length === 3) {
            const m2 = mesesEspanol.indexOf(p2[1].toUpperCase());
            if (m2 !== -1) {
              const fFin = new Date(
                parseInt(p2[2]),
                m2,
                parseInt(p2[0]),
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

    // --- CORRECCIÓN CLAVE: CAMPO OBSERVACIÓN SIEMPRE DISPONIBLE E INPUT PARA TODOS ---
    // Si es DISPONIBLE e inicia limpio, muestra "SIN NOVEDAD" pero te permite escribir encima
    let valorObservacionActual = registro.observacion || "";
    if (estadoActual === "DISPONIBLE" && valorObservacionActual === "") {
      valorObservacionActual = "SIN NOVEDAD";
      registro.observacion = "SIN NOVEDAD";
    }

    let campoObservacion = `<input type="text" value="${valorObservacionActual}" placeholder="Ej: Memoria / Alta médica" style="padding:6px; border-radius:4px; border:1px solid #ccc; width:100%; font-weight:500;" onchange="actualizarObservacion('${p.cedula}', this.value)">`;

    let botonAccionHTML = "-";
    if (estadoActual !== "DISPONIBLE") {
      if (!filasDesbloqueadasSoloEstado[p.cedula]) {
        botonAccionHTML = `<button type="button" class="btn-edit" style="padding:6px 10px; font-size:11px; margin:0; background:#9b59b6;" onclick="solicitarEdicionEstado('${p.cedula}', '${estadoActual}')">Editar Estado</button>`;
      } else {
        botonAccionHTML = `<button type="button" class="btn-submit" style="padding:6px 10px; font-size:11px; margin:0; background:#27ae60;" onclick="cerrarEdicionEstado('${p.cedula}')">Listo</button>`;
      }
    }

    tr.innerHTML = `
            <td><strong>${p.cedula}</strong></td>
            <td>${p.grado}</td>
            <td>${p.apellidos_nombres}</td>
            <td>
                <select class="select-table-embed" onchange="cambiarEstadoOperacional('${p.cedula}', this.value, '${estadoActual}')" style="padding:6px; border-radius:4px; width:100%; font-weight:bold;" ${selectEstadoDeshabilitado ? "disabled" : ""}>
                    ${optionsSelect}
                </select>
            </td>
            <td>
                <input type="date" value="${stringFechaInicio}" style="padding:6px; border-radius:4px; border:1px solid #ccc;" onchange="cambiarFechaRango('${p.cedula}', 'inicio', this.value)" ${inputsFechasDeshabilitados ? "disabled" : ""}>
            </td>
            <td>
                <input type="date" value="${stringFechaFinal}" style="padding:6px; border-radius:4px; border:1px solid #ccc;" onchange="cambiarFechaRango('${p.cedula}', 'final', this.value)" ${inputsFechasDeshabilitados ? "disabled" : ""}>
            </td>
            <td>
                <span class="${diasCalculados > 0 ? "badge-ord" : ""}" style="background:${diasCalculados > 0 ? (estadoActual === "FALTO" ? "#e74c3c" : "#2980b9") : "transparent"}; color:${diasCalculados > 0 ? "#fff" : "#000"}; font-weight:bold; padding:4px 8px; white-space: nowrap;">
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

function solicitarEdicionEstado(cedula, estadoAnterior) {
  const observacionBitacora = prompt(
    `Para auditar el cambio de "Editar Estado", ingrese la AUTORIZACIÓN ADMINISTRATIVA u Observación:`,
  );
  if (observacionBitacora === null) return;

  filasDesbloqueadasSoloEstado[cedula] = true;
  mapaEstadosPersonal[cedula].observacion_auditoria = observacionBitacora;

  if (window.datosPersonalGlobal)
    renderizarPanelOperacional(window.datosPersonalGlobal);
}

function cerrarEdicionEstado(cedula) {
  filasDesbloqueadasSoloEstado[cedula] = false;
  if (window.datosPersonalGlobal)
    renderizarPanelOperacional(window.datosPersonalGlobal);
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

  if (!mapaEstadosPersonal[cedula]) {
    mapaEstadosPersonal[cedula] = {
      id_estado: estadosDisponibles[0],
      apellidos_nombres: "",
      fecha_presentacion: "",
      fecha_reincorporacion: "",
      dias_falto: 0,
      observacion: "",
    };
  }

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

  if (window.datosPersonalGlobal)
    renderizarPanelOperacional(window.datosPersonalGlobal);
}

function cambiarEstadoOperacional(cedula, nuevoEstado, estadoAnterior) {
  if (!mapaEstadosPersonal[cedula]) {
    mapaEstadosPersonal[cedula] = {
      id_estado: estadosDisponibles[0],
      apellidos_nombres: "",
      fecha_presentacion: "",
      fecha_reincorporacion: "",
      dias_falto: 0,
      observacion: "",
    };
  }

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

  if (window.datosPersonalGlobal)
    renderizarPanelOperacional(window.datosPersonalGlobal);
}

function actualizarObservacion(cedula, texto) {
  mapaEstadosPersonal[cedula].observacion = texto.toUpperCase();
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
    if (!conteoCruzado[p.grado]) {
      conteoCruzado[p.grado] = {};
      estadosDisponibles.forEach((e) => (conteoCruzado[p.grado][e] = 0));
    }
    if (conteoCruzado[p.grado][est] !== undefined)
      conteoCruzado[p.grado][est]++;
  });

  const tbodyResumen = document.getElementById("table-body-matriz-resumen");
  tbodyResumen.innerHTML = "";
  let sumaEstadosVerificacion = 0;
  estadosDisponibles.forEach((est) => {
    sumaEstadosVerificacion += conteoEstados[est];
    tbodyResumen.innerHTML += `<tr><td><strong>${est}</strong></td><td>${conteoEstados[est]}</td></tr>`;
  });
  tbodyResumen.innerHTML += `<tr><td>TOTAL PERSONAL</td><td>${sumaEstadosVerificacion}</td></tr>`;

  const theadCruzado = document.getElementById("thead-matriz-cruzada");
  const tbodyCruzado = document.getElementById("table-body-matriz-cruzada");
  theadCruzado.innerHTML = `<tr><th>Grado</th>${estadosDisponibles.map((e) => `<th>${e}</th>`).join("")}<th>Total</th></tr>`;
  tbodyCruzado.innerHTML = "";

  Object.keys(conteoCruzado).forEach((grado) => {
    let totalFilaGrado = 0;
    let celdasResultantes = estadosDisponibles
      .map((est) => {
        const val = conteoCruzado[grado][est];
        totalFilaGrado += val;
        return `<td>${val}</td>`;
      })
      .join("");
    tbodyCruzado.innerHTML += `<tr><td><strong>${grado}</strong></td>${celdasResultantes}<td style="font-weight:bold; background:#f8fafc;">${totalFilaGrado}</td></tr>`;
  });

  const badge = document.getElementById("validation-status-badge");
  if (sumaEstadosVerificacion === totalPersonal) {
    badge.className = "validation-badge success";
    badge.textContent = `✔ Sincronizado: ${sumaEstadosVerificacion} / ${totalPersonal}`;
    document.getElementById("btn-guardar-control-operacional").disabled = false;
  } else {
    badge.className = "validation-badge danger";
    badge.textContent = `⚠ Error: ${sumaEstadosVerificacion} de ${totalPersonal}`;
    document.getElementById("btn-guardar-control-operacional").disabled = true;
  }
}

async function guardarControlOperacional() {
  let registrosPayload = [];
  if (window.datosPersonalGlobal) {
    window.datosPersonalGlobal.forEach((p) => {
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
      if (window.datosPersonalGlobal) {
        window.datosPersonalGlobal.forEach((p) => {
          filasDesbloqueadasSoloEstado[p.cedula] = false;
          if (mapaEstadosPersonal[p.cedula]) {
            delete mapaEstadosPersonal[p.cedula].audit_estado_anterior;
            delete mapaEstadosPersonal[p.cedula].audit_estado_nuevo;
            delete mapaEstadosPersonal[p.cedula].observacion_auditoria;
          }
        });
        renderizarPanelOperacional(window.datosPersonalGlobal);
      }
    });
  }
}
