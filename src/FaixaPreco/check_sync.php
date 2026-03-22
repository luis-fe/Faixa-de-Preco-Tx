<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . '/../../db.php';

$plano = $_GET['plano'] ?? '';

if (empty($plano)) {
    echo json_encode(['sync' => '--:--']);
    exit;
}

try {
    // Busca a data e hora da última sincronização do Excel para este plano
    $stmt = $pdo->prepare('SELECT "dataHoraSincronizacao" FROM "controleSincronizacaoExcel" WHERE plano = :plano');
    $stmt->execute([':plano' => $plano]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row && !empty($row['dataHoraSincronizacao'])) {
        echo json_encode(['sync' => $row['dataHoraSincronizacao']]);
    } else {
        echo json_encode(['sync' => '--:--']);
    }
} catch (Exception $e) {
    echo json_encode(['sync' => '--:--']);
}
?>