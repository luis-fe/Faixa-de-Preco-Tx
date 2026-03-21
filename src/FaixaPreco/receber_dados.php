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

            $nomePlano = $dados[0]['plano_nome'] ?? 'PADRAO';

            $sqlPlano = 'INSERT INTO "Plano" (plano) VALUES (:plano) ON CONFLICT (plano) DO NOTHING';
            $pdo->prepare($sqlPlano)->execute([':plano' => $nomePlano]);

            // INCLUINDO CLASSIFICACAO NO PRODUTO
            $sqlProd = 'INSERT INTO "produto" (referencia, descricao, colecao, linha, grupo, "classificacao") 
                        VALUES (:ref, :desc, :col, :lin, :gru, :class)
                        ON CONFLICT (referencia) DO UPDATE SET 
                        descricao = EXCLUDED.descricao, colecao = EXCLUDED.colecao, 
                        linha = EXCLUDED.linha, grupo = EXCLUDED.grupo, "classificacao" = EXCLUDED."classificacao"';

            // INCLUINDO PRECO B2C E MKP NO PRODUTO_PLANO
            $sqlPreco = 'INSERT INTO "produto_plano" (referencia, plano, "precoB2B", "precoB2C", "MkpB2B") 
                         VALUES (:ref, :plano, :precoB2B, :precoB2C, :mkpB2B)
                         ON CONFLICT (referencia, plano) DO UPDATE SET 
                         "precoB2B" = EXCLUDED."precoB2B",
                         "precoB2C" = EXCLUDED."precoB2C",
                         "MkpB2B" = EXCLUDED."MkpB2B"';

            $stmtProd = $pdo->prepare($sqlProd);
            $stmtPreco = $pdo->prepare($sqlPreco);

            $contador = 0;
            foreach ($dados as $item) {
                if (!empty($item['ref'])) {
                    // Salva Produto
                    $stmtProd->execute([
                        ':ref'   => $item['ref'],
                        ':desc'  => $item['descricao'] ?? '',
                        ':col'   => $item['colecao'] ?? '',
                        ':lin'   => $item['linha'] ?? '',
                        ':gru'   => $item['grupo'] ?? '',
                        ':class' => $item['classificacao'] ?? ''
                    ]);

                    // Salva Preços e Markup
                    $stmtPreco->execute([
                        ':ref'      => $item['ref'],
                        ':plano'    => $nomePlano,
                        ':precoB2B' => $item['preco'] ?? '',      // Mantive 'preco' pois era como sua macro enviava
                        ':precoB2C' => $item['precoB2C'] ?? '',
                        ':mkpB2B'   => $item['MkpB2B'] ?? ''
                    ]);
                    $contador++;
                }
            }

            $pdo->commit();
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