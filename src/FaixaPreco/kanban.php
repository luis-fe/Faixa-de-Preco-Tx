<?php
session_save_path(sys_get_temp_dir()); 
session_start();

if (!isset($_SESSION['logado']) || $_SESSION['logado'] !== true) {
    header("Location: ../../index.php");
    exit;
}
require_once __DIR__ . '/../../db.php';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanban de Produtos</title>
    <style>
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
            margin: 0; padding: 0;
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

        .filters { display: flex; gap: 15px; flex-wrap: wrap; align-items: center; }

        /* Estilo Select Plano */
        #filter-plano {
            padding: 8px 10px;
            border-radius: 4px;
            border: 1px solid var(--white);
            background: var(--white);
            color: var(--green-primary);
            font-weight: bold;
            cursor: pointer;
        }

        /* CUSTOM MULTI-SELECT (Dropdown Suspenso) */
        .multiselect-container {
            position: relative;
            display: inline-block;
            min-width: 180px;
        }

        .select-box {
            background-color: var(--white);
            color: var(--green-primary);
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #ccc;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .select-box::after { content: '▼'; font-size: 0.7em; margin-left: 10px; }

        .checkboxes-list {
            display: none;
            position: absolute;
            background-color: var(--white);
            border: 1px solid #ccc;
            width: 100%;
            max-height: 250px;
            overflow-y: auto;
            z-index: 1001;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            padding: 5px 0;
        }

        .checkboxes-list.show { display: block; }

        .checkboxes-list label {
            display: block;
            padding: 8px 12px;
            color: #333;
            font-size: 0.85em;
            cursor: pointer;
        }

        .checkboxes-list label:hover { background-color: var(--green-light); }
        .checkboxes-list input { margin-right: 10px; }

        /* Estilo do Kanban (Mantido) */
        .global-indicator {
            background-color: var(--white); color: var(--green-primary);
            padding: 8px 15px; border-radius: 20px; font-weight: bold;
            border: 2px solid var(--green-medium);
        }

        .kanban-board { display: flex; gap: 20px; padding: 20px; height: calc(100vh - 140px); }
        .kanban-column {
            background-color: var(--white); flex: 1; border: 2px solid var(--green-medium);
            border-radius: 8px; display: flex; flex-direction: column; overflow: hidden;
        }
        .kanban-header { background-color: var(--green-medium); color: var(--white); padding: 15px; text-align: center; }
        .kanban-cards {
            padding: 15px; overflow-y: auto; flex-grow: 1; background-color: #fafafa;
            display: grid; grid-template-columns: repeat(3, 1fr); grid-gap: 15px; align-content: start;
        }
       
        /* CARD ATUALIZADO */
        .card {
            background-color: var(--white);
            border: 1px solid var(--green-medium);
            border-top: 4px solid var(--green-primary);
            padding: 12px;
            border-radius: 6px;
            display: flex;
            flex-direction: column; /* Garante que os itens fiquem um abaixo do outro */
            gap: 8px; /* Espaço entre a descrição e o preço */
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            min-height: 80px;
            justify-content: space-between;
        }

        .card .ref-desc {
            font-size: 0.85em;
            color: #333;
            font-weight: 500;
            line-height: 1.2;
            /* Se a descrição for muito longa, ela quebra em até 2 linhas e põe reticências */
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .card .price {
            color: var(--green-primary);
            font-weight: 800;
            font-size: 1.2em;
            display: block; /* Garante que o preço ocupe a linha toda se necessário */
            border-top: 1px solid #eee; /* Uma linha bem discreta para separar */
            padding-top: 5px;
        }
        /* Modal e Outros */
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; }
        .modal-content { background: #fff; width: 450px; margin: 10% auto; padding: 20px; border-radius: 8px; border: 3px solid var(--green-primary); }
        .footer { text-align: center; font-size: 0.8em; color: #666; padding: 10px; position: fixed; bottom: 0; width: 100%; background: var(--green-light); }
    </style>
</head>
<body>

    <div class="header">
        <div class="filters">
            <select id="filter-plano">
                <option value="">SELECIONE O PLANO</option>
                <?php
                $stmt = $pdo->query('SELECT plano FROM "Plano" ORDER BY plano');
                while($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    echo '<option value="'.$r['plano'].'">'.$r['plano'].'</option>';
                }
                ?>
            </select>

            <div class="multiselect-container" id="container-colecao">
                <div class="select-box" onclick="toggleDropdown('list-colecao')">COLEÇÕES</div>
                <div class="checkboxes-list" id="list-colecao"></div>
            </div>

            <div class="multiselect-container" id="container-linha">
                <div class="select-box" onclick="toggleDropdown('list-linha')">LINHAS</div>
                <div class="checkboxes-list" id="list-linha"></div>
            </div>

            <div class="multiselect-container" id="container-grupo">
                <div class="select-box" onclick="toggleDropdown('list-grupo')">GRUPOS</div>
                <div class="checkboxes-list" id="list-grupo"></div>
            </div>

            <button class="btn" id="btn-config">Configurar Faixas</button>
        </div>
        <div class="global-indicator">Mix Total: <span id="total-mix">0</span></div>
    </div>

    <div class="kanban-board">
        <div class="kanban-column" id="col-entrada">
            <div class="kanban-header">
                <h3>Entrada</h3>
                <span class="range-info" id="info-range-entrada">R$ 0 - R$ 99.99</span>
                <span class="mix-info">Mix: <span id="mix-entrada">0</span></span>
            </div>
            <div class="kanban-cards" id="cards-entrada"></div>
        </div>
        <div class="kanban-column" id="col-inter">
            <div class="kanban-header">
                <h3>Intermediário</h3>
                <span class="range-info" id="info-range-inter">R$ 100 - R$ 299</span>
                <span class="mix-info">Mix: <span id="mix-inter">0</span></span>
            </div>
            <div class="kanban-cards" id="cards-inter"></div>
        </div>
        <div class="kanban-column" id="col-premium">
            <div class="kanban-header">
                <h3>Premium</h3>
                <span class="range-info" id="info-range-premium">R$ 300+</span>
                <span class="mix-info">Mix: <span id="mix-premium">0</span></span>
            </div>
            <div class="kanban-cards" id="cards-premium"></div>
        </div>
    </div>

    <div id="configModal" class="modal">
        <div class="modal-content">
            <h3>Faixas de Preço</h3>
            <table style="width:100%">
                <tr><td>Entrada</td><td>Até</td><td><input type="number" id="entrada-max" value="99.99"></td></tr>
                <tr><td>Inter</td><td>Até</td><td><input type="number" id="inter-max" value="299.99"></td></tr>
            </table>
            <button class="btn" id="btn-save-ranges" style="margin-top:15px">Salvar</button>
        </div>
    </div>

    <div class="footer">Sincronizado às: <span id="last-sync">--:--</span></div>

    <script src="script.js"></script>
    <script>
        // Função global para o toggle do dropdown
        function toggleDropdown(id) {
            document.querySelectorAll('.checkboxes-list').forEach(l => {
                if(l.id !== id) l.classList.remove('show');
            });
            document.getElementById(id).classList.toggle('show');
        }

        // Fecha se clicar fora
        window.addEventListener('click', function(e) {
            if (!e.target.closest('.multiselect-container')) {
                document.querySelectorAll('.checkboxes-list').forEach(l => l.classList.remove('show'));
            }
        });
    </script>
</body>
</html>