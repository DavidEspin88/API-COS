// REEMPLAZA ESTA URL CON TU URL DE GOOGLE APPS SCRIPT ACTUALIZADA (TERMINADA EN /exec)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxOFjWcL-NIb4HsshGL6fIdwZi9AeAX7p4xhKdP56H5Z3KcfO8m9CD3q7xGZIzRp_aTbw/exec";

// selectores de elementos del DOM
const crudForm = document.getElementById('crud-form');
const tableBody = document.getElementById('table-body');
const loadingText = document.getElementById('loading-text');
const btnCancel = document.getElementById('btn-cancel');
const formTitle = document.getElementById('form-title');
const btnSave = document.getElementById('btn-save');

let isEditing = false;

// Cargar datos automáticamente al abrir o refrescar la página
document.addEventListener('DOMContentLoaded', loadData);

// Función para obtener (READ) los registros de Google Sheets
async function loadData() {
    loadingText.style.display = "block";
    tableBody.innerHTML = "";
    try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.calibre}</td>
                <td>${item.cantidad}</td>
                <td>${item.lote}</td>
                <td class="actions-btns">
                    <button class="btn-edit" onclick="setupEdit('${item.id}', '${item.calibre}', ${item.cantidad}, '${item.lote}')">Editar</button>
                    <button class="btn-delete" onclick="deleteItem('${item.id}')">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando datos:", error);
        alert("No se pudieron cargar los datos desde la Base de Datos.");
    } finally {
        loadingText.style.display = "none";
    }
}

// Escuchador del evento Submit (CREATE o UPDATE)
crudForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('item-id').value;
    const calibre = document.getElementById('calibre').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const lote = document.getElementById('lote').value;

    const payload = {
        action: isEditing ? "update" : "create",
        id: id,
        calibre: calibre,
        cantidad: cantidad,
        lote: lote
    };

    loadingText.style.display = "block";

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Manejo seguro de políticas CORS de Google Apps Script
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        // Espera de 1.5s para asegurar la actualización en Sheets antes de recargar
        setTimeout(() => {
            resetForm();
            loadData();
        }, 1500);

    } catch (error) {
        console.error("Error al procesar el envío:", error);
        alert("Ocurrió un error al procesar la solicitud.");
        loadingText.style.display = "none";
    }
});

// Cambia el estado del formulario para edición de un registro existente
function setupEdit(id, calibre, cantidad, lote) {
    isEditing = true;
    formTitle.innerText = "Modificar Munición";
    btnSave.innerText = "Actualizar";
    btnCancel.style.display = "block";
    
    document.getElementById('item-id').value = id;
    document.getElementById('calibre').value = calibre;
    document.getElementById('cantidad').value = cantidad;
    document.getElementById('lote').value = lote;
}

// Escuchador para cancelar edición
btnCancel.addEventListener('click', resetForm);

// Restablece el formulario a su estado original
function resetForm() {
    isEditing = false;
    formTitle.innerText = "Ingresar Munición";
    btnSave.innerText = "Guardar";
    btnCancel.style.display = "none";
    crudForm.reset();
    document.getElementById('item-id').value = "";
}

// Función para remover (DELETE) un registro por ID
async function deleteItem(id) {
    if (!confirm("¿Está seguro de eliminar este registro de munición?")) return;
    
    loadingText.style.display = "block";
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "delete", id: id })
        });
        
        setTimeout(loadData, 1500);
    } catch (error) {
        console.error("Error al eliminar:", error);
        loadingText.style.display = "none";
    }
}