📚 Manual de Inicio y Uso: Suriel - Asistente Personal Inteligente (v1.4)

Este documento contiene las instrucciones necesarias para poner en marcha y utilizar la aplicación de asistente de chat de Base de Conocimiento Privada, apodado "Suriel".

1\. Requisitos Previos

Antes de comenzar, asegurate de tener instalados los siguientes programas en tu sistema:

Python 3.10 o superior: Necesario para ejecutar el servidor backend.

Pip (Administrador de paquetes de Python): Generalmente viene incluido con Python.

Clave de API de Groq: Necesaria para que el asistente de IA pueda funcionar. Podés obtenerla en el sitio web de Groq.

2\. Configuración del Backend

El backend está escrito en Python usando FastAPI.

2.1. Clave de API

Abrí el archivo backend/.env.

Reemplazá el texto TU\_CLAVE\_AQUI con tu clave de API real de Groq:

GROQ\_API\_KEY="TU\_CLAVE\_AQUI"





2.2. Instalación de Dependencias

Abrí tu terminal o consola.

Navegá hasta la carpeta del proyecto:

cd Asistente-Personal-Inteligente.1.4/backend





Instalá todas las librerías necesarias utilizando el archivo requirements.txt:

pip install -r requirements.txt





2.3. Ejecución del Servidor

Asegurándote de seguir dentro de la carpeta backend, ejecutá el servidor con el siguiente comando:

uvicorn main:app --reload





El servidor estará corriendo en http://127.0.0.1:8000. Dejá esta terminal abierta mientras uses la aplicación.

3\. Uso de la Aplicación (Frontend)

El frontend es una simple página web que se conecta al servidor de Python.

3.1. Acceso a la Interfaz

Navegá hasta la carpeta Asistente-Personal-Inteligente.1.4/frontend.

Hacé doble clic en el archivo index.html. Se abrirá automáticamente en tu navegador web.

3.2. Carga de Documentos (Base de Conocimiento)

Hacé clic en "Seleccionar archivo" y elegí uno o varios archivos PDF que contengan la información que querés consultar.

Hacé clic en el botón "Subir PDF".

La aplicación procesará el PDF (lo dividirá en fragmentos y lo guardará en la base de datos vectorial vector\_db/).

Una vez finalizado, verás un mensaje de estado indicando el éxito o si ocurrió algún error.

Importante: La información cargada en la carpeta backend/vector\_db/ es persistente. Esto significa que si reiniciás el servidor, la información ya cargada no se perderá.

3.3. Interacción con Suriel

Escribí tu pregunta en el campo de texto.

Hacé clic en "Enviar".

Suriel buscará en los documentos que subiste el contexto más relevante y formulará su respuesta únicamente con esa información.

Si la respuesta no se encuentra en la base de datos, Suriel responderá con el mensaje: "No tengo esa información".

4\. Notas Técnicas

Modelo de Lenguaje: Se utiliza llama3-8b-8192 a través de la API de Groq.

Base Vectorial: Se utiliza ChromaDB para almacenar los embeddings.

Embeddings: Se usa el modelo sentence-transformers/all-MiniLM-L6-v2 para la conversión de texto a vectores.



