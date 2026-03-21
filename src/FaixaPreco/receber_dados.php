<?php
// Permite requisições de outras origens
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: text/plain; charset=UTF-8");

// 1. Chama a conexão com o banco de dados que criamos no db.php
require_once __DIR__ . '/../../db.php';

// Recebe o pacote JSON enviado pelo Excel
$json_recebido = file_get_contents('php://input');

if (!empty($json_recebido)) {
    // Transforma o JSON em um Array do PHP para podermos varrer linha por linha
    $dados = json_decode($json_recebido, true);

    if (is_array($dados)) {
        try {
            // Inicia uma "Transação". Se der erro no meio do caminho, ele desfaz tudo!
            $pdo->beginTransaction();

            // 2. A MÁGICA DO POSTGRESQL (UPSERT)
            // Tenta inserir. Se a referência já existir, ele atualiza as outras colunas!
            $sql = 'INSERT INTO "produto" (referencia, descricao, colecao, linha, grupo) 
                    VALUES (:referencia, :descricao, :colecao, :linha, :grupo)
                    ON CONFLICT (referencia) 
                    DO UPDATE SET 
                        descricao = EXCLUDED.descricao,
                        colecao = EXCLUDED.colecao,
                        linha = EXCLUDED.linha,
                        grupo = EXCLUDED.grupo';

            // Prepara a query no banco para ser executada repetidas vezes (muito mais rápido)
            $stmt = $pdo->prepare($sql);

            $contador = 0;

            // 3. O DE/PARA
            // Varre cada produto enviado pela planilha
            foreach ($dados as $item) {
                $referencia = $item['ref'] ?? null;
                $descricao  = $item['descricao'] ?? ''; // Nova coluna que vamos mandar do Excel
                $colecao    = $item['colecao'] ?? '';
                $linha      = $item['linha'] ?? '';
                $grupo      = $item['grupo'] ?? '';

                // Só insere se a referência não estiver vazia
                if ($referencia) {
                    $stmt->execute([
                        ':referencia' => $referencia,
                        ':descricao'  => $descricao,
                        ':colecao'    => $colecao,
                        ':linha'      => $linha,
                        ':grupo'      => $grupo
                    ]);
                    $contador++;
                }
            }

            // Confirma a gravação de tudo no banco de dados!
            $pdo->commit();

            // 4. Mantém o JSON para o Kanban não parar de funcionar (por enquanto)
            file_put_contents('dados.json', $json_recebido);

            echo "Sincronizado com sucesso! $contador produtos integrados no PostgreSQL às " . date('H:i:s');

        } catch (Exception $e) {
            // Se algo explodir, cancela a gravação no banco
            $pdo->rollBack();
            echo "Erro crítico ao salvar no banco de dados: " . $e->getMessage();
        }
    } else {
        echo "Erro: O formato dos dados enviados não é um JSON válido.";
    }
} else {
    echo "Nenhum dado recebido.";
}
?>