// URL base de nuestro servidor FastAPI
const URL_BASE_API = "http://127.0.0.1:8000";

/**
 * Muestra un mensaje temporal en la interfaz de chat (simulando un alert, pero sin usar alert()).
 * @param {string} mensaje - El texto a mostrar.
 * @param {boolean} esError - Indica si es un mensaje de error (rojo) o éxito (verde).
 */
function mostrarMensajeEstado(mensaje, esError = false) {
    const estadoElemento = document.getElementById("estado-subida");
    estadoElemento.textContent = mensaje;
    estadoElemento.style.color = esError ? '#dc2626' : '#10b981';
}

/**
 * Función para subir el archivo PDF al servidor e iniciar el proceso de indexación RAG.
 */
async function subirPDF() {
    const entradaArchivo = document.getElementById("archivo-pdf");
    const botonSubir = document.getElementById("btn-subir");

    if (!entradaArchivo.files.length) {
        return mostrarMensajeEstado("⚠️ Por favor, seleccioná un archivo PDF antes de subir.", true);
    }

    const archivo = entradaArchivo.files[0];
    const datosFormulario = new FormData();
    datosFormulario.append("file", archivo);

    mostrarMensajeEstado(`Subiendo e indexando '${archivo.name}'...`, false);
    botonSubir.disabled = true;

    try {
        const respuesta = await fetch(`${URL_BASE_API}/upload`, {
            method: "POST",
            body: datosFormulario,
        });
        
        const datos = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensajeEstado(`✅ ${datos.mensaje}`, false);
        } else {
            mostrarMensajeEstado(`❌ Error al subir: ${datos.detail || datos.error || "Error desconocido"}`, true);
        }
    } catch (error) {
        mostrarMensajeEstado(`❌ Error de conexión con el servidor: ${error.message}. ¿Está el backend iniciado?`, true);
    } finally {
        botonSubir.disabled = false;
    }
}

/**
 * Función para enviar el mensaje del usuario al servidor y recibir la respuesta de Suriel.
 */
async function enviarMensaje() {
    const entrada = document.getElementById("entrada-usuario");
    const cajaChat = document.getElementById("chat-box");
    const mensajeUsuario = entrada.value.trim();
    
    if (!mensajeUsuario) return;

    // 1. Mostrar mensaje del usuario
    cajaChat.innerHTML += `<div class="message user"><strong>Tú:</strong> ${mensajeUsuario}</div>`;
    entrada.value = "";
    
    // 2. Mostrar indicador de carga de Suriel
    const idCarga = "carga-suriel";
    cajaChat.innerHTML += `<div id="${idCarga}" class="message bot"><strong>Suriel:</strong> ⏳ Pensando...</div>`;
    cajaChat.scrollTop = cajaChat.scrollHeight;

    try {
        const respuesta = await fetch(`${URL_BASE_API}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensaje: mensajeUsuario })
        });
        
        const datos = await respuesta.json();
        
        // 3. Reemplazar indicador de carga por la respuesta
        const elementoCarga = document.getElementById(idCarga);
        if (elementoCarga) {
            elementoCarga.remove(); 
        }

        let respuestaFinal;
        if (respuesta.ok) {
            // Usamos 'respuesta' porque así lo nombramos en el backend (main.py)
            respuestaFinal = datos.respuesta || "Suriel no pudo generar una respuesta.";
        } else {
            // Manejo de errores del servidor FastAPI (ej: 500)
            respuestaFinal = `Error del servidor: ${datos.detail || "No se pudo conectar."}`;
        }

        cajaChat.innerHTML += `<div class="message bot"><strong>Suriel:</strong> ${respuestaFinal}</div>`;


    } catch (error) {
        console.error("Error de red al intentar chatear:", error);
        // Mostrar mensaje de error de conexión en el chat
        const elementoCarga = document.getElementById(idCarga);
        if (elementoCarga) {
            elementoCarga.remove(); 
        }
        cajaChat.innerHTML += `<div class="message bot"><strong>Suriel:</strong> ❌ Error de conexión. Asegurate de que el servidor (backend) esté corriendo.</div>`;

    } finally {
        // 4. Asegurar que el chat scrollee al final
        cajaChat.scrollTop = cajaChat.scrollHeight;
    }
}
