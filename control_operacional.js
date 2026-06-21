// Variables de estado operacional en memoria caché local
let estadosDisponibles = [];
let mapaEstadosPersonal = {}; // { cedula: estado_nombre }

// Inserción en la carga masiva de script.js
// Agrega esto al final del try{} de loadAllData() en script.js:
// if(typeof inicializarControlOperacional === 'function') inicializarControlOperacional(data);

function inicializarControlOperacional(data) {
    estadosDisponibles = data.estado.map(e => e.estado);
    
    // Mapear los estados guardados en Sheets
    mapaEstadosPersonal = {};
    if (data.control_estado) {
        data.control_estado.forEach(c => {
            mapaEstadosPersonal[c.cedula] = c.id_estado; // Guarda la relación
        });
    }

    renderizarPanelOperacional(data.personal);
}

function renderizarPanelOperacional(personal) {
    const tbodyControl = document.getElementById("table-body-control-operacional");
    tbodyControl.innerHTML = "";

    // 1. Dibujar Filas de Control con Selectores de Estado Integrados
    personal.forEach(p => {
        const estadoActual = mapaEstadosPersonal[p.cedula] || estadosDisponibles[0] || "DISPONIBLE";
        if (!mapaEstadosPersonal[p.cedula] && estadosDisponibles[0]) {
            mapaEstadosPersonal[p.cedula] = estadosDisponibles[0]; // Asignación por defecto
        }

        const tr = document.createElement("tr");
        let optionsSelect = estadosDisponibles.map(est => `<option value="${est}" ${est === estadoActual ? 'selected' : ''}>${est}</option>`).join('');

        tr.innerHTML = `
            <td><strong>${p.grado}</strong></td>
            <td>${p.apellidos_nombres}</td>
            <td>${p.cedula}</td>
            <td>${p.funcion || '-'}</td>
            <td>
                <select class="select-table-embed" data-cedula="${p.cedula}" onchange="cambiarEstadoMemoria('${p.cedula}', this.value)">
                    ${optionsSelect}
                </select>
            </td>
        `;
        tbodyControl.appendChild(tr);
    });

    calcularYRenderizarMatrices(personal);
}

function cambiarEstadoMemoria(cedula, nuevoEstado) {
    mapaEstadosPersonal[cedula] = nuevoEstado;
    // Recalcular matrices e indicadores en tiempo real de forma reactiva sin tocar la base de datos
    if (window.datosPersonalGlobal) {
        calcularYRenderizarMatrices(window.datosPersonalGlobal);
    }
}

function calcularYRenderizarMatrices(personal) {
    const totalPersonal = personal.length;
    
    // Inicializar contadores
    let conteoEstados = {};
    estadosDisponibles.forEach(e => conteoEstados[e] = 0);
    
    let conteoCruzado = {}; // { GRADO: { ESTADO: conteo } }

    personal.forEach(p => {
        const est = mapaEstadosPersonal[p.cedula] || estadosDisponibles[0];
        if (conteoEstados[est] !== undefined) conteoEstados[est]++;
        
        if (!conteoCruzado[p.grado]) {
            conteoCruzado[p.grado] = {};
            estadosDisponibles.forEach(e => conteoCruzado[p.grado][e] = 0);
        }
        if (conteoCruzado[p.grado][est] !== undefined) conteoCruzado[p.grado][est]++;
    });



    // 3. Renderizar Matriz Resumen Simple
    const tbodyResumen = document.getElementById("table-body-matriz-resumen");
    tbodyResumen.innerHTML = "";
    let sumaEstadosVerificacion = 0;

    estadosDisponibles.forEach(est => {
        sumaEstadosVerificacion += conteoEstados[est];
        tbodyResumen.innerHTML += `<tr><td><strong>${est}</strong></td><td>${conteoEstados[est]}</td></tr>`;
    });
    tbodyResumen.innerHTML += `<tr style="background:#e2e8f0; font-weight:bold;"><td>TOTAL PERSONAL</td><td>${sumaEstadosVerificacion}</td></tr>`;

    // 4. Renderizar Matriz de Distribución por Grado (Matriz Cruzada)
    const theadCruzado = document.getElementById("thead-matriz-cruzada");
    const tbodyCruzado = document.getElementById("table-body-matriz-cruzada");
    
    theadCruzado.innerHTML = `<tr><th>Grado</th>${estadosDisponibles.map(e => `<th>${e}</th>`).join('')}<th>Total</th></tr>`;
    tbodyCruzado.innerHTML = "";

    Object.keys(conteoCruzado).forEach(grado => {
        let totalFilaGrado = 0;
        let celdasResultantes = estadosDisponibles.map(est => {
            const val = conteoCruzado[grado][est];
            totalFilaGrado += val;
            return `<td>${val}</td>`;
        }).join('');

        tbodyCruzado.innerHTML += `<tr><td><strong>${grado}</strong></td>${celdasResultantes}<td style="font-weight:bold; background:#f1f5f9;">${totalFilaGrado}</td></tr>`;
    });

    // 5. Validaciones de Integridad Matemática en el Frontend
    const badge = document.getElementById("validation-status-badge");
    if (sumaEstadosVerificacion === totalPersonal) {
        badge.className = "validation-badge success";
        badge.textContent = `✔ Cuadrado Exitoso: ${sumaEstadosVerificacion} / ${totalPersonal}`;
        document.getElementById("btn-guardar-control-operacional").disabled = false;
    } else {
        badge.className = "validation-badge danger";
        badge.textContent = `⚠ Inconsistencia detectada: ${sumaEstadosVerificacion} de ${totalPersonal}`;
        document.getElementById("btn-guardar-control-operacional").disabled = true;
        console.error("Inconsistencia Operacional: La suma de estados no coincide con el total de personal.");
    }
}

// 6. Persistencia Masiva Eficiente
async function guardarControlOperacional() {
    let registrosPayload = [];
    Object.keys(mapaEstadosPersonal).forEach(cedula => {
        registrosPayload.push({ cedula: cedula, id_estado: mapaEstadosPersonal[cedula] });
    });

    const payload = {
        target: "control_operacional",
        action: "save_matrix",
        registros: registrosPayload
    };

    // sendData reutiliza el cargador de script.js
    if (typeof sendData === "function") {
        sendData(payload, () => { alert("Matrices Operacionales actualizadas con éxito en Google Sheets."); });
    }
}