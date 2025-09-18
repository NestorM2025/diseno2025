// Inicializar mapa
const map = L.map("map").setView([4.61, -74.08], 12); // Bogotá por defecto

// Cargar tiles de OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let marker = null;
let polyline = null;
let routePoints = []; // Array para almacenar solo los puntos nuevos desde que se cargó la página
let lastProcessedTimestamp = null; // Para controlar qué puntos ya procesamos

// Función para obtener y actualizar datos
async function fetchData() {
  try {
    const response = await fetch("data.php");
    const data = await response.json();

    if (data.length > 0) {
      const last = data[data.length - 1];

      // Mostrar datos en el recuadro en una sola línea
      document.getElementById("info").innerHTML = `
        <b>Fecha/Hora:</b> ${last.timestamp} | <b>Lat:</b> ${last.lat} | <b>Lon:</b> ${last.lng}
      `;

      // Solo añadir punto nuevo si es diferente al último procesado
      if (lastProcessedTimestamp !== last.timestamp) {
        const newPoint = [parseFloat(last.lat), parseFloat(last.lng)];
        routePoints.push(newPoint);
        lastProcessedTimestamp = last.timestamp;
      }

      // Colocar o mover marcador en el mapa
      if (marker) {
        marker.setLatLng([last.lat, last.lng]);
      } else {
        marker = L.marker([last.lat, last.lng]).addTo(map);
      }

      // Crear o actualizar polyline solo con los puntos nuevos acumulados
      if (routePoints.length > 1) {
        if (polyline) {
          polyline.setLatLngs(routePoints);
        } else {
          polyline = L.polyline(routePoints, {
            color: 'red',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1
          }).addTo(map);
        }
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

// Llamar a data.php para traer también el nombre de la página
fetch('data.php')
  .then(res => res.json())
  .then(data => {
    if (data.pageName) {
      document.title = data.pageName;
      document.getElementById('page-header').textContent = data.pageName;
    }
  })
  .catch(err => console.error(err));
