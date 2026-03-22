<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: text/plain; charset=UTF-8");

require_once __DIR__ . '/../../db.php';

// FORÇA O FUSO HORÁRIO PARA O PADRÃO BRASILEIRO (BRASÍLIA)
date_default_timezone_set('America/Sao_Paulo');

$json_recebido = file_get_contents('php://input');

if (!empty($json_recebido)) {
    $dados = json_decode($json_recebido, true);

    if (is_array($dados)) {
        try {
            $pdo->beginTransaction();

            // 1. Descobre qual plano estamos sincronizando
            $nomePlano = $dados[0]['plano_nome'] ?? 'PADRAO';

            // 2. Garante que o nome do plano existe na tabela mestre "Plano"
            $sqlPlano = 'INSERT INTO "Plano" (plano) VALUES (:plano) ON CONFLICT (plano) DO NOTHING';
            $pdo->prepare($sqlPlano)->execute([':plano' => $nomePlano]);

            // 3. LIMPEZA ("Drop and Replace"): Apaga os dados antigos do plano atual
            $sqlLimpar = 'DELETE FROM "produto_plano" WHERE plano = :plano';
            $pdo->prepare($sqlLimpar)->execute([':plano' => $nomePlano]);

            // 4. Prepara os SQLs de Inserção (COM PROTEÇÃO CONTRA DUPLICADOS NA PLANILHA)
            $sqlProd = 'INSERT INTO "produto" (referencia, descricao, colecao, linha, grupo, "classificacao") 
                        VALUES (:ref, :desc, :col, :lin, :gru, :class)
                        ON CONFLICT (referencia) DO UPDATE SET 
                        descricao = EXCLUDED.descricao, colecao = EXCLUDED.colecao, 
                        linha = EXCLUDED.linha, grupo = EXCLUDED.grupo, "classificacao" = EXCLUDED."classificacao"';

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
                    
                    // --- Tratamento do Markup (Arredondamento para 2 casas) ---
                    $mkp = $item['MkpB2B'] ?? '';
                    if ($mkp !== '') {
                        $mkpNumerico = (float) str_replace(',', '.', $mkp);
                        $mkp = (string) round($mkpNumerico, 2);
                    }

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
                        ':precoB2B' => $item['preco'] ?? '',      
                        ':precoB2C' => $item['precoB2C'] ?? '',
                        ':mkpB2B'   => $mkp
                    ]);
                    
                    $contador++;
                }
            }

            // 5. REGISTRO DE AUDITORIA (LOG DE SINCRONIZAÇÃO NO PADRÃO BR)
            // Gera a string no formato: Dia/Mês/Ano Hora:Minuto:Segundo
            $dataHoraBR = date('d/m/Y H:i:s');
            
            $sqlLog = 'INSERT INTO "controleSincronizacaoExcel" (plano, "dataHoraSincronizacao") 
                       VALUES (:plano, :dataHora) 
                       ON CONFLICT (plano) DO UPDATE SET 
                       "dataHoraSincronizacao" = EXCLUDED."dataHoraSincronizacao"';
            
            $pdo->prepare($sqlLog)->execute([
                ':plano'    => $nomePlano,
                ':dataHora' => $dataHoraBR
            ]);

            $pdo->commit();
            file_put_contents('dados.json', $json_recebido);
            
            echo "Sincronizado com Sucesso!\n";
            echo "Plano: '$nomePlano'\n";
            echo "Ação: Base limpa e $contador produtos gravados (duplicidades da planilha foram mescladas).";

        } catch (Exception $e) {
            $pdo->rollBack();
            echo "Erro Crítico no Postgres: " . $e->getMessage();
        }
    } else {
        echo "Erro: JSON inválido ou mal formatado.";
    }
} else {
    echo "Aviso: Nenhum dado recebido do Excel.";
}
?>