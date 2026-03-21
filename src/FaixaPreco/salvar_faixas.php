<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

// Recebe o pacote JSON enviado pelo JavaScript
$json = file_get_contents('php://input');
$dados = json_decode($json, true);

if (!$dados) {
    echo json_encode(["error" => "Dados inválidos."]);
    exit;
}

// Extrai os dados
$plano = $dados['plano'] ?? '';
$linha = empty($dados['linha']) ? 'TODAS' : $dados['linha']; // Se o usuário não escolheu, gravamos como 'TODAS'
$grupo = empty($dados['grupo']) ? 'TODOS' : $dados['grupo'];
$valorEntrada = (string)$dados['valorEntrada'];
$valorInter = (string)$dados['valorInter'];
$valorPremium = (string)$dados['valorPremium'];

try {
    // 1. Garante que a tabela existe com as colunas que você pediu e a CHAVE ÚNICA (Constraint)
    $pdo->exec('CREATE TABLE IF NOT EXISTS "planoFaixaPrecoLinhaGrupo" (
        plano VARCHAR,
        linha VARCHAR,
        grupo VARCHAR,
        "valorEntradaB2B" VARCHAR,
        "valorintermediarioB2B" VARCHAR,
        "valorPremium" VARCHAR,
        UNIQUE(plano, linha, grupo)
    )');

    // 2. A Query de UPSERT (Insere, ou atualiza se já existir a mesma combinação)
    $sql = 'INSERT INTO "planoFaixaPrecoLinhaGrupo" (plano, linha, grupo, "valorEntradaB2B", "valorintermediarioB2B", "valorPremium")
            VALUES (:plano, :linha, :grupo, :vEntrada, :vInter, :vPremium)
            ON CONFLICT (plano, linha, grupo) 
            DO UPDATE SET 
                "valorEntradaB2B" = EXCLUDED."valorEntradaB2B",
                "valorintermediarioB2B" = EXCLUDED."valorintermediarioB2B",
                "valorPremium" = EXCLUDED."valorPremium"';

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':plano'    => $plano,
        ':linha'    => $linha,
        ':grupo'    => $grupo,
        ':vEntrada' => $valorEntrada,
        ':vInter'   => $valorInter,
        ':vPremium' => $valorPremium
    ]);

    // Responde sucesso para o JavaScript
    echo json_encode(["sucesso" => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>