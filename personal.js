// ============================================================
// SELECTORES EXCLUSIVOS DE PERSONAL
// ============================================================
const formPer = document.getElementById("form-personal");
const tableBodyPer = document.getElementById("table-body-personal");
const btnCancelPer = document.getElementById("btn-cancel-per");
const formTitlePer = document.getElementById("form-title-per");
const btnSavePer = document.getElementById("btn-save-per");

const selectGrado = document.getElementById("per-grado");
const selectEspecialidad = document.getElementById("per-especialidad");
const selectFuncion = document.getElementById("per-funcion");

// Selectores de Paginación añadidos
const btnPrevPage = document.getElementById("btn-prev-page");
const btnNextPage = document.getElementById("btn-next-page");
const paginationText = document.getElementById("pagination-text");

// Variables de Estado de Paginación y Control
let isEditingPer = false;
let datosPersonalGlobal = [];
let datosPersonalAgregadoGlobal = []; // Memoria caché para personal agregado
let currentPage = 1;
const rowsPerPage = 10;

// ============================================================
// INICIALIZACIÓN DE LISTENERS (DOM CONTENT LOADED)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const modalPer = document.getElementById("modal-registro-personal");
  const btnAbrirModalPer = document.getElementById("btn-abrir-nuevo-personal");
  const btnAbrirModalAgregado = document.getElementById(
    "btn-abrir-nuevo-agregado",
  );
  const btnCerrarModalPer = document.getElementById(
    "btn-cerrar-modal-personal",
  );

  // Botones de la barra de sub-navegación interna
  const btnSubPlanta = document.getElementById("btn-sub-planta");
  const btnSubAgregado = document.getElementById("btn-sub-agregado");
  const submoduloPlantaView = document.getElementById("submodulo-planta-view");
  const submoduleAgregadoView = document.getElementById(
    "submodulo-agregado-view",
  );

  // --- CONTROL DE SUB-NAVEGACIÓN INTERNA ---
  if (
    btnSubPlanta &&
    btnSubAgregado &&
    submoduloPlantaView &&
    submoduleAgregadoView
  ) {
    btnSubPlanta.addEventListener("click", () => {
      btnSubPlanta.style.background = "var(--primary-color)";
      btnSubAgregado.style.background = "#7f8c8d";
      submoduloPlantaView.classList.remove("hidden");
      submoduleAgregadoView.classList.add("hidden");
    });

    btnSubAgregado.addEventListener("click", () => {
      btnSubAgregado.style.background = "var(--primary-color)";
      btnSubPlanta.style.background = "#7f8c8d";
      submoduleAgregadoView.classList.remove("hidden");
      submoduloPlantaView.classList.add("hidden");
    });
  }

  // --- CONTROL DE MODALES (PLANTA VS AGREGADO) ---
  if (btnAbrirModalPer && modalPer) {
    btnAbrirModalPer.addEventListener("click", () => {
      resetFormPersonal();
      formPer.dataset.modeTarget = "personal"; // Bandera: Destino Planta
      formTitlePer.innerHTML = `<i class="fa-solid fa-user-gear"></i> Registrar Nuevo Personal de Planta`;
      modalPer.classList.remove("hidden");
    });
  }

  if (btnAbrirModalAgregado && modalPer) {
    btnAbrirModalAgregado.addEventListener("click", () => {
      resetFormPersonal();
      formPer.dataset.modeTarget = "personal_agregado"; // Bandera: Destino Agregado
      formTitlePer.innerHTML = `<i class="fa-solid fa-people-arrows"></i> Registrar Personal Agregado (Temporal)`;
      modalPer.classList.remove("hidden");
    });
  }

  if (btnCerrarModalPer && modalPer) {
    btnCerrarModalPer.addEventListener("click", () => {
      modalPer.classList.add("hidden");
    });
  }

  if (modalPer) {
    modalPer.addEventListener("click", (e) => {
      if (e.target === modalPer) modalPer.classList.add("hidden");
    });
  }

  // --- CONTROLES DE PAGINACIÓN DE PLANTA ---
  if (btnPrevPage && btnNextPage) {
    btnPrevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        mostrarPaginaActual();
      }
    });
    btnNextPage.addEventListener("click", () => {
      const maxPage = Math.ceil(datosPersonalGlobal.length / rowsPerPage);
      if (currentPage < maxPage) {
        currentPage++;
        mostrarPaginaActual();
      }
    });
  }
});

// ============================================================
// ENVÍO DE FORMULARIO MAESTRO (PROCESAMIENTO INTELIGENTE)
// ============================================================
if (formPer) {
  formPer.addEventListener("submit", async (e) => {
    e.preventDefault();
    const antInput = document.getElementById("per-ant").value;
    const modoDestino = formPer.dataset.modeTarget || "personal"; //

    const payload = {
      target: modoDestino,
      action: isEditingPer
        ? "update"
        : modoDestino === "personal_agregado"
          ? "save"
          : "create",
      cedula: document.getElementById("per-cedula").value.trim(),
      grado: selectGrado.value,
      especialidad: selectEspecialidad.value,
      ant: antInput === "" ? "" : parseInt(antInput),
      apellidos_nombres: document
        .getElementById("per-nombres")
        .value.toUpperCase()
        .trim(),
      funcion: selectFuncion.value,
      fecha_nacimiento: document.getElementById("per-fecha").value,
      contacto: document.getElementById("per-contacto").value.trim(),
      nombre_contacto: document
        .getElementById("per-nombre-contacto")
        .value.toUpperCase()
        .trim(),
    };

    if (typeof sendData === "function") {
      sendData(payload, () => {
        resetFormPersonal();
        const modalPer = document.getElementById("modal-registro-personal");
        if (modalPer) modalPer.classList.add("hidden");
      });
    }
  });
}

// ============================================================
// POBLACIÓN DE DATOS Y RENDERIZADO DE TABLAS
// ============================================================
function poblarDesplegablesPersonal() {
  const currentGrado = selectGrado.value;
  const currentEsp = selectEspecialidad.value;
  const currentFun = selectFuncion.value;

  selectGrado.innerHTML = '<option value="">-- Seleccione un Grado --</option>';
  selectEspecialidad.innerHTML =
    '<option value="">-- Seleccione Especialidad --</option>';
  selectFuncion.innerHTML =
    '<option value="">-- Seleccione Función --</option>';

  if (window.gradosCargados) {
    window.gradosCargados.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.grado;
      opt.textContent = `${item.grado} - (${item.grado_completo})`;
      selectGrado.appendChild(opt);
    });
  }
  if (window.especialidadesCargadas) {
    window.especialidadesCargadas.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.especialidad;
      opt.textContent = item.especialidad;
      selectEspecialidad.appendChild(opt);
    });
  }
  if (window.funcionesCargadas) {
    window.funcionesCargadas.forEach((item) => {
      const opt = document.createElement("option");
      const nombreFuncion = item.funcion || item["function"] || item.valor_unico || "";
      opt.value = nombreFuncion;
      opt.textContent = nombreFuncion;
      selectFuncion.appendChild(opt);
    });
  }

  selectGrado.value = currentGrado;
  selectEspecialidad.value = currentEsp;
  selectFuncion.value = currentFun;
}

function renderPersonalTable(personalData) {
  datosPersonalGlobal = personalData || [];
  window.datosPersonalGlobal = datosPersonalGlobal;
  currentPage = 1;
  mostrarPaginaActual();
}

function mostrarPaginaActual() {
  tableBodyPer.innerHTML = "";
  const totalRegistros = datosPersonalGlobal.length;

  if (totalRegistros === 0) {
    tableBodyPer.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#7f8c8d;">No hay personal registrado</td></tr>`;
    paginationText.textContent = "Mostrando 0-0 de 0 registros";
    btnPrevPage.disabled = true;
    btnNextPage.disabled = true;
    return;
  }

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRegistros);
  const paginatedItems = datosPersonalGlobal.slice(startIndex, endIndex);

  paginatedItems.forEach((item) => {
    const antMostrar =
      item.ant === null || item.ant === ""
        ? '<span style="color:#7f8c8d;">-</span>'
        : item.ant;
    const antPasarParametro = item.ant === null ? "" : String(item.ant);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge-ord">${item.ord}</span></td>
      <td><strong>${item.cedula}</strong></td>
      <td>${item.grado}</td>
      <td>${item.especialidad}</td>
      <td>${antMostrar}</td>
      <td style="text-align:left;">${item.apellidos_nombres}</td>
      <td>${item.funcion || "-"}</td>
      <td>${item.fecha_nacimiento || "-"}</td>
      <td>${item.contacto}</td>
      <td>${item.nombre_contacto}</td>
      <td>
        <button class="btn-edit btn-edit-per" type="button">Editar</button>
        <button class="btn-delete btn-delete-per" type="button">Eliminar</button>
      </td>`;

    const btnEdit = tr.querySelector(".btn-edit-per");
    btnEdit.addEventListener("click", () => {
      formPer.dataset.modeTarget = "personal"; //
      setupEditPer(
        item.cedula,
        item.grado,
        item.especialidad,
        antPasarParametro,
        item.apellidos_nombres,
        item.funcion || "",
        item.fecha_nacimiento || "",
        item.contacto,
        item.nombre_contacto,
      );
    });

    tr.querySelector(".btn-delete-per").addEventListener("click", () => {
      deletePersonal(item.cedula);
    });

    tableBodyPer.appendChild(tr);
  });

  paginationText.textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${totalRegistros} registros`;
  const maxPage = Math.ceil(totalRegistros / rowsPerPage);
  btnPrevPage.disabled = currentPage === 1;
  btnNextPage.disabled = currentPage === maxPage || maxPage === 0;
}

// ============================================================
// RENDERIZADO Y CONTROL DE PERSONAL AGREGADO (SOLUCIÓN COMPLETA DE EVENTOS)
// ============================================================
function actualizarMatrizSalvoconductosYPersonalExterna(data) {
  datosPersonalAgregadoGlobal = data.personal_agregado || [];
  window.datosPersonalAgregadoGlobal = datosPersonalAgregadoGlobal; //

  const tbodyAgregados = document.getElementById(
    "table-body-personal-agregado",
  );
  if (!tbodyAgregados) return;
  tbodyAgregados.innerHTML = "";

  if (datosPersonalAgregadoGlobal.length === 0) {
    tbodyAgregados.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#7f8c8d; padding:15px;">No hay personal agregado registrado en el escuadrón</td></tr>`;
    return;
  }

  datosPersonalAgregadoGlobal.forEach((item, index) => {
    const tr = document.createElement("tr");
    const esActivo = String(item.estado).toUpperCase() === "ACTIVO";
    const antPasarParametro = item.ant === null ? "" : String(item.ant);

    tr.innerHTML = `
      <td><span class="badge-ord">${index + 1}</span></td>
      <td><strong>${item.cedula}</strong></td>
      <td>${item.grado}</td>
      <td>${item.especialidad}</td>
      <td>${item.ant || "-"}</td>
      <td style="text-align:left;">${item.apellidos_nombres}</td>
      <td>${item.funcion || "-"}</td>
      <td>${item.contacto}</td>
      <td><span class="badge-ord" style="background:${esActivo ? "#18bc9c" : "#7f8c8d"}; font-size:11px;">${item.estado}</span></td>
      <td>
         <button type="button" class="btn-edit btn-edit-pa" style="padding:4px 8px; font-size:11px; margin:0;"><i class="fa-solid fa-user-pen"></i> Editar</button>
         ${
           esActivo
             ? `<button type="button" class="btn-delete btn-concluir-pa" style="padding:4px 8px; font-size:11px; margin:0; background:#e67e22;"><i class="fa-solid fa-power-off"></i> Concluir</button>`
             : `<button type="button" class="btn-edit btn-activar-pa" style="padding:4px 8px; font-size:11px; margin:0; background:#2980b9; width:auto !important;"><i class="fa-solid fa-user-check"></i> Reincorporar</button>`
         }
         <button type="button" class="btn-delete btn-delete-pa" style="padding:4px 8px; font-size:11px; margin:0 0 0 4px;"><i class="fa-solid fa-trash"></i> Eliminar</button>
      </td>
    `;

    // --- ENLACE SEGURO DE ESCUCHADORES DE EVENTOS POR FILA (EVITA ERRORES DE SINTAXIS) ---
    tr.querySelector(".btn-edit-pa").addEventListener("click", () => {
      formPer.dataset.modeTarget = "personal_agregado";
      setupEditPer(
        item.cedula,
        item.grado,
        item.especialidad,
        antPasarParametro,
        item.apellidos_nombres,
        item.funcion || "",
        item.fecha_nacimiento || "",
        item.contacto,
        item.nombre_contacto,
      );
      formTitlePer.innerHTML = `<i class="fa-solid fa-user-gear"></i> Modificar Personal Agregado`;
    });

    if (esActivo) {
      tr.querySelector(".btn-concluir-pa").addEventListener("click", () => {
        concluirServicioAgregado(item.cedula);
      });
    } else {
      // EVENTO PARA VOLVER ACTIVO AL USUARIO INACTIVO
      tr.querySelector(".btn-activar-pa").addEventListener("click", () => {
        reactivarServicioAgregado(item);
      });
    }

    tr.querySelector(".btn-delete-pa").addEventListener("click", () => {
      eliminarPersonalAgregadoTotal(item.cedula);
    });

    tbodyAgregados.appendChild(tr);
  });
}

// Concluir servicio temporal (Pasar a Inactivo)
function concluirServicioAgregado(cedula) {
  if (
    confirm(
      `¿Confirmar la conclusión de servicios para la CC: ${cedula}? Su registro pasará a estado Inactivo.`,
    )
  ) {
    if (typeof sendData === "function") {
      sendData(
        { target: "personal_agregado", action: "concluir", id: cedula },
        () => {
          loadAllData();
        },
      );
    }
  }
}

// REINCORPORAR: Enviar de nuevo los datos como "save" para reactivarlo en Sheets
function reactivarServicioAgregado(item) {
  if (
    confirm(
      `¿Desea reincorporar y dar el ALTA ACTIVA nuevamente al efectivo CC: ${item.cedula}?`,
    )
  ) {
    const payload = {
      target: "personal_agregado",
      action: "save", // El backend cambiará automáticamente el campo a "ACTIVO" al recibirlo de nuevo
      cedula: item.cedula,
      grado: item.grado,
      especialidad: item.especialidad,
      ant: item.ant === null ? "" : parseInt(item.ant),
      apellidos_nombres: item.apellidos_nombres,
      funcion: item.funcion,
      fecha_nacimiento: item.fecha_nacimiento,
      contacto: item.contacto,
      nombre_contacto: item.nombre_contacto,
    };

    if (typeof sendData === "function") {
      sendData(payload, () => {
        loadAllData();
      });
    }
  }
}

// Eliminar Físicamente de la pestaña PERSONAL_AGREGADO
function eliminarPersonalAgregadoTotal(cedula) {
  if (
    confirm(
      `¿Está seguro de eliminar de forma PERMANENTE al efectivo agregado con CC: ${cedula} de la base de datos?`,
    )
  ) {
    if (typeof sendData === "function") {
      sendData(
        { target: "personal_agregado", action: "delete", id: cedula },
        () => {
          loadAllData();
        },
      );
    }
  }
}

// ============================================================
// AUXILIARES: CONFIGURACIÓN DE EDICIÓN Y LIMPIEZA
// ============================================================
function setupEditPer(
  cedula,
  grado,
  especialidad,
  ant,
  apellidosNombres,
  funcion,
  fechaNacimiento,
  contacto,
  nombreContacto,
) {
  isEditingPer = true;
  formTitlePer.innerHTML = `<i class="fa-solid fa-user-gear"></i> Modificar Datos de Personal`;
  btnSavePer.innerText = "Actualizar Registro";
  btnCancelPer.style.display = "block";

  const cedulaInput = document.getElementById("per-cedula");
  cedulaInput.value = cedula;
  cedulaInput.readOnly = true;
  cedulaInput.style.background = "#e0e0e0";

  document.getElementById("per-ant").value = ant;
  selectGrado.value = grado;
  selectEspecialidad.value = especialidad;
  selectFuncion.value = funcion;
  document.getElementById("per-nombres").value = apellidosNombres;

  const fechaLimpia =
    fechaNacimiento && fechaNacimiento !== "-" ? fechaNacimiento.trim() : "";
  if (fechaLimpia && fechaLimpia.includes("/")) {
    const partes = fechaLimpia.split("/");
    const meses = [
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
    const indiceMes = meses.indexOf(partes[1].toUpperCase());
    if (indiceMes !== -1 && partes.length === 3) {
      document.getElementById("per-fecha").value =
        `${partes[2]}-${String(indiceMes + 1).padStart(2, "0")}-${partes[0]}`;
    } else {
      document.getElementById("per-fecha").value = "";
    }
  } else {
    document.getElementById("per-fecha").value = "";
  }

  document.getElementById("per-contacto").value = contacto;
  document.getElementById("per-nombre-contacto").value = nombreContacto;

  const modalPer = document.getElementById("modal-registro-personal");
  if (modalPer) modalPer.classList.remove("hidden");
}

function resetFormPersonal() {
  isEditingPer = false;
  formTitlePer.innerHTML = `<i class="fa-solid fa-user-gear"></i> Registrar Nuevo Personal Militar`;
  btnSavePer.innerText = "Guardar Registro";
  btnCancelPer.style.display = "none";
  const cedulaInput = document.getElementById("per-cedula");
  cedulaInput.readOnly = false;
  cedulaInput.style.background = "#ffffff";
  formPer.reset();
}

async function deletePersonal(cedulaId) {
  if (
    !confirm(`¿Eliminar permanentemente al personal con cédula: ${cedulaId}?`)
  )
    return;
  if (typeof sendData === "function") {
    sendData({ action: "delete", id: cedulaId, target: "personal" }, () => {
      loadAllData();
    });
  }
}