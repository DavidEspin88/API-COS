// Selectores Exclusivos de Personal
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

// Variables de Estado de Paginación
let isEditingPer = false;
let datosPersonalGlobal = [];
let currentPage = 1;
const rowsPerPage = 10;

// Inicializar Listeners para las Flechas de navegación de la tabla
document.addEventListener("DOMContentLoaded", () => {
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

// 1. Población Dinámica de Menús Desplegables
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
      // Normalización: el servidor puede devolver "funcion" o "valor_unico"
      const nombreFuncion = item.function || item.funcion || "";
    
    opt.value = nombreFuncion;
    opt.textContent = nombreFuncion;
    selectFuncion.appendChild(opt);
  });
}

  selectGrado.value = currentGrado;
  selectEspecialidad.value = currentEsp;
  selectFuncion.value = currentFun;
}

// 2. Interceptor de la Carga de Datos de Personal
function renderPersonalTable(personalData) {
  datosPersonalGlobal = personalData || [];
  window.datosPersonalGlobal = datosPersonalGlobal; // Compartir en ventana para control_operacional.js
  currentPage = 1;
  mostrarPaginaActual();
}

// 2.1 Dividir y renderizar el segmento de 10 registros correspondientes
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
      <td><span class="badge-ord">${item.ord}</span></td><td><strong>${item.cedula}</strong></td>
      <td>${item.grado}</td><td>${item.especialidad}</td><td>${antMostrar}</td>
      <td>${item.apellidos_nombres}</td><td>${item.funcion || "-"}</td><td>${item.fecha_nacimiento || "-"}</td>
      <td>${item.contacto}</td><td>${item.nombre_contacto}</td>
      <td>
        <button class="btn-edit btn-edit-per" type="button">Editar</button>
        <button class="btn-delete btn-delete-per" type="button">Eliminar</button>
      </td>`;

    const btnEdit = tr.querySelector(".btn-edit-per");
    btnEdit.dataset.cedula = item.cedula;
    btnEdit.dataset.grado = item.grado;
    btnEdit.dataset.especialidad = item.especialidad;
    btnEdit.dataset.ant = antPasarParametro;
    btnEdit.dataset.nombres = item.apellidos_nombres;
    btnEdit.dataset.funcion = item.funcion || "";
    btnEdit.dataset.fecha = item.fecha_nacimiento || "";
    btnEdit.dataset.contacto = item.contacto;
    btnEdit.dataset.nombreContacto = item.nombre_contacto;

    btnEdit.addEventListener("click", function () {
      setupEditPer(
        this.dataset.cedula,
        this.dataset.grado,
        this.dataset.especialidad,
        this.dataset.ant,
        this.dataset.nombres,
        this.dataset.funcion,
        this.dataset.fecha,
        this.dataset.contacto,
        this.dataset.nombreContacto,
      );
    });

    const btnDelete = tr.querySelector(".btn-delete-per");
    btnDelete.dataset.cedula = item.cedula;
    btnDelete.addEventListener("click", function () {
      deletePersonal(this.dataset.cedula);
    });

    tableBodyPer.appendChild(tr);
  });

  paginationText.textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${totalRegistros} registros`;
  const maxPage = Math.ceil(totalRegistros / rowsPerPage);
  btnPrevPage.disabled = currentPage === 1;
  btnNextPage.disabled = currentPage === maxPage || maxPage === 0;
}

// 3. Envío de Formulario
formPer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const antInput = document.getElementById("per-ant").value;
  const payload = {
    target: "personal",
    action: isEditingPer ? "update" : "create",
    cedula: document.getElementById("per-cedula").value,
    grado: selectGrado.value,
    especialidad: selectEspecialidad.value,
    ant: antInput === "" ? "" : parseInt(antInput),
    apellidos_nombres: document
      .getElementById("per-nombres")
      .value.toUpperCase(),
    funcion: selectFuncion.value,
    fecha_nacimiento: document.getElementById("per-fecha").value,
    contacto: document.getElementById("per-contacto").value,
    nombre_contacto: document.getElementById("per-nombre-contacto").value,
  };

  if (typeof sendData === "function") sendData(payload, resetFormPersonal);
});

// 4. Configurar Interfaz para Edición
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
  formTitlePer.innerText = "Modificar Datos de Personal";
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
  formPer.scrollIntoView({ behavior: "smooth" });
}

// 5. Limpieza del Formulario
function resetFormPersonal() {
  isEditingPer = false;
  formTitlePer.innerText = "Registrar Nuevo Personal";
  btnCancelPer.style.display = "none";
  const cedulaInput = document.getElementById("per-cedula");
  cedulaInput.readOnly = false;
  cedulaInput.style.background = "#ffffff";
  formPer.reset();
}

// 6. Eliminar Personal
async function deletePersonal(cedulaId) {
  if (
    !confirm(`¿Eliminar permanentemente al personal con cédula: ${cedulaId}?`)
  )
    return;
  if (typeof sendData === "function")
    sendData({ action: "delete", id: cedulaId, target: "personal" }, () => {});
}
