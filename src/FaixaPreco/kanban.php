<?php
session_save_path(sys_get_temp_dir()); 
session_start();

// Volta duas pastas (FaixaPreco -> src -> raiz) para achar o index.php
if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    header("Location: ../../index.php");
    exit;
}
// Chama o arquivo do banco para conectar e verificar se as tabelas existem
require_once 'db.php';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanban de Produtos</title>
    <style>
        /* Design Verde e Branco */
        :root {
            --green-primary: #2E7D32;
            --green-light: #E8F5E9;
            --green-medium: #4CAF50;
            --white: #FFFFFF;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--green-light);
            color: var(--green-primary);
            margin: 0;
            padding: 0;
            font-size: 16px; 
        }

        /* Cabeçalho */
        .header {
            background-color: var(--green-primary);
            color: var(--white);
            padding: 15px 20px; 
            display: flex;
            flex-wrap: wrap;
            gap: 15px; 
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .filters {
            display: flex;
            gap: 12px; 
            flex-wrap: wrap;
            align-items: center;
        }

        .filters select {
            padding: 8px 10px; 
            border-radius: 4px;
            border: 1px solid var(--white);
            background: var(--white);
            color: var(--green-primary);
            outline: none;
            font-size: 1em; 
            text-transform: uppercase;
        }

        .global-indicator {
            background-color: var(--white);
            color: var(--green-primary);
            padding: 8px 15px; 
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.1em; 
            border: 2px solid var(--green-medium);
        }

        .btn {
            background-color: var(--green-medium);
            color: var(--white);
            border: 2px solid var(--white);
            padding: 8px 15px; 
            cursor: pointer;
            border-radius: 4px;
            font-weight: bold;
            transition: 0.3s;
            font-size: 1em; 
        }

        .btn:hover {
            background-color: var(--white);
            color: var(--green-primary);
        }

        /* Kanban Board */
        .kanban-board {
            display: flex;
            gap: 20px; 
            padding: 20px; 
            height: calc(100vh - 140px);
        }

        .kanban-column {
            background-color: var(--white);
            flex: 1;
            border: 2px solid var(--green-medium);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        .kanban-header {
            background-color: var(--green-medium);
            color: var(--white);
            padding: 15px; 
            text-align: center;
        }

        .kanban-header h3 { margin: 0 0 5px 0; font-size: 1.3em;} 
        .kanban-header .range-info { font-size: 0.9em; opacity: 0.9; } 
        .kanban-header .mix-info { font-weight: bold; margin-top: 5px; display: block; font-size: 1.05em;} 

        /* GRID PARA CARDS */
        .kanban-cards {
            padding: 15px; 
            overflow-y: auto;
            flex-grow: 1;
            background-color: #fafafa;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-gap: 15px; 
            align-content: start;
        }

        /* CARD */
        .card {
            background-color: var(--white);
            border: 1px solid var(--green-medium);
            border-top: 4px solid var(--green-primary);
            padding: 12px 15px; 
            border-radius: 6px; 
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            color: #333;
            gap: 6px; 
        }

        .card .ref {
            font-size: 0.9em; 
            color: #666;
            font-weight: normal;
        }

        .card .price {
            color: var(--green-primary);
            font-weight: bold;
            font-size: 1.15em; 
        }

        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0,0,0,0.6);
            z-index: 1000;
        }

        .modal-content {
            background-color: var(--white);
            width: 500px; 
            margin: 100px auto;
            padding: 25px; 
            border-radius: 8px;
            border: 3px solid var(--green-primary);
            position: relative;
        }

        .close-modal {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 26px; 
            cursor: pointer;
            color: var(--green-primary);
            font-weight: bold;
        }

        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 1em; } 
        th, td { border: 1px solid var(--green-medium); padding: 10px; text-align: center; } 
        th { background-color: var(--green-medium); color: var(--white); }
        input[type="number"] { width: 80px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 1em; } 
        
        .modal-footer { margin-top: 20px; text-align: right; }

        /* Rodapé Discreto */
        .footer {
            text-align: center;
            font-size: 0.85em;
            color: #666;
            padding: 8px;
            position: fixed;
            bottom: 0;
            width: 100%;
            background-color: var(--green-light);
            border-top: 1px solid #ccc;
            z-index: 100;
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="filters">
            <select id="filter-colecao"><option value="">COLECAO</option></select>
            <select id="filter-linha"><option value="">LINHA</option></select>
            <select id="filter-grupo"><option value="">GRUPO</option></select>
            
            <button class="btn" id="btn-config">Configurar Faixas</button>
        </div>
        <div class="global-indicator">
            Mix Total: <span id="total-mix">0</span> produtos
        </div>
    </div>

    <div id="configModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" id="close-modal">&times;</span>
            <h2>Configuração de Faixas de Preço</h2>
            <p style="font-size: 0.9em; color: #666; margin-top: 0;">Ajuste as faixas para este mix.</p>
            <table>
                <thead>
                    <tr>
                        <th>Faixa</th>
                        <th>De (R$)</th>
                        <th>Até (R$)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Entrada</strong></td>
                        <td><input type="number" id="entrada-min" value="0"></td>
                        <td><input type="number" id="entrada-max" value="99.99"></td>
                    </tr>
                    <tr>
                        <td><strong>Intermediário</strong></td>
                        <td><input type="number" id="inter-min" value="100.00"></td>
                        <td><input type="number" id="inter-max" value="299.99"></td>
                    </tr>
                    <tr>
                        <td><strong>Premium</strong></td>
                        <td><input type="number" id="premium-min" value="300.00"></td>
                        <td><input type="number" id="premium-max" value="9999.99"></td>
                    </tr>
                </tbody>
            </table>
            <div class="modal-footer">
                <button class="btn" id="btn-save-ranges" style="background-color: var(--green-primary);">Salvar e Atualizar</button>
            </div>
        </div>
    </div>

    <div class="kanban-board">
        <div class="kanban-column" id="col-entrada">
            <div class="kanban-header">
                <h3>Entrada</h3>
                <span class="range-info" id="info-range-entrada">R$ 0 - R$ 99.99</span>
                <span class="mix-info">Mix: <span id="mix-entrada">0</span> produtos</span>
            </div>
            <div class="kanban-cards" id="cards-entrada"></div>
        </div>

        <div class="kanban-column" id="col-inter">
            <div class="kanban-header">
                <h3>Intermediário</h3>
                <span class="range-info" id="info-range-inter">R$ 100.00 - R$ 299.99</span>
                <span class="mix-info">Mix: <span id="mix-inter">0</span> produtos</span>
            </div>
            <div class="kanban-cards" id="cards-inter"></div>
        </div>

        <div class="kanban-column" id="col-premium">
            <div class="kanban-header">
                <h3>Premium</h3>
                <span class="range-info" id="info-range-premium">R$ 300.00+</span>
                <span class="mix-info">Mix: <span id="mix-premium">0</span> produtos</span>
            </div>
            <div class="kanban-cards" id="cards-premium"></div>
        </div>
    </div>

    <div class="footer">
        Sincronizado às: <span id="last-sync">Aguardando dados...</span>
    </div>

    <script src="script.js"></script>
</body>
</html>