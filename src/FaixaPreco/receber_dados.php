<?php
// Permite requisições de outras origens (se o Excel estiver rodando fora do servidor)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: text/plain; charset=UTF-8");

// Recebe o pacote JSON enviado pelo Excel
$json_recebido = file_get_contents('php://input');

if (!empty($json_recebido)) {
    // Salva na mesma pasta com o nome dados.json
    // IMPORTANTE: Certifique-se de que o PHP tenha permissão de escrita nesta pasta
    if(file_put_contents('dados.json', $json_recebido)) {
        echo "Sincronizado com sucesso! " . date('H:i:s');
    } else {
        echo "Erro ao tentar salvar o arquivo dados.json no servidor.";
    }
} else {
    echo "Nenhum dado recebido.";
}
?>