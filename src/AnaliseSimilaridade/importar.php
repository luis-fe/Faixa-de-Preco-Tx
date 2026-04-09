<?php
// importar.php
// Volta duas pastas para trás para achar a pasta vendor na raiz do projeto
require __DIR__ . '/../../vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['planilha'])) {
    $arquivoTmp = $_FILES['planilha']['tmp_name'];

    try {
        // Carrega a planilha
        $spreadsheet = IOFactory::load($arquivoTmp);
        $worksheet = $spreadsheet->getActiveSheet();
        
        // Transforma a planilha em um array associativo (usando a primeira linha como chave)
        $dadosExcel = $worksheet->toArray(null, true, true, true);
        $cabecalhos = array_shift($dadosExcel); // Tira a primeira linha (cabeçalhos)
        
        $dadosFormatados = [];
        foreach ($dadosExcel as $linha) {
            // Mapeia as colunas (ajuste a letra da coluna conforme sua planilha real)
            // Exemplo: 'A' => Pedido Totvs, 'J' => REF, etc.
            $dadosFormatados[] = [
                'Pedido' => $linha['B'], // Supondo que B seja o "Pedido Totvs" ou "Teceo"
                'REF' => $linha['J'],
                'DESCRICAO' => $linha['K'],
                'COR' => $linha['L'],
                'TAM' => $linha['M'],
                'SaldoPedido' => (float) $linha['E'] // Supondo que E seja o "Saldo Pedido"
            ];
        }

        // Devolve os dados em JSON para o JavaScript montar a tela
        header('Content-Type: application/json');
        echo json_encode($dadosFormatados);
        exit;

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['erro' => 'Erro ao ler o arquivo: ' . $e->getMessage()]);
        exit;
    }
}
?>