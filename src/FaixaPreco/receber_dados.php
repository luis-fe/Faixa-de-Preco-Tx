<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: text/plain; charset=UTF-8");

require_once __DIR__ . '/../../db.php';

$json_recebido = file_get_contents('php://input');

if (!empty($json_recebido)) {
    $dados = json_decode($json_recebido, true);

    if (is_array($dados)) {
        try {
            $pdo->beginTransaction();

            // 1. Pega o nome do plano do primeiro item enviado
            $nomePlano = $dados[0]['plano_nome'] ?? 'PADRAO';

            // 2. Insere o Plano se não existir
            $sqlPlano = 'INSERT INTO "Plano" (plano) VALUES (:plano) ON CONFLICT (plano) DO NOTHING';
            $stmtPlano = $pdo->prepare($sqlPlano);
            $stmtPlano->execute([':plano' => $nomePlano]);

            // 3. Prepara os SQLs de Produto e Preço (UPSERT)
            $sqlProd = 'INSERT INTO "produto" (referencia, descricao, colecao, linha, grupo) 
                        VALUES (:ref, :desc, :col, :lin, :gru)
                        ON CONFLICT (referencia) DO UPDATE SET 
                        descricao = EXCLUDED.descricao, colecao = EXCLUDED.colecao, 
                        linha = EXCLUDED.linha, grupo = EXCLUDED.grupo';

            $sqlPreco = 'INSERT INTO "produto_plano" (referencia, plano, "precoB2B") 
                         VALUES (:ref, :plano, :preco)
                         ON CONFLICT (referencia, plano) DO UPDATE SET "precoB2B" = EXCLUDED."precoB2B"';

            $stmtProd = $pdo->prepare($sqlProd);
            $stmtPreco = $pdo->prepare($sqlPreco);

            $contador = 0;
            foreach ($dados as $item) {
                if (!empty($item['ref'])) {
                    // Salva Produto
                    $stmtProd->execute([
                        ':ref'  => $item['ref'],
                        ':desc' => $item['descricao'],
                        ':col'  => $item['colecao'],
                        ':lin'  => $item['linha'],
                        ':gru'  => $item['grupo']
                    ]);

                    // Salva Preço associado ao Plano
                    $stmtPreco->execute([
                        ':ref'   => $item['ref'],
                        ':plano' => $nomePlano,
                        ':preco' => $item['preco']
                    ]);
                    $contador++;
                }
            }

            $pdo->commit();
            
            // Opcional: mantém o JSON para compatibilidade temporária
            file_put_contents('dados.json', $json_recebido);

            echo "Sincronizado! Plano '$nomePlano' e $contador produtos atualizados no Postgres.";

        } catch (Exception $e) {
            $pdo->rollBack();
            echo "Erro no Postgres: " . $e->getMessage();
        }
    } else {
        echo "Erro: JSON inválido.";
    }
} else {
    echo "Nenhum dado recebido.";
}
?>