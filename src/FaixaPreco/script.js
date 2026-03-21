document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 
    let colecoesAtuais = []; // Guarda as colunas dinâmicas da matriz
    let dadosMatriz = []; // Guarda as linhas da matriz
    let sortConfig = { key: 'total', dir: 'desc' };

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

    // ==========================================
    // 1. BUSCAR DADOS
    // ==========================================
    selPlano.addEventListener('change', () => {
        const plano = selPlano.value;
        if (!plano) { limparFiltros(); return; }

        fetch(`buscar_produtos.php?plano=${encodeURIComponent(plano)}`)
            .then(res => res.json())
            .then(data => {
                produtosBase = data.map(p => {
                    const limpaMoeda = (val) => {
                        if (!val || String(val).trim() === '') return 0;
                        let limpo = String(val).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
                        return parseFloat(limpo) || 0;
                    };
                    return {
                        ref: p.referencia || 'N/A', desc: p.descricao || '', colecao: p.colecao || 'GERAL', linha: p.linha || 'GERAL', grupo: p.grupo || 'GERAL',
                        preco: limpaMoeda(p.precoB2B || p.precob2b || p.preco), precoB2C: limpaMoeda(p.precoB2C || p.precob2c),
                        mkp: parseFloat(p.MkpB2B || p.mkpb2b) || 0, eMax: parseFloat(p.faixa_entrada_max) || 0, iMax: parseFloat(p.faixa_inter_max) || 0
                    };
                });
                gerarFiltrosCheckboxes();
                popularGrupoModal();
                atualizarKanban();
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString('pt-BR');
            });
    });

    // ==========================================
    // 2. MATRIZ DE RESUMO (BI)
    // ==========================================
    btnAbrirResumo.onclick = () => {
        if (produtosBase.length === 0) { alert("Selecione um plano primeiro!"); return; }
        
        // Popula o select de grupos disponíveis
        const uniqueGrupos = [...new Set(produtosBase.map(d => d.grupo))].sort();
        resumoFilterGrupo.innerHTML = '<option value="TODOS">TODOS OS GRUPOS</option>' + uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
        
        sortConfig = { key: 'total', dir: 'desc' }; // Reseta a ordenação para o padrão
        atualizarDadosMatriz();
        modalSummary.style.display = 'block';
    };

    resumoFilterGrupo.addEventListener('change', () => {
        atualizarDadosMatriz();
    });

    function atualizarDadosMatriz() {
        const grupoSelecionado = resumoFilterGrupo.value;
        const produtosFiltrados = produtosBase.filter(p => grupoSelecionado === "TODOS" || p.grupo === grupoSelecionado);
        
        // Descobre as coleções (Colunas) existentes nesse filtro
        colecoesAtuais = [...new Set(produtosFiltrados.map(p => p.colecao))].sort();

        // Agrupa os dados
        const linhasMap = {};
        produtosFiltrados.forEach(p => {
            const key = `${p.grupo}|${p.linha}`;
            if (!linhasMap[key]) {
                linhasMap[key] = { grupo: p.grupo, linha: p.linha, total: 0 };
                colecoesAtuais.forEach(c => linhasMap[key][c] = 0); // Zera as coleções pra essa linha
            }
            linhasMap[key][p.colecao]++;
            linhasMap[key].total++;
        });

        dadosMatriz = Object.values(linhasMap);
        
        // Se a coleção usada na ordenação sumiu após o filtro, volta para "total"
        if (!['grupo', 'linha', 'total'].includes(sortConfig.key) && !colecoesAtuais.includes(sortConfig.key)) {
            sortConfig.key = 'total';
            sortConfig.dir = 'desc';
        }

        window.ordenarMatriz(sortConfig.key, sortConfig.dir);
    }

    // Função de ordenação exposta para o HTML
    window.ordenarMatriz = (key, forcedDir = null) => {
        if (forcedDir) {
            sortConfig.dir = forcedDir;
        } else {
            sortConfig.dir = (sortConfig.key === key && sortConfig.dir === 'asc') ? 'desc' : 'asc';
        }
        sortConfig.key = key;

        dadosMatriz.sort((a, b) => {
            let vA = a[key] || 0, vB = b[key] || 0;
            return typeof vA === 'string' 
                ? (sortConfig.dir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA)) 
                : (sortConfig.dir === 'asc' ? vA - vB : vB - vA);
        });
        
        renderizarMatrizHTML();
    };

    function renderizarMatrizHTML() {
        // Monta o Cabeçalho (Thead)
        let theadHtml = `<tr>
            <th onclick="ordenarMatriz('grupo')">GRUPO ↕️</th>
            <th onclick="ordenarMatriz('linha')">LINHA ↕️</th>`;
        colecoesAtuais.forEach(c => {
            theadHtml += `<th style="text-align: center;" onclick="ordenarMatriz('${c}')">${c} ↕️</th>`;
        });
        theadHtml += `<th style="text-align: center; background: var(--green-medium);" onclick="ordenarMatriz('total')">TOTAL ↕️</th></tr>`;
        theadResumo.innerHTML = theadHtml;

        // Monta o Corpo (Tbody)
        let totaisColunas = {};
        colecoesAtuais.forEach(c => totaisColunas[c] = 0);
        let totalGeral = 0;

        bodyResumo.innerHTML = dadosMatriz.map(row => {
            let tr = `<tr><td>${row.grupo}</td><td><strong>${row.linha}</strong></td>`;
            colecoesAtuais.forEach(c => {
                const val = row[c] || 0;
                totaisColunas[c] += val;
                tr += `<td style="text-align: center; color: ${val > 0 ? 'var(--green-primary)' : '#ccc'}; font-weight: ${val > 0 ? 'bold' : 'normal'};">${val > 0 ? val : '-'}</td>`;
            });
            totalGeral += row.total;
            tr += `<td style="text-align: center; font-weight: bold; background: #f1f8e9; color: var(--green-primary);">${row.total}</td></tr>`;
            return tr;
        }).join('');

        // Monta o Rodapé (Tfoot)
        let tfootHtml = `<tr><td colspan="2" style="text-align: right; padding: 12px; font-size: 1.1em;">TOTAL GERAL:</td>`;
        colecoesAtuais.forEach(c => {
            tfootHtml += `<td style="text-align: center; padding: 12px; font-size: 1.1em;">${totaisColunas[c]}</td>`;
        });
        tfootHtml += `<td style="text-align: center; padding: 12px; font-size: 1.2em;">${totalGeral}</td></tr>`;
        tfootResumo.innerHTML = tfootHtml;
    }

    // ==========================================
    // 3. CHECKBOXES DO KANBAN
    // ==========================================
    function gerarFiltrosCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();
        const preencher = (container, data) => {
            container.innerHTML = `<label style="border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 8px; color: var(--green-primary);"><input type="checkbox" class="select-all" checked> <strong>Selecionar Tudo</strong></label>` +
                data.map(val => `<label><input type="checkbox" class="item-checkbox" value="${val}" checked> ${val}</label>`).join('');
            container.querySelector('.select-all').addEventListener('change', (e) => {
                container.querySelectorAll('.item-checkbox').forEach(chk => { if (chk.closest('label').style.display !== 'none') chk.checked = e.target.checked; });
                atualizarKanban();
            });
            container.querySelectorAll('.item-checkbox').forEach(chk => chk.addEventListener('change', atualizarKanban));
        };
        preencher(listColecao, unique('colecao')); preencher(listLinha, unique('linha')); preencher(listGrupo, unique('grupo'));
    }

    // ==========================================
    // 4. LÓGICA MESTRA DO KANBAN E BI
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

        const filtrados = produtosBase.filter(p => fCol.includes(p.colecao) && fLin.includes(p.linha) && fGru.includes(p.grupo));
        const cols = { entrada: document.getElementById('cards-entrada'), inter: document.getElementById('cards-inter'), premium: document.getElementById('cards-premium') };
        Object.values(cols).forEach(c => c.innerHTML = '');
        let cont = { e: 0, i: 0, p: 0 };

        filtrados.forEach(p => {
            const card = document.createElement('div'); card.className = 'card';
            let b2cHtml = p.precoB2C > 0 ? `<span class="price-b2c">(B2C - R$ ${p.precoB2C.toFixed(2)})</span>` : '';
            let mkpHtml = p.mkp > 0 ? `<span class="markup">Mkt: ${p.mkp.toFixed(2)}</span>` : '';

            card.innerHTML = `<div class="info-container"><span class="ref-code">${p.ref}</span><span class="description">${p.desc}</span></div>
                <div class="price-container"><div class="b2b-row"><span class="price">R$ ${p.preco.toFixed(2)}</span>${mkpHtml}</div>${b2cHtml}</div>`;

            if (p.preco <= p.eMax) { cols.entrada.appendChild(card); cont.e++; }
            else if (p.preco <= p.iMax) { cols.inter.appendChild(card); cont.i++; }
            else { cols.premium.appendChild(card); cont.p++; }
        });

        document.getElementById('mix-entrada').innerText = cont.e; document.getElementById('mix-inter').innerText = cont.i; document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;

        const rangeE = document.getElementById('info-range-entrada'), rangeI = document.getElementById('info-range-inter'), rangeP = document.getElementById('info-range-premium');
        if ((effLin.length === 1 || effGru.length === 1) && filtrados.length > 0) {
            rangeE.innerText = `Até R$ ${filtrados[0].eMax.toFixed(2)}`; rangeI.innerText = `R$ ${(filtrados[0].eMax + 0.01).toFixed(2)} - R$ ${filtrados[0].iMax.toFixed(2)}`; 
            rangeE.style.display = rangeI.style.display = rangeP.style.display = 'block';
        } else { rangeE.style.display = rangeI.style.display = rangeP.style.display = 'none'; }
    }

    // ==========================================
    // 5. MODAL DE GRUPO DINÂMICO E SALVAMENTO
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
        btnSave.innerText = "Salvando..."; btnSave.disabled = true;
        for (let inputE of inputs) {
            const linha = inputE.dataset.linha, vEntrada = inputE.value, vInter = containerLinhasDinamicas.querySelector(`.in-inter[data-linha="${linha}"]`).value;
            await fetch('salvar_faixas.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plano, linha, grupo, valorEntrada: vEntrada, valorInter: vInter, valorPremium: vInter }) });
        }
        modalConfig.style.display = 'none'; selPlano.dispatchEvent(new Event('change'));
        btnSave.innerText = "Salvar Todas as Faixas"; btnSave.disabled = false;
    };

    // CONTROLES
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