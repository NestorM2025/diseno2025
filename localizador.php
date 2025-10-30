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
    // Obtener parámetros de ubicación y radio
    $lat   = $_GET['lat'] ?? null;
    $lng   = $_GET['lng'] ?? null;
    $radio = $_GET['radio'] ?? 500; // Radio por defecto: 500 metros

    if ($lat === null || $lng === null) {
        ob_clean();
        echo json_encode([
            'error'     => 'Se requieren los parámetros lat y lng',
            'pageName'  => $pageName,
            'locations' => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Validar que sean números válidos
    if (!is_numeric($lat) || !is_numeric($lng) || !is_numeric($radio)) {
        ob_clean();
        echo json_encode([
            'error'     => 'Los parámetros lat, lng y radio deben ser numéricos',
            'lat'       => $lat,
            'lng'       => $lng,
            'radio'     => $radio,
            'pageName'  => $pageName,
            'locations' => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Convertir a float/int
    $lat = floatval($lat);
    $lng = floatval($lng);
    $radio = intval($radio);

    // Validar rango del radio
    if ($radio < 1 || $radio > 10000) {
        ob_clean();
        echo json_encode([
            'error'     => 'El radio debe estar entre 1 y 10000 metros',
            'radio'     => $radio,
            'pageName'  => $pageName,
            'locations' => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Fórmula de Haversine para calcular distancia en MySQL incluyendo RPM
    // Radio de la Tierra en metros: 6371000
    $sql = "SELECT 
                lat, 
                lon,
                rpm,
                CONCAT(fecha, ' ', hora) AS timestamp,
                id,
                (6371000 * acos(
                    cos(radians(?)) * 
                    cos(radians(lat)) * 
                    cos(radians(lon) - radians(?)) + 
                    sin(radians(?)) * 
                    sin(radians(lat))
                )) AS distancia
            FROM locations2
            HAVING distancia <= ?
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

    // Bind parameters: lat, lng, lat (repetido para el seno), radio
    $stmt->bind_param('dddd', $lat, $lng, $lat, $radio);
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
                    "timestamp" => $row["timestamp"],
                    "distancia" => round((float)$row["distancia"], 2) // Distancia en metros
                ];
            }
        }
    }
    $stmt->close();

    // Enviar JSON limpio
    ob_clean();
    echo json_encode([
        "success"      => true,
        "total"        => count($data),
        "punto_busqueda" => [
            "lat"   => $lat,
            "lng"   => $lng
        ],
        "radio_metros" => $radio,
        "pageName"     => $pageName . " - Localizador",
        "locations"    => $data
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