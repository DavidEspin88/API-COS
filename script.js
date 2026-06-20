// REEMPLAZA CON TU URL DE DEPLOYMENT DE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxOFjWcL-NIb4HsshGL6fIdwZi9AeAX7p4xhKdP56H5Z3KcfO8m9CD3q7xGZIzRp_aTbw/exec";

// Selectores Munición
const formMun = document.getElementById('form-municion');
const tableBodyMun = document.getElementById('table-body-municion');
const btnCancelMun = document.getElementById('btn-cancel-mun');
const formTitleMun = document.getElementById('form-title-mun');
const btnSaveMun = document.getElementById('btn-save-mun');

// Selectores Armamento
const formArm = document.getElementById('form-armamento');
const tableBodyArm = document.getElementById('table-body-armamento');
const btnCancelArm = document.getElementById('btn-cancel-arm');
const formTitleArm = document.getElementById('form-title-arm');
const btnSaveArm = document.getElementById('btn-save-arm');

// Selectores Grado
const formGra = document.getElementById('form-grado');
const tableBodyGra = document.getElementById('table-body-grado');
const btnCancelGra = document.getElementById('btn-cancel-gra');
const formTitleGra = document.getElementById('form-title-gra');
const btnSaveGra = document.getElementById('btn-save-gra');

const loadingText = document.getElementById('loading-text');

let isEditingMun = false;
let isEditingArm = false;
let isEditingGra = false;

document.addEventListener('DOMContentLoaded', loadAllData);

// GET: Sincronizar todos los datos
async function loadAllData() {
    loadingText.style.display = "block";
    tableBodyMun.innerHTML = "";
    tableBodyArm.innerHTML = "";
    tableBodyGra.innerHTML = "";
    try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        
        // Renderizar Munición
        data.municion.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.calibre}</td>
                <td>${item.cantidad}</td>
                <td>${item.lote}</td>
                <td>
                    <button class="btn-edit" onclick="setupEditMun('${item.id}', '${item.calibre}', ${item.cantidad}, '${item.lote}')">Editar</button>
                    <button class="btn-delete" onclick="deleteItem('${item.id}', 'municion')">Eliminar</button>
                </td>
            `;
            tableBodyMun.appendChild(tr);
        });

        // Renderizar Armamento
        data.armamento.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.tipo}</td>
                <td>${item.serie}</td>
                <td>${item.cantidad_armamento}</td>
                <td>
                    <button class="btn-edit" onclick="setupEditArm('${item.id}', '${item.tipo}', '${item.serie}', ${item.cantidad_armamento})">Editar</button>
                    <button class="btn-delete" onclick="deleteItem('${item.id}', 'armamento')">Eliminar</button>
                </td>
            `;
            tableBodyArm.appendChild(tr);
        });

        // Renderizar Grado
        data.grado.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.grado}</strong></td>
                <td>${item.grado_completo}</td>
                <td>
                    <button class="btn-edit" onclick="setupEditGra('${item.id}', '${item.grado}', '${item.grado_completo}')">Editar</button>
                    <button class="btn-delete" onclick="deleteItem('${item.id}', 'grado')">Eliminar</button>
                </td>
            `;
            tableBodyGra.appendChild(tr);
        });

    } catch (error) {
        console.error("Error sincronizando los inventarios globales:", error);
    } finally {
        loadingText.style.display = "none";
    }
}

// POST: Envío Munición
formMun.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        target: "municion",
        action: isEditingMun ? "update" : "create",
        id: document.getElementById('mun-id').value,
        calibre: document.getElementById('mun-calibre').value,
        text_id: "",
        cantidad: parseInt(document.getElementById('mun-cantidad').value),
        lote: document.getElementById('mun-lote').value
    };
    sendData(payload, resetFormMunicion);
});

// POST: Envío Armamento
formArm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        target: "armamento",
        action: isEditingArm ? "update" : "create",
        id: document.getElementById('arm-id').value,
        tipo: document.getElementById('arm-tipo').value,
        serie: document.getElementById('arm-serie').value,
        cantidad_armamento: parseInt(document.getElementById('arm-cantidad').value)
    };
    sendData(payload, resetFormArmamento);
});

// POST: Envío Grado
formGra.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        target: "grado",
        action: isEditingGra ? "update" : "create",
        id: document.getElementById('gra-id').value,
        grado: document.getElementById('gra-sigla').value,
        grado_completo: document.getElementById('gra-completo').value
    };
    sendData(payload, resetFormGrado);
});

// Despachador Global asíncrono
async function sendData(payload, callbackReset) {
    loadingText.style.display = "block";
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setTimeout(() => {
            callbackReset();
            loadAllData();
        }, 1200);
    } catch (error) {
        console.error("Error de red en operación remota:", error);
        loadingText.style.display = "none";
    }
}

// Interfases de Edición
function setupEditMun(id, calibre, cantidad, lote) {
    isEditingMun = true;
    formTitleMun.innerText = "Modificar Munición";
    btnSaveMun.innerText = "Actualizar Munición";
    btnCancelMun.style.display = "block";
    document.getElementById('mun-id').value = id;
    document.getElementById('mun-calibre').value = calibre;
    document.getElementById('mun-cantidad').value = cantidad;
    document.getElementById('mun-lote').value = lote;
}

function setupEditArm(id, tipo, serie, cantidad) {
    isEditingArm = true;
    formTitleArm.innerText = "Modificar Armamento";
    btnSaveArm.innerText = "Actualizar Armamento";
    btnCancelArm.style.display = "block";
    document.getElementById('arm-id').value = id;
    document.getElementById('arm-tipo').value = tipo;
    document.getElementById('arm-serie').value = serie;
    document.getElementById('arm-cantidad').value = cantidad;
}

function setupEditGra(id, grado, gradoCompleto) {
    isEditingGra = true;
    formTitleGra.innerText = "Modificar Rango/Grado";
    btnSaveGra.innerText = "Actualizar Grado";
    btnCancelGra.style.display = "block";
    document.getElementById('gra-id').value = id;
    document.getElementById('gra-sigla').value = grado;
    document.getElementById('gra-completo').value = gradoCompleto;
}

function resetFormMunicion() {
    isEditingMun = false;
    formTitleMun.innerText = "Ingresar Munición";
    btnSaveMun.innerText = "Guardar Munición";
    btnCancelMun.style.display = "none";
    formMun.reset();
}

function resetFormArmamento() {
    isEditingArm = false;
    formTitleArm.innerText = "Ingresar Armamento";
    btnSaveArm.innerText = "Guardar Armamento";
    btnCancelArm.style.display = "none";
    formArm.reset();
}

function resetFormGrado() {
    isEditingGra = false;
    formTitleGra.innerText = "Ingresar Grado";
    btnSaveGra.innerText = "Guardar Grado";
    btnCancelGra.style.display = "none";
    formGra.reset();
}

// DELETE unificado
async function deleteItem(id, targetType) {
    if (!confirm(`¿Está seguro de eliminar este registro en la sección ${targetType}?`)) return;
    const payload = { action: "delete", id: id, target: targetType };
    sendData(payload, () => {});
}