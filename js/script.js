// Inicializar mapa
const map = L.map("map").setView([4.61, -74.08], 12); // Bogotá por defecto

// Cargar tiles de OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Variables para Vehículo 1
let marker1 = null;
let polyline1 = null;
let routePoints1 = [];
let lastProcessedTimestamp1 = null;

// Variables para Vehículo 2
let marker2 = null;
let polyline2 = null;
let routePoints2 = [];
let lastProcessedTimestamp2 = null;

let pageNameSet = false;
let centerMode = 1; // 1 = Vehículo 1, 2 = Vehículo 2, 0 = Ambos

// Iconos personalizados para cada vehículo
const icon1 = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const icon2 = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Event listeners para botones
document.getElementById('centerVehicle1').addEventListener('click', () => {
  centerMode = 1;
  updateActiveButton('centerVehicle1');
  if (marker1) {
    map.setView(marker1.getLatLng(), map.getZoom());
  }
});

document.getElementById('centerVehicle2').addEventListener('click', () => {
  centerMode = 2;
  updateActiveButton('centerVehicle2');
  if (marker2) {
    map.setView(marker2.getLatLng(), map.getZoom());
  }
});

document.getElementById('centerBoth').addEventListener('click', () => {
  centerMode = 0;
  updateActiveButton('centerBoth');
  fitBothVehicles();
});

function updateActiveButton(activeId) {
  document.querySelectorAll('.btn-vehicle').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(activeId).classList.add('active');
}

function fitBothVehicles() {
  const bounds = L.latLngBounds();
  let hasMarkers = false;

  if (marker1) {
    bounds.extend(marker1.getLatLng());
    hasMarkers = true;
  }
  if (marker2) {
    bounds.extend(marker2.getLatLng());
    hasMarkers = true;
  }

  if (hasMarkers) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

// Función para obtener y actualizar datos
async function fetchData() {
  try {
    const response = await fetch("data.php");
    const data = await response.json();

    // Establecer el nombre de la página solo una vez
    if (!pageNameSet && data.pageName) {
      document.title = data.pageName;
      document.getElementById('page-header').textContent = "Localizador";
      pageNameSet = true;
    }

    // Procesar datos del Vehículo 1
    if (data.vehicle1 && data.vehicle1.length > 0) {
      processVehicleData(data.vehicle1, 1);
    }

    // Procesar datos del Vehículo 2
    if (data.vehicle2 && data.vehicle2.length > 0) {
      processVehicleData(data.vehicle2, 2);
    }

  } catch (err) {
    console.error("❌ Error cargando datos:", err);
    document.getElementById("info1").innerHTML = `
      <div class="vehicle-label">🚗 Vehículo 1</div>
      <b style="color: red;">Error:</b> No se pudieron cargar los datos.
    `;
    document.getElementById("info2").innerHTML = `
      <div class="vehicle-label">🚙 Vehículo 2</div>
      <b style="color: red;">Error:</b> No se pudieron cargar los datos.
    `;
  }
}

function processVehicleData(locationData, vehicleNum) {
  const last = locationData[locationData.length - 1];
  const rpm = last.rpm !== undefined ? last.rpm : 'N/A';
  
  // Referencias según el vehículo
  const infoElement = document.getElementById(`info${vehicleNum}`);
  const vehicleLabel = vehicleNum === 1 ? '🚗 Vehículo 1' : '🚙 Vehículo 2';
  
  // Actualizar información
  infoElement.innerHTML = `
    <div class="vehicle-label">${vehicleLabel}</div>
    <b>Fecha/Hora:</b> ${last.timestamp}<br>
    <b>Lat:</b> ${last.lat} | <b>Lon:</b> ${last.lng}<br>
    <b>RPM:</b> ${rpm}
  `;

  // Variables según el vehículo
  let marker, polyline, routePoints, lastProcessedTimestamp, icon, color;
  
  if (vehicleNum === 1) {
    marker = marker1;
    polyline = polyline1;
    routePoints = routePoints1;
    lastProcessedTimestamp = lastProcessedTimestamp1;
    icon = icon1;
    color = 'blue';
  } else {
    marker = marker2;
    polyline = polyline2;
    routePoints = routePoints2;
    lastProcessedTimestamp = lastProcessedTimestamp2;
    icon = icon2;
    color = 'red';
  }

  // Solo añadir punto nuevo si es diferente al último procesado
  if (lastProcessedTimestamp !== last.timestamp) {
    const newPoint = [parseFloat(last.lat), parseFloat(last.lng)];
    routePoints.push(newPoint);
    
    if (vehicleNum === 1) {
      lastProcessedTimestamp1 = last.timestamp;
      routePoints1 = routePoints;
    } else {
      lastProcessedTimestamp2 = last.timestamp;
      routePoints2 = routePoints;
    }
  }

  // Colocar o mover marcador en el mapa
  if (marker) {
    marker.setLatLng([last.lat, last.lng]);
  } else {
    marker = L.marker([last.lat, last.lng], { icon: icon })
      .bindPopup(`<b>${vehicleLabel}</b><br>RPM: ${rpm}`)
      .addTo(map);
    
    if (vehicleNum === 1) {
      marker1 = marker;
    } else {
      marker2 = marker;
    }
  }

  // Crear o actualizar polyline
  if (routePoints.length > 1) {
    if (polyline) {
      polyline.setLatLngs(routePoints);
    } else {
      polyline = L.polyline(routePoints, {
        color: color,
        weight: 3,
        opacity: 0.8,
        smoothFactor: 1
      }).addTo(map);
      
      if (vehicleNum === 1) {
        polyline1 = polyline;
      } else {
        polyline2 = polyline;
      }
    }
  }

  // Centrar el mapa según el modo seleccionado
  if (centerMode === vehicleNum) {
    const currentZoom = map.getZoom();
    map.setView([last.lat, last.lng], currentZoom);
  } else if (centerMode === 0) {
    fitBothVehicles();
  }
}

// Función para ajustar el mapa cuando cambia el tamaño de ventana
function handleResize() {
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