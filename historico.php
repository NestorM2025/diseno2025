<?php
// Evitar cualquier salida antes del JSON
ob_start();

header('Content-Type: application/json; charset=UTF-8');

// Leer variables de entorno desde .env
$env = @parse_ini_file(__DIR__ . '/.env');

if (!$env) {
    ob_clean();
    echo json_encode([
        "error" => "No se pudo cargar el archivo .env",
        "pageName" => "Error",
        "locations" => []
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$host     = $env['DB_HOST'];
$user     = $env['DB_USER'];
$pass     = $env['DB_PASS'];
$dbname   = $env['DB_NAME'];
$pageName = $env['PAGE_NAME'];

// Conectar a la base de datos
$conn = @new mysqli($host, $user, $pass, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    ob_clean();
    echo json_encode([
        "error" => "Conexión fallida: " . $conn->connect_error,
        "pageName" => $pageName,
        "locations" => []
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Obtener parámetros
    $vehiculoId  = $_GET['vehiculo_id'] ?? '1';
    $fechaInicio = $_GET['fecha_inicio'] ?? null;
    $fechaFin    = $_GET['fecha_fin'] ?? null;

    // Validar vehículo ID
    if (!in_array($vehiculoId, ['1', '2'])) {
        ob_clean();
        echo json_encode([
            'error'     => 'vehiculo_id debe ser 1 o 2',
            'pageName'  => $pageName,
            'locations' => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Seleccionar la tabla según el vehículo
    $tabla = ($vehiculoId === '1') ? 'locations2' : 'vehiculo2';

    if (!$fechaInicio || !$fechaFin) {
        ob_clean();
        echo json_encode([
            'error'     => 'Se requieren los parámetros fecha_inicio y fecha_fin',
            'pageName'  => $pageName,
            'locations' => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Validar formato de fechas (básico)
    if (!strtotime($fechaInicio) || !strtotime($fechaFin)) {
        ob_clean();
        echo json_encode([
            'error'       => 'Formato de fecha inválido. Use: YYYY-MM-DDTHH:MM',
            'fechaInicio' => $fechaInicio,
            'fechaFin'    => $fechaFin,
            'pageName'    => $pageName,
            'locations'   => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Convertir datetime-local a formato de base de datos
    $fechaInicioFormatted = date('Y-m-d H:i:s', strtotime($fechaInicio));
    $fechaFinFormatted    = date('Y-m-d H:i:s', strtotime($fechaFin));

    // Consulta incluyendo RPM - usar la tabla correspondiente
    $sql = "SELECT lat, lon, rpm, CONCAT(fecha, ' ', hora) AS timestamp, id
            FROM $tabla
            WHERE CONCAT(fecha, ' ', hora) >= ?
              AND CONCAT(fecha, ' ', hora) <= ?
            ORDER BY id ASC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        ob_clean();
        echo json_encode([
            'error'     => 'Error preparando consulta: ' . $conn->error,
            'pageName'  => $pageName,
            'locations' => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt->bind_param('ss', $fechaInicioFormatted, $fechaFinFormatted);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            if ($row["lat"] !== null && $row["lon"] !== null) {
                $data[] = [
                    "lat"       => (float)$row["lat"],
                    "lng"       => (float)$row["lon"],
                    "rpm"       => (int)$row["rpm"],
                    "timestamp" => $row["timestamp"]
                ];
            }
        }
    }
    $stmt->close();

    // Nombre del vehículo
    $vehiculoNombre = ($vehiculoId === '1') ? 'Vehículo 1' : 'Vehículo 2';

    // Enviar JSON limpio
    ob_clean();
    echo json_encode([
        "success"         => true,
        "vehiculo_id"     => $vehiculoId,
        "vehiculo_nombre" => $vehiculoNombre,
        "tabla"           => $tabla,
        "total"           => count($data),
        "fecha_inicio"    => $fechaInicio,
        "fecha_fin"       => $fechaFin,
        "consulta_desde"  => $fechaInicioFormatted,
        "consulta_hasta"  => $fechaFinFormatted,
        "pageName"        => $pageName . " - Histórico",
        "locations"       => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'error'     => 'Error interno del servidor: ' . $e->getMessage(),
        'pageName'  => $pageName,
        'locations' => []
    ], JSON_UNESCAPED_UNICODE);
    exit;
} finally {
    if ($conn && $conn instanceof mysqli) {
        $conn->close();
    }
}