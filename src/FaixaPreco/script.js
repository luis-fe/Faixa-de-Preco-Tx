// REGISTRA O PLUGIN DE RÓTULOS DO CHART.JS
Chart.register(ChartDataLabels);

document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 
    let colecoesAtuais = []; 
    let dadosMatriz = []; 
    let sortConfig = { key: 'padrao', dir: 'desc' };
    let modoColecao = false;
    let backupFiltros = null;
    let chartInstance = null; 
    
    let linhaSelecionadaPBI = null; 

    let currentSyncTime = '--:--';
    let pollingInterval = null;

    const selPlano = document.getElementById('filter-plano');
    const listColecao = document.getElementById('list-colecao');
    const listLinha = document.getElementById('list-linha');
    const listGrupo = document.getElementById('list-grupo');
    const toggleTipoPreco = document.getElementById('toggle-tipo-preco');
    const filtroTabelaGrupo = document.getElementById('filtro-tabela-grupo');

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

    const tabKanban = document.getElementById('tab-kanban');
    const tabPiramide = document.getElementById('tab-piramide');
    const viewKanban = document.getElementById('view-kanban');
    const viewPiramide = document.getElementById('piramide-view');

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
        
        if (chartInstance) {
            chartInstance.resize();
            chartInstance.update();
        }
    });

    toggleTipoPreco.addEventListener('change', () => { atualizarKanban(); });

    // --- NOVA LÓGICA DE SINCRONIZAÇÃO DO SELECT DA TABELA ---
    filtroTabelaGrupo.addEventListener('change', (e) => { 
        const val = e.target.value;
        const chkAll = listGrupo.querySelector('.select-all');
        const chkItems = listGrupo.querySelectorAll('.item-checkbox');

        if (chkAll && chkItems) {
            if (val === 'TODOS') {
                chkAll.checked = true;
                chkItems.forEach(chk => chk.checked = true);
            } else {
                chkAll.checked = false;
                chkItems.forEach(chk => {
                    chk.checked = (chk.value === val);
                });
            }
        }
        
        linhaSelecionadaPBI = null; // Reseta sub-linha selecionada para evitar conflito
        atualizarKanban(); 
    });

    selPlano.addEventListener('change', () => {
        const plano = selPlano.value;
        if (!plano) { limparFiltros(); return; }

        if (pollingInterval) clearInterval(pollingInterval);
        lblLastSync.innerText = "Carregando...";
        linhaSelecionadaPBI = null; 

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
                        preco: limpaMoeda(p.precoB2B || p.precob2b || p.preco), 
                        precoB2C: limpaMoeda(p.precoB2C || p.precob2c),
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

    btnAbrirResumo.onclick = () => {
        if (produtosBase.length === 0) { alert("Selecione um plano primeiro!"); return; }
        
        const filtroAtual = resumoFilterGrupo.value || 'TODOS';
        const uniqueGrupos = [...new Set(produtosBase.map(d => d.grupo))].sort();
        resumoFilterGrupo.innerHTML = '<option value="TODOS">TODOS</option>' + uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
        
        if (uniqueGrupos.includes(filtroAtual)) {
            resumoFilterGrupo.value = filtroAtual;
        } else {
            resumoFilterGrupo.value = 'TODOS';
        }

        btnToggleColecao.innerText = modoColecao ? "➖ Ocultar" : "➕ Expandir";

        atualizarDadosMatriz();
        window.ordenarMatriz(sortConfig.key, sortConfig.dir);
        modalSummary.style.display = 'block';
    };

    btnToggleColecao.onclick = () => {
        modoColecao = !modoColecao;
        btnToggleColecao.innerText = modoColecao ? "➖ Ocultar" : "➕ Expandir";
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
        theadHtml += `<th style="text-align: center; width: 20%;" onclick="ordenarMatriz('total')">TOTAL ↕️</th></tr>`;
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
            tr += `<td style="text-align: center; background: #f9f9f9;">${linkTotalRow}</td></tr>`;
            return tr;
        }).join('');

        const colspanBase = 2;
        let tfootHtml = `<tr><td colspan="${colspanBase}" style="text-align: right; padding: 10px; font-size: 1.1em;">TOTAL GERAL:</td>`;
        if (modoColecao) {
            colecoesAtuais.forEach(c => {
                const linkTotalCol = `<a class="matrix-link-white" onclick="aplicarFiltroResumo(null, null, '${esc(c)}'); return false;">${totaisColunas[c]}</a>`;
                tfootHtml += `<td style="text-align: center; padding: 10px; font-size: 1.1em;">${linkTotalCol}</td>`;
            });
        }
        const linkGrandTotal = `<a class="matrix-link-white" onclick="aplicarFiltroResumo(null, null, null); return false;">${totalGeral}</a>`;
        tfootHtml += `<td style="text-align: center; padding: 10px; font-size: 1.2em;">${linkGrandTotal}</td></tr>`;
        tfootResumo.innerHTML = tfootHtml;
    }

    function gerarFiltrosCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();
        const preencher = (container, data) => {
            container.innerHTML = `<label style="border-bottom: 2px solid #eee; padding-bottom: 6px; margin-bottom: 6px; color: var(--green-primary); font-weight: bold;"><input type="checkbox" class="select-all" checked> Selecionar Tudo</label>` +
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

    window.toggleLinhaPBI = (grupo, linha) => {
        if (linhaSelecionadaPBI && linhaSelecionadaPBI.grupo === grupo && linhaSelecionadaPBI.linha === linha) {
            linhaSelecionadaPBI = null; 
        } else {
            linhaSelecionadaPBI = { grupo, linha }; 
        }
        atualizarKanban();
    };

    function atualizarKanban() {
        if (!selPlano.value) return; 

        const getChecked = (container) => Array.from(container.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        const fCol = getChecked(listColecao), fLin = getChecked(listLinha), fGru = getChecked(listGrupo);
        const analisarB2C = toggleTipoPreco.checked;

        // --- SINCRONIZA AS CHECKBOXES PARA O SELECT DA TABELA ---
        if (fGru.length === 1) {
            filtroTabelaGrupo.value = fGru[0];
        } else {
            filtroTabelaGrupo.value = 'TODOS';
        }

        const validCol = new Set(produtosBase.filter(p => fLin.includes(p.linha) && fGru.includes(p.grupo)).map(p => p.colecao));
        const validLin = new Set(produtosBase.filter(p => fCol.includes(p.colecao) && fGru.includes(p.grupo)).map(p => p.linha));
        const validGru = new Set(produtosBase.filter(p => fCol.includes(p.colecao) && fLin.includes(p.linha)).map(p => p.grupo));

        const effCol = fCol.filter(x => validCol.has(x)), effLin = fLin.filter(x => validLin.has(x)), effGru = fGru.filter(x => validGru.has(x));

        const updateVis = (cont, vSet) => { cont.querySelectorAll('.item-checkbox').forEach(chk => { chk.closest('label').style.display = vSet.has(chk.value) ? 'block' : 'none'; }); };
        updateVis(listColecao, validCol); updateVis(listLinha, validLin); updateVis(listGrupo, validGru);

        let filtradosGerais = produtosBase.filter(p => fCol.includes(p.colecao) && fLin.includes(p.linha) && fGru.includes(p.grupo));
        
        atualizarTabelaLateral(filtradosGerais);

        let filtradosParaVisuais = filtradosGerais;
        
        const setSub = (id, arr) => {
            const el = document.getElementById(id);
            if (arr.length === 1) el.innerText = `(${arr[0]})`; else if (arr.length > 1) el.innerText = `(...)`; else el.innerText = `(Nenhum)`;
        };

        if (linhaSelecionadaPBI) {
            filtradosParaVisuais = filtradosGerais.filter(p => p.grupo === linhaSelecionadaPBI.grupo && p.linha === linhaSelecionadaPBI.linha);
            setSub('sub-linha', [linhaSelecionadaPBI.linha]);
            setSub('sub-grupo', [linhaSelecionadaPBI.grupo]);
            setSub('sub-colecao', [...new Set(filtradosParaVisuais.map(p => p.colecao))]);
        } else {
            setSub('sub-linha', effLin);
            setSub('sub-grupo', effGru);
            setSub('sub-colecao', effCol);
        }

        filtradosParaVisuais.sort((a, b) => a.preco - b.preco);

        const isFiltered = (linhaSelecionadaPBI !== null) || (filtradosParaVisuais.length < produtosBase.length);
        
        renderizarGraficoPiramide(filtradosParaVisuais, analisarB2C, isFiltered);

        const cols = { entrada: document.getElementById('cards-entrada'), inter: document.getElementById('cards-inter'), premium: document.getElementById('cards-premium') };
        Object.values(cols).forEach(c => c.innerHTML = '');
        let cont = { e: 0, i: 0, p: 0 };

        filtradosParaVisuais.forEach(p => {
            const card = document.createElement('div'); card.className = 'meu-card';
            let b2cHtml = p.precoB2C > 0 ? `<span class="price-b2c">(B2C - R$ ${p.precoB2C.toFixed(2)})</span>` : '';
            let mkpHtml = p.mkp > 0 ? `<span class="markup">Mkp: ${p.mkp.toFixed(2)}</span>` : '';

            let nomeTag = (p.subcolecao && p.subcolecao.trim() !== '') ? p.subcolecao : p.colecao;
            let badgeHtml = '';
            
            if (nomeTag) {
                let txtMinusculo = nomeTag.toLowerCase();
                let corFundo = '#757575'; let corTexto = '#ffffff'; 
                
                if (txtMinusculo.includes('starter') || txtMinusculo.includes('estoque futuro')) corFundo = '#9E9E9E'; 
                else if (txtMinusculo.includes('lancamento') || txtMinusculo.includes('lançamento')) corFundo = '#FBC02D'; 
                else if (txtMinusculo.includes('reedicao') || txtMinusculo.includes('reedição')) corFundo = '#4CAF50'; 
                else if (txtMinusculo.includes('best') || txtMinusculo.includes('saller') || txtMinusculo.includes('seller')) corFundo = '#FF9800'; 

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
        
        if (linhaSelecionadaPBI) {
            document.getElementById('total-mix').innerText = `${cont.e + cont.i + cont.p} (Filtrado)`;
        } else {
            document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;
        }

        const rangeE = document.getElementById('info-range-entrada'), rangeI = document.getElementById('info-range-inter'), rangeP = document.getElementById('info-range-premium');
        
        if (filtradosParaVisuais.length > 0 && new Set(filtradosParaVisuais.map(p=>p.linha)).size === 1 && new Set(filtradosParaVisuais.map(p=>p.grupo)).size === 1) {
            rangeE.innerText = `Até R$ ${filtradosParaVisuais[0].eMax.toFixed(2)}`; 
            rangeI.innerText = `R$ ${(filtradosParaVisuais[0].eMax + 0.01).toFixed(2)} - R$ ${filtradosParaVisuais[0].iMax.toFixed(2)}`; 
            rangeP.innerText = `Acima de R$ ${filtradosParaVisuais[0].iMax.toFixed(2)}`;
            rangeE.style.display = rangeI.style.display = rangeP.style.display = 'block';
        } else { 
            rangeE.style.display = rangeI.style.display = rangeP.style.display = 'none'; 
        }
    }

    function atualizarTabelaLateral(filtradosGerais) {
        // Agora, como o filtro principal já faz o corte correto de Grupo, 
        // a tabela apenas exibe o que os filtros principais mandaram. Fica muito mais limpo!
        const tbody = document.querySelector('#side-summary-table tbody');
        
        const mapa = {};
        let totalGeralTabela = 0;

        filtradosGerais.forEach(p => {
            const key = p.grupo + '|' + p.linha;
            if (!mapa[key]) mapa[key] = { grupo: p.grupo, linha: p.linha, total: 0 };
            mapa[key].total++;
            totalGeralTabela++;
        });

        const arrayResumo = Object.values(mapa);
        arrayResumo.sort((a, b) => a.grupo.localeCompare(b.grupo) || a.linha.localeCompare(b.linha));

        tbody.innerHTML = arrayResumo.map(item => {
            let classeCSS = '';
            
            if (linhaSelecionadaPBI) {
                if (linhaSelecionadaPBI.grupo === item.grupo && linhaSelecionadaPBI.linha === item.linha) {
                    classeCSS = 'selected'; 
                } else {
                    classeCSS = 'dimmed'; 
                }
            }

            const escG = item.grupo.replace(/'/g, "\\'");
            const escL = item.linha.replace(/'/g, "\\'");

            let percentual = totalGeralTabela > 0 ? ((item.total / totalGeralTabela) * 100).toFixed(1) : 0;

            return `
            <tr class="${classeCSS}" onclick="toggleLinhaPBI('${escG}', '${escL}')">
                <td>${item.grupo}</td>
                <td><strong>${item.linha}</strong></td>
                <td style="text-align: center; color: var(--green-primary); font-weight: bold;">${item.total}</td>
                <td style="text-align: center; font-size: 0.9em; color: #555;">${percentual}%</td>
            </tr>`;
        }).join('');
    }

    function renderizarGraficoPiramide(filtradosParaVisuais, analisarB2C, isFiltered) {
        const ctx = document.getElementById('graficoPiramide').getContext('2d');

        const tituloGrafico = analisarB2C ? 'Preço B2C x Nº Produtos' : 'Preço B2B x Nº Produtos';
        const chavePrecoAtiva = analisarB2C ? 'precoB2C' : 'preco';

        const contagemPorPreco = {};
        filtradosParaVisuais.forEach(p => {
            const valorPreco = p[chavePrecoAtiva];
            if (!valorPreco || valorPreco <= 0) return;

            const precoStr = valorPreco.toFixed(2);
            contagemPorPreco[precoStr] = (contagemPorPreco[precoStr] || 0) + 1;
        });

        const labelsOrdenadas = Object.keys(contagemPorPreco).sort((a, b) => parseFloat(b) - parseFloat(a));
        const dados = labelsOrdenadas.map(l => contagemPorPreco[l]);
        const labelsComSifrao = labelsOrdenadas.map(l => 'R$ ' + l.replace('.', ','));

        if (chartInstance) {
            chartInstance.destroy();
        }

        if (labelsOrdenadas.length === 0) {
            ctx.font = "16px sans-serif";
            ctx.fillStyle = "#888";
            ctx.textAlign = "center";
            ctx.fillText("Nenhum dado selecionado", ctx.canvas.width/2, ctx.canvas.height/2);
            return;
        }

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelsComSifrao,
                datasets: [{
                    data: dados,
                    backgroundColor: '#4CAF50', 
                    borderWidth: 0,
                    borderRadius: 4,
                    barPercentage: 0.6,  
                    categoryPercentage: 0.8
                }]
            },
            options: {
                indexAxis: 'y', 
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 10, left: 10, right: 40 } },
                plugins: {
                    title: {
                        display: true,
                        text: tituloGrafico,
                        color: '#25382D',
                        font: { size: 15, weight: 'bold', family: 'Segoe UI' },
                        padding: { bottom: 15 }
                    },
                    legend: { display: false },
                    
                    datalabels: {
                        display: true, 
                        color: isFiltered ? '#fff' : '#444', 
                        backgroundColor: isFiltered ? (analisarB2C ? '#673AB7' : '#25382D') : null, 
                        borderRadius: 4,
                        padding: isFiltered ? 4 : 0,
                        anchor: isFiltered ? 'center' : 'end', 
                        align: isFiltered ? 'center' : 'right',  
                        font: { weight: 'bold', size: isFiltered ? 12 : 11, family: 'Segoe UI' },
                        formatter: function(value) { return value; }
                    },
                    tooltip: {
                        backgroundColor: analisarB2C ? '#673AB7' : '#25382D',
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 },
                        callbacks: {
                            title: function(context) { return 'Preço: ' + context[0].label; },
                            label: function(context) { return context.raw + ' produtos encontrados'; }
                        }
                    }
                },
                scales: {
                    x: { display: false, beginAtZero: true },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#444', font: { weight: 'bold', size: 11, family: 'Segoe UI' }, padding: 8 },
                        title: { display: false } 
                    }
                }
            }
        });
    }

    function popularGrupoModal() {
        const uniqueGrupos = [...new Set(produtosBase.map(p => p.grupo))].sort();
        
        modalSelGrupo.innerHTML = '<option value="" disabled selected>Selecione...</option>' + uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
        
        const selTabelaGrupo = document.getElementById('filtro-tabela-grupo');
        const grupoAtualTabela = selTabelaGrupo.value; 
        selTabelaGrupo.innerHTML = '<option value="TODOS">TODOS</option>' + uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
        if (uniqueGrupos.includes(grupoAtualTabela)) selTabelaGrupo.value = grupoAtualTabela;
    }

    modalSelGrupo.addEventListener('change', () => {
        const grupoSel = modalSelGrupo.value;
        containerLinhasDinamicas.innerHTML = '';
        const linhasDoGrupo = [...new Set(produtosBase.filter(p => p.grupo === grupoSel).map(p => p.linha))].sort();
        linhasDoGrupo.forEach(linha => {
            const amostra = produtosBase.find(p => p.grupo === grupoSel && p.linha === linha);
            const divRow = document.createElement('div');
            divRow.style = "display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f5f5f5;";
            divRow.innerHTML = `<div style="flex: 2; font-weight: bold; font-size: 0.8em; color: #333;">${linha}</div>
                <div style="flex: 1.5;"><input type="number" step="0.01" class="in-entrada" data-linha="${linha}" value="${amostra.eMax.toFixed(2)}" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9em;"></div>
                <div style="flex: 1.5;"><input type="number" step="0.01" class="in-inter" data-linha="${linha}" value="${amostra.iMax.toFixed(2)}" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9em;"></div>
                <div style="flex: 1; text-align: center; font-size: 0.75em; color: var(--green-primary); font-weight: bold;">> <span class="lbl-premium">${amostra.iMax.toFixed(2)}</span></div>`;
            divRow.querySelector('.in-inter').addEventListener('input', (e) => { 
                let val = parseFloat(e.target.value) || 0;
                divRow.querySelector('.lbl-premium').innerText = val.toFixed(2); 
            });
            containerLinhasDinamicas.appendChild(divRow);
        });
        document.getElementById('msg-selecione-filtros').style.display = 'none'; document.getElementById('config-faixas-area').style.display = 'block';
    });

    btnSave.onclick = async () => {
        const plano = selPlano.value, grupo = modalSelGrupo.value, inputs = containerLinhasDinamicas.querySelectorAll('.in-entrada');
        if(!plano || !grupo) return;

        const getChecked = (container) => Array.from(document.getElementById(container).querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        let tempBackup = { 
            col: getChecked('list-colecao'), colAll: document.querySelector('#list-colecao .select-all').checked,
            lin: getChecked('list-linha'), linAll: document.querySelector('#list-linha .select-all').checked,
            gru: getChecked('list-grupo'), gruAll: document.querySelector('#list-grupo .select-all').checked 
        };
        
        if (!backupFiltros) backupFiltros = tempBackup;

        btnSave.innerText = "Salvando..."; btnSave.disabled = true; btnSave.style.opacity = 0.7;
        for (let inputE of inputs) {
            const linha = inputE.dataset.linha, vEntrada = inputE.value, vInter = containerLinhasDinamicas.querySelector(`.in-inter[data-linha="${linha}"]`).value;
            await fetch('salvar_faixas.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plano, linha, grupo, valorEntrada: vEntrada, valorInter: vInter, valorPremium: vInter }) });
        }
        modalConfig.style.display = 'none'; 
        selPlano.dispatchEvent(new Event('change')); 
        btnSave.innerText = "Salvar Faixas do Grupo"; btnSave.disabled = false; btnSave.style.opacity = 1;
    };

    document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
        if (!selPlano.value) return; 
        document.querySelectorAll('.select-all').forEach(chk => chk.checked = true);
        document.querySelectorAll('.item-checkbox').forEach(chk => chk.checked = true);
        document.getElementById('resumo-filter-grupo').value = 'TODOS';
        document.getElementById('filtro-tabela-grupo').value = 'TODOS';
        toggleTipoPreco.checked = false; 
        linhaSelecionadaPBI = null; 
        atualizarKanban();
    });

    document.getElementById('close-modal').onclick = () => modalConfig.style.display = 'none';
    document.getElementById('close-summary').onclick = () => modalSummary.style.display = 'none';
    
    document.getElementById('btn-config').onclick = () => {
        if (!selPlano.value) { alert("Selecione o plano primeiro!"); return; }
        const validGru = new Set(produtosBase.filter(p => Array.from(listColecao.querySelectorAll('.item-checkbox:checked')).map(c=>c.value).includes(p.colecao) && Array.from(listLinha.querySelectorAll('.item-checkbox:checked')).map(c=>c.value).includes(p.linha)).map(p => p.grupo));
        const fGruChecked = Array.from(listGrupo.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        const effGru = fGruChecked.filter(x => validGru.has(x));

        modalSelGrupo.value = "";
        if (effGru.length === 1) { modalSelGrupo.value = effGru[0]; modalSelGrupo.dispatchEvent(new Event('change')); }
        else { document.getElementById('msg-selecione-filtros').style.display = 'block'; document.getElementById('config-faixas-area').style.display = 'none'; }
        modalConfig.style.display = 'block';
    };

    window.onclick = (e) => { if (e.target == modalConfig) modalConfig.style.display = 'none'; if (e.target == modalSummary) modalSummary.style.display = 'none'; };
    function limparFiltros() { produtosBase = []; linhaSelecionadaPBI = null; atualizarKanban(); }
});
