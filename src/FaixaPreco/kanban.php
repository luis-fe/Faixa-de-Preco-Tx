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
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
    
    <style>
        :root {
            --green-primary: #25382D;
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

        .header {
            background-color: var(--green-primary);
            color: var(--white);
            padding: 15px 20px; 
            display: flex; flex-wrap: wrap; gap: 15px; 
            align-items: center; justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* NAVEGAÇÃO SUPERIOR (Atualizada: Menor e sem bordas) */
        .top-nav {
            background-color: var(--white);
            padding: 5px 20px; /* Reduzido o padding vertical do container */
            display: flex;
            gap: 10px;
            border-bottom: 1px solid #ccc;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .nav-tab {
            background: none; 
            border: none; /* <-- RETIRADO O FRAME/BORDA AQUI */
            color: var(--green-primary); 
            padding: 3px 11px; /* <-- REDUZIDO O PADDING EM 1 CASA AQUI */
            border-radius: 10px; 
            font-weight: bold; 
            cursor: pointer;
            transition: 0.3s; 
            font-size: 0.7em; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .nav-tab.active { background: var(--green-primary); color: var(--white); }
        .nav-tab:hover { background: var(--green-medium); color: var(--white); }

        .filters { display: flex; gap: 15px; flex-wrap: wrap; align-items: center; }

        #filter-plano {
            padding: 8px 10px; border-radius: 4px; border: 1px solid var(--white);
            background: var(--white); color: var(--green-primary);
            font-weight: bold; cursor: pointer;
        }

        /* Dropdowns Suspensos */
        .multiselect-container { position: relative; display: inline-block; min-width: 180px; }
        .select-box {
            background-color: var(--white); color: var(--green-primary);
            padding: 8px 12px; border-radius: 4px; border: 1px solid #ccc;
            cursor: pointer; font-size: 0.9em; font-weight: bold;
            display: flex; justify-content: space-between; align-items: center;
        }
        
        .filter-subtitle {
            color: #888;
            font-size: 0.85em;
            font-weight: normal;
            margin-left: 6px;
        }

        .select-box::after { content: '▼'; font-size: 0.7em; margin-left: 10px; color: #888; }
        .checkboxes-list {
            display: none; position: absolute; background-color: var(--white);
            border: 1px solid #ccc; width: 100%; max-height: 250px;
            overflow-y: auto; z-index: 1001; box-shadow: 0 5px 15px rgba(0,0,0,0.2); padding: 5px 0;
        }
        .checkboxes-list.show { display: block; }
        .checkboxes-list label { display: block; padding: 8px 12px; color: #333; font-size: 0.85em; cursor: pointer; }
        .checkboxes-list label:hover { background-color: var(--green-light); }
        .checkboxes-list input { margin-right: 10px; }

        .global-indicator {
            background-color: var(--white); color: var(--green-primary);
            padding: 8px 15px; border-radius: 20px; font-weight: bold;
            border: 2px solid var(--green-medium);
        }

        .btn {
            background-color: var(--green-medium); color: var(--white);
            border: 2px solid var(--white); padding: 8px 15px;
            cursor: pointer; border-radius: 4px; font-weight: bold;
        }

        #btn-limpar-filtros {
            background: none; border: none; color: var(--green-light);
            text-decoration: underline; cursor: pointer; font-size: 0.85em;
            padding: 5px; opacity: 0.9;
        }
        #btn-limpar-filtros:hover { opacity: 1; color: var(--white); }

        /* Kanban Board */
        .kanban-board { display: flex; gap: 20px; padding: 20px; height: calc(100vh - 190px); }
        .kanban-column {
            background-color: var(--white); flex: 1; border: 2px solid var(--green-medium);
            border-radius: 8px; display: flex; flex-direction: column; overflow: hidden;
        }
        .kanban-header { background-color: var(--green-medium); color: var(--white); padding: 8px; text-align: center; }
        .kanban-header h3 { margin: 0 0 5px 0; font-size: 1.1em; }
        .range-info { font-size: 0.85em; opacity: 0.9; }
        .mix-info { display: block; margin-top: 5px; font-size: 1.1em; font-weight: bold; color: #E8F5E9; }
        .kanban-cards {
            padding: 15px; overflow-y: auto; flex-grow: 1; background-color: #fafafa;
            display: grid; grid-template-columns: repeat(2, 1fr); grid-gap: 15px; align-content: start;
        }
        
        /* CARD */
        .card {
            background-color: var(--white); border: 1px solid var(--green-medium); border-top: 4px solid var(--green-primary);
            padding: 10px; padding-bottom: 22px; 
            border-radius: 6px; display: flex; flex-direction: column; gap: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-height: 90px; justify-content: space-between;
            overflow: hidden; word-wrap: break-word;
            position: relative; 
        }
        .card .info-container { display: flex; flex-direction: column; gap: 2px; }
        .card .ref-code { font-size: 0.9em; color: #222; font-weight: bold; display: block; }
        .card .description { font-size: 0.78em; color: #757575; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card .price-container { display: flex; flex-direction: column; border-top: 1px solid #f0f0f0; padding-top: 6px; margin-top: 4px; }
        .card .b2b-row { display: flex; justify-content: space-between; align-items: baseline; }
        .card .price { color: var(--green-primary); font-weight: 800; font-size: 1.15em; white-space: nowrap; }
        .card .markup { color: #888; font-size: 0.85em; font-weight: bold; }
        .card .price-b2c { color: #673AB7; font-size: 0.75em; font-weight: bold; display: block; margin-top: -2px; }

        .subcolecao-badge {
            position: absolute; bottom: 0; right: 0; font-size: 0.68em; 
            font-weight: bold; padding: 3px 8px; border-top-left-radius: 6px; 
            letter-spacing: 0.5px; text-transform: uppercase;
        }

        /* CONTAINER DA PIRÂMIDE */
        #piramide-view {
            display: none; padding: 20px; background: white; margin: 20px; 
            border-radius: 8px; border: 2px solid var(--green-medium); 
            height: calc(100vh - 230px); box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        /* Estilos de Modais */
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; }
        .modal-content { background: #fff; margin: 5% auto; padding: 25px; border-radius: 8px; border: 3px solid var(--green-primary); position: relative;}
        .close-modal { position: absolute; top: 10px; right: 15px; font-size: 24px; cursor: pointer; color: var(--green-primary); font-weight: bold; }
        .footer { text-align: center; font-size: 0.8em; color: #666; padding: 10px; position: fixed; bottom: 0; width: 100%; background: var(--green-light); border-top: 1px solid #ccc;}

        #table-resumo { width: 100%; border-collapse: collapse; margin-top: 5px; }
        #table-resumo th, #table-resumo td { border: 1px solid #dcdcdc; padding: 10px; font-size: 0.9em; }
        #table-resumo thead th { background: #757575; color: white; padding: 12px; position: sticky; top: 0; cursor: pointer; font-size: 0.85em; text-align: left; border: 1px solid #616161; }
        #table-resumo thead th:hover { background: #9E9E9E; } 
        #table-resumo tbody tr:nth-child(even) { background-color: #f9f9f9; }
        #table-resumo tbody tr:hover { background-color: #e8f5e9; }
        .matrix-link { color: var(--green-primary); text-decoration: underline; cursor: pointer; font-weight: bold; display: block; }
        .matrix-link:hover { color: #1b5e20; background: rgba(76, 175, 80, 0.1); border-radius: 4px; }
        .matrix-link-white { color: white; text-decoration: underline; cursor: pointer; font-weight: bold; display: block; }
        .matrix-link-white:hover { color: #e8f5e9; }
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

            <div class="multiselect-container">
                <div class="select-box" onclick="toggleDropdown('list-colecao')">
                    <div>COLEÇÕES <span class="filter-subtitle" id="sub-colecao"></span></div>
                </div>
                <div class="checkboxes-list" id="list-colecao"></div>
            </div>

            <div class="multiselect-container">
                <div class="select-box" onclick="toggleDropdown('list-linha')">
                    <div>LINHAS <span class="filter-subtitle" id="sub-linha"></span></div>
                </div>
                <div class="checkboxes-list" id="list-linha"></div>
            </div>

            <div class="multiselect-container">
                <div class="select-box" onclick="toggleDropdown('list-grupo')">
                    <div>GRUPOS <span class="filter-subtitle" id="sub-grupo"></span></div>
                </div>
                <div class="checkboxes-list" id="list-grupo"></div>
            </div>

            <button class="btn" id="btn-config">Configurar Faixas</button>
            <button class="btn" id="btn-resumo">Resumo do Mix</button> 

            <button id="btn-limpar-filtros" title="Limpar todos os filtros">Limpar Filtros</button>
        </div>
        <div class="global-indicator">Mix Total: <span id="total-mix">0</span></div>
    </div>

    <div class="top-nav">
        <button class="nav-tab active" id="tab-kanban">📋 Faixa de Preço</button>
        <button class="nav-tab" id="tab-piramide">🔺 Pirâmide de Preços</button>
    </div>

    <div class="kanban-board" id="view-kanban">
        <div class="kanban-column" id="col-entrada">
            <div class="kanban-header">
                <h3>Entrada</h3>
                <span class="range-info" id="info-range-entrada" style="display: none;">R$ 0 - R$ 99.99</span>
                <span class="mix-info">Mix: <span id="mix-entrada">0</span></span>
            </div>
            <div class="kanban-cards" id="cards-entrada"></div>
        </div>
        <div class="kanban-column" id="col-inter">
            <div class="kanban-header">
                <h3>Intermediário</h3>
                <span class="range-info" id="info-range-inter" style="display: none;">R$ 100 - R$ 299</span>
                <span class="mix-info">Mix: <span id="mix-inter">0</span></span>
            </div>
            <div class="kanban-cards" id="cards-inter"></div>
        </div>
        <div class="kanban-column" id="col-premium">
            <div class="kanban-header">
                <h3>Premium</h3>
                <span class="range-info" id="info-range-premium" style="display: none;">Acima de R$ 300</span>
                <span class="mix-info">Mix: <span id="mix-premium">0</span></span>
            </div>
            <div class="kanban-cards" id="cards-premium"></div>
        </div>
    </div>

    <div id="piramide-view">
        <canvas id="graficoPiramide"></canvas>
    </div>

    <div id="configModal" class="modal">
        <div class="modal-content" style="width: 600px;"> 
            <span class="close-modal" id="close-modal">&times;</span>
            <h2 style="margin: 0 0 5px 0; font-size: 1.4em;">Configurar Faixas</h2>
            <hr style="border: 0; border-top: 1px solid #eee; margin-bottom: 20px;">
            <div style="margin-bottom: 20px;">
                <label style="font-size: 0.75em; font-weight: bold; display: block; margin-bottom: 5px;">1. SELECIONE O GRUPO</label>
                <select id="modal-filter-grupo" style="width: 100%; padding: 10px; border-radius: 4px; border: 1px solid var(--green-primary); font-weight: bold;"></select>
            </div>
            <div id="msg-selecione-filtros" style="text-align: center; color: #757575; padding: 20px 0; font-style: italic;">
                ⚠️ Selecione um Grupo para carregar as Linhas vinculadas.
            </div>
            <div id="config-faixas-area" style="display: none;">
                <div style="display: flex; font-size: 0.7em; font-weight: bold; color: #666; margin-bottom: 10px; padding: 0 10px;">
                    <div style="flex: 2;">LINHA</div>
                    <div style="flex: 1.5; text-align: center;">ENTRADA (ATÉ)</div>
                    <div style="flex: 1.5; text-align: center;">INTERMED. (ATÉ)</div>
                    <div style="flex: 1; text-align: center;">PREMIUM</div>
                </div>
                <div id="linhas-dinamicas-container" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px; border: 1px solid #eee; padding: 10px; border-radius: 4px;"></div>
                <div class="modal-footer" style="text-align: right;">
                    <button class="btn" id="btn-save-ranges" style="background-color: var(--green-primary); width: 100%; border: none; padding: 15px; font-size: 1em;">Salvar Todas as Faixas do Grupo</button>
                </div>
            </div>
        </div>
    </div>

    <div id="summaryModal" class="modal">
        <div class="modal-content" style="width: 900px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;">
            <span class="close-modal" id="close-summary">&times;</span>
            <h2 style="margin: 0;">Resumo do Mix</h2>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
            <div style="background: #f1f8e9; padding: 10px; border-radius: 6px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                <label style="font-size: 0.8em; font-weight: bold; color: var(--green-primary);">FILTRAR POR GRUPO:</label>
                <select id="resumo-filter-grupo" style="flex-grow: 1; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold;">
                    <option value="TODOS">TODOS OS GRUPOS</option>
                </select>
            </div>
            <div style="text-align: right; margin-bottom: 5px;">
                <button id="btn-toggle-colecao" style="font-size: 0.7em; padding: 6px 12px; background-color: #757575; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ➕ Expandir Coleções
                </button>
            </div>
            <div style="overflow-y: auto; overflow-x: auto; flex-grow: 1;">
                <table id="table-resumo">
                    <thead id="thead-resumo"></thead>
                    <tbody id="body-resumo"></tbody>
                    <tfoot id="tfoot-resumo" style="position: sticky; bottom: 0; background: #757575; color: white; font-weight: bold;"></tfoot>
                </table>
            </div>
        </div>
    </div>

    <div class="footer">Sincronizado às: <span id="last-sync">--:--</span></div>

    <script src="script.js?v=<?php echo time(); ?>"></script>
    
    <script>
        function toggleDropdown(id) {
            document.querySelectorAll('.checkboxes-list').forEach(l => {
                if(l.id !== id) l.classList.remove('show');
            });
            document.getElementById(id).classList.toggle('show');
        }
        window.addEventListener('click', function(e) {
            if (!e.target.closest('.multiselect-container')) {
                document.querySelectorAll('.checkboxes-list').forEach(l => l.classList.remove('show'));
            }
        });
    </script>
</body>
</html>