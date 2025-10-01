from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
# Usamos HuggingFaceEmbeddings para convertir el texto en vectores (embeddings)
from langchain_community.embeddings import HuggingFaceEmbeddings 
from groq import Groq
import os, shutil
from dotenv import load_dotenv
import json # Necesario para parsear el error de Groq

# Cargar variables de entorno del archivo .env
load_dotenv()

# Inicializar cliente de Groq con la clave de entorno
clave_api = os.getenv("GROQ_API_KEY")
if not clave_api:
    # Si la clave falta, detenemos la app al inicio para evitar errores
    raise Exception("La variable de entorno GROQ_API_KEY no está configurada.")
cliente_groq = Groq(api_key=clave_api)

# Inicializar la aplicación FastAPI
app = FastAPI(title="Suriel Base Privada API")

# Configuración de CORS: permite solicitudes desde cualquier origen (*) para el desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Definición de directorios para la persistencia
RUTA_SUBIDA = "uploads"
RUTA_DB = "vector_db"

# Crear directorios si no existen
os.makedirs(RUTA_SUBIDA, exist_ok=True)
os.makedirs(RUTA_DB, exist_ok=True)

# Inicializar el modelo de embeddings
# Modelo: sentence-transformers/all-MiniLM-L6-v2, balance de velocidad y precisión
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Inicializar o cargar la base de datos vectorial ChromaDB
# persist_directory asegura que la base de conocimiento se mantenga guardada
almacen_vectorial = Chroma(
    persist_directory=RUTA_DB, 
    embedding_function=embeddings
)

# Modelo Pydantic para validar la solicitud de chat
class SolicitudChat(BaseModel):
    mensaje: str

# Función auxiliar para agregar el contenido de un PDF
def agregar_pdf_a_almacen(ruta_archivo: str):
    """
    Carga, divide y guarda el contenido de un PDF en el almacén vectorial Chroma.
    
    El POR QUÉ: Dividimos el texto para que el modelo de IA pueda recibir
    fragmentos pequeños y muy relevantes en lugar del PDF completo.
    """
    try:
        # 1. Cargar el documento PDF
        cargador = PyPDFLoader(ruta_archivo)
        documentos = cargador.load()
        
        # 2. Dividir el texto en fragmentos (chunks) más pequeños
        divisor_texto = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=100 # Superposición para mantener el contexto entre fragmentos
        )
        fragmentos = divisor_texto.split_documents(documentos)
        
        # 3. Almacenar los fragmentos en la base de datos vectorial
        almacen_vectorial.add_documents(fragmentos)
        almacen_vectorial.persist()
        
    except Exception as e:
        # Si algo falla en el procesamiento (por ej. PDF corrupto),
        # relanzamos el error para que FastAPI lo maneje.
        raise e

@app.post("/upload")
async def subir_pdf(archivo: UploadFile = File(...)):
    """
    Endpoint para subir un archivo PDF y agregarlo a la base de conocimiento (RAG).
    """
    if not archivo.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")
    
    ruta_archivo = os.path.join(RUTA_SUBIDA, archivo.filename)
    
    try:
        # 1. Guardar el archivo temporalmente en el sistema de archivos
        with open(ruta_archivo, "wb") as buffer:
            shutil.copyfileobj(archivo.file, buffer)

        # 2. Procesar y agregar a la base de datos vectorial
        agregar_pdf_a_almacen(ruta_archivo)
        
        # 3. Limpieza: Eliminar el archivo de la carpeta de subida después de procesar
        if os.path.exists(ruta_archivo):
                os.remove(ruta_archivo)
                
        return {"mensaje": f"PDF '{archivo.filename}' cargado y agregado al índice correctamente."}
    
    except Exception as e:
        print(f"Error al procesar el archivo: {e}")
        # Aseguramos la limpieza del archivo subido en caso de error
        if os.path.exists(ruta_archivo):
            os.remove(ruta_archivo)
        raise HTTPException(status_code=500, detail=f"Error interno al procesar el PDF: {e}")

@app.post("/chat")
async def chat(solicitud: SolicitudChat):
    """
    Endpoint para chatear. Usa la base de conocimiento para recuperar el contexto 
    y Groq para generar una respuesta grounded (basada en el contexto).
    """
    try:
        # 1. Búsqueda de contexto: Encuentra los 3 fragmentos más relevantes (RAG)
        # Esto reduce el universo de información que la IA tiene que considerar.
        resultados = almacen_vectorial.similarity_search(solicitud.mensaje, k=3)
        contexto = "\n\n".join([doc.page_content for doc in resultados])

        # 2. Construcción del prompt de sistema estricto
        # El POR QUÉ de la estrictez: forzamos al modelo a no "imaginar" o usar
        # conocimiento externo, garantizando respuestas solo de nuestros PDFs.
        prompt_sistema = f"""
            Eres Suriel, un asistente que responde SOLO con la información de la base de datos privada proporcionada a continuación. 
            Tu objetivo es ser conciso y útil.
            Si la respuesta NO está en el contexto, tu ÚNICA respuesta debe ser: "No tengo esa información".

            Contexto relevante de la base de datos:
            ---
            {contexto}
            ---

            Pregunta: {solicitud.mensaje}
            Respuesta:
        """

        # 3. Llamada a la API de Groq para la generación
        respuesta_groq = cliente_groq.chat.completions.create(
            # MODELO ACTUALIZADO: llama-3.1-8b-instant (reemplazo del anterior)
            model="llama-3.1-8b-instant", 
            messages=[
                # Solo pasamos el prompt de sistema para mantener el enfoque estricto (RAG)
                {"role": "system", "content": prompt_sistema},
            ]
        )
        
        respuesta = respuesta_groq.choices[0].message.content
        
        return {"respuesta": respuesta}
    
    except Exception as e:
        print(f"Error en el chat: {e}")
        
        # Manejo de errores específicos para Groq
        error_message = str(e)
        try:
                # Intentamos parsear el mensaje de error para dar un detalle más útil al usuario
                error_data = json.loads(error_message.split(" - ")[1].replace("'", "\""))
                error_message = error_data.get('error', {}).get('message', str(e))
        except:
                pass
                
        # Si el error es por modelo, damos un mensaje claro
        if "model_decommissioned" in str(e) or "invalid model" in str(e):
                error_message = "El modelo de IA fue descontinuado o es inválido. Por favor, verificá el nombre del modelo en el código."
        
        raise HTTPException(status_code=500, detail=f"Error al generar la respuesta de IA: {error_message}")