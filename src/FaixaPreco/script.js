// REGISTRA O PLUGIN DE RÓTULOS DO CHART.JS
Chart.register(ChartDataLabels);

document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 
    let colecoesAtuais = []; 
    let dadosMatriz = []; 
    let sortConfig = { key: 'padrao', dir: 'desc' };
    let modoColecao = false;
    let backupFiltros = null;
    let chartInstance = null; // Variável para controlar o gráfico
    
    let currentSyncTime = '--:--';
    let pollingInterval = null;

    // --- ELEMENTOS ---
    const selPlano = document.getElementById('filter-plano');
    const listColecao = document.getElementById('list-colecao');
    const listLinha = document.getElementById('list-linha');
    const listGrupo = document.getElementById('list-grupo');

    const modalConfig = document.getElementById('configModal');
    const modalSelGrupo = document.getElementById('modal-filter-grupo');
    const containerLinhasDinamicas = document.getElementById('linhas-dinamicas-container');
    const btnSave = document.getElementById('btn-save-ranges');

    const modalSummary = document.getElementById('summaryModal');
    const theadResumo = document.getElementById('thead-resumo');
    const bodyResumo = document.getElementById('body-resumo');
    const tfootResumo = document.getElementById('tfoot-resumo');
    const btnAbrirResumo = document.getElementById('btn-resumo');
    const resumoFilterGrupo = document.getElementById('resumo-filter-grupo');
    const btnToggleColecao = document.getElementById('btn-toggle-colecao');
    const lblLastSync = document.getElementById('last-sync');

    // Abas
    const tabKanban = document.getElementById('tab-kanban');
    const tabPiramide = document.getElementById('tab-piramide');
    const viewKanban = document.getElementById('view-kanban');
    const viewPiramide = document.getElementById('piramide-view');

    // ==========================================
    // CONTROLE DAS ABAS
    // ==========================================
    tabKanban.addEventListener('click', () => {
        tabKanban.classList.add('active');
        tabPiramide.classList.remove('active');
        viewKanban.style.display = 'flex';
        viewPiramide.style.display = 'none';
    });

    tabPiramide.addEventListener('click', () => {
        tabPiramide.classList.add('active');
        tabKanban.classList.remove('active');
        viewKanban.style.display = 'none';
        viewPiramide.style.display = 'block';
        
        // Garante que o gráfico seja redesenhado no tamanho correto ao abrir a aba
        if (chartInstance) {
            chartInstance.resize();
            chartInstance.update();
        }
    });

    // ==========================================
    // 1. BUSCAR DADOS
    // ==========================================
    selPlano.addEventListener('change', () => {
        const plano = selPlano.value;
        if (!plano) { limparFiltros(); return; }

        if (pollingInterval) clearInterval(pollingInterval);
        lblLastSync.innerText = "Carregando...";

        fetch(`buscar_produtos.php?plano=${encodeURIComponent(plano)}&_=${Date.now()}`)
            .then(res => res.json())
            .then(data => {
                produtosBase = data.map(p => {
                    const limpaMoeda = (val) => {
                        if (!val || String(val).trim() === '') return 0;
                        let limpo = String(val).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
                        return parseFloat(limpo) || 0;
                    };
                    return {
                        ref: p.referencia || 'N/A', desc: p.descricao || '', 
                        colecao: p.colecao || 'GERAL', linha: p.linha || 'GERAL', grupo: p.grupo || 'GERAL',
                        subcolecao: p.subcolecao || p.Subcolecao || p.SUBCOLECAO || '', 
                        preco: limpaMoeda(p.precoB2B || p.precob2b || p.preco), precoB2C: limpaMoeda(p.precoB2C || p.precob2c),
                        mkp: parseFloat(p.MkpB2B || p.mkpb2b) || 0, eMax: parseFloat(p.faixa_entrada_max) || 0, iMax: parseFloat(p.faixa_inter_max) || 0
                    };
                });
                
                gerarFiltrosCheckboxes();

                if (backupFiltros) {
                    restaurarFiltros(backupFiltros);
                    backupFiltros = null; 
                }

                popularGrupoModal();
                atualizarKanban();
                iniciarPolling(plano);
            });
    });

    // ==========================================
    // 2. SISTEMA DE TEMPO REAL
    // ==========================================
    function iniciarPolling(plano) {
        verificarSync(plano, true);
        pollingInterval = setInterval(() => { verificarSync(plano, false); }, 10000); 
    }

    function verificarSync(plano, isInitial) {
        fetch(`check_sync.php?plano=${encodeURIComponent(plano)}&_=${Date.now()}`)
            .then(res => res.json())
            .then(data => {
                const bdSync = data.sync;
                if (isInitial) {
                    currentSyncTime = bdSync;
                    lblLastSync.innerText = currentSyncTime;
                } else {
                    if (bdSync !== '--:--' && bdSync !== currentSyncTime) {
                        if (modalConfig.style.display === 'block') return;

                        const getChecked = (container) => Array.from(document.getElementById(container).querySelectorAll('.item-checkbox:checked')).map(c => c.value);
                        backupFiltros = { 
                            col: getChecked('list-colecao'), colAll: document.querySelector('#list-colecao .select-all').checked,
                            lin: getChecked('list-linha'), linAll: document.querySelector('#list-linha .select-all').checked,
                            gru: getChecked('list-grupo'), gruAll: document.querySelector('#list-grupo .select-all').checked 
                        };
                        
                        currentSyncTime = bdSync;
                        lblLastSync.innerText = "Atualizando dados...";
                        selPlano.dispatchEvent(new Event('change'));
                        
                        if (modalSummary.style.display === 'block') {
                            setTimeout(() => { atualizarDadosMatriz(); }, 1000); 
                        }
                    }
                }
            })
            .catch(err => console.error("Erro ao checar sync", err));
    }

    // ==========================================
    // 3. MATRIZ DE RESUMO E CLIQUE NOS LINKS
    // ==========================================
    btnAbrirResumo.onclick = () => {
        if (produtosBase.length === 0) { alert("Selecione um plano primeiro!"); return; }
        
        const filtroAtual = resumoFilterGrupo.value || 'TODOS';
        const uniqueGrupos = [...new Set(produtosBase.map(d => d.grupo))].sort();
        resumoFilterGrupo.innerHTML = '<option value="TODOS">TODOS OS GRUPOS</option>' + uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
        
        if (uniqueGrupos.includes(filtroAtual)) {
            resumoFilterGrupo.value = filtroAtual;
        } else {
            resumoFilterGrupo.value = 'TODOS';
        }

        btnToggleColecao.innerText = modoColecao ? "➖ Ocultar Coleções" : "➕ Expandir Coleções";

        atualizarDadosMatriz();
        window.ordenarMatriz(sortConfig.key, sortConfig.dir);
        modalSummary.style.display = 'block';
    };

    btnToggleColecao.onclick = () => {
        modoColecao = !modoColecao;
        btnToggleColecao.innerText = modoColecao ? "➖ Ocultar Coleções" : "➕ Expandir Coleções";
        renderizarMatrizHTML();
    };

    resumoFilterGrupo.addEventListener('change', () => { atualizarDadosMatriz(); });

    function atualizarDadosMatriz() {
        const grupoSelecionado = resumoFilterGrupo.value;
        const produtosFiltrados = produtosBase.filter(p => grupoSelecionado === "TODOS" || p.grupo === grupoSelecionado);
        colecoesAtuais = [...new Set(produtosFiltrados.map(p => p.colecao))].sort();

        const linhasMap = {};
        produtosFiltrados.forEach(p => {
            const key = `${p.grupo}|${p.linha}`;
            if (!linhasMap[key]) {
                linhasMap[key] = { grupo: p.grupo, linha: p.linha, total: 0 };
                colecoesAtuais.forEach(c => linhasMap[key][c] = 0);
            }
            linhasMap[key][p.colecao]++;
            linhasMap[key].total++;
        });

        dadosMatriz = Object.values(linhasMap);
        
        if (!['grupo', 'linha', 'total', 'padrao'].includes(sortConfig.key) && !colecoesAtuais.includes(sortConfig.key)) {
            sortConfig.key = 'padrao';
        }
        window.ordenarMatriz(sortConfig.key, sortConfig.dir);
    }

    window.ordenarMatriz = (key, forcedDir = null) => {
        if (key === 'padrao') {
            sortConfig.key = 'padrao';
            sortConfig.dir = 'desc';
            dadosMatriz.sort((a, b) => {
                if (a.grupo === b.grupo) return b.total - a.total; 
                return a.grupo.localeCompare(b.grupo);
            });
        } else {
            sortConfig.dir = forcedDir || (sortConfig.key === key && sortConfig.dir === 'asc' ? 'desc' : 'asc');
            sortConfig.key = key;
            dadosMatriz.sort((a, b) => {
                let vA = a[key] || 0, vB = b[key] || 0;
                return typeof vA === 'string' ? (sortConfig.dir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA)) : (sortConfig.dir === 'asc' ? vA - vB : vB - vA);
            });
        }
        renderizarMatrizHTML();
    };

    window.aplicarFiltroResumo = (grupo, linha, colecao) => {
        const filtroGrupoResumo = resumoFilterGrupo.value; 

        const setChecks = (containerId, valorAlvo) => {
            const container = document.getElementById(containerId);
            const checkboxes = container.querySelectorAll('.item-checkbox');
            let allChecked = true;
            
            checkboxes.forEach(chk => {
                if (valorAlvo === null) {
                    if (containerId === 'list-grupo' && filtroGrupoResumo !== 'TODOS') {
                        chk.checked = (chk.value === filtroGrupoResumo);
                    } else {
                        chk.checked = true;
                    }
                } else {
                    chk.checked = (chk.value === String(valorAlvo));
                }
                if (!chk.checked) allChecked = false;
            });
            container.querySelector('.select-all').checked = allChecked;
        };

        setChecks('list-grupo', grupo);
        setChecks('list-linha', linha);
        setChecks('list-colecao', colecao);

        atualizarKanban();
        modalSummary.style.display = 'none';
    };

    function renderizarMatrizHTML() {
        const esc = (str) => str ? str.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';

        let theadHtml = `<tr>
            <th onclick="ordenarMatriz('grupo')" style="width: 25%;">GRUPO ↕️</th>
            <th onclick="ordenarMatriz('linha')" style="width: 35%;">LINHA ↕️</th>`;
        
        if (modoColecao) {
            colecoesAtuais.forEach(c => {
                theadHtml += `<th style="text-align: center;" onclick="ordenarMatriz('${c}')">${c} ↕️</th>`;
            });
        }
        theadHtml += `<th style="text-align: center; width: 20%;" onclick="ordenarMatriz('total')">TOTAL PRODUTOS ↕️</th></tr>`;
        theadResumo.innerHTML = theadHtml;

        let totaisColunas = {};
        colecoesAtuais.forEach(c => totaisColunas[c] = 0);
        let totalGeral = 0;

        bodyResumo.innerHTML = dadosMatriz.map(row => {
            let tr = `<tr><td>${row.grupo}</td><td><strong>${row.linha}</strong></td>`;
            if (modoColecao) {
                colecoesAtuais.forEach(c => {
                    const val = row[c] || 0;
                    totaisColunas[c] += val;
                    const link = val > 0 
                        ? `<a class="matrix-link" onclick="aplicarFiltroResumo('${esc(row.grupo)}', '${esc(row.linha)}', '${esc(c)}'); return false;">${val}</a>` 
                        : '-';
                    tr += `<td style="text-align: center; color: ${val > 0 ? 'var(--green-primary)' : '#ccc'}; font-weight: ${val > 0 ? 'bold' : 'normal'};">${link}</td>`;
                });
            }
            totalGeral += row.total;
            
            const linkTotalRow = `<a class="matrix-link" onclick="aplicarFiltroResumo('${esc(row.grupo)}', '${esc(row.linha)}', null); return false;">${row.total}</a>`;
            tr += `<td style="text-align: center; background: #f1f8e9;">${linkTotalRow}</td></tr>`;
            return tr;
        }).join('');

        const colspanBase = 2;
        let tfootHtml = `<tr><td colspan="${colspanBase}" style="text-align: right; padding: 12px; font-size: 1.1em; border: 1px solid #616161;">TOTAL GERAL:</td>`;
        if (modoColecao) {
            colecoesAtuais.forEach(c => {
                const linkTotalCol = `<a class="matrix-link-white" onclick="aplicarFiltroResumo(null, null, '${esc(c)}'); return false;">${totaisColunas[c]}</a>`;
                tfootHtml += `<td style="text-align: center; padding: 12px; font-size: 1.1em; border: 1px solid #616161;">${linkTotalCol}</td>`;
            });
        }
        const linkGrandTotal = `<a class="matrix-link-white" onclick="aplicarFiltroResumo(null, null, null); return false;">${totalGeral}</a>`;
        tfootHtml += `<td style="text-align: center; padding: 12px; font-size: 1.2em; border: 1px solid #616161;">${linkGrandTotal}</td></tr>`;
        tfootResumo.innerHTML = tfootHtml;
    }

    // ==========================================
    // 4. CHECKBOXES DO KANBAN 
    // ==========================================
    function gerarFiltrosCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();
        const preencher = (container, data) => {
            container.innerHTML = `<label style="border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 8px; color: var(--green-primary);"><input type="checkbox" class="select-all" checked> <strong>Selecionar Tudo</strong></label>` +
                data.map(val => `<label><input type="checkbox" class="item-checkbox" value="${val}" checked> ${val}</label>`).join('');
            
            const chkAll = container.querySelector('.select-all');
            const chkItems = container.querySelectorAll('.item-checkbox');

            chkAll.addEventListener('change', (e) => {
                chkItems.forEach(chk => chk.checked = e.target.checked);
                atualizarKanban();
            });

            chkItems.forEach(chk => chk.addEventListener('change', () => {
                const visiveis = Array.from(chkItems).filter(c => c.closest('label').style.display !== 'none');
                chkAll.checked = visiveis.every(c => c.checked);
                atualizarKanban();
            }));
        };
        preencher(listColecao, unique('colecao')); 
        preencher(listLinha, unique('linha')); 
        preencher(listGrupo, unique('grupo'));
    }

    function restaurarFiltros(backup) {
        const aplicarBackup = (containerId, marcados, wasAllChecked) => {
            const container = document.getElementById(containerId);
            const checkboxes = container.querySelectorAll('.item-checkbox');
            let allChecked = true;
            
            checkboxes.forEach(chk => {
                if (wasAllChecked) {
                    chk.checked = true;
                } else {
                    chk.checked = marcados.includes(chk.value);
                }
                if (!chk.checked) allChecked = false;
            });
            container.querySelector('.select-all').checked = allChecked;
        };

        aplicarBackup('list-colecao', backup.col, backup.colAll);
        aplicarBackup('list-linha', backup.lin, backup.linAll);
        aplicarBackup('list-grupo', backup.gru, backup.gruAll);
    }

    // ==========================================
    // 5. LÓGICA MESTRA DO KANBAN E TAGS
    // ==========================================
    function atualizarKanban() {
        const getChecked = (container) => Array.from(container.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        const fCol = getChecked(listColecao), fLin = getChecked(listLinha), fGru = getChecked(listGrupo);

        const validCol = new Set(produtosBase.filter(p => fLin.includes(p.linha) && fGru.includes(p.grupo)).map(p => p.colecao));
        const validLin = new Set(produtosBase.filter(p => fCol.includes(p.colecao) && fGru.includes(p.grupo)).map(p => p.linha));
        const validGru = new Set(produtosBase.filter(p => fCol.includes(p.colecao) && fLin.includes(p.linha)).map(p => p.grupo));

        const effCol = fCol.filter(x => validCol.has(x)), effLin = fLin.filter(x => validLin.has(x)), effGru = fGru.filter(x => validGru.has(x));

        const setSub = (id, arr) => {
            const el = document.getElementById(id);
            if (arr.length === 1) el.innerText = `(${arr[0]})`; else if (arr.length > 1) el.innerText = `(Vários itens)`; else el.innerText = `(Nenhum)`;
        };
        setSub('sub-colecao', effCol); setSub('sub-linha', effLin); setSub('sub-grupo', effGru);

        const updateVis = (cont, vSet) => { cont.querySelectorAll('.item-checkbox').forEach(chk => { chk.closest('label').style.display = vSet.has(chk.value) ? 'block' : 'none'; }); };
        updateVis(listColecao, validCol); updateVis(listLinha, validLin); updateVis(listGrupo, validGru);

        let filtrados = produtosBase.filter(p => fCol.includes(p.colecao) && fLin.includes(p.linha) && fGru.includes(p.grupo));
        
        filtrados.sort((a, b) => a.preco - b.preco);

        // Renderiza o Gráfico Pirâmide de forma sincronizada com o filtro!
        renderizarGraficoPiramide(filtrados);

        const cols = { entrada: document.getElementById('cards-entrada'), inter: document.getElementById('cards-inter'), premium: document.getElementById('cards-premium') };
        Object.values(cols).forEach(c => c.innerHTML = '');
        let cont = { e: 0, i: 0, p: 0 };

        filtrados.forEach(p => {
            const card = document.createElement('div'); card.className = 'card';
            let b2cHtml = p.precoB2C > 0 ? `<span class="price-b2c">(B2C - R$ ${p.precoB2C.toFixed(2)})</span>` : '';
            let mkpHtml = p.mkp > 0 ? `<span class="markup">Mkp: ${p.mkp.toFixed(2)}</span>` : '';

            let nomeTag = (p.subcolecao && p.subcolecao.trim() !== '') ? p.subcolecao : p.colecao;
            let badgeHtml = '';
            
            if (nomeTag) {
                let txtMinusculo = nomeTag.toLowerCase();
                let corFundo = '#757575'; 
                let corTexto = '#ffffff'; 
                
                if (txtMinusculo.includes('starter') || txtMinusculo.includes('estoque futuro')) {
                    corFundo = '#9E9E9E'; 
                } else if (txtMinusculo.includes('lancamento') || txtMinusculo.includes('lançamento')) {
                    corFundo = '#FBC02D'; 
                    corTexto = '#ffffff';
                } else if (txtMinusculo.includes('reedicao') || txtMinusculo.includes('reedição')) {
                    corFundo = '#4CAF50'; 
                    corTexto = '#ffffff';
                } else if (txtMinusculo.includes('best') || txtMinusculo.includes('saller') || txtMinusculo.includes('seller')) {
                    // --- CORRIGIDO AQUI: Aspas fechadas na palavra 'best' ---
                    corFundo = '#FF9800'; 
                    corTexto = '#ffffff';
                }

                badgeHtml = `<div class="subcolecao-badge" style="background-color: ${corFundo}; color: ${corTexto};">${nomeTag}</div>`;
            }

            card.innerHTML = `<div class="info-container"><span class="ref-code">${p.ref}</span><span class="description">${p.desc}</span></div>
                <div class="price-container"><div class="b2b-row"><span class="price">R$ ${p.preco.toFixed(2)}</span>${mkpHtml}</div>${b2cHtml}</div>
                ${badgeHtml}`;

            if (p.preco <= p.eMax) { cols.entrada.appendChild(card); cont.e++; }
            else if (p.preco <= p.iMax) { cols.inter.appendChild(card); cont.i++; }
            else { cols.premium.appendChild(card); cont.p++; }
        });

        document.getElementById('mix-entrada').innerText = cont.e; document.getElementById('mix-inter').innerText = cont.i; document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;

        const rangeE = document.getElementById('info-range-entrada'), rangeI = document.getElementById('info-range-inter'), rangeP = document.getElementById('info-range-premium');
        
        if (effLin.length === 1 && effGru.length === 1 && filtrados.length > 0) {
            rangeE.innerText = `Até R$ ${filtrados[0].eMax.toFixed(2)}`; 
            rangeI.innerText = `R$ ${(filtrados[0].eMax + 0.01).toFixed(2)} - R$ ${filtrados[0].iMax.toFixed(2)}`; 
            rangeP.innerText = `Acima de R$ ${filtrados[0].iMax.toFixed(2)}`;
            rangeE.style.display = rangeI.style.display = rangeP.style.display = 'block';
        } else { 
            rangeE.style.display = rangeI.style.display = rangeP.style.display = 'none'; 
        }
    }

    // ==========================================
    // 6. FUNÇÃO DO GRÁFICO DA PIRÂMIDE
    // ==========================================
    function renderizarGraficoPiramide(filtrados) {
        const ctx = document.getElementById('graficoPiramide').getContext('2d');

        // Agrupar produtos por faixas de preço exato
        const contagemPorPreco = {};
        filtrados.forEach(p => {
            const precoStr = p.preco.toFixed(2);
            contagemPorPreco[precoStr] = (contagemPorPreco[precoStr] || 0) + 1;
        });

        // Ordena os preços do MAIOR (topo) para o MENOR (base), formato clássico de pirâmide/funil
        const labelsOrdenadas = Object.keys(contagemPorPreco).sort((a, b) => parseFloat(b) - parseFloat(a));
        const dados = labelsOrdenadas.map(l => contagemPorPreco[l]);
        const labelsComSifrao = labelsOrdenadas.map(l => 'R$ ' + l.replace('.', ','));

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: 'bar', // Barra horizontal cria o formato de pirâmide deitada
            data: {
                labels: labelsComSifrao,
                datasets: [{
                    label: 'Quantidade de Produtos',
                    data: dados,
                    backgroundColor: '#25382D', // Verde escuro elegante
                    borderColor: '#4CAF50',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', // Inverte os eixos para o gráfico ficar deitado (Y=Preço, X=Qtd)
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    // --- CONFIGURAÇÃO DOS RÓTULOS (DENTRO E AO CENTRO) ---
                    datalabels: {
                        color: 'white', // Texto branco para contrastar
                        anchor: 'center', // Fixa o ponto de ancoragem no centro da barra
                        align: 'center',  // Alinha o texto centralizado no ponto de ancoragem
                        font: {
                            weight: 'bold',
                            size: 13
                        },
                        formatter: function(value) {
                            return value; // Apenas mostra o número puro
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.raw + ' produtos nesse preço';
                            }
                        }
                    }
                },
                scales: {
                    // --- RETIRA O EIXO X (linhas e números) AQUI ---
                    x: {
                        display: false, // Oculta o eixo X completamente
                        beginAtZero: true
                    },
                    y: {
                        grid: { display: false }, // Limpa as linhas de grade do Y
                        ticks: {
                            color: '#25382D',
                            font: { weight: 'bold', size: 12 }
                        },
                        title: { display: true, text: 'PREÇO SUGERIDO (B2B)', font: { weight: 'bold' } }
                    }
                }
            }
        });
    }

    // ==========================================
    // 7. MODAL DE GRUPO DINÂMICO E SALVAMENTO
    // ==========================================
    function popularGrupoModal() {
        const uniqueGrupos = [...new Set(produtosBase.map(p => p.grupo))].sort();
        modalSelGrupo.innerHTML = '<option value="" disabled selected>Selecione o Grupo...</option>' + uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    modalSelGrupo.addEventListener('change', () => {
        const grupoSel = modalSelGrupo.value;
        containerLinhasDinamicas.innerHTML = '';
        const linhasDoGrupo = [...new Set(produtosBase.filter(p => p.grupo === grupoSel).map(p => p.linha))].sort();
        linhasDoGrupo.forEach(linha => {
            const amostra = produtosBase.find(p => p.grupo === grupoSel && p.linha === linha);
            const divRow = document.createElement('div');
            divRow.style = "display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;";
            divRow.innerHTML = `<div style="flex: 2; font-weight: bold; font-size: 0.85em;">${linha}</div>
                <div style="flex: 1.5;"><input type="number" step="0.01" class="in-entrada" data-linha="${linha}" value="${amostra.eMax.toFixed(2)}" style="width: 100%; padding: 5px;"></div>
                <div style="flex: 1.5;"><input type="number" step="0.01" class="in-inter" data-linha="${linha}" value="${amostra.iMax.toFixed(2)}" style="width: 100%; padding: 5px;"></div>
                <div style="flex: 1; text-align: center; font-size: 0.75em; color: var(--green-primary); font-weight: bold;">> <span class="lbl-premium">${amostra.iMax.toFixed(2)}</span></div>`;
            divRow.querySelector('.in-inter').addEventListener('input', (e) => { divRow.querySelector('.lbl-premium').innerText = e.target.value; });
            containerLinhasDinamicas.appendChild(divRow);
        });
        document.getElementById('msg-selecione-filtros').style.display = 'none'; document.getElementById('config-faixas-area').style.display = 'block';
    });

    btnSave.onclick = async () => {
        const plano = selPlano.value, grupo = modalSelGrupo.value, inputs = containerLinhasDinamicas.querySelectorAll('.in-entrada');
        
        const getChecked = (container) => Array.from(document.getElementById(container).querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        let tempBackup = { 
            col: getChecked('list-colecao'), colAll: document.querySelector('#list-colecao .select-all').checked,
            lin: getChecked('list-linha'), linAll: document.querySelector('#list-linha .select-all').checked,
            gru: getChecked('list-grupo'), gruAll: document.querySelector('#list-grupo .select-all').checked 
        };
        
        if (!backupFiltros) backupFiltros = tempBackup;

        btnSave.innerText = "Salvando..."; btnSave.disabled = true;
        for (let inputE of inputs) {
            const linha = inputE.dataset.linha, vEntrada = inputE.value, vInter = containerLinhasDinamicas.querySelector(`.in-inter[data-linha="${linha}"]`).value;
            await fetch('salvar_faixas.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plano, linha, grupo, valorEntrada: vEntrada, valorInter: vInter, valorPremium: vInter }) });
        }
        modalConfig.style.display = 'none'; 
        selPlano.dispatchEvent(new Event('change')); 
        btnSave.innerText = "Salvar Todas as Faixas do Grupo"; btnSave.disabled = false;
    };

    // ==========================================
    // 8. CONTROLES GERAIS E BOTÃO LIMPAR FILTROS
    // ==========================================
    document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
        if (!selPlano.value) return; 
        document.querySelectorAll('.select-all').forEach(chk => chk.checked = true);
        document.querySelectorAll('.item-checkbox').forEach(chk => chk.checked = true);
        document.getElementById('resumo-filter-grupo').value = 'TODOS';
        atualizarKanban();
    });

    document.getElementById('close-modal').onclick = () => modalConfig.style.display = 'none';
    document.getElementById('close-summary').onclick = () => modalSummary.style.display = 'none';
    document.getElementById('btn-config').onclick = () => {
        if (!selPlano.value) { alert("Selecione o plano primeiro"); return; }
        const fGru = Array.from(listGrupo.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        const validGru = new Set(produtosBase.filter(p => Array.from(listColecao.querySelectorAll('.item-checkbox:checked')).map(c=>c.value).includes(p.colecao) && Array.from(listLinha.querySelectorAll('.item-checkbox:checked')).map(c=>c.value).includes(p.linha)).map(p => p.grupo));
        const effGru = fGru.filter(x => validGru.has(x));
        modalSelGrupo.value = "";
        if (effGru.length === 1) { modalSelGrupo.value = effGru[0]; modalSelGrupo.dispatchEvent(new Event('change')); }
        else { document.getElementById('msg-selecione-filtros').style.display = 'block'; document.getElementById('config-faixas-area').style.display = 'none'; }
        modalConfig.style.display = 'block';
    };
    window.onclick = (e) => { if (e.target == modalConfig) modalConfig.style.display = 'none'; if (e.target == modalSummary) modalSummary.style.display = 'none'; };
    function limparFiltros() { produtosBase = []; atualizarKanban(); }
});