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
    $sql = '
    WITH stats AS (
        SELECT 
            p.linha, 
            p.grupo,
            MIN(CAST(REPLACE(REPLACE(NULLIF(pp."precoB2B", \'\'), \'R$\', \'\'), \',\', \'.\') AS NUMERIC)) AS min_preco,
            MAX(CAST(REPLACE(REPLACE(NULLIF(pp."precoB2B", \'\'), \'R$\', \'\'), \',\', \'.\') AS NUMERIC)) AS max_preco
        FROM "produto_plano" pp
        INNER JOIN "produto" p ON p.referencia = pp.referencia
        WHERE pp.plano = :plano
        GROUP BY p.linha, p.grupo
    )
    SELECT 
        p.referencia, p.descricao, p.colecao, p.linha, p.grupo, p.classificacao, 
        p."sub-colecao" AS subcolecao, /* Mapeia a coluna do BD (com hifen) para o JS (sem hifen) */
        
        pp."precoB2B",
        pp."precoB2C",
        pp."MkpB2B",
        
        COALESCE(
            CAST(REPLACE(NULLIF(fx."valorEntradaB2B", \'\'), \',\', \'.\') AS NUMERIC), 
            s.min_preco + ((s.max_preco - s.min_preco) / 3.0)
        ) AS faixa_entrada_max,
        
        COALESCE(
            CAST(REPLACE(NULLIF(fx."valorintermediarioB2B", \'\'), \',\', \'.\') AS NUMERIC), 
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
    echo json_encode(["error" => "Erro no SQL: " . $e->getMessage()]);
}
?>