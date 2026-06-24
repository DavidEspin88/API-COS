let salvoCachePersonal = [];
let salvoCacheCalibres = [];
let salvoCacheArmamentoReal = [];
let salvoCacheMunicionStock = [];
let salvoconductosEmitidosLista = [];

function poblarDesplegablesSalvoconducto(data) {
  salvoCachePersonal = data.personal || [];
  salvoCacheCalibres = data.armamento_calibre || [];
  salvoCacheArmamentoReal = data.armamento || [];
  salvoCacheMunicionStock = data.municion || [];
  salvoconductosEmitidosLista = data.control_salvoconductos || [];

  const selectTipo = document.getElementById("salvo-tipo-arma");
  const selectAprobador = document.getElementById("salvo-aprobador");
  const selectLugar = document.getElementById("salvo-lugar");

  if (!selectTipo) return;

  // 1. Población de Tipos de Armamento
  selectTipo.innerHTML = '<option value="">-- Seleccione Tipo --</option>';
  const tiposUnicos = [...new Set((data.armamento_calibre || []).map(a => a.tipo_armamento))];
  tiposUnicos.forEach(t => { if (t) selectTipo.innerHTML += `<option value="${t}">${t}</option>`; });

  // 2. Población de Lugares / Repartos desde la base de datos (REQUERIMIENTO 3)
  selectLugar.innerHTML = '<option value="">-- Seleccione Destino --</option>';
  (data.lugar || []).forEach(l => { if (l.lugar) selectLugar.innerHTML += `<option value="${l.lugar}">${l.lugar}</option>`; });

  // 3. Población de Autoridades Aprobadoras (Filtro por Rol)
  selectAprobador.innerHTML = '<option value="">-- Seleccione Autoridad Militar Facultada --</option>';
  (data.personal || []).forEach(p => {
    const cargoLimpio = String(p.funcion).trim().toUpperCase();
    if (cargoLimpio === 'COMANDANTE DE ESCUADRON VIGALGO "BUITRE"' || cargoLimpio === 'OFICIAL DE SEMANA') {
      selectAprobador.innerHTML += `<option value="${p.grado} ${p.apellidos_nombres}">${p.grado} ${p.apellidos_nombres}</option>`;
    }
  });

  // Calcular las existencias y dibujar paneles
  calcularYRenderizarExistenciasDisponibles();
  renderizarTablaSalvoconductos();
}

// === REQUERIMIENTO 2: CÁLCULO ARITMÉTICO DINÁMICO DE EXISTENCIAS EN TIEMPO REAL ===
function calcularYRenderizarExistenciasDisponibles() {
  const tbodyArmas = document.getElementById("table-body-resumen-armas");
  const tbodyMun = document.getElementById("table-body-resumen-municion");
  if (!tbodyArmas || !tbodyMun) return;

  tbodyArmas.innerHTML = "";
  tbodyMun.innerHTML = "";

  // A. Consolidación y conteo de Armamento
  let resumenArmas = {};
  salvoCacheArmamentoReal.forEach(a => {
    const tipo = String(a.tipo).trim().toUpperCase();
    if (!resumenArmas[tipo]) resumenArmas[tipo] = { total: 0, asignados: 0 };
    resumenArmas[tipo].total += parseInt(a.cantidad_armamento) || 0;
  });

  // B. Consolidación y conteo de Munición
  let resumenMun = {};
  salvoCacheMunicionStock.forEach(m => {
    const calibre = String(m.calibre).trim().toUpperCase();
    if (!resumenMun[calibre]) resumenMun[calibre] = { total: 0, entregado: 0 };
    resumenMun[calibre].total += parseInt(m.cantidad) || 0;
  });

  // C. Cruzar contra Salvoconductos activos ("ENTREGA")
  salvoconductosEmitidosLista.forEach(s => {
    if (s.estado === "ENTREGA") {
      const tipoArma = String(s.tipo_arma).trim().toUpperCase();
      const calibre = String(s.calibre).trim().toUpperCase();
      const cantMun = parseInt(s.cantidad_municion) || 0;

      if (resumenArmas[tipoArma]) resumenArmas[tipoArma].asignados += 1; // 1 Fusil/Arma por documento físico de serie
      if (resumenMun[calibre]) resumenMun[calibre].entregado += cantMun;
    }
  });

  // D. Dibujar Tabla Resumen Armas
  Object.keys(resumenArmas).forEach(tipo => {
    const total = resumenArmas[tipo].total;
    const asignados = resumenArmas[tipo].asignados;
    const disponible = total - asignados;
    tbodyArmas.innerHTML += `<tr><td><strong>${tipo}</strong></td><td>${total}</td><td>${asignados}</td><td style="font-weight:bold; color:${disponible > 0 ? '#18bc9c':'#e74c3c'}">${disponible}</td></tr>`;
  });

  // E. Dibujar Tabla Resumen Munición
  Object.keys(resumenMun).forEach(calibre => {
    const total = resumenMun[calibre].total;
    const entregado = resumenMun[calibre].entregado;
    const disponible = total - entregado;
    tbodyMun.innerHTML += `<tr><td><strong>${calibre}</strong></td><td>${total}</td><td>${entregado}</td><td style="font-weight:bold; color:${disponible > 0 ? '#2980b9':'#e74c3c'}">${disponible}</td></tr>`;
  });
}

function filtrarSeriesPorTipo(tipoArma) {
  const selectSerie = document.getElementById("salvo-serie");
  document.getElementById("salvo-marca").value = "";
  document.getElementById("salvo-calibre").value = "";
  if (!selectSerie) return;
  selectSerie.innerHTML = '<option value="">-- Seleccione Serie --</option>';

  const armasFiltradas = salvoCacheArmamentoReal.filter(a => String(a.tipo).trim().toUpperCase() === String(tipoArma).toUpperCase());
  armasFiltradas.forEach(arma => {
    const estaPrestada = salvoconductosEmitidosLista.some(s => 
      String(s.serie).trim().toUpperCase() === String(arma.serie).trim().toUpperCase() && s.estado === "ENTREGA"
    );
    if (!estaPrestada) selectSerie.innerHTML += `<option value="${arma.serie}">${arma.serie}</option>`;
  });
}

function vincularDetallesArma(serieSeleccionada) {
  const arma = salvoCacheArmamentoReal.find(a => String(a.serie).trim().toUpperCase() === String(serieSeleccionada).trim().toUpperCase());
  if (arma) {
    document.getElementById("salvo-marca").value = arma.marca || "SIN MARCA";
    const relacion = salvoCacheCalibres.find(ac => String(ac.tipo_armamento).trim().toUpperCase() === String(arma.tipo).trim().toUpperCase());
    document.getElementById("salvo-calibre").value = relacion ? relacion.calibre_reglamentario : "-";
  }
}

function buscarCedulaSalvoconducto(cedulaDigitada) {
  const inputInfo = document.getElementById("salvo-info-militar");
  if (!inputInfo) return;
  let cc = cedulaDigitada.trim();
  if (cc.length === 9) cc = "0" + cc;
  const tripulante = salvoCachePersonal.find(p => String(p.cedula).trim() === cc);
  if (tripulante) {
    inputInfo.value = `${tripulante.grado} ${tripulante.apellidos_nombres}`;
    inputInfo.style.border = "2px solid #1abc9c";
  } else { inputInfo.value = ""; inputInfo.style.border = "1px solid #ccc"; }
}

function renderizarTablaSalvoconductos() {
  const tbody = document.getElementById("table-body-salvoconductos-activos");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!salvoconductosEmitidosLista || salvoconductosEmitidosLista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#7f8c8d; padding:15px;">No hay salvoconductos registrados</td></tr>`;
    return;
  }

  salvoconductosEmitidosLista.forEach(s => {
    const tr = document.createElement("tr");
    const esActivo = s.estado === "ENTREGA";
    
    tr.innerHTML = `
      <td><small>${s.fecha}</small></td>
      <td>${s.cedula}</td>
      <td style="text-align:left;">${s.apellidos_nombres}</td>
      <td><strong>${s.tipo_arma}</strong> <br><small>${s.serie}</small></td>
      <td>${s.cantidad_municion} <br><small>${s.calibre}</small></td>
      <td><strong>${s.lugar}</strong></td> <td><small>${s.fecha_inicio} al ${s.fecha_fin}</small></td>
      <td><span class="badge-ord" style="background:${esActivo ? '#e67e22' : '#7f8c8d'}; font-size:11px;">${s.estado}</span></td>
      <td>
        ${esActivo ? `<button type="button" class="btn-submit" style="background:#27ae60; padding:4px 8px; font-size:11px;" onclick="registrarDevolucionAnticipada('${s.id}')">Devolución</button>` : `<span style="color:#27ae60; font-weight:bold;">✔ En Polvorín</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const formSalvoconducto = document.getElementById("form-salvoconducto");
  if (formSalvoconducto) {
    formSalvoconducto.addEventListener("submit", async (e) => {
      e.preventDefault();
      const infoMilitar = document.getElementById("salvo-info-militar").value;
      const calibre = document.getElementById("salvo-calibre").value;
      const cantMunSolicitada = parseInt(document.getElementById("salvo-cant-mun").value) || 0;

      if (!infoMilitar) { alert("❌ Error: Cédula no válida."); return; }

      // Validación estricta de stock antes del POST
      const loteMunicion = salvoCacheMunicionStock.find(m => String(m.calibre).trim().toUpperCase() === String(calibre).trim().toUpperCase());
      const stockDisponible = loteMunicion ? parseInt(loteMunicion.cantidad) : 0;
      if (cantMunSolicitada > stockDisponible) {
        alert(`❌ Abortado: Stock insuficiente en polvorín. Almacenado: ${stockDisponible}.`); return;
      }

      const payload = {
        target: "salvoconductos", action: "create",
        cedula: document.getElementById("salvo-cedula").value,
        apellidos_nombres: infoMilitar,
        tipo_arma: document.getElementById("salvo-tipo-arma").value,
        serie: document.getElementById("salvo-serie").value,
        marca: document.getElementById("salvo-marca").value,
        calibre: calibre,
        cantidad_municion: cantMunSolicitada,
        lugar: document.getElementById("salvo-lugar").value, // REQUERIMIENTO 3: Envío de Lugar
        fecha_inicio: document.getElementById("salvo-fecha-inicio").value,
        fecha_fin: document.getElementById("salvo-fecha-fin").value,
        aprobado_por: document.getElementById("salvo-aprobador").value
      };

      if (typeof sendData === "function") { sendData(payload, () => { formSalvoconducto.reset(); document.getElementById("salvo-info-militar").value = ""; }); }
    });
  }
});

async function registrarDevolucionAnticipada(idSalvoconducto) {
  if (confirm("¿Confirmar la entrega y reincorporación del material bélico al stock de la Unidad?")) {
    if (typeof sendData === "function") { sendData({ target: "salvoconductos", action: "update", id: idSalvoconducto }, () => {}); }
  }
}