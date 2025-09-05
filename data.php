<?php
header('Content-Type: application/json');

// Datos de conexión
$host = "datos1.cra0e4qeof2m.us-east-2.rds.amazonaws.com";
$user = "nestorm";
$pass = "nestorm2025";
$dbname = "localizador";

// Conectar a la base de datos
$conn = new mysqli($host, $user, $pass, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    echo json_encode(["error" => "Conexión fallida: " . $conn->connect_error]);
    exit;
}

// Consultar los últimos 50 registros
$sql = "SELECT lat, lon, CONCAT(fecha, ' ', hora) AS timestamp FROM locations2 ORDER BY id ASC";
$result = $conn->query($sql);

$data = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $data[] = [
            "lat" => floatval($row["lat"]),
            "lng" => floatval($row["lon"]),
            "timestamp" => $row["timestamp"]
        ];
    }
}

// Devolver JSON
echo json_encode($data);

// Cerrar conexión
$conn->close();
?>
