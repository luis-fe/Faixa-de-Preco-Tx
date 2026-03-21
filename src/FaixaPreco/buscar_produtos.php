<?php
header('Content-Type: application/json');
ini_set('display_errors', 0); 
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';

$plano = $_GET['plano'] ?? '';

if (empty($plano)) {
    echo json_encode([]);
    exit;
}

try {
    // A MÁGICA DOS TERCEIS (1/3, 2/3) NO POSTGRESQL
    $sql = '
    WITH stats AS (
        SELECT 
            p.linha, 
            p.grupo,
            MIN(CAST(NULLIF(pp."precoB2B", \'\') AS NUMERIC)) AS min_preco,
            MAX(CAST(NULLIF(pp."precoB2B", \'\') AS NUMERIC)) AS max_preco
        FROM "produto_plano" pp
        INNER JOIN "produto" p ON p.referencia = pp.referencia
        WHERE pp.plano = :plano
        GROUP BY p.linha, p.grupo
    )
    SELECT 
        p.*, 
        pp."precoB2B",
        -- COALESCE: Se a faixa salva for NULA, ele calcula 1/3 do intervalo (Min + (Max - Min) / 3)
        COALESCE(
            CAST(NULLIF(fx."valorEntradaB2B", \'\') AS NUMERIC), 
            s.min_preco + ((s.max_preco - s.min_preco) / 3.0)
        ) AS faixa_entrada_max,
        
        -- COALESCE: Se a faixa salva for NULA, ele calcula 2/3 do intervalo
        COALESCE(
            CAST(NULLIF(fx."valorintermediarioB2B", \'\') AS NUMERIC), 
            s.min_preco + (((s.max_preco - s.min_preco) / 3.0) * 2.0)
        ) AS faixa_inter_max

    FROM "produto_plano" pp
    INNER JOIN "produto" p ON p.referencia = pp.referencia
    INNER JOIN stats s ON p.linha = s.linha AND p.grupo = s.grupo
    LEFT JOIN "planoFaixaPrecoLinhaGrupo" fx 
        ON fx.plano = pp.plano 
        AND fx.linha = p.linha 
        AND fx.grupo = p.grupo
    WHERE pp.plano = :plano';
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':plano' => $plano]);
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($resultados);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Erro SQL: " . $e->getMessage()]);
}
?>