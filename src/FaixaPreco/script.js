document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 
    let dadosResumo = []; 
    let sortConfig = { key: 'total', dir: 'desc' };

    // --- ELEMENTOS DA TELA PRINCIPAL ---
    const selPlano = document.getElementById('filter-plano');
    const listColecao = document.getElementById('list-colecao');
    const listLinha = document.getElementById('list-linha');
    const listGrupo = document.getElementById('list-grupo');

    // --- ELEMENTOS DO MODAL CONFIGURAÇÃO ---
    const modalConfig = document.getElementById('configModal');
    const modalSelGrupo = document.getElementById('modal-filter-grupo');
    const containerLinhasDinamicas = document.getElementById('linhas-dinamicas-container');
    const btnSave = document.getElementById('btn-save-ranges');

    // --- ELEMENTOS DO MODAL RESUMO ---
    const modalSummary = document.getElementById('summaryModal');
    const bodyResumo = document.getElementById('body-resumo');
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
                        preco: limpaMoeda(p.precoB2B || p.precob2b || p.preco),
                        precoB2C: limpaMoeda(p.precoB2C || p.precob2c),
                        mkp: parseFloat(p.MkpB2B || p.mkpb2b) || 0, 
                        eMax: parseFloat(p.faixa_entrada_max) || 0, iMax: parseFloat(p.faixa_inter_max) || 0
                    };
                });
                gerarFiltrosCheckboxes();
                popularGrupoModal();
                atualizarKanban();
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString('pt-BR');
            });
    });

    // ==========================================
    // 2. LOGICA DO RESUMO COM FILTRO DINÂMICO
    // ==========================================
    btnAbrirResumo.onclick = () => {
        if (produtosBase.length === 0) { alert("Selecione um plano primeiro!"); return; }
        
        // 1. Processa todos os dados uma única vez
        const mapResumo = {};
        produtosBase.forEach(p => {
            const key = `${p.grupo}|${p.linha}`;
            if (!mapResumo[key]) mapResumo[key] = { grupo: p.grupo, linha: p.linha, total: 0 };
            mapResumo[key].total++;
        });
        dadosResumo = Object.values(mapResumo);

        // 2. Popula o select do Filtro de Grupo no modal
        const uniqueGrupos = [...new Set(dadosResumo.map(d => d.grupo))].sort();
        resumoFilterGrupo.innerHTML = '<option value="TODOS">TODOS OS GRUPOS</option>' + 
            uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');

        // 3. Renderiza e abre
        ordenarResumo('total', 'desc');
        modalSummary.style.display = 'block';
    };

    // Evento de troca no filtro do resumo
    resumoFilterGrupo.addEventListener('change', () => {
        renderizarTabelaResumo();
    });

    function renderizarTabelaResumo() {
        const grupoSelecionado = resumoFilterGrupo.value;
        
        // Filtra os dados com base no select
        const filtrados = dadosResumo.filter(item => 
            grupoSelecionado === "TODOS" || item.grupo === grupoSelecionado
        );

        bodyResumo.innerHTML = filtrados.map(item => `
            <tr>
                <td>${item.grupo}</td>
                <td>${item.linha}</td>
                <td style="text-align: center; font-weight: bold; color: var(--green-primary);">${item.total}</td>
            </tr>
        `).join('');
    }

    // Função de ordenação
    window.ordenarResumo = (key, forcedDir = null) => {
        sortConfig.dir = forcedDir || (sortConfig.key === key && sortConfig.dir === 'asc' ? 'desc' : 'asc');
        sortConfig.key = key;
        dadosResumo.sort((a, b) => {
            let vA = a[key], vB = b[key];
            return typeof vA === 'string' ? (sortConfig.dir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA)) : (sortConfig.dir === 'asc' ? vA - vB : vB - vA);
        });
        renderizarTabelaResumo();
    };

    // ==========================================
    // 3. RESTANTE DA LÓGICA (CONFIG E KANBAN)
    // ==========================================
    function gerarFiltrosCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();
        const preencher = (container, data) => {
            container.innerHTML = `<label style="border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 8px; color: var(--green-primary);"><input type="checkbox" class="select-all" checked> <strong>Tudo</strong></label>` +
                data.map(val => `<label><input type="checkbox" class="item-checkbox" value="${val}" checked> ${val}</label>`).join('');
            container.querySelector('.select-all').addEventListener('change', (e) => {
                container.querySelectorAll('.item-checkbox').forEach(chk => { if (chk.closest('label').style.display !== 'none') chk.checked = e.target.checked; });
                atualizarKanban();
            });
            container.querySelectorAll('.item-checkbox').forEach(chk => chk.addEventListener('change', atualizarKanban));
        };
        preencher(listColecao, unique('colecao')); preencher(listLinha, unique('linha')); preencher(listGrupo, unique('grupo'));
    }

    function popularGrupoModal() {
        const uniqueGrupos = [...new Set(produtosBase.map(p => p.grupo))].sort();
        modalSelGrupo.innerHTML = '<option value="" disabled selected>Selecione o Grupo...</option>' + 
            uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
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
        msgFiltros.style.display = 'none'; areaFaixas.style.display = 'block';
    });

    function atualizarKanban() {
        const getChecked = (container) => Array.from(container.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        const fCol = getChecked(listColecao), fLin = getChecked(listLinha), fGru = getChecked(listGrupo);
        const validLin = new Set(produtosBase.filter(p => fCol.includes(p.colecao) && fGru.includes(p.grupo)).map(p => p.linha));
        const validGru = new Set(produtosBase.filter(p => fCol.includes(p.colecao) && fLin.includes(p.linha)).map(p => p.grupo));
        const setSub = (id, arr, valid) => {
            const el = document.getElementById(id), eff = arr.filter(x => valid ? valid.has(x) : true);
            el.innerText = eff.length === 1 ? `(${eff[0]})` : (eff.length > 1 ? `(Vários itens)` : `(Nenhum)`);
        };
        setSub('sub-colecao', fCol); setSub('sub-linha', fLin, validLin); setSub('sub-grupo', fGru, validGru);
        const updateVis = (cont, vSet) => { cont.querySelectorAll('.item-checkbox').forEach(chk => { chk.closest('label').style.display = vSet.has(chk.value) ? 'block' : 'none'; }); };
        updateVis(listColecao, new Set(fCol)); updateVis(listLinha, validLin); updateVis(listGrupo, validGru);
        const filtrados = produtosBase.filter(p => fCol.includes(p.colecao) && fLin.includes(p.linha) && fGru.includes(p.grupo));
        const cols = { entrada: document.getElementById('cards-entrada'), inter: document.getElementById('cards-inter'), premium: document.getElementById('cards-premium') };
        Object.values(cols).forEach(c => c.innerHTML = '');
        let cont = { e: 0, i: 0, p: 0 };
        filtrados.forEach(p => {
            const card = document.createElement('div'); card.className = 'card';
            card.innerHTML = `<div class="info-container"><span class="ref-code">${p.ref}</span><span class="description">${p.desc}</span></div>
                <div class="price-container"><div class="b2b-row"><span class="price">R$ ${p.preco.toFixed(2)}</span><span class="markup">Mkt: ${p.mkp.toFixed(2)}</span></div>
                <span class="price-b2c">(B2C - R$ ${p.precoB2C.toFixed(2)})</span></div>`;
            if (p.preco <= p.eMax) { cols.entrada.appendChild(card); cont.e++; }
            else if (p.preco <= p.iMax) { cols.inter.appendChild(card); cont.i++; }
            else { cols.premium.appendChild(card); cont.p++; }
        });
        document.getElementById('mix-entrada').innerText = cont.e; document.getElementById('mix-inter').innerText = cont.i; document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;
        const rE = document.getElementById('info-range-entrada'), rI = document.getElementById('info-range-inter'), rP = document.getElementById('info-range-premium');
        if ((fLin.filter(x => validLin.has(x)).length === 1 || fGru.filter(x => validGru.has(x)).length === 1) && filtrados.length > 0) {
            rE.innerText = `Até R$ ${filtrados[0].eMax.toFixed(2)}`; rI.innerText = `Até R$ ${filtrados[0].iMax.toFixed(2)}`; rE.style.display = rI.style.display = rP.style.display = 'block';
        } else { rE.style.display = rI.style.display = rP.style.display = 'none'; }
    }

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

    document.getElementById('close-modal').onclick = () => modalConfig.style.display = 'none';
    document.getElementById('close-summary').onclick = () => modalSummary.style.display = 'none';
    document.getElementById('btn-config').onclick = () => {
        if (!selPlano.value) { alert("Selecione o plano primeiro"); return; }
        modalConfig.style.display = 'block';
    };
    window.onclick = (e) => { if (e.target == modalConfig) modalConfig.style.display = 'none'; if (e.target == modalSummary) modalSummary.style.display = 'none'; };
    function limparFiltros() { produtosBase = []; atualizarKanban(); }
});