<?php
require_once __DIR__ . '/../../db.php';

$plano = $_GET['plano'] ?? '';

if (empty($plano)) {
    echo json_encode([]);
    exit;
}

try {
    // Seu SQL exato, adaptado para o PDO
    $sql = 'SELECT p.*, pp."precoB2B" 
            FROM "produto_plano" pp
            INNER JOIN "produto" p ON p.referencia = pp.referencia 
            WHERE pp.plano = :plano';
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':plano' => $plano]);
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($resultados);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}