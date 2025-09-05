import socket
import threading
import json
from flask import Flask, jsonify

# Configuración UDP
UDP_IP = "0.0.0.0"   # Escucha en todas las interfaces
UDP_PORT = 5000      # Puerto UDP donde llegan los datos

# Almacenamiento de datos
data_points = []

# Función que escucha paquetes UDP
def udp_listener():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))
    print(f"✅ Escuchando UDP en puerto {UDP_PORT}...")
    while True:
        msg, addr = sock.recvfrom(1024)  # Máximo 1024 bytes por paquete
        try:
            decoded = msg.decode("utf-8").strip()
            timestamp, lat, lon = decoded.split(",")
            point = {
                "timestamp": timestamp,
                "lat": float(lat),
                "lng": float(lon)
            }
            data_points.append(point)
            print(f"📩 Recibido de {addr}: {point}")
        except Exception as e:
            print(f"⚠️ Error procesando paquete: {e}")

# API Flask
app = Flask(__name__)

@app.route("/data.json")
def get_data():
    return jsonify(data_points)

if __name__ == "__main__":
    # Iniciar hilo UDP
    t = threading.Thread(target=udp_listener, daemon=True)
    t.start()

    # Iniciar servidor web Flask en puerto 8080
    print("🌐 API Flask corriendo en http://0.0.0.0:8080/data.json")
    app.run(host="0.0.0.0", port=8080)
