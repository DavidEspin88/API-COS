// ============================================================
// LOGICA DE AUTENTICACIÓN (LOGIN ROBUSTO - VERSIÓN CORREGIDA)
// ============================================================
function inicializarMóduloAutenticacionFAE() {
  const formAuth = document.getElementById("form-auth-login");
  const btnToggle = document.getElementById("btn-toggle-pass");
  const inputPass = document.getElementById("auth-password");
  const iconEye = document.getElementById("icon-pass-eye");

  if (!formAuth) return;

  // Funcionalidad para mostrar/ocultar contraseña con el ojo
  if (btnToggle && inputPass && iconEye) {
    btnToggle.addEventListener("click", () => {
      const esPass = inputPass.type === "password";
      inputPass.type = esPass ? "text" : "password";
      iconEye.className = esPass
        ? "fa-regular fa-eye-slash"
        : "fa-regular fa-eye";
    });
  }

  formAuth.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Captura limpia de los elementos en el momento del submit
    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");
    
    const errEmail = document.getElementById("err-email");
    const errPass = document.getElementById("err-password");
    const alertBox = document.getElementById("auth-alert");

    const btnSubmit = document.getElementById("btn-submit-auth");
    const btnText = document.getElementById("btn-text-auth");
    const btnSpinner = document.getElementById("btn-spinner-auth");

    // Resetear mensajes de error visuales previos
    if (errEmail) errEmail.textContent = "";
    if (errPass) errPass.textContent = "";
    if (alertBox) {
      alertBox.className = "auth-alert hidden";
      alertBox.textContent = "";
    }

    // Asegurar lectura fidedigna de los valores escritos
    const emailValue = emailInput ? emailInput.value.trim() : "";
    const passValue = passwordInput ? passwordInput.value : "";
    let hayErrores = false;

    if (!emailValue) {
      if (errEmail) errEmail.textContent = "❌ El correo electrónico institucional es obligatorio.";
      hayErrores = true;
    }
    if (!passValue) {
      if (errPass) errPass.textContent = "❌ La contraseña de acceso es obligatoria.";
      hayErrores = true;
    }

    if (hayErrores) return;

    // Activar estado visual de carga (Spinner)
    if (btnSubmit) {
      btnSubmit.disabled = true;
      if (btnText) btnText.textContent = "Verificando Credenciales...";
      if (btnSpinner) btnSpinner.classList.remove("hidden");
    }

    // Procesar autenticación local basándose en la memoria global cargada de la hoja
    setTimeout(() => {
      const listaUsuariosCache = window.listUsuariosGlobalMemoria || [];

      // Imprimir logs rápidos en la consola del navegador por si necesitas auditar qué se compara
      console.log("Intentando ingresar con:", emailValue);
      console.log("Usuarios en memoria local del navegador:", listaUsuariosCache);

      const usuarioEncontrado = listaUsuariosCache.find(
        (u) =>
          String(u.correo).trim().toLowerCase() === emailValue.toLowerCase() &&
          String(u.contrasena).trim() === String(passValue).trim()
      );

      if (!usuarioEncontrado) {
        if (alertBox) {
          alertBox.textContent = "❌ Acceso Denegado: El correo electrónico o la contraseña son incorrectos.";
          alertBox.className = "auth-alert error";
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          if (btnText) btnText.textContent = "Ingresar al Sistema";
          if (btnSpinner) btnSpinner.classList.add("hidden");
        }
        return;
      }

      // --- LOGIN EXITOSO ---
      cuentaUsuarioActivoSesion = usuarioEncontrado;
      
      // Control de Estado de Cuenta Estricto
      if (String(usuarioEncontrado.estado_cuenta).trim().toUpperCase() !== "ACTIVO") {
        if (alertBox) {
          alertBox.textContent = "❌ Acceso Denegado: Su cuenta militar se encuentra INACTIVA. Contacte al Administrador.";
          alertBox.className = "auth-alert error";
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          if (btnText) btnText.textContent = "Ingresar al Sistema";
          if (btnSpinner) btnSpinner.classList.add("hidden");
        }
        return;
      }

      if (alertBox) {
        alertBox.textContent = "✔ Autenticación autorizada. Ingresando al sistema...";
        alertBox.className = "auth-alert success";
      }

      // Aplicar Matriz de Permisos Operacionales en el DOM
      aplicarRestriccionesDePerfil(usuarioEncontrado.tipo_usuario);

      // Formatear firma del operador logueado (Tu lógica existente)
      const tokensNombres = usuarioEncontrado.apellidos_nombres.trim().split(/\s+/);
      let firmaLegibleTripulante = usuarioEncontrado.apellidos_nombres;
      if (tokensNombres.length >= 3) {
        firmaLegibleTripulante = `${tokensNombres[2]} ${tokensNombres[0]}`;
      }

      let gradoMilitarPrefijo = usuarioEncontrado.tipo_usuario;
      const textEscuadron = document.querySelector(".text-escuadron");
      if (textEscuadron) {
        const divOperador = document.getElementById("sidebar-operador-firma") || document.createElement("div");
        divOperador.id = "sidebar-operador-firma";
        divOperador.innerHTML = `<span style="font-size: 11px; color: #18bc9c; font-weight: 600; text-transform: uppercase;"><i class="fa-solid fa-user-shield"></i> ${gradoMilitarPrefijo}: ${firmaLegibleTripulante}</span>`;
        textEscuadron.parentNode.insertBefore(divOperador, textEscuadron.nextSibling);
      }

      // Transición e intercambio de pantallas para SPA
      setTimeout(() => {
        const authContainer = document.querySelector(".auth-container");
        if (authContainer) authContainer.style.display = "none";

        const wrapperMain = document.querySelector(".app-layout");
        if (wrapperMain) wrapperMain.style.display = "flex";
      }, 1200);
      
    }, 1200);
  });
}
function aplicarRestriccionesDePerfil(perfil) {
  const selectRolForm = document.getElementById("usr-tipo");
  
  // 1. Repoblar select con matriz de roles reducida
  if (selectRolForm) {
    selectRolForm.innerHTML = `
      <option value="">-- Seleccione un Rol de Acceso --</option>
      <option value="ADMINISTRADOR">ADMINISTRADOR</option>
      <option value="OPERADOR">OPERADOR</option>
    `;
  }

  // 2. Capturar elementos de navegación y contenidos de pestañas (SPA)
  const tabsNavegacion = document.querySelectorAll(".menu-tab");
  const contenidosPestañas = document.querySelectorAll(".tab-content");
  const rolLimpio = String(perfil).trim().toUpperCase();

  if (rolLimpio === "OPERADOR") {
    // --- RESTRICCIÓN ESTRICTA PARA EL ROL OPERADOR ---
    tabsNavegacion.forEach((tab) => {
      const moduloAsociado = tab.dataset.module;

      // Habilitar ÚNICAMENTE: registro_personal, salvoconductos y parte_diario
      if (
        moduloAsociado === "registro_personal" ||
        moduloAsociado === "salvoconductos" ||
        moduloAsociado === "parte_diario"
      ) {
        tab.style.display = "flex"; // Visible en barra lateral
      } else {
        tab.style.display = "none"; // Ocultar el resto de botones de inventarios/configuraciones
      }
    });

    // Ocultar TODAS las secciones primero (limpieza total del estado previo)
    contenidosPestañas.forEach((content) => {
      content.classList.remove("active");
      content.classList.add("hidden");
    });

    // Redirección forzada por seguridad al sub-módulo autorizado por defecto
    localStorage.setItem("lastMilitarModule", "parte_diario");
    
    // Quitar estados activos viejos de los botones y activar el de Parte Diario
    tabsNavegacion.forEach(t => t.classList.remove("active"));
    const tabParteDiario = document.querySelector('.menu-tab[data-module="parte_diario"]');
    const moduloParteDiario = document.getElementById("module-parte_diario");
    
    if (tabParteDiario && moduloParteDiario) {
      tabParteDiario.classList.add("active");
      moduloParteDiario.classList.remove("hidden");
      moduloParteDiario.classList.add("active");
      
      // Actualizar el encabezado de módulo del header general
      const titleHeader = document.getElementById("current-module-title");
      if (titleHeader) titleHeader.innerText = "Sección de Parte Diario";
    }

  } else {
    // --- ACCESO TOTAL PARA EL ROL ADMINISTRADOR ---
    tabsNavegacion.forEach((tab) => {
      tab.style.display = "flex";
    });
    // Determinar el módulo inicial: respetar el último visitado o ir a municion por defecto
    const ultimoModuloAdmin = localStorage.getItem("lastMilitarModule");
    const moduloInicialAdmin = (ultimoModuloAdmin && ultimoModuloAdmin !== "parte_diario")
      ? ultimoModuloAdmin
      : "municion";

    // Ocultar todas las secciones y mostrar solo la correcta
    contenidosPestañas.forEach((content) => {
      content.classList.remove("active");
      content.classList.add("hidden");
    });
    tabsNavegacion.forEach(t => t.classList.remove("active"));

    const targetContent = document.getElementById(`module-${moduloInicialAdmin}`);
    const targetTab = document.querySelector(`.menu-tab[data-module="${moduloInicialAdmin}"]`);
    if (targetContent && targetTab) {
      targetContent.classList.remove("hidden");
      targetContent.classList.add("active");
      targetTab.classList.add("active");
      localStorage.setItem("lastMilitarModule", moduloInicialAdmin);
      const titleHeader = document.getElementById("current-module-title");
      if (titleHeader) titleHeader.innerText = "Sección de " + targetTab.textContent.replace(/[^\w\s\/\.ñÑáéíóúÁÉÍÓÚ]/g, "").trim();
    }
  }
}
function toggleVisibilidadPassword() {
  const inputPass = document.getElementById("usr-password");
  if (inputPass) {
    const esPass = inputPass.type === "password";
    inputPass.type = esPass ? "text" : "password";
  }
}

// ============================================================
// MOTOR DE SIMULACIÓN DE RADAR MILITAR/ATC DE ALTA FIDELIDAD
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  inicializarRadarTacticoCanvas();
});

function inicializarRadarTacticoCanvas() {
  const canvas = document.getElementById("radarCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = width / 2 - 10;

  // Variables de control del Haz de exploración
  let sweepAngle = 0;
  const sweepSpeed = 0.012; // Velocidad angular constante (Rad por frame)

  // Configuración de Objetivos Aéreos (Contactos militares reales)
  // Coordenadas polares iniciales relativas al centro: r (distancia), theta (ángulo)
  const targets = [
    { id: "FAE-032", r: 120, theta: 0.5, speed: 0.15, heading: 240, alt: "FL180", spdKnots: "280KT", intensity: 0, trails: [] },
    { id: "AM-402",  r: 160, theta: 2.1, speed: -0.08, heading: 110, alt: "FL320", spdKnots: "420KT", intensity: 0, trails: [] },
    { id: "B-881",   r: 70,  theta: 4.3, speed: 0.22, heading: 15, alt: "FL095", spdKnots: "190KT", intensity: 0, trails: [] }
  ];

  // Bucle de renderizado a 60 FPS optimizado por hardware
  function drawRadarLoop() {
    // 1. Fondo base de la pantalla CRT con sutil luminiscencia residual
    ctx.fillStyle = "rgba(10, 15, 26, 1)";
    ctx.fillRect(0, 0, width, height);

    // 2. Ruido electrónico de fondo (Efecto estática analógica de tubo fosforescente)
    ctx.fillStyle = "rgba(0, 200, 150, 0.03)";
    for (let i = 0; i < 45; i++) {
      let nx = Math.random() * width;
      let ny = Math.random() * height;
      ctx.fillRect(nx, ny, 1.5, 1.5);
    }

    // 3. Dibujo de Círculos de Alcance y Cuadrícula (Mapeo estático nítido)
    ctx.strokeStyle = "rgba(0, 200, 150, 0.15)";
    ctx.lineWidth = 1;
    
    // Anillos concéntricos de distancia (50NM, 100NM, 150NM)
    for (let r = maxRadius / 3; r <= maxRadius; r += maxRadius / 3) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Líneas de rumbo cardinales y ticks de marcación angular
    ctx.strokeStyle = "rgba(0, 200, 150, 0.08)";
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius);
      ctx.stroke();
    }

    // 4. Actualización matemática y dibujado de Estelas e Intensidades de Objetivos
    targets.forEach((t) => {
      // Mover los aviones lentamente simulando vectores de velocidad reales
      t.r += t.speed * 0.1;
      t.theta += 0.0005;

      // Calcular posición cartesiana actual del avión en la pantalla
      const tx = cx + Math.cos(t.theta) * t.r;
      const ty = cy + Math.sin(t.theta) * t.r;

      // Evaluar proximidad angular respecto al haz de exploración (Detección Primaria)
      let angleDiff = sweepAngle - t.theta;
      // Normalizar diferencia de ángulos entre 0 y 2*PI
      while (angleDiff < 0) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI * 2) angleDiff -= Math.PI * 2;

      // Si el haz pasa encima del contacto (umbral estrecho de escaneo), se ilumina al 100%
      if (angleDiff < 0.08) {
        if (t.intensity < 0.9) {
          t.intensity = 1.0; // Bloom instantáneo
          // Registrar posición actual en el historial de estela táctica
          t.trails.push({ x: tx, y: ty, alpha: 0.7 });
          if (t.trails.length > 4) t.trails.shift(); // Limitar largo de la cola histórica
        }
      } else {
        // Desvanecimiento progresivo y exponencial (Persistencia de fósforo TRC)
        t.intensity *= 0.993;
      }

      // Dibujar estela histórica (Trails de persistencia analógica)
      t.trails.forEach((trail, idx) => {
        trail.alpha *= 0.995; // Fading de estela
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 150, ${trail.alpha * t.intensity * 0.4})`;
        ctx.fill();
      });

      // Si el objetivo tiene brillo remanente, se renderiza en la grilla táctica
      if (t.intensity > 0.05) {
        ctx.save();
        ctx.shadowBlur = 10 * t.intensity;
        ctx.shadowColor = "rgba(0, 250, 180, 0.8)";

        // Blip Central (Objetivo primario)
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 170, ${t.intensity})`;
        ctx.fill();
        ctx.restore();

        // Vector de rumbo (Línea proyectada de trayectoria)
        const headingRad = (t.heading * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(headingRad) * 12, ty + Math.sin(headingRad) * 12);
        ctx.strokeStyle = `rgba(0, 200, 150, ${t.intensity * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Bloque de datos ATC (Etiqueta Profesional de Información de Vuelo)
        ctx.fillStyle = `rgba(0, 255, 150, ${t.intensity * 0.85})`;
        ctx.font = "bold 9px 'JetBrains Mono', Monaco, monospace";
        ctx.fillText(t.id, tx + 10, ty - 12); // Línea 1: Identificador
        ctx.font = "500 8px 'JetBrains Mono', monospace";
        ctx.fillText(`${t.alt} ${t.spdKnots}`, tx + 10, ty - 3); // Línea 2: Altitud y Velocidad
        ctx.fillText(`HDG ${String(t.heading).padStart(3, "0")}°`, tx + 10, ty + 6); // Línea 3: Rumbo
      }
    });

    // 5. Haz de Exploración Continuo (Efecto Barrido Degradado)
    ctx.save();
    // Dibujar el haz principal (Rayo vector de alta intensidad)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * maxRadius, cy + Math.sin(sweepAngle) * maxRadius);
    ctx.strokeStyle = "rgba(0, 255, 180, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dibujar cuña de desvanecimiento tras el haz (Gradiente angular de barrido)
    const segments = 40;
    for (let i = 0; i < segments; i++) {
      let alpha = (1 - i / segments) * 0.13;
      let angle = sweepAngle - (i * 0.005);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius);
      ctx.strokeStyle = `rgba(0, 200, 150, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();

    // Avanzar ángulo de exploración para el siguiente frame
    sweepAngle += sweepSpeed;
    if (sweepAngle > Math.PI * 2) sweepAngle -= Math.PI * 2;

    requestAnimationFrame(drawRadarLoop);
  }

  // Lanzar ciclo continuo coordinado por la GPU del sistema
  requestAnimationFrame(drawRadarLoop);
}