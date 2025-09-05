import socket
import json
import mysql.connector
import os
from dotenv import load_dotenv

# ==========================
# 1. Cargar variables de entorno
# ==========================
load_dotenv()  # Carga las variables desde el archivo .env

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_NAME")

try:
    db = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )
    cursor = db.cursor()
    print("✅ Conexión exitosa a la base de datos")
except Exception as e:
    print(f"❌ Error conectando a la base de datos: {e}")
    exit(1)

# ==========================
# 2. Configuración UDP
# ==========================
UDP_IP = "0.0.0.0"   # Escucha en todas las interfaces
UDP_PORT = 7000      # Puerto UDP

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

print(f"📡 Sniffer escuchando en {UDP_IP}:{UDP_PORT}...")

# ==========================
# 3. Bucle de recepción
# ==========================
while True:
    data, addr = sock.recvfrom(1024)  # Recibe datos
    mensaje = data.decode().strip()
    print(f"📩 Recibido: {mensaje} de {addr}")

    try:
        # Convertir JSON a diccionario
        data_json = json.loads(mensaje)

        # Extraer valores
        lat = float(data_json["Latitud"])
        lon = float(data_json["Longitud"])
        fecha = data_json["Fecha"]   # formato: YYYY-MM-DD
        hora = data_json["Hora"]     # formato: HH:MM:SS

        # Insertar en la base
        sql = "INSERT INTO locations2 (lat, lon, fecha, hora) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql, (lat, lon, fecha, hora))
        db.commit()

        print(f"✅ Guardado en DB -> lat:{lat}, lon:{lon}, fecha:{fecha}, hora:{hora}")

    except json.JSONDecodeError:
        print("❌ Error: No se pudo decodificar el JSON")
    except KeyError as e:
        print(f"❌ Error: Clave faltante en el JSON -> {e}")
    except Exception as e:
        print(f"❌ Error general: {e}")
