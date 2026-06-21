// Selectores Exclusivos de Personal
const formPer = document.getElementById("form-personal");
const tableBodyPer = document.getElementById("table-body-personal");
const btnCancelPer = document.getElementById("btn-cancel-per");
const formTitlePer = document.getElementById("form-title-per");
const btnSavePer = document.getElementById("btn-save-per");

const selectGrado = document.getElementById("per-grado");
const selectEspecialidad = document.getElementById("per-especialidad");
const selectFuncion = document.getElementById("per-funcion");

let isEditingPer = false;

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
      opt.value = item.funcion;
      opt.textContent = item.funcion;
      selectFuncion.appendChild(opt);
    });
  }

  selectGrado.value = currentGrado;
  selectEspecialidad.value = currentEsp;
  selectFuncion.value = currentFun;
}

// 2. Renderizar Tabla de Personal
// 2. Renderizar Tabla de Personal (Formato dd/mmm/aaaa en pantalla)
function renderPersonalTable(personalData) {
  tableBodyPer.innerHTML = "";
  if (!personalData) return;

  personalData.forEach((item) => {
    const antMostrar = item.ant === null || item.ant === "" ? '<span style="color:#7f8c8d;">-</span>' : item.ant;
    const antPasarParametro = item.ant === null ? "" : item.ant;

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><span class="badge-ord">${item.ord}</span></td>
            <td><strong>${item.cedula}</strong></td>
            <td>${item.grado}</td>
            <td>${item.especialidad}</td>
            <td>${antMostrar}</td>
            <td>${item.apellidos_nombres}</td>
            <td>${item.funcion || "-"}</td>
            <td>${item.fecha_nacimiento || "-"}</td> <td>${item.contacto}</td>
            <td>${item.nombre_contacto}</td>
            <td>
                <button class="btn-edit" onclick="setupEditPer('${item.cedula}', '${item.grado}', '${item.especialidad}', '${antPasarParametro}', '${item.apellidos_nombres}', '${item.funcion || ""}', '${item.fecha_nacimiento}', '${item.contacto}', '${item.nombre_contacto}')">Editar</button>
                <button class="btn-delete" onclick="deletePersonal('${item.cedula}')">Eliminar</button>
            </td>
        `;
    tableBodyPer.appendChild(tr);
  });
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
function setupEditPer(cedula, grado, especialidad, ant, apellidosNombres, funcion, fechaNacimiento, contacto, nombreContacto) {
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
  
  // --- Conversión de formato "dd/mmm/aaaa" a "aaaa-mm-dd" para el input html ---
  if (fechaNacimiento && fechaNacimiento.includes("/")) {
    const partes = fechaNacimiento.split("/"); // [dd, mmm, aaaa]
    const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    const indiceMes = meses.indexOf(partes[1].toUpperCase());
    
    if (indiceMes !== -1) {
      const mesNumero = String(indiceMes + 1).padStart(2, '0');
      const anio = partes[2];
      const dia = partes[0];
      document.getElementById("per-fecha").value = `${anio}-${mesNumero}-${dia}`;
    }
  } else {
    document.getElementById("per-fecha").value = "";
  }
  
  document.getElementById("per-contacto").value = contacto;
  document.getElementById("per-nombre-contacto").value = nombreContacto;
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
  if (!confirm(`¿Eliminar permanentemente cédula: ${cedulaId}?`)) return;
  if (typeof sendData === "function")
    sendData({ action: "delete", id: cedulaId, target: "personal" }, () => {});
}
