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

// Consultar datos del Vehículo 1 (tabla locations2)
$sql1 = "SELECT lat, lon, rpm, CONCAT(fecha, ' ', hora) AS timestamp FROM locations2 ORDER BY id ASC";
$result1 = $conn->query($sql1);

$vehicle1Data = [];
if ($result1->num_rows > 0) {
    while($row = $result1->fetch_assoc()) {
        $vehicle1Data[] = [
            "lat" => floatval($row["lat"]),
            "lng" => floatval($row["lon"]),
            "rpm" => intval($row["rpm"]),
            "timestamp" => $row["timestamp"]
        ];
    }
}

// Consultar datos del Vehículo 2 (tabla vehiculo2)
$sql2 = "SELECT lat, lon, rpm, CONCAT(fecha, ' ', hora) AS timestamp FROM vehiculo2 ORDER BY id ASC";
$result2 = $conn->query($sql2);

$vehicle2Data = [];
if ($result2->num_rows > 0) {
    while($row = $result2->fetch_assoc()) {
        $vehicle2Data[] = [
            "lat" => floatval($row["lat"]),
            "lng" => floatval($row["lon"]),
            "rpm" => intval($row["rpm"]),
            "timestamp" => $row["timestamp"]
        ];
    }
}

// Devolver datos de ambos vehículos
echo json_encode([
    "pageName" => $pageName,
    "vehicle1" => $vehicle1Data,
    "vehicle2" => $vehicle2Data
]);

$conn->close();
?>