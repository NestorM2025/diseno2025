+<?php
// Evitar cualquier salida antes del JSON
ob_start();

header('Content-Type: application/json');

// Leer variables de entorno desde .env
$env = parse_ini_file(__DIR__ . '/.env');

if (!$env) {
    ob_clean();
    echo json_encode([
        "error" => "No se pudo cargar el archivo .env",
        "pageName" => "Error"
    ]);
    exit;
}

$host = $env['DB_HOST'] ?? 'localhost';
$user = $env['DB_USER'] ?? '';
$pass = $env['DB_PASS'] ?? '';
$dbname = $env['DB_NAME'] ?? '';
$pageName = $env['PAGE_NAME'] ?? 'Localizador';

// Conectar a la base de datos
$conn = new mysqli($host, $user, $pass, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    ob_clean();
    echo json_encode([
        "error" => "Conexión fallida: " . $conn->connect_error,
        "pageName" => $pageName
    ]);
    exit;
}

try {
    // Obtener parámetros de fecha
    $fechaInicio = $_GET['fecha_inicio'] ?? null;
    $fechaFin = $_GET['fecha_fin'] ?? null;
    
    if (!$fechaInicio || !$fechaFin) {
        ob_clean();
        echo json_encode([
            'error' => 'Se requieren los parámetros fecha_inicio y fecha_fin',
            'pageName' => $pageName,
            'locations' => []
        ]);
        exit;
    }
    
    // Validar formato de fechas (básico)
    if (!strtotime($fechaInicio) || !strtotime($fechaFin)) {
        ob_clean();
        echo json_encode([
            'error' => 'Formato de fecha inválido. Use: YYYY-MM-DDTHH:MM',
            'fechaInicio' => $fechaInicio,
            'fechaFin' => $fechaFin,
            'pageName' => $pageName,
            'locations' => []
        ]);
        exit;
    }
    
    // Convertir formato de datetime-local a formato de base de datos
    $fechaInicioFormatted = date('Y-m-d H:i:s', strtotime($fechaInicio));
    $fechaFinFormatted = date('Y-m-d H:i:s', strtotime($fechaFin));
    
    // Preparar la consulta con filtro de fechas
    // Usamos CONCAT(fecha, ' ', hora) para crear el timestamp como en tu data.php original
    $sql = "SELECT lat, lon, CONCAT(fecha, ' ', hora) AS timestamp, id
            FROM locations2 
            WHERE CONCAT(fecha, ' ', hora) >= ? 
            AND CONCAT(fecha, ' ', hora) <= ? 
            ORDER BY id ASC";
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        ob_clean();
        echo json_encode([
            'error' => 'Error preparando consulta: ' . $conn->error,
            'pageName' => $pageName,
            'locations' => []
        ]);
        exit;
    }
    
    $stmt->bind_param('ss', $fechaInicioFormatted, $fechaFinFormatted);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $data = [];
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            // Validar que lat y lon no sean null
            if ($row["lat"] !== null && $row["lon"] !== null) {
                $data[] = [
                    "lat" => floatval($row["lat"]),
                    "lng" => floatval($row["lon"]),
                    "timestamp" => $row["timestamp"]
                ];
            }
        }
    }
    
    $stmt->close();
    
    // Limpiar cualquier salida previa y enviar JSON
    ob_clean();
    echo json_encode([
        "success" => true,
        "total" => count($data),
        "fecha_inicio" => $fechaInicio,
        "fecha_fin" => $fechaFin,
        "consulta_desde" => $fechaInicioFormatted,
        "consulta_hasta" => $fechaFinFormatted,
        "pageName" => $pageName . " - Histórico",
        "locations" => $data
    ]);
    
} catch(Exception $e) {
    ob_clean();
    echo json_encode([
        'error' => 'Error interno del servidor: ' . $e->getMessage(),
        'pageName' => $pageName,
        'locations' => []
    ]);
}

$conn->close();
?>