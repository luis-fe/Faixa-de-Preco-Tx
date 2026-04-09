<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Painel de Análise - Grade Dupla</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

    <style>
        :root {
            --green-primary: #25382D;
            --green-light: #E8F5E9;
            --green-medium: #4CAF50;
            --white: #FFFFFF;
        }

        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: var(--green-light); color: var(--green-primary); margin: 0; }
        .header { background-color: var(--green-primary); color: var(--white); padding: 8px 15px; display: flex; gap: 15px; align-items: center; justify-content: space-between; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .logo-header { height: 35px; border-radius: 4px; }
        .filters { display: flex; gap: 15px; flex-wrap: wrap; align-items: center; width: 100%; justify-content: flex-start; }
        .top-nav { background-color: var(--white); padding: 8px 20px; border-bottom: 1px solid #ccc; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .nav-tab { background: var(--green-primary); border: none; color: var(--white); padding: 4px 12px; border-radius: 8px; font-weight: bold; font-size: 0.75em; text-transform: uppercase; }
        .matriz-container { background-color: var(--white); border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .ref-title { background-color: var(--green-primary); color: var(--white); padding: 10px 15px; border-radius: 4px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
        
        .table-matriz { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        .table-matriz th, .table-matriz td { border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 0.9em; }
        
        /* Estilos específicos para Negativo e Positivo */
        .grade-negativa th { background-color: #ffebee; color: #c62828; }
        .grade-positiva th { background-color: #e8f5e9; color: #2e7d32; }
        .grade-title { font-size: 0.9em; font-weight: bold; text-align: center; margin-bottom: 5px; text-transform: uppercase; }
        .grade-title.neg { color: #c62828; }
        .grade-title.pos { color: #2e7d32; }

        .select2-container { flex-grow: 1; max-width: 500px; }
        .loading-badge { background-color: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }
    </style>
</head>
<body>

    <div class="header">
        <div class="filters">
            <img src="../static/logo.jpeg" alt="Logo" class="logo-header" onerror="this.src='https://via.placeholder.com/100x35?text=LOGO'">
            <div id="status-db" class="loading-badge">⏳ Carregando bases de dados...</div>
            <select id="seletorPedidos" multiple="multiple" disabled></select>
        </div>
    </div>

    <div class="top-nav">
        <button class="nav-tab">📋 Análise Dupla: Pedido vs Estoque</button>
    </div>

    <div class="container-fluid py-4">
        
        <div class="alert alert-secondary text-center" id="msg-central">Aguardando leitura dos arquivos Excel...</div>
        
        <div id="areaGrades"></div>

    </div>

    <script>
        let dadosPedidos = []; // Veio da AnaliseSaldoNegativo.xlsx
        let dadosEstoque = []; // Veio da estoque.xlsx

        $(document).ready(function() {
            $('#seletorPedidos').select2({ placeholder: "Pesquise ou selecione um pedido...", allowClear: true, width: 'resolve' });
            $('#seletorPedidos').on('change', function() { gerarGrades($(this).val()); });

            carregarPlanilhasDoServidor();
        });

        async function carregarPlanilhasDoServidor() {
            try {
                const ts = Date.now(); // Impede o cache
                
                const [respPedidos, respEstoque] = await Promise.all([
                    fetch('AnaliseSaldoNegativo.xlsx?v=' + ts),
                    fetch('estoque.xlsx?v=' + ts)
                ]);
                
                if (!respPedidos.ok) throw new Error("AnaliseSaldoNegativo.xlsx não encontrada.");
                if (!respEstoque.ok) throw new Error("estoque.xlsx não encontrada.");

                // PROCESSA PLANILHA 1: PEDIDOS
                const abPedidos = await respPedidos.arrayBuffer();
                const wbPedidos = XLSX.read(new Uint8Array(abPedidos), {type: 'array'});
                const jsonPedidos = XLSX.utils.sheet_to_json(wbPedidos.Sheets[wbPedidos.SheetNames[0]]);
                dadosPedidos = jsonPedidos.map(linha => ({
                    Pedido: linha['Pedido Totvs'], 
                    REF: linha['REF'] ? String(linha['REF']).trim().toUpperCase() : '',
                    DESCRICAO: linha['DESCRICAO'],
                    COR: linha['COR'],
                    TAM: linha['TAM'],
                    SaldoPedido: parseFloat(linha['Saldo Pedido']) || 0 
                }));

                // PROCESSA PLANILHA 2: ESTOQUE
                const abEstoque = await respEstoque.arrayBuffer();
                const wbEstoque = XLSX.read(new Uint8Array(abEstoque), {type: 'array'});
                const jsonEstoque = XLSX.utils.sheet_to_json(wbEstoque.Sheets[wbEstoque.SheetNames[0]]);
                dadosEstoque = jsonEstoque.map(linha => ({
                    REF: linha['Referencia'] ? String(linha['Referencia']).trim().toUpperCase() : '', 
                    COR: linha['Cor'],
                    TAM: linha['Tam'],
                    Estoque: parseFloat(linha['Estoque']) || 0 
                }));

                // Libera a tela
                preencherSeletorPedidos(dadosPedidos);
                document.getElementById('status-db').innerHTML = '✅ Bases Sincronizadas';
                document.getElementById('status-db').style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
                document.getElementById('msg-central').className = 'alert alert-success text-center';
                document.getElementById('msg-central').innerHTML = 'Bases carregadas com sucesso! Selecione os pedidos para ver a grade dupla.';

            } catch (erro) {
                console.error(erro);
                document.getElementById('status-db').innerHTML = '❌ Erro de Leitura';
                document.getElementById('status-db').style.backgroundColor = 'rgba(244, 67, 54, 0.8)';
                document.getElementById('msg-central').className = 'alert alert-danger text-center';
                document.getElementById('msg-central').innerHTML = `Erro ao ler as planilhas: ${erro.message}. Verifique se ambas estão na pasta.`;
            }
        }

        function preencherSeletorPedidos(dados) {
            const consolidado = dados.reduce((acc, item) => {
                const pedido = item.Pedido;
                if (!acc[pedido]) {
                    acc[pedido] = 0;
                }
                acc[pedido] += item.SaldoPedido;
                return acc;
            }, {});

            const listaParaOrdenar = Object.keys(consolidado).map(pedidoId => {
                return {
                    id: pedidoId,
                    saldoConsolidado: consolidado[pedidoId]
                };
            });

            listaParaOrdenar.sort((a, b) => b.saldoConsolidado - a.saldoConsolidado);

            const seletor = $('#seletorPedidos');
            seletor.empty(); 
            
            listaParaOrdenar.forEach(item => {
                const textoLabel = `Pedido: ${item.id} [Saldo: ${item.saldoConsolidado.toLocaleString('pt-BR')}]`;
                seletor.append(new Option(textoLabel, item.id, false, false));
            });

            seletor.prop('disabled', false); 
            seletor.trigger('change');
        }

        function montarTabelaHTML(infoGrade, cssClasse, campoValor) {
            const tamanhosArray = Array.from(infoGrade.tamanhos).sort();
            const coresArray = Array.from(infoGrade.cores).sort();

            let html = `<table class="table-matriz ${cssClasse}"><thead><tr><th style="text-align: left;">COR \\ TAM</th>`;
            tamanhosArray.forEach(tam => html += `<th>${tam}</th>`);
            html += `<th>TOTAL</th></tr></thead><tbody>`;

            coresArray.forEach(cor => {
                html += `<tr><td style="text-align: left;"><strong>${cor}</strong></td>`;
                let totalCor = 0;
                tamanhosArray.forEach(tam => {
                    const saldo = infoGrade.grade[cor][tam] || 0;
                    totalCor += saldo;
                    html += `<td>${saldo > 0 ? saldo : '-'}</td>`;
                });
                html += `<td style="background-color: #f9f9f9;"><strong>${totalCor}</strong></td></tr>`;
            });
            html += `</tbody></table>`;
            return html;
        }

        function gerarGrades(pedidosSelecionados) {
            const area = document.getElementById('areaGrades');
            const msgCentral = document.getElementById('msg-central'); // Pega a referência do aviso
            
            area.innerHTML = ''; 
            
            // CORREÇÃO 2: Lógica de esconder/mostrar a mensagem
            if (!pedidosSelecionados || pedidosSelecionados.length === 0) {
                if(msgCentral) msgCentral.style.display = 'block'; // Mostra o aviso pedindo para selecionar
                return; 
            } else {
                if(msgCentral) msgCentral.style.display = 'none'; // Esconde o aviso para mostrar as tabelas
            }

            const pedidosFiltrados = dadosPedidos.filter(item => pedidosSelecionados.includes(String(item.Pedido)));
            
            const agrupadoNegativo = {};
            pedidosFiltrados.forEach(item => {
                const titulo = `PEDIDO: ${item.Pedido} | REF: ${item.REF} - ${item.DESCRICAO}`;
                
                if (!agrupadoNegativo[titulo]) {
                    agrupadoNegativo[titulo] = { refOriginal: item.REF, cores: new Set(), tamanhos: new Set(), grade: {} };
                }
                
                agrupadoNegativo[titulo].cores.add(item.COR);
                agrupadoNegativo[titulo].tamanhos.add(item.TAM);

                if (!agrupadoNegativo[titulo].grade[item.COR]) agrupadoNegativo[titulo].grade[item.COR] = {};
                const saldoAtual = agrupadoNegativo[titulo].grade[item.COR][item.TAM] || 0;
                agrupadoNegativo[titulo].grade[item.COR][item.TAM] = saldoAtual + item.SaldoPedido;
            });

            for (const [titulo, infoNegativa] of Object.entries(agrupadoNegativo)) {
                
                const refAtual = infoNegativa.refOriginal;
                const estoqueDestaRef = dadosEstoque.filter(e => e.REF === refAtual);
                
                let htmlEstoquePositivo = "";
                
                if (estoqueDestaRef.length > 0) {
                    const infoPositiva = { cores: new Set(), tamanhos: new Set(), grade: {} };
                    
                    estoqueDestaRef.forEach(item => {
                        infoPositiva.cores.add(item.COR);
                        infoPositiva.tamanhos.add(item.TAM);
                        if (!infoPositiva.grade[item.COR]) infoPositiva.grade[item.COR] = {};
                        
                        const estoqueAtual = infoPositiva.grade[item.COR][item.TAM] || 0;
                        infoPositiva.grade[item.COR][item.TAM] = estoqueAtual + item.Estoque;
                    });
                    
                    htmlEstoquePositivo = `
                        <div class="col-md-6">
                            <div class="grade-title pos">Disponível em Estoque (+)</div>
                            ${montarTabelaHTML(infoPositiva, 'grade-positiva', 'Estoque')}
                        </div>
                    `;
                } else {
                    htmlEstoquePositivo = `
                        <div class="col-md-6 d-flex align-items-center justify-content-center" style="background-color: #fafafa; border: 1px dashed #ccc; border-radius: 4px;">
                            <span class="text-muted small">Nenhum estoque positivo encontrado para esta referência.</span>
                        </div>
                    `;
                }

                let htmlBloco = `
                    <div class="matriz-container shadow-sm">
                        <div class="ref-title">${titulo}</div>
                        <div class="row g-4">
                            <div class="col-md-6" style="border-right: 1px solid #eee;">
                                <div class="grade-title neg">Saldo do Pedido (-)</div>
                                ${montarTabelaHTML(infoNegativa, 'grade-negativa', 'SaldoPedido')}
                            </div>
                            
                            ${htmlEstoquePositivo}
                        </div>
                    </div>
                `;
                area.innerHTML += htmlBloco;
            }
        }
    </script>
</body>
</html>