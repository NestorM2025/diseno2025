// Inicializar mapa
const map = L.map("map").setView([4.61, -74.08], 12); // Bogotá por defecto

// Cargar tiles de OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let marker = null;

// Función para obtener y actualizar datos
async function fetchData() {
  try {
    const response = await fetch("data.php");
    const data = await response.json();

    if (data.length > 0) {
      const last = data[data.length - 1];

      // Mostrar datos en el recuadro
      document.getElementById("info").innerHTML = `
        <b>Fecha/Hora:</b> ${last.timestamp}<br>
        <b>Lat:</b> ${last.lat}<br>
        <b>Lon:</b> ${last.lng}
      `;

      // Colocar o mover marcador en el mapa
      if (marker) {
        marker.setLatLng([last.lat, last.lng]);
      } else {
        marker = L.marker([last.lat, last.lng]).addTo(map);
      }

      // Centrar el mapa en la nueva posición respetando el zoom actual del usuario
      const currentZoom = map.getZoom();
      map.setView([last.lat, last.lng], currentZoom);
    }
  } catch (err) {
    console.error("❌ Error cargando datos:", err);
    
    // Mostrar mensaje de error en la interfaz
    document.getElementById("info").innerHTML = `
      <b style="color: red;">Error:</b> No se pudieron cargar los datos.<br>
      <small>Revisa la conexión o el archivo data.php</small>
    `;
  }
}

// Función para ajustar el mapa cuando cambia el tamaño de ventana
function handleResize() {
  // Invalidar el tamaño del mapa para que se redibuje correctamente
  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

// Event listeners
window.addEventListener('resize', handleResize);

// Actualizar cada 5 segundos
setInterval(fetchData, 5000);

// Cargar datos iniciales
fetchData();