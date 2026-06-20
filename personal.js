// Selectores Exclusivos de Personal
const formPer = document.getElementById('form-personal');
const tableBodyPer = document.getElementById('table-body-personal');
const btnCancelPer = document.getElementById('btn-cancel-per');
const formTitlePer = document.getElementById('form-title-per');
const btnSavePer = document.getElementById('btn-save-per');

const selectGrado = document.getElementById('per-grado');
const selectEspecialidad = document.getElementById('per-especialidad');

let isEditingPer = false;

// 1. Población Dinámica de Menús Desplegables desde las variables del script principal
function poblarDesplegablesPersonal() {
    // Guardar selecciones actuales para no borrarlas si se está editando
    const currentGrado = selectGrado.value;
    const currentEsp = selectEspecialidad.value;

    // Limpiar desplegables manteniendo la opción por defecto
    selectGrado.innerHTML = '<option value="">-- Seleccione un Grado --</option>';
    selectEspecialidad.innerHTML = '<option value="">-- Seleccione Especialidad --</option>';

    // Cargar Grados (Obtenidos de la columna 'GRADO')
    if (window.gradosCargados) {
        window.gradosCargados.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.grado; // Toma el valor de la columna GRADO
            opt.textContent = `${item.grado} - (${item.grado_completo})`;
            selectGrado.appendChild(opt);
        });
    }

    // Cargar Especialidades (Obtenidos de la columna 'ESPECIALIDAD')
    if (window.especialidadesCargadas) {
        window.especialidadesCargadas.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.especialidad; // Toma el valor de la columna ESPECIALIDAD
            opt.textContent = item.especialidad;
            selectEspecialidad.appendChild(opt);
        });
    }

    // Restaurar selecciones
    selectGrado.value = currentGrado;
    selectEspecialidad.value = currentEsp;
}

// 2. Renderizar Tabla de Personal
function renderPersonalTable(personalData) {
    tableBodyPer.innerHTML = "";
    if (!personalData) return;

    personalData.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge-ord">${item.ord}</span></td>
            <td><strong>${item.cedula}</strong></td>
            <td>${item.grado}</td>
            <td>${item.especialidad}</td>
            <td>${item.ant}</td>
            <td>${item.apellidos_nombres}</td>
            <td>${item.fecha_nacimiento}</td>
            <td>${item.contacto}</td>
            <td>${item.nombre_contacto}</td>
            <td>
                <button class="btn-edit" onclick="setupEditPer('${item.cedula}', '${item.grado}', '${item.especialidad}', ${item.ant}, '${item.apellidos_nombres}', '${item.fecha_nacimiento}', '${item.contacto}', '${item.nombre_contacto}')">Editar</button>
                <button class="btn-delete" onclick="deletePersonal('${item.cedula}')">Eliminar</button>
            </td>
        `;
        tableBodyPer.appendChild(tr);
    });
}

// 3. Envío de Formulario (Create / Update)
formPer.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        target: "personal",
        action: isEditingPer ? "update" : "create",
        cedula: document.getElementById('per-cedula').value,
        grado: selectGrado.value,
        especialidad: selectEspecialidad.value,
        ant: parseInt(document.getElementById('per-ant').value),
        apellidos_nombres: document.getElementById('per-nombres').value.toUpperCase(), // Estandarización militar
        fecha_nacimiento: document.getElementById('per-fecha').value,
        contacto: document.getElementById('per-contacto').value,
        nombre_contacto: document.getElementById('per-nombre-contacto').value
    };

    // La función sendData global está definida en script.js
    if (typeof sendData === 'function') {
        sendData(payload, resetFormPersonal);
    }
});

// 4. Configurar Interfaz para Edición
function setupEditPer(cedula, grado, especialidad, ant, apellidosNombres, fechaNacimiento, contacto, nombreContacto) {
    isEditingPer = true;
    formTitlePer.innerText = "Modificar Datos de Personal";
    btnSavePer.innerText = "Actualizar Registro";
    btnCancelPer.style.style.display = "block";
    
    // Bloquear la Cédula (Clave Primaria No Modificable)
    const cedulaInput = document.getElementById('per-cedula');
    cedulaInput.value = cedula;
    cedulaInput.readOnly = true;
    cedulaInput.style.background = "#e0e0e0";

    // Asignación de campos sobrantes
    document.getElementById('per-ant').value = ant;
    selectGrado.value = grado;
    selectEspecialidad.value = especialidad;
    document.getElementById('per-nombres').value = apellidosNombres;
    document.getElementById('per-fecha').value = fechaNacimiento;
    document.getElementById('per-contacto').value = contacto;
    document.getElementById('per-nombre-contacto').value = nombreContacto;
}

// 5. Limpieza del Formulario
function resetFormPersonal() {
    isEditingPer = false;
    formTitlePer.innerText = "Registrar Nuevo Personal";
    btnSavePer.innerText = "Guardar Registro";
    btnCancelPer.style.display = "none";
    
    const cedulaInput = document.getElementById('per-cedula');
    cedulaInput.readOnly = false;
    cedulaInput.style.background = "#ffffff";
    
    formPer.reset();
}

// 6. Eliminar Personal (Usa la Cédula como ID)
async function deletePersonal(cedulaId) {
    if (!confirm(`¿Está seguro de eliminar de forma permanente al personal con Cédula: ${cedulaId}?`)) return;
    const payload = { action: "delete", id: cedulaId, target: "personal" };
    if (typeof sendData === 'function') {
        sendData(payload, () => {});
    }
}