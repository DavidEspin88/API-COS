let estadosDisponibles = [];
let mapaEstadosPersonal = {}; // { cedula: { id_estado, fecha_presentacion, fecha_reincorporacion, dias_falto } }

function inicializarControlOperacional(data) {
  estadosDisponibles = data.estado.map((e) => e.estado);

  mapaEstadosPersonal = {};
  if (data.control_estado && data.control_estado.length > 0) {
    data.control_estado.forEach((c) => {
      mapaEstadosPersonal[c.cedula] = {
        id_estado: c.id_estado,
        fecha_presentacion: c.fecha_presentacion || "",
        fecha_reincorporacion: c.fecha_reincorporacion || "",
        dias_falto: parseInt(c.dias_falto) || 0,
      };
    });
  }

  renderizarPanelOperacional(data.personal);
}

function renderizarPanelOperacional(personal) {
  const tbodyControl = document.getElementById("table-body-control-operacional");
  tbodyControl.innerHTML = "";

  const mesesEspanol = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const ahora = new Date();

  personal.forEach((p) => {
    if (!mapaEstadosPersonal[p.cedula]) {
      mapaEstadosPersonal[p.cedula] = {
        id_estado: estadosDisponibles[0] || "DISPONIBLE",
        fecha_presentacion: "",
        fecha_reincorporacion: "",
        dias_falto: 0,
      };
    }

    const registro = mapaEstadosPersonal[p.cedula];
    let estadoActual = registro.id_estado;
    let diasFalto = 0;
    let esFalto = false;

    // --- CÁLCULO DE DÍAS DE FALTA ---
    if (estadoActual !== "DISPONIBLE" && registro.fecha_presentacion) {
      const partes = registro.fecha_presentacion.split(" ")[0].split("-"); // DD-MMM-YYYY
      if (partes.length === 3) {
        const diaP = parseInt(partes[0]);
        const mesP = mesesEspanol.indexOf(partes[1].toUpperCase());
        const anioP = parseInt(partes[2]);

        const fechaLimite = new Date(anioP, mesP, diaP, 9, 0, 0); // Límite 09:00:00

        if (ahora >= fechaLimite) {
          const d1 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
          const d2 = new Date(anioP, mesP, diaP);
          const diferenciaTiempo = d1.getTime() - d2.getTime();
          const diasDiferencia = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

          diasFalto = diasDiferencia + 1;
          esFalto = true;
          registro.dias_falto = diasFalto; // Actualización en caliente en el mapa de memoria
        }
      }
    }

    if (estadoActual === "DISPONIBLE") {
      diasFalto = registro.dias_falto;
    }

    const tr = document.createElement("tr");
    if (esFalto) tr.className = "row-funcionario-falto";

    let optionsSelect = estadosDisponibles
      .map((est) => `<option value="${est}" ${est === estadoActual ? "selected" : ""}>${est}</option>`)
      .join("");

    let stringFechaInput = "";
    if (registro.fecha_presentacion) {
      const partes = registro.fecha_presentacion.split(" ")[0].split("-");
      if (partes.length === 3) {
        const mesNum = String(mesesEspanol.indexOf(partes[1].toUpperCase()) + 1).padStart(2, "0");
        stringFechaInput = `${partes[2]}-${mesNum}-${partes[0].padStart(2, "0")}`; // YYYY-MM-DD
      }
    }

    // --- CONSTRUCCIÓN DE FILA CON EL NUEVO ORDEN DE COLUMNAS REQUERIDO ---
    tr.innerHTML = `
            <td><strong>${p.cedula}</strong></td>
            <td>${p.grado}</td>
            <td>${p.apellidos_nombres}</td>
            <td>
                <select class="select-table-embed" onchange="cambiarEstadoOperacional('${p.cedula}', this.value)" style="padding:6px; border-radius:4px; width:100%;">
                    ${optionsSelect}
                </select>
            </td>
            <td>
                <input type="date" value="${stringFechaInput}" style="padding:6px; border-radius:4px; border:1px solid #ccc;" onchange="cambiarFechaPresentacion('${p.cedula}', this.value)" ${estadoActual === "DISPONIBLE" ? "disabled" : ""}>
                <div style="font-size:10px; color:#7f8c8d; margin-top:2px;">${registro.fecha_presentacion ? "Asignada: " + registro.fecha_presentacion.split(" ")[0] : "Sin asignar"}</div>
            </td>
            <td>
                <span style="font-size:11px; font-weight:500;">${registro.fecha_reincorporacion ? registro.fecha_reincorporacion.split(" ")[0] : "-"}</span>
            </td>
            <td>
                ${esFalto ? `<span class="alerta-pendiente-reincorporacion" style="margin-bottom:4px; display:block;">PENDIENTE DE REINCORPORACIÓN</span><span style="font-size:11px; font-weight:bold; color:#c0392b;">INCUMPLIMIENTO: ${diasFalto} DÍAS FALTO</span>` : (registro.fecha_reincorporacion ? `<span style="font-size:11px; color:#27ae60; font-weight:600;">✔ REINCORPORADO<br><small style="color:#7f8c8d; font-weight:normal;">${registro.fecha_reincorporacion.split(" ")[1]}</small></span>` : '<span style="color:#7f8c8d; font-style:italic;">SIN NOVEDAD</span>')}
            </td>
        `;
    tbodyControl.appendChild(tr);
  });

  calcularYRenderizarMatrices(personal);
}

function cambiarFechaPresentacion(cedula, valorFecha) {
  if (!valorFecha) return;
  const mesesEspanol = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const partes = valorFecha.split("-"); // YYYY-MM-DD
  const fechaFormateada = `${partes[2]}-${mesesEspanol[parseInt(partes[1]) - 1]}-${partes[0]} 09:00:00`;

  mapaEstadosPersonal[cedula].fecha_presentacion = fechaFormateada;
  mapaEstadosPersonal[cedula].fecha_reincorporacion = "";
  mapaEstadosPersonal[cedula].dias_falto = 0;

  if (window.datosPersonalGlobal)
    renderizarPanelOperacional(window.datosPersonalGlobal);
}

function cambiarEstadoOperacional(cedula, nuevoEstado) {
  const registro = mapaEstadosPersonal[cedula];
  const ahora = new Date();
  const mesesEspanol = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

  registro.id_estado = nuevoEstado;

  if (nuevoEstado === "DISPONIBLE") {
    const timestamp = `${String(ahora.getDate()).padStart(2, "0")}-${mesesEspanol[ahora.getMonth()]}-${ahora.getFullYear()} ${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}:${String(ahora.getSeconds()).padStart(2, "0")}`;
    registro.fecha_reincorporacion = timestamp;
    // Se conserva el historial de dias_falto calculado para que pase al reporte en Google Sheets
  } else {
    registro.fecha_reincorporacion = "";
    registro.dias_falto = 0;
  }

  if (window.datosPersonalGlobal)
    renderizarPanelOperacional(window.datosPersonalGlobal);
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
      // Extraer datos calculados directamente de la memoria activa
      const r = mapaEstadosPersonal[p.cedula] || {
        id_estado: estadosDisponibles[0],
        fecha_presentacion: "",
        fecha_reincorporacion: "",
        dias_falto: 0,
      };
      
      registrosPayload.push({
        cedula: String(p.cedula),
        grado: p.grado,
        apellidos_nombres: p.apellidos_nombres,
        id_estado: r.id_estado,
        fecha_presentacion: r.fecha_presentacion,
        fecha_reincorporacion: r.fecha_reincorporacion,
        dias_falto: parseInt(r.dias_falto) || 0 // Envía el conteo de días exacto calculado en el panel
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
      alert("Parte Diario guardado con éxito.");
    });
  }
}