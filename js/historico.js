// Inicializar mapa sin ubicación específica
const map = L.map("map").setView([0, 0], 2); // Vista mundial por defecto

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
    <b>Consultando datos desde ${formatearFechaLegible(fechaInicio)} hasta ${formatearFechaLegible(fechaFin)}...</b>
  `;
  
  try {
    // Construir URL con parámetros de fecha
    const url = `historico.php?fecha_inicio=${encodeURIComponent(fechaInicio)}&fecha_fin=${encodeURIComponent(fechaFin)}`;
    
    console.log('Consultando URL:', url); // Para debug
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Obtener el texto crudo primero para debug
    const responseText = await response.text();
    console.log('Respuesta cruda del servidor:', responseText);
    
    // Intentar parsear como JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Error parseando JSON:', jsonError);
      console.error('Respuesta que causó el error:', responseText);
      throw new Error(`Respuesta inválida del servidor: ${responseText.substring(0, 200)}...`);
    }
    
    console.log('Datos recibidos:', data); // Para debug
    
    // Verificar si hay error en la respuesta
    if (data.error) {
      document.getElementById("info").innerHTML = `
        <b style="color: red;">Error:</b> ${data.error}<br>
        <small>${data.message || 'Revisa la configuración del servidor'}</small>
      `;
      return;
    }
    
    // Establecer el nombre de la página si viene en los datos
    if (!pageNameSet && data.pageName) {
      document.title = data.pageName;
      pageNameSet = true;
    }
    
    // Procesar datos de ubicación - manejo más flexible
    let locationData = [];
    if (Array.isArray(data)) {
      locationData = data;
    } else if (data.locations && Array.isArray(data.locations)) {
      locationData = data.locations;
    } else if (data.data && Array.isArray(data.data)) {
      locationData = data.data;
    } else if (data.lat && data.lng) {
      locationData = [data]; // Un solo punto
    }
    
    console.log(`Procesando ${locationData.length} puntos`); // Para debug
    
    if (locationData.length > 0) {
      // Limpiar mapa anterior
      limpiarMapa();
      
      // Filtrar puntos con coordenadas válidas
      const puntosValidos = locationData.filter(point => 
        point.lat && point.lng && 
        !isNaN(parseFloat(point.lat)) && 
        !isNaN(parseFloat(point.lng))
      );
      
      if (puntosValidos.length === 0) {
        document.getElementById("info").innerHTML = `
          <b>No se encontraron puntos con coordenadas válidas para el período seleccionado.</b>
        `;
        return;
      }
      
      // Crear array de puntos para la polyline
      const routePoints = puntosValidos.map(point => [parseFloat(point.lat), parseFloat(point.lng)]);
      
      // Crear polyline solo si hay más de 1 punto
      if (routePoints.length > 1) {
        polyline = L.polyline(routePoints, {
          color: 'blue',
          weight: 3,
          opacity: 0.7,
          smoothFactor: 1
        }).addTo(map);
        
        // Ajustar vista del mapa para mostrar todo el recorrido
        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
      } else {
        // Solo un punto, centrar en él
        map.setView([routePoints[0][0], routePoints[0][1]], 15);
      }
      
      // Añadir marcador de inicio (verde)
      const startPoint = puntosValidos[0];
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
      
      startMarker.bindPopup(`<b>Inicio:</b><br>${startPoint.timestamp}<br><b>Lat:</b> ${startPoint.lat}<br><b>Lon:</b> ${startPoint.lng}`);
      markers.push(startMarker);
      
      // Solo añadir marcador de fin si hay más de un punto
      if (puntosValidos.length > 1) {
        const endPoint = puntosValidos[puntosValidos.length - 1];
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
        
        endMarker.bindPopup(`<b>Fin:</b><br>${endPoint.timestamp}<br><b>Lat:</b> ${endPoint.lat}<br><b>Lon:</b> ${endPoint.lng}`);
        markers.push(endMarker);
      }
      
      // Mostrar información del recorrido
      const inicio = formatearFechaLegible(startPoint.timestamp);
      const fin = puntosValidos.length > 1 ? formatearFechaLegible(puntosValidos[puntosValidos.length - 1].timestamp) : inicio;
      
      document.getElementById("info").innerHTML = `
        <b>Recorrido encontrado:</b> ${puntosValidos.length} punto${puntosValidos.length > 1 ? 's' : ''} | 
        <b>Inicio:</b> ${inicio} ${puntosValidos.length > 1 ? `| <b>Fin:</b> ${fin}` : ''}
      `;
      
    } else {
      document.getElementById("info").innerHTML = `
        <b>No se encontraron datos para el período seleccionado.</b><br>
        <small>Verifica que existan registros en las fechas consultadas.</small>
      `;
    }
    
  } catch (err) {
    console.error("❌ Error consultando datos históricos:", err);
    document.getElementById("info").innerHTML = `
      <b style="color: red;">Error:</b> No se pudieron cargar los datos históricos.<br>
      <small>Error: ${err.message}</small>
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

// Función para formatear fecha de manera legible
function formatearFechaLegible(fechaString) {
  try {
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) return fechaString;
    
    const opciones = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return fecha.toLocaleDateString('es-ES', opciones);
  } catch {
    return fechaString;
  }
}

// Función para establecer fecha por defecto (últimas 24 horas)
function establecerFechasPorDefecto() {
  const ahora = new Date();
  // Poner el fin al momento actual
  const inicioDelDia = new Date(ahora);
  inicioDelDia.setHours(0, 0, 0, 0); // Inicio del día actual
  
  // Formatear fechas para datetime-local
  const formatoFecha = (fecha) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  // Por defecto: desde las 00:00 de hoy hasta ahora
  document.getElementById('fecha-inicio').value = formatoFecha(inicioDelDia);
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