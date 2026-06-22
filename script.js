// REEMPLAZA CON TU URL DE DEPLOYMENT DE APPS SCRIPT
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxOFjWcL-NIb4HsshGL6fIdwZi9AeAX7p4xhKdP56H5Z3KcfO8m9CD3q7xGZIzRp_aTbw/exec";

// Selectores Munición
const formMun = document.getElementById("form-municion");
const tableBodyMun = document.getElementById("table-body-municion");
const btnCancelMun = document.getElementById("btn-cancel-mun");
const formTitleMun = document.getElementById("form-title-mun");
const btnSaveMun = document.getElementById("btn-save-mun");

// Selectores Armamento
const formArm = document.getElementById("form-armamento");
const tableBodyArm = document.getElementById("table-body-armamento");
const btnCancelArm = document.getElementById("btn-cancel-arm");
const formTitleArm = document.getElementById("form-title-arm");
const btnSaveArm = document.getElementById("btn-save-arm");

// Selectores Grado
const formGra = document.getElementById("form-grado");
const tableBodyGra = document.getElementById("table-body-grado");
const btnCancelGra = document.getElementById("btn-cancel-gra");
const formTitleGra = document.getElementById("form-title-gra");
const btnSaveGra = document.getElementById("btn-save-gra");

// Selectores Función
const formFunco = document.getElementById("form-funcion");
const tableBodyFunco = document.getElementById("table-body-funcion");
const btnCancelFunco = document.getElementById("btn-cancel-funco");
const formTitleFunco = document.getElementById("form-title-funco");
const btnSaveFunco = document.getElementById("btn-save-funco");

// Selectores Lugar
const formLug = document.getElementById("form-lugar");
const tableBodyLug = document.getElementById("table-body-lugar");
const btnCancelLug = document.getElementById("btn-cancel-lug");
const formTitleLug = document.getElementById("form-title-lug");
const btnSaveLug = document.getElementById("btn-save-lug");

// Selectores Especialidad
const formEsp = document.getElementById("form-especialidad");
const tableBodyEsp = document.getElementById("table-body-especialidad");
const btnCancelEsp = document.getElementById("btn-cancel-esp");
const formTitleEsp = document.getElementById("form-title-esp");
const btnSaveEsp = document.getElementById("btn-save-esp");

// Selectores Estado
const formEst = document.getElementById("form-estado");
const tableBodyEst = document.getElementById("table-body-estado");
const btnCancelEst = document.getElementById("btn-cancel-est");
const formTitleEst = document.getElementById("form-title-est");
const btnSaveEst = document.getElementById("btn-save-est");

const loadingText = document.getElementById("loading-text");

let isEditingMun = false;
let isEditingArm = false;
let isEditingGra = false;
let isEditingFunco = false;
let isEditingLug = false;
let isEditingEsp = false;
let isEditingEst = false;

document.addEventListener("DOMContentLoaded", loadAllData);

async function loadAllData() {
  loadingText.style.display = "block";
  tableBodyMun.innerHTML = "";
  tableBodyArm.innerHTML = "";
  tableBodyGra.innerHTML = "";
  tableBodyFunco.innerHTML = "";
  tableBodyLug.innerHTML = "";
  tableBodyEsp.innerHTML = "";
  tableBodyEst.innerHTML = "";
  try {
    const response = await fetch(WEB_APP_URL);
    const data = await response.json();

    // Renderizar Munición
    data.municion.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${item.calibre}</td><td>${item.cantidad}</td><td>${item.lote}</td>
            <td><button class="btn-edit" onclick="setupEditMun('${item.id}', '${item.calibre}', ${item.cantidad}, '${item.lote}')">Editar</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}', 'municion')">Eliminar</button></td>`;
      tableBodyMun.appendChild(tr);
    });

    // Renderizar Armamento
    data.armamento.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.tipo}</td><td>${item.marca || "-"}</td><td>${item.serie}</td><td>${item.cantidad_armamento}</td>
        <td>
            <button class="btn-edit" onclick="setupEditArm('${item.id}', '${item.tipo}', '${item.marca || ""}', '${item.serie}', ${item.cantidad_armamento})">Editar</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}', 'armamento')">Eliminar</button>
        </td>`;
      tableBodyArm.appendChild(tr);
    });

    // Renderizar Grado
    window.gradosCargados = data.grado;
    data.grado.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td><strong>${item.grado}</strong></td><td>${item.grado_completo}</td>
            <td><button class="btn-edit" onclick="setupEditGra('${item.id}', '${item.grado}', '${item.grado_completo}')">Editar</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}', 'grado')">Eliminar</button></td>`;
      tableBodyGra.appendChild(tr);
    });

    // Renderizar Función
    window.funcionesCargadas = data.funcion;
    data.funcion.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${item.funcion}</td>
            <td><button class="btn-edit" onclick="setupEditFunco('${item.id}', '${item.funcion}')">Editar</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}', 'funcion')">Eliminar</button></td>`;
      tableBodyFunco.appendChild(tr);
    });

    // Renderizar Lugar
    data.lugar.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${item.lugar}</td>
            <td><button class="btn-edit" onclick="setupEditLug('${item.id}', '${item.lugar}')">Editar</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}', 'lugar')">Eliminar</button></td>`;
      tableBodyLug.appendChild(tr);
    });

    // Renderizar Especialidad
    window.especialidadesCargadas = data.especialidad;
    data.especialidad.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${item.especialidad}</td>
            <td><button class="btn-edit" onclick="setupEditEsp('${item.id}', '${item.especialidad}')">Editar</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}', 'especialidad')">Eliminar</button></td>`;
      tableBodyEsp.appendChild(tr);
    });

    // Renderizar Estado
    data.estado.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${item.estado}</td>
            <td><button class="btn-edit" onclick="setupEditEst('${item.id}', '${item.estado}')">Editar</button>
            <button class="btn-delete" onclick="deleteItem('${item.id}', 'estado')">Eliminar</button></td>`;
      tableBodyEst.appendChild(tr);
    });

    // Sincronización Segura del archivo personal.js
    if (typeof renderPersonalTable === "function") {
      renderPersonalTable(data.personal);
      poblarDesplegablesPersonal();
    }

    // Inyección de Control Estadístico Operacional
    if (typeof inicializarControlOperacional === "function") {
      inicializarControlOperacional(data);
    }
  } catch (error) {
    console.error("Error cargando inventarios:", error);
  } finally {
    loadingText.style.display = "none";
  }
}

// ============================================================
// FUNCIÓN CENTRAL PARA ENVIAR DATOS (POST) CON AUTO-REFRESCO
// ============================================================
async function sendData(payload, callbackReset) {
  loadingText.style.display = "block";
  loadingText.innerText = "Sincronizando cambios con Google Sheets...";
  
  try {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.status === "error") {
      alert("Error del servidor: " + result.message);
      loadingText.style.display = "none";
      return;
    }

    setTimeout(() => {
      // Ejecuta la limpieza o congelamiento del formulario web correspondiente
      callbackReset();
      
      // --- REGLA DE LOGÍSTICA SINCRO: NO RESETEAR LA VISTA SI SOLO SE GUARDA EL PARTE ---
      if (payload.target !== "control_operacional") {
        // Si creamos, editamos o eliminamos personal, munición o armamento, recarga TODO en caliente
        loadAllData();
      } else {
        loadingText.style.display = "none"; // Si es el parte diario, solo apaga el indicador y mantiene tus datos en pantalla
      }
    }, 1200);
  } catch (error) {
    console.error("Error remoto:", error);
    alert("❌ Error de comunicación con el servidor de Google Sheets.");
    loadingText.style.display = "none";
  }
}

// Submits Listeners
formMun.addEventListener("submit", (e) => {
  e.preventDefault();
  sendData(
    {
      target: "municion",
      action: isEditingMun ? "update" : "create",
      id: document.getElementById("mun-id").value,
      calibre: document.getElementById("mun-calibre").value,
      cantidad: parseInt(document.getElementById("mun-cantidad").value),
      lote: document.getElementById("mun-lote").value,
    },
    resetFormMunicion,
  );
});
formArm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendData(
    {
      target: "armamento",
      action: isEditingArm ? "update" : "create",
      id: document.getElementById("arm-id").value,
      tipo: document.getElementById("arm-tipo").value,
      marca: document.getElementById("arm-marca").value,
      serie: document.getElementById("arm-serie").value,
      cantidad_armamento: parseInt(
        document.getElementById("arm-cantidad").value,
      ),
    },
    resetFormArmamento,
  );
});
formGra.addEventListener("submit", (e) => {
  e.preventDefault();
  sendData(
    {
      target: "grado",
      action: isEditingGra ? "update" : "create",
      id: document.getElementById("gra-id").value,
      grado: document.getElementById("gra-sigla").value,
      grado_completo: document.getElementById("gra-completo").value,
    },
    resetFormGrado,
  );
});
formFunco.addEventListener("submit", (e) => {
  e.preventDefault();
  sendData(
    {
      target: "funcion",
      action: isEditingFunco ? "update" : "create",
      id: document.getElementById("funco-id").value,
      valor_unico: document.getElementById("funco-nombre").value,
    },
    resetFormFuncion,
  );
});
formLug.addEventListener("submit", (e) => {
  e.preventDefault();
  sendData(
    {
      target: "lugar",
      action: isEditingLug ? "update" : "create",
      id: document.getElementById("lug-id").value,
      valor_unico: document.getElementById("lug-nombre").value,
    },
    resetFormLugar,
  );
});
formEsp.addEventListener("submit", (e) => {
  e.preventDefault();
  sendData(
    {
      target: "especialidad",
      action: isEditingEsp ? "update" : "create",
      id: document.getElementById("esp-id").value,
      valor_unico: document.getElementById("esp-nombre").value,
    },
    resetFormEspecialidad,
  );
});
formEst.addEventListener("submit", (e) => {
  e.preventDefault();
  sendData(
    {
      target: "estado",
      action: isEditingEst ? "update" : "create",
      id: document.getElementById("est-id").value,
      valor_unico: document.getElementById("est-nombre").value,
    },
    resetFormEstado,
  );
});

// Interfaces de Edición
function setupEditMun(id, calibre, cantidad, lote) {
  isEditingMun = true;
  formTitleMun.innerText = "Modificar Munición";
  btnSaveMun.innerText = "Actualizar";
  btnCancelMun.style.display = "block";
  document.getElementById("mun-id").value = id;
  document.getElementById("mun-calibre").value = calibre;
  document.getElementById("mun-cantidad").value = cantidad;
  document.getElementById("mun-lote").value = lote;
}
function setupEditArm(id, tipo, marca, serie, cantidad) {
  isEditingArm = true;
  formTitleArm.innerText = "Modificar Armamento";
  btnSaveArm.innerText = "Actualizar";
  btnCancelArm.style.display = "block";
  document.getElementById("arm-id").value = id;
  document.getElementById("arm-tipo").value = tipo;
  document.getElementById("arm-marca").value = marca;
  document.getElementById("arm-serie").value = serie;
  document.getElementById("arm-cantidad").value = cantidad;
}
function setupEditGra(id, grado, completo) {
  isEditingGra = true;
  formTitleGra.innerText = "Modificar Grado";
  btnSaveGra.innerText = "Actualizar";
  btnCancelGra.style.display = "block";
  document.getElementById("gra-id").value = id;
  document.getElementById("gra-sigla").value = grado;
  document.getElementById("gra-completo").value = completo;
}
function setupEditFunco(id, funcion) {
  isEditingFunco = true;
  formTitleFunco.innerText = "Modificar Función";
  btnSaveFunco.innerText = "Actualizar";
  btnCancelFunco.style.display = "block";
  document.getElementById("funco-id").value = id;
  document.getElementById("funco-nombre").value = funcion;
}
function setupEditLug(id, lugar) {
  isEditingLug = true;
  if (formTitleLug) formTitleLug.innerText = "Modificar Lugar";
  btnSaveLug.innerText = "Actualizar";
  btnCancelLug.style.display = "block";
  document.getElementById("lug-id").value = id;
  document.getElementById("lug-nombre").value = lugar;
}
function setupEditEsp(id, esp) {
  isEditingEsp = true;
  formTitleEsp.innerText = "Modificar Especialidad";
  btnSaveEsp.innerText = "Actualizar";
  btnCancelEsp.style.display = "block";
  document.getElementById("esp-id").value = id;
  document.getElementById("esp-nombre").value = esp;
}
function setupEditEst(id, est) {
  isEditingEst = true;
  formTitleEst.innerText = "Modificar Estado";
  btnSaveEst.innerText = "Actualizar";
  btnCancelEst.style.display = "block";
  document.getElementById("est-id").value = id;
  document.getElementById("est-nombre").value = est;
}

// Resets
function resetFormMunicion() {
  isEditingMun = false;
  formTitleMun.innerText = "Ingresar Munición";
  btnCancelMun.style.display = "none";
  formMun.reset();
}
function resetFormArmamento() {
  isEditingArm = false;
  formTitleArm.innerText = "Ingresar Armamento";
  btnCancelArm.style.display = "none";
  formArm.reset();
}
function resetFormGrado() {
  isEditingGra = false;
  formTitleGra.innerText = "Ingresar Grado";
  btnCancelGra.style.display = "none";
  formGra.reset();
}
function resetFormFuncion() {
  isEditingFunco = false;
  formTitleFunco.innerText = "Ingresar Función";
  btnCancelFunco.style.display = "none";
  formFunco.reset();
}
function resetFormLugar() {
  isEditingLug = false;
  if (formTitleLug) formTitleLug.innerText = "Ingresar Lugar";
  btnCancelLug.style.display = "none";
  formLug.reset();
}
function resetFormEspecialidad() {
  isEditingEsp = false;
  formTitleEsp.innerText = "Ingresar Especialidad";
  btnCancelEsp.style.display = "none";
  formEsp.reset();
}
function resetFormEstado() {
  isEditingEst = false;
  formTitleEst.innerText = "Ingresar Estado";
  btnCancelEst.style.display = "none";
  formEst.reset();
  document.getElementById("est-id").value = "";
}

async function deleteItem(id, type) {
  if (confirm(`¿Eliminar de ${type}?`))
    sendData({ action: "delete", id: id, target: type }, () => {});
}
