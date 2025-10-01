// URL base de la API de FastAPI
const URL_API = "http://127.0.0.1:8000";

// Elementos de la interfaz
const entradaPDF = document.getElementById("pdf-file");
const estadoCarga = document.getElementById("upload-status");
const entradaUsuario = document.getElementById("user-input");
const cajaChat = document.getElementById("chat-box");
const botonEnviar = document.querySelector(".input-container button");
const botonSubir = document.querySelector(".upload-section button");

/**
 * Muestra un mensaje de estado en la interfaz.
 * @param {string} mensaje - El texto a mostrar.
 * @param {('success'|'error'|'loading'|'')} tipo - El tipo de mensaje para aplicar estilos.
 */
function mostrarEstado(mensaje, tipo = '') {
    estadoCarga.textContent = mensaje;
    estadoCarga.className = `status-message status-${tipo}`;
}

/**
 * Deshabilita o habilita los elementos de entrada para evitar clics múltiples.
 * @param {boolean} deshabilitar - true para deshabilitar, false para habilitar.
 */
function gestionarInteraccion(deshabilitar) {
    entradaUsuario.disabled = deshabilitar;
    botonEnviar.disabled = deshabilitar;
    entradaPDF.disabled = deshabilitar;
    botonSubir.disabled = deshabilitar;
}

/**
 * Desplaza automáticamente la caja de chat al último mensaje.
 */
function desplazarChatAbajo() {
    cajaChat.scrollTop = cajaChat.scrollHeight;
}

/**
 * Sube el archivo PDF seleccionado al servidor y lo indexa.
 */
async function uploadPDF() {
    if (!entradaPDF.files.length) {
        return mostrarEstado("🚨 Por favor, seleccioná un archivo PDF primero.", 'error');
    }

    const archivo = entradaPDF.files[0];
    const formData = new FormData();
    formData.append("archivo", archivo); // El nombre debe coincidir con el backend 'archivo'

    mostrarEstado(`⏳ Procesando "${archivo.name}"... Esto puede tardar unos segundos.`, 'loading');
    gestionarInteraccion(true);

    try {
        const res = await fetch(`${URL_API}/upload`, { 
            method: "POST", 
            body: formData 
        });
        const datos = await res.json();

        if (res.ok) {
            mostrarEstado(`✅ ${datos.mensaje}`, 'success');
        } else {
            mostrarEstado(`❌ Error al subir: ${datos.detail || "Verificá el servidor."}`, 'error');
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        mostrarEstado("❌ No se pudo conectar con el servidor. ¿Está el backend corriendo?", 'error');
    } finally {
        gestionarInteraccion(false);
    }
}

/**
 * Envía el mensaje del usuario al servidor y muestra la respuesta de Suriel.
 */
async function sendMessage() {
    const mensaje = entradaUsuario.value.trim();
    if (!mensaje) return;

    // 1. Mostrar mensaje del usuario
    cajaChat.innerHTML += `<div class="message user"><strong>Tú:</strong> ${mensaje}</div>`;
    entradaUsuario.value = "";
    desplazarChatAbajo();

    // 2. Mostrar mensaje de carga de Suriel
    const idMensajeCarga = "loading-" + Date.now();
    cajaChat.innerHTML += `<div id="${idMensajeCarga}" class="message bot loading-message"><strong>Suriel:</strong> Escribiendo...</div>`;
    desplazarChatAbajo();
    gestionarInteraccion(true);

    try {
        const res = await fetch(`${URL_API}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensaje: mensaje })
        });
        
        const datos = await res.json();
        const elementoMensajeCarga = document.getElementById(idMensajeCarga);

        if (res.ok) {
            // 3. Reemplazar mensaje de carga con la respuesta final
            elementoMensajeCarga.className = 'message bot';
            elementoMensajeCarga.innerHTML = `<strong>Suriel:</strong> ${datos.respuesta}`;
        } else {
            // 3. Mostrar error de servidor
            elementoMensajeCarga.className = 'message bot status-error';
            elementoMensajeCarga.innerHTML = `<strong>Suriel (Error):</strong> Error interno (${datos.detail || "revisá la consola del backend"})`;
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        const elementoMensajeCarga = document.getElementById(idMensajeCarga);
        elementoMensajeCarga.className = 'message bot status-error';
        elementoMensajeCarga.innerHTML = `<strong>Suriel (Error):</strong> No se pudo conectar con el servidor.`;
    } finally {
        // 4. Habilitar interacción y desplazar
        gestionarInteraccion(false);
        desplazarChatAbajo();
    }
}