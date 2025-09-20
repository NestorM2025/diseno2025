// Inicializar mapa
const map = L.map("map").setView([4.61, -74.08], 12); // Bogotá por defecto

// Cargar tiles de OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let polyline = null;
let markers = [];
let pageNameSet = false;

// Función para limpiar el mapa
function limpiarMapa() {
  if (polyline) {
    map.removeLayer(polyline);
    polyline = null;
  }
  
  markers.forEach(marker => {
    map.removeLayer(marker);
  });
  markers = [];
  
  document.getElementById("info").innerHTML = `
    <b>Mapa limpiado. Selecciona un nuevo rango de fechas para consultar.</b>
  `;
}

// Función para consultar recorrido histórico
async function consultarRecorrido() {
  const fechaInicio = document.getElementById('fecha-inicio').value;
  const fechaFin = document.getElementById('fecha-fin').value;
  
  if (!fechaInicio || !fechaFin) {
    alert('Por favor selecciona tanto la fecha de inicio como la fecha de fin.');
    return;
  }
  
  if (new Date(fechaInicio) >= new Date(fechaFin)) {
    alert('La fecha de inicio debe ser anterior a la fecha de fin.');
    return;
  }
  
  // Deshabilitar botón mientras se carga
  const btnConsultar = document.getElementById('btn-consultar');
  btnConsultar.disabled = true;
  btnConsultar.textContent = 'Cargando...';
  
  document.getElementById("info").innerHTML = `
    <b>Consultando datos desde ${fechaInicio} hasta ${fechaFin}...</b>
  `;
  
  try {
    // Construir URL con parámetros de fecha
    const url = `data.php?fecha_inicio=${encodeURIComponent(fechaInicio)}&fecha_fin=${encodeURIComponent(fechaFin)}&historico=1`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Establecer el nombre de la página si viene en los datos
    if (!pageNameSet && data.pageName) {
      document.title = `${data.pageName} - Histórico`;
      pageNameSet = true;
    }
    
    // Procesar datos de ubicación
    let locationData = [];
    if (Array.isArray(data)) {
      locationData = data;
    } else if (data.locations && Array.isArray(data.locations)) {
      locationData = data.locations;
    }
    
    if (locationData.length > 0) {
      // Limpiar mapa anterior
      limpiarMapa();
      
      // Crear array de puntos para la polyline
      const routePoints = locationData.map(point => [parseFloat(point.lat), parseFloat(point.lng)]);
      
      // Crear polyline con todo el recorrido histórico
      polyline = L.polyline(routePoints, {
        color: 'blue',
        weight: 3,
        opacity: 0.7,
        smoothFactor: 1
      }).addTo(map);
      
      // Añadir marcador de inicio (verde)
      const startPoint = locationData[0];
      const startMarker = L.marker([startPoint.lat, startPoint.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(map);
      
      startMarker.bindPopup(`<b>Inicio:</b><br>${startPoint.timestamp}`);
      markers.push(startMarker);
      
      // Añadir marcador de fin (rojo)
      const endPoint = locationData[locationData.length - 1];
      const endMarker = L.marker([endPoint.lat, endPoint.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(map);
      
      endMarker.bindPopup(`<b>Fin:</b><br>${endPoint.timestamp}`);
      markers.push(endMarker);
      
      // Ajustar vista del mapa para mostrar todo el recorrido
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
      
      // Mostrar información del recorrido
      document.getElementById("info").innerHTML = `
        <b>Recorrido histórico:</b> ${locationData.length} puntos | 
        <b>Inicio:</b> ${startPoint.timestamp} | 
        <b>Fin:</b> ${endPoint.timestamp}
      `;
      
    } else {
      document.getElementById("info").innerHTML = `
        <b>No se encontraron datos para el período seleccionado.</b>
      `;
    }
    
  } catch (err) {
    console.error("❌ Error consultando datos históricos:", err);
    document.getElementById("info").innerHTML = `
      <b style="color: red;">Error:</b> No se pudieron cargar los datos históricos.<br>
      <small>Revisa la conexión o el archivo data.php</small>
    `;
  } finally {
    // Rehabilitar botón
    btnConsultar.disabled = false;
    btnConsultar.textContent = 'Consultar Recorrido';
  }
}

// Función para ajustar el mapa cuando cambia el tamaño de ventana
function handleResize() {
  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

// Función para establecer fecha por defecto (últimas 24 horas)
function establecerFechasPorDefecto() {
  const ahora = new Date();
  const hace24h = new Date(ahora.getTime() - (24 * 60 * 60 * 1000));
  
  // Formatear fechas para datetime-local
  const formatoFecha = (fecha) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  document.getElementById('fecha-inicio').value = formatoFecha(hace24h);
  document.getElementById('fecha-fin').value = formatoFecha(ahora);
}

// Event listeners
document.getElementById('btn-consultar').addEventListener('click', consultarRecorrido);
document.getElementById('btn-limpiar').addEventListener('click', limpiarMapa);
window.addEventListener('resize', handleResize);

// Permitir consulta con Enter en los campos de fecha
document.getElementById('fecha-inicio').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') consultarRecorrido();
});

document.getElementById('fecha-fin').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') consultarRecorrido();
});

// Inicializar fechas por defecto al cargar
establecerFechasPorDefecto();