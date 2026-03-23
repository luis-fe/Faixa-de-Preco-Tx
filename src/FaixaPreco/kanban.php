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
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
    
    <style>
        :root {
            --green-primary: #25382D;
            --green-light: #E8F5E9;
            --green-medium: #4CAF50;
            --white: #FFFFFF;
            --purple-b2c: #673AB7; 
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--green-light);
            color: var(--green-primary);
            margin: 0; padding: 0;
            overflow-x: hidden;
        }

        .header {
            background-color: var(--green-primary);
            color: var(--white);
            padding: 10px 20px; 
            display: flex; flex-wrap: wrap; gap: 15px; 
            align-items: center; justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative; z-index: 100;
        }

        .logo-header {
            height: 35px; 
            object-fit: contain; 
            margin-right: 10px; 
            border-radius: 4px; 
        }

        .top-nav {
            background-color: var(--white);
            padding: 8px 20px; 
            display: flex;
            gap: 8px;
            border-bottom: 1px solid #ccc;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            position: relative; z-index: 90;
            flex-wrap: wrap; 
        }
        .nav-tab {
            background: none; 
            border: none;
            color: var(--green-primary); 
            padding: 4px 12px; 
            border-radius: 8px; 
            font-weight: bold; 
            cursor: pointer;
            transition: 0.3s; 
            font-size: 0.75em; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
        }
        .nav-tab.active { background: var(--green-primary); color: var(--white); opacity: 1; }
        .nav-tab:hover { background: var(--green-light); opacity: 1; }
        .nav-tab.active:hover { background: var(--green-primary); }

        /* Ajuste: Retirado o width: 100% para não quebrar a linha no PC */
        .filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

        #filter-plano {
            padding: 6px 10px; border-radius: 4px; border: 1px solid var(--white);
            background: var(--white); color: var(--green-primary);
            font-weight: bold; cursor: pointer; font-size: 0.85em;
        }

        .multiselect-container { position: relative; display: inline-block; min-width: 160px; }
        .select-box {
            background-color: var(--white); color: var(--green-primary);
            padding: 6px 12px; border-radius: 4px; border: 1px solid #ccc;
            cursor: pointer; font-size: 0.85em; font-weight: bold;
            display: flex; justify-content: space-between; align-items: center;
        }
        
        .filter-subtitle { color: #888; font-size: 0.8em; font-weight: normal; margin-left: 4px; }
        .select-box::after { content: '▼'; font-size: 0.7em; margin-left: 8px; color: #888; }
        
        .checkboxes-list {
            display: none; position: absolute; background-color: var(--white);
            border: 1px solid #ccc; width: 100%; max-height: 250px;
            overflow-y: auto; z-index: 1001; box-shadow: 0 5px 15px rgba(0,0,0,0.2); padding: 5px 0;
            border-radius: 4px;
        }
        .checkboxes-list.show { display: block; }
        .checkboxes-list label { display: block; padding: 6px 12px; color: #333; font-size: 0.8em; cursor: pointer; }
        .checkboxes-list label:hover { background-color: var(--green-light); }
        .checkboxes-list input { margin-right: 8px; }

        .global-indicator {
            background-color: var(--white); color: var(--green-primary);
            padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85em;
            border: 2px solid var(--green-medium);
            white-space: nowrap;
        }

        .btn-custom {
            background-color: var(--green-medium); color: var(--white);
            border: 1px solid var(--white); padding: 6px 12px;
            cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 0.85em;
        }
        .btn-custom:hover { background-color: var(--white); color: var(--green-medium); border-color: var(--green-medium); }

        #btn-limpar-filtros {
            background: none; border: none; color: var(--green-light);
            text-decoration: underline; cursor: pointer; font-size: 0.8em;
            padding: 5px; opacity: 0.8;
            white-space: nowrap;
        }
        #btn-limpar-filtros:hover { opacity: 1; color: var(--white); }

        /* Kanban Board */
        .kanban-board { min-height: calc(100vh - 170px); height: auto; }
        .kanban-column {
            background-color: var(--white); border: 1px solid #ddd;
            border-radius: 8px; display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            height: 100%; 
            min-height: 400px; 
        }
        .kanban-header { background-color: var(--green-medium); color: var(--white); padding: 8px; text-align: center; border-bottom: 2px solid var(--green-primary); }
        .kanban-header h3 { margin: 0 0 3px 0; font-size: 1em; text-transform: uppercase; letter-spacing: 1px; }
        .range-info { font-size: 0.75em; opacity: 0.9; display: block; margin-bottom: 3px; color: #fff;}
        .mix-info { display: block; font-size: 1em; font-weight: bold; color: var(--white); text-shadow: 1px 1px 2px rgba(0,0,0,0.2); }
        
        /* Retornamos para as 2 colunas fixas originais que você gostou */
        .kanban-cards {
            padding: 10px; overflow-y: auto; flex-grow: 1; background-color: #f5f5f5;
            display: grid; grid-template-columns: repeat(2, 1fr); grid-gap: 10px; align-content: start;
        }
        
        /* CARD (Com as regras originais fortes para sobrepor o Bootstrap) */
        .card {
            background-color: var(--white) !important; border: 1px solid #eee !important; border-top: 3px solid var(--green-primary) !important;
            padding: 8px !important; padding-bottom: 20px !important; 
            border-radius: 4px !important; display: flex !important; flex-direction: column !important; gap: 4px !important;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important; min-height: 80px !important; justify-content: space-between !important;
            overflow: hidden !important; position: relative !important; transition: 0.2s !important;
            flex-direction: column; /* Sobrescreve flex-row acidental do BS */
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important; }
        
        .card .info-container { display: flex; flex-direction: column; gap: 1px; }
        .card .ref-code { font-size: 0.85em; color: #222; font-weight: bold; display: block; }
        .card .description { font-size: 0.75em; color: #666; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 1.8em; margin-bottom: 0;}
        .card .price-container { display: flex; flex-direction: column; border-top: 1px solid #f0f0f0; padding-top: 4px; margin-top: 2px; }
        .card .b2b-row { display: flex; justify-content: space-between; align-items: baseline; }
        .card .price { color: var(--green-primary); font-weight: 800; font-size: 1.1em; white-space: nowrap; }
        .card .markup { color: #888; font-size: 0.8em; font-weight: bold; }
        .card .price-b2c { color: var(--purple-b2c); font-size: 0.7em; font-weight: bold; display: block; margin-top: -1px; }

        .subcolecao-badge {
            position: absolute; bottom: 0; right: 0; font-size: 0.65em; 
            font-weight: bold; padding: 2px 6px; border-top-left-radius: 4px; 
            letter-spacing: 0.5px; text-transform: uppercase; max-width: 70%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* VISÃO PIRÂMIDE */
        #piramide-view {
            min-height: calc(100vh - 165px); 
            height: auto;
        }

        .chart-controls {
            display: flex; justify-content: flex-start; align-items: center;
            margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; gap: 15px;
        }

        .control-label { font-size: 0.85em; font-weight: bold; color: #555; margin-bottom: 0;}

        .price-toggle-container {
            display: flex; align-items: center; gap: 10px;
            background: #f5f5f5; padding: 5px 15px; border-radius: 20px; border: 1px solid #ddd;
        }

        .toggle-text { font-size: 0.8em; font-weight: bold; transition: 0.3s; }
        .toggle-text.b2b { color: var(--green-primary); }
        .toggle-text.b2c { color: #999; }

        .switch { position: relative; display: inline-block; width: 40px; height: 20px; margin-bottom: 0;}
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--green-primary); transition: .4s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }

        input:checked + .slider { background-color: var(--purple-b2c); }
        input:checked + .slider:before { transform: translateX(20px); }
        input:checked ~ .toggle-text.b2b { color: #999; }
        input:checked ~ .toggle-text.b2c { color: var(--purple-b2c); }
        
        .chart-canvas-wrapper { width: 100%; min-height: 400px; flex-grow: 1; position: relative; }

        /* Tabela Lateral */
        .piramide-right-col {
            display: flex; flex-direction: column; height: 100%; min-height: 400px;
        }

        #side-summary-table { width: 100%; border-collapse: collapse; font-size: 0.85em; margin-bottom: 0;}
        #side-summary-table th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; position: sticky; top: 0; color: #444;}
        #side-summary-table td { padding: 6px 8px; border-bottom: 1px solid #eee; }
        
        #side-summary-table tbody tr { cursor: pointer; transition: 0.2s; }
        #side-summary-table tbody tr:hover { background-color: #f1f8e9; }
        #side-summary-table tbody tr.dimmed { opacity: 0.35; }
        #side-summary-table tbody tr.selected { background-color: var(--green-light); border-left: 4px solid var(--green-primary); }

        /* Modais Customizados */
        .modal-custom-backdrop { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; overflow-y: auto; padding: 20px; }
        .modal-custom-content { background: #fff; margin: auto; padding: 20px; border-radius: 8px; border: 2px solid var(--green-primary); position: relative; width: 100%; }
        .close-modal { position: absolute; top: 8px; right: 12px; font-size: 22px; cursor: pointer; color: var(--green-primary); font-weight: bold; opacity: 0.7; z-index: 10; }
        .close-modal:hover { opacity: 1; }
        
        .footer { text-align: center; font-size: 0.75em; color: #888; padding: 8px; position: fixed; bottom: 0; width: 100%; background: var(--green-light); border-top: 1px solid #ddd; z-index: 80;}

        #table-resumo { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 0;}
        #table-resumo th, #table-resumo td { border: 1px solid #eee; padding: 8px; font-size: 0.85em; text-align: left; }
        #table-resumo thead th { background: #666; color: white; position: sticky; top: 0; cursor: pointer; text-transform: uppercase; font-size: 0.8em; letter-spacing: 0.5px; border-color: #555;}
        #table-resumo thead th:hover { background: #777; } 
        #table-resumo tbody tr:nth-child(even) { background-color: #fafafa; }
        #table-resumo tbody tr:hover { background-color: #e8f5e9; }
        .matrix-link { color: var(--green-primary); text-decoration: underline; cursor: pointer; font-weight: bold; display: block; }
        .matrix-link:hover { color: var(--green-medium); }
        .matrix-link-white { color: white; text-decoration: underline; cursor: pointer; font-weight: bold; display: block; }
        .matrix-link-white:hover { color: var(--green-light); }

        /* === MEDIA QUERIES PARA MOBILE === */
        @media (max-width: 991px) {
            .header { flex-direction: column; align-items: stretch; }
            /* No celular, os filtros empilham ocupando a tela toda */
            .filters { flex-direction: column; align-items: stretch; width: 100%; } 
            .multiselect-container { max-width: 100%; width: 100%; }
            .global-indicator { margin-left: 0; text-align: center; margin-top: 10px; }
            .btn-group-mobile { display: flex; gap: 10px; width: 100%; }
            .btn-group-mobile .btn-custom { flex: 1; }
            
            .piramide-right-col {
                border-left: none !important;
                padding-left: 0 !important;
                border-top: 2px solid #eee;
                padding-top: 20px;
                margin-top: 20px;
            }
            .kanban-cards { grid-template-columns: 1fr; } /* 1 Card por linha no mobile */
        }
        @media (min-width: 992px) {
            .piramide-right-col { border-left: 1px solid #eee; padding-left: 15px; }
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="filters">
            
            <img src="../static/logo.jpeg" alt="Logo" class="logo-header">

            <select id="filter-plano">
                <option value="">PLANO</option>
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

            <div class="btn-group-mobile">
                <button class="btn-custom" id="btn-config">Faixas</button>
                <button class="btn-custom" id="btn-resumo">Resumo Mix</button> 
            </div>

            <button id="btn-limpar-filtros" title="Limpar todos os filtros">Limpar Filtros</button>
        </div>
        <div class="global-indicator mt-2 mt-lg-0">Mix Total: <span id="total-mix">0</span></div>
    </div>

    <div class="top-nav">
        <button class="nav-tab active" id="tab-kanban">📋 Faixa de Preço</button>
        <button class="nav-tab" id="tab-piramide">🔺 Pirâmide de Preços</button>
    </div>

    <div class="kanban-board container-fluid py-3" id="view-kanban" style="display: flex;">
        <div class="row w-100 m-0 g-3">
            
            <div class="col-12 col-lg-4">
                <div class="kanban-column" id="col-entrada">
                    <div class="kanban-header">
                        <h3>Entrada</h3>
                        <span class="range-info" id="info-range-entrada" style="display: none;"></span>
                        <span class="mix-info">Mix: <span id="mix-entrada">0</span></span>
                    </div>
                    <div class="kanban-cards" id="cards-entrada"></div>
                </div>
            </div>
            
            <div class="col-12 col-lg-4">
                <div class="kanban-column" id="col-inter">
                    <div class="kanban-header">
                        <h3>Intermediário</h3>
                        <span class="range-info" id="info-range-inter" style="display: none;"></span>
                        <span class="mix-info">Mix: <span id="mix-inter">0</span></span>
                    </div>
                    <div class="kanban-cards" id="cards-inter"></div>
                </div>
            </div>
            
            <div class="col-12 col-lg-4">
                <div class="kanban-column" id="col-premium">
                    <div class="kanban-header">
                        <h3>Premium</h3>
                        <span class="range-info" id="info-range-premium" style="display: none;"></span>
                        <span class="mix-info">Mix: <span id="mix-premium">0</span></span>
                    </div>
                    <div class="kanban-cards" id="cards-premium"></div>
                </div>
            </div>

        </div>
    </div>

    <div class="container-fluid py-3" id="piramide-view" style="display: none;">
        <div class="row w-100 m-0 bg-white border rounded shadow-sm p-3">
            
            <div class="col-12 col-lg-7 d-flex flex-column mb-4 mb-lg-0">
                <div class="chart-controls">
                    <label class="control-label">Análise por:</label>
                    <div class="price-toggle-container">
                        <span class="toggle-text b2b">Preço B2B</span>
                        <label class="switch">
                            <input type="checkbox" id="toggle-tipo-preco">
                            <span class="slider"></span>
                        </label>
                        <span class="toggle-text b2c">Preço B2C</span>
                    </div>
                </div>
                <div class="chart-canvas-wrapper">
                    <canvas id="graficoPiramide"></canvas>
                </div>
            </div>

            <div class="col-12 col-lg-5 piramide-right-col">
                <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="font-size: 0.8em; font-weight: bold; color: var(--green-primary); margin-bottom: 0;">GÊNERO:</label>
                        <select id="filtro-tabela-genero" class="form-select form-select-sm shadow-none border-secondary text-dark fw-bold">
                            <option value="TODOS" selected>TODOS</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Infantil">Infantil</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <button id="btn-explode-visao" class="btn btn-sm btn-outline-secondary fw-bold" style="white-space: nowrap;">🔽 Explodir Grupos</button>
                </div>
                <div style="overflow-y: auto; flex-grow: 1;">
                    <table id="side-summary-table">
                        <thead>
                            </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>

    <div id="configModal" class="modal-custom-backdrop">
        <div class="modal-custom-content shadow" style="max-width: 500px;"> 
            <span class="close-modal" id="close-modal">&times;</span>
            <h2 style="margin: 0 0 10px 0; font-size: 1.2em; text-transform: uppercase;">Configurar Faixas</h2>
            <div style="margin-bottom: 15px;">
                <label style="font-size: 0.8em; font-weight: bold; display: block; margin-bottom: 4px;">GRUPO</label>
                <select id="modal-filter-grupo" class="form-select border-secondary fw-bold text-dark"></select>
            </div>
            <div id="msg-selecione-filtros" style="text-align: center; color: #888; padding: 20px 0; font-style: italic; font-size: 0.9em;">
                ⚠️ Selecione um Grupo para carregar as Linhas.
            </div>
            <div id="config-faixas-area" style="display: none;">
                <div id="linhas-dinamicas-container" style="max-height: 350px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #eee; padding: 5px; border-radius: 4px;"></div>
                <div class="mt-3">
                    <button class="btn-custom w-100 py-2 fs-6" id="btn-save-ranges" style="background-color: var(--green-primary); border: none;">Salvar Faixas do Grupo</button>
                </div>
            </div>
        </div>
    </div>

    <div id="summaryModal" class="modal-custom-backdrop">
        <div class="modal-custom-content shadow d-flex flex-column" style="max-width: 900px; height: 90vh;">
            <span class="close-modal" id="close-summary">&times;</span>
            <h2 style="margin: 0 0 10px 0; font-size: 1.2em; text-transform: uppercase;">Resumo do Mix</h2>
            
            <div class="bg-light p-2 rounded mb-3 d-flex align-items-center gap-2 border">
                <label style="font-size: 0.85em; font-weight: bold; color: #555; white-space: nowrap; margin-bottom: 0;">FILTRAR GRUPO:</label>
                <select id="resumo-filter-grupo" class="form-select form-select-sm border-secondary fw-bold text-dark">
                    <option value="TODOS">TODOS</option>
                </select>
                <button id="btn-toggle-colecao" class="btn btn-secondary btn-sm fw-bold px-3 text-nowrap">➕ Expandir</button>
            </div>
            
            <div style="overflow: auto; flex-grow: 1; border: 1px solid #eee; border-radius: 4px;">
                <table id="table-resumo">
                    <thead id="thead-resumo"></thead>
                    <tbody id="body-resumo"></tbody>
                    <tfoot id="tfoot-resumo" style="position: sticky; bottom: 0; background: #666; color: white; font-weight: bold; z-index: 10;"></tfoot>
                </table>
            </div>
        </div>
    </div>

    <div class="footer pb-1">Sincronizado às: <span id="last-sync">--:--</span></div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
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