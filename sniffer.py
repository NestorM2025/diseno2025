import socket
import threading
import json
from flask import Flask, jsonify
from flask_cors import CORS   # Para habilitar CORS

# Lista para guardar los datos recibidos
data_store = []

# Configuración de Flask
app = Flask(__name__)
CORS(app)  # Habilita CORS en todas las rutas

@app.route('/data.json')
def get_data():
    """Devuelve todos los datos recibidos en formato JSON"""
    return jsonify(data_store)

def udp_listener(host="0.0.0.0", port=5000):
    """Escucha paquetes UDP y los guarda en data_store"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((host, port))
    print(f"✅ Escuchando UDP en {host}:{port}...")

    while True:
        data, addr = sock.recvfrom(1024)
        try:
            msg = json.loads(data.decode('utf-8'))
            print(f"📩 Recibido de {addr}: {msg}")
            data_store.append(msg)
            # Si quieres limitar a los últimos N datos:
            if len(data_store) > 100:
                data_store.pop(0)
        except Exception as e:
            print(f"⚠️ Error procesando paquete: {e}")

def start_flask():
    """Inicia la API Flask"""
    print("🌐 API Flask corriendo en http://0.0.0.0:8080/data.json")
    app.run(host="0.0.0.0", port=8080, debug=False)

if __name__ == "__main__":
    # Hilo para escuchar UDP
    udp_thread = threading.Thread(target=udp_listener, daemon=True)
    udp_thread.start()

    # Inicia Flask en el hilo principal
    start_flask()
