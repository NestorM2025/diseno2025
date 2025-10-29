<?php
header('Content-Type: application/json');

// Leer variables de entorno desde .env
$env = parse_ini_file(__DIR__ . '/.env');

$host = $env['DB_HOST'];
$user = $env['DB_USER'];
$pass = $env['DB_PASS'];
$dbname = $env['DB_NAME'];
$pageName = $env['PAGE_NAME'];

// Conectar a la base de datos
$conn = new mysqli($host, $user, $pass, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    echo json_encode([
        "error" => "Conexión fallida: " . $conn->connect_error,
        "pageName" => $pageName
    ]);
    exit;
}

// Consultar los últimos registros incluyendo RPM
$sql = "SELECT lat, lon, rpm, CONCAT(fecha, ' ', hora) AS timestamp FROM locations2 ORDER BY id ASC";
$result = $conn->query($sql);

$data = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $data[] = [
            "lat" => floatval($row["lat"]),
            "lng" => floatval($row["lon"]),
            "rpm" => intval($row["rpm"]),
            "timestamp" => $row["timestamp"]
        ];
    }
}

echo json_encode([
    "pageName" => $pageName,
    "locations" => $data
]);

$conn->close();
?>