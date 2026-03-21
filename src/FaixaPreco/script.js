document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 
    let dadosResumo = []; // Armazena os dados processados para o resumo
    let sortConfig = { key: 'total', dir: 'desc' }; // Configuração de ordenação inicial

    // --- ELEMENTOS DA TELA PRINCIPAL ---
    const selPlano = document.getElementById('filter-plano');
    const listColecao = document.getElementById('list-colecao');
    const listLinha = document.getElementById('list-linha');
    const listGrupo = document.getElementById('list-grupo');

    // --- ELEMENTOS DO MODAL CONFIGURAÇÃO ---
    const modalConfig = document.getElementById('configModal');
    const modalSelGrupo = document.getElementById('modal-filter-grupo');
    const msgFiltros = document.getElementById('msg-selecione-filtros');
    const areaFaixas = document.getElementById('config-faixas-area');
    const containerLinhasDinamicas = document.getElementById('linhas-dinamicas-container');
    const btnSave = document.getElementById('btn-save-ranges');

    // --- ELEMENTOS DO MODAL RESUMO ---
    const modalSummary = document.getElementById('summaryModal');
    const bodyResumo = document.getElementById('body-resumo');
    const btnAbrirResumo = document.getElementById('btn-resumo');

    // ==========================================
    // 1. BUSCAR DADOS QUANDO MUDAR O PLANO
    // ==========================================
    selPlano.addEventListener('change', () => {
        const plano = selPlano.value;
        if (!plano) {
            limparFiltros();
            return;
        }

        fetch(`buscar_produtos.php?plano=${encodeURIComponent(plano)}`)
            .then(async res => {
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Erro desconhecido no servidor.");
                }
                return res.json();
            })
            .then(data => {
                produtosBase = data.map(p => {
                    const limpaMoeda = (val) => {
                        if (!val || String(val).trim() === '') return 0;
                        let limpo = String(val).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
                        return parseFloat(limpo) || 0;
                    };

                    return {
                        ref: p.referencia || 'N/A',
                        desc: p.descricao || '',
                        colecao: p.colecao || 'GERAL',
                        linha: p.linha || 'GERAL',
                        grupo: p.grupo || 'GERAL',
                        preco: limpaMoeda(p.precoB2B || p.precob2b || p.preco),
                        precoB2C: limpaMoeda(p.precoB2C || p.precob2c),
                        mkp: parseFloat(p.MkpB2B || p.mkpb2b) || 0, 
                        eMax: parseFloat(p.faixa_entrada_max) || 0, 
                        iMax: parseFloat(p.faixa_inter_max) || 0
                    };
                });

                gerarFiltrosCheckboxes();
                popularGrupoModal();
                atualizarKanban();
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString('pt-BR');
            })
            .catch(err => {
                console.error("Erro Crítico:", err);
                alert("Falha: " + err.message); 
            });
    });

    // ==========================================
    // 2. CRIAR AS CHECKBOXES DOS FILTROS
    // ==========================================
    function gerarFiltrosCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();

        const preencher = (container, data) => {
            let html = `<label style="border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 8px; color: var(--green-primary);">
                    <input type="checkbox" class="select-all" checked> <strong>Tudo</strong>
                </label>` +
                data.map(val => `<label><input type="checkbox" class="item-checkbox" value="${val}" checked> ${val}</label>`).join('');
            
            container.innerHTML = html;
            const chkAll = container.querySelector('.select-all');
            const chkItems = container.querySelectorAll('.item-checkbox');

            chkAll.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                chkItems.forEach(chk => { if (chk.closest('label').style.display !== 'none') chk.checked = isChecked; });
                atualizarKanban();
            });

            chkItems.forEach(chk => { chk.addEventListener('change', atualizarKanban); });
        };

        preencher(listColecao, unique('colecao'));
        preencher(listLinha, unique('linha'));
        preencher(listGrupo, unique('grupo'));
    }

    // ==========================================
    // 3. LOGICA DO MODAL DE RESUMO (MIX)
    // ==========================================
    btnAbrirResumo.onclick = () => {
        if (produtosBase.length === 0) { alert("Selecione um plano primeiro!"); return; }
        
        // Agrupa produtos por Grupo e Linha
        const mapResumo = {};
        produtosBase.forEach(p => {
            const key = `${p.grupo}|${p.linha}`;
            if (!mapResumo[key]) {
                mapResumo[key] = { grupo: p.grupo, linha: p.linha, total: 0 };
            }
            mapResumo[key].total++;
        });

        dadosResumo = Object.values(mapResumo);
        
        // Ordenação inicial por Total de Produtos (Descendente)
        ordenarResumo('total', 'desc');
        modalSummary.style.display = 'block';
    };

    // Função de ordenação clicável
    window.ordenarResumo = (key, forcedDir = null) => {
        if (forcedDir) {
            sortConfig.dir = forcedDir;
        } else {
            sortConfig.dir = (sortConfig.key === key && sortConfig.dir === 'asc') ? 'desc' : 'asc';
        }
        sortConfig.key = key;

        dadosResumo.sort((a, b) => {
            let valA = a[key];
            let valB = b[key];
            if (typeof valA === 'string') {
                return sortConfig.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                return sortConfig.dir === 'asc' ? valA - valB : valB - valA;
            }
        });
        renderizarTabelaResumo();
    };

    function renderizarTabelaResumo() {
        bodyResumo.innerHTML = dadosResumo.map(item => `
            <tr>
                <td>${item.grupo}</td>
                <td>${item.linha}</td>
                <td style="text-align: center; font-weight: bold; color: var(--green-primary);">${item.total}</td>
            </tr>
        `).join('');
    }

    // ==========================================
    // 4. LÓGICA DINÂMICA DO MODAL (POR GRUPO)
    // ==========================================
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
            divRow.innerHTML = `
                <div style="flex: 2; font-weight: bold; font-size: 0.85em;">${linha}</div>
                <div style="flex: 1.5;"><input type="number" step="0.01" class="in-entrada" data-linha="${linha}" value="${amostra.eMax.toFixed(2)}" style="width: 100%; padding: 5px; border-radius:4px; border:1px solid #ccc;"></div>
                <div style="flex: 1.5;"><input type="number" step="0.01" class="in-inter" data-linha="${linha}" value="${amostra.iMax.toFixed(2)}" style="width: 100%; padding: 5px; border-radius:4px; border:1px solid #ccc;"></div>
                <div style="flex: 1; text-align: center; font-size: 0.75em; color: var(--green-primary); font-weight: bold;">> <span class="lbl-premium">${amostra.iMax.toFixed(2)}</span></div>
            `;
            const inputInter = divRow.querySelector('.in-inter');
            const labelPremium = divRow.querySelector('.lbl-premium');
            inputInter.addEventListener('input', () => { labelPremium.innerText = inputInter.value; });
            containerLinhasDinamicas.appendChild(divRow);
        });
        msgFiltros.style.display = 'none';
        areaFaixas.style.display = 'block';
    });

    // ==========================================
    // 5. LÓGICA MESTRA DO KANBAN E BI
    // ==========================================
    function atualizarKanban() {
        const getChecked = (container) => Array.from(container.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        const fColecoes = getChecked(listColecao);
        const fLinhas = getChecked(listLinha);
        const fGrupos = getChecked(listGrupo);

        const validColecoes = new Set(produtosBase.filter(p => fLinhas.includes(p.linha) && fGrupos.includes(p.grupo)).map(p => p.colecao));
        const validLinhas = new Set(produtosBase.filter(p => fColecoes.includes(p.colecao) && fGrupos.includes(p.grupo)).map(p => p.linha));
        const validGrupos = new Set(produtosBase.filter(p => fColecoes.includes(p.colecao) && fLinhas.includes(p.linha)).map(p => p.grupo));

        const effCol = fColecoes.filter(x => validColecoes.has(x));
        const effLin = fLinhas.filter(x => validLinhas.has(x));
        const effGru = fGrupos.filter(x => validGrupos.has(x));

        const setSub = (id, arr) => {
            const el = document.getElementById(id);
            if (arr.length === 1) el.innerText = `(${arr[0]})`;
            else if (arr.length > 1) el.innerText = `(Vários itens)`;
            else el.innerText = `(Nenhum)`;
        };
        setSub('sub-colecao', effCol); setSub('sub-linha', effLin); setSub('sub-grupo', effGru);

        const updateVis = (cont, vSet) => { cont.querySelectorAll('.item-checkbox').forEach(chk => { chk.closest('label').style.display = vSet.has(chk.value) ? 'block' : 'none'; }); };
        updateVis(listColecao, validColecoes); updateVis(listLinha, validLinhas); updateVis(listGrupo, validGrupos);

        const filtrados = produtosBase.filter(p => fColecoes.includes(p.colecao) && fLinhas.includes(p.linha) && fGrupos.includes(p.grupo));
        const cols = { entrada: document.getElementById('cards-entrada'), inter: document.getElementById('cards-inter'), premium: document.getElementById('cards-premium') };
        Object.values(cols).forEach(c => c.innerHTML = '');
        let cont = { e: 0, i: 0, p: 0 };

        filtrados.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            let b2c = p.precoB2C > 0 ? `<span class="price-b2c">(B2C - R$ ${p.precoB2C.toFixed(2)})</span>` : '';
            let mkp = p.mkp > 0 ? `<span class="markup">Mkt: ${p.mkp.toFixed(2)}</span>` : '';
            card.innerHTML = `<div class="info-container"><span class="ref-code">${p.ref}</span><span class="description">${p.desc}</span></div>
                <div class="price-container"><div class="b2b-row"><span class="price">R$ ${p.preco.toFixed(2)}</span>${mkp}</div>${b2c}</div>`;

            if (p.preco <= p.eMax) { cols.entrada.appendChild(card); cont.e++; }
            else if (p.preco <= p.iMax) { cols.inter.appendChild(card); cont.i++; }
            else { cols.premium.appendChild(card); cont.p++; }
        });

        document.getElementById('mix-entrada').innerText = cont.e;
        document.getElementById('mix-inter').innerText = cont.i;
        document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;

        const rangeE = document.getElementById('info-range-entrada'), rangeI = document.getElementById('info-range-inter'), rangeP = document.getElementById('info-range-premium');
        if ((effLin.length === 1 || effGru.length === 1) && filtrados.length > 0) {
            rangeE.innerText = `Até R$ ${filtrados[0].eMax.toFixed(2)}`;
            rangeI.innerText = `R$ ${(filtrados[0].eMax + 0.01).toFixed(2)} - R$ ${filtrados[0].iMax.toFixed(2)}`;
            rangeE.style.display = rangeI.style.display = rangeP.style.display = 'block';
        } else { rangeE.style.display = rangeI.style.display = rangeP.style.display = 'none'; }
    }

    // ==========================================
    // 6. SALVAR EM LOTE
    // ==========================================
    btnSave.onclick = async () => {
        const plano = selPlano.value;
        const grupo = modalSelGrupo.value;
        const rows = containerLinhasDinamicas.querySelectorAll('.in-entrada');
        btnSave.innerText = "Salvando todas..."; btnSave.disabled = true;

        try {
            for (let inputE of rows) {
                const linha = inputE.dataset.linha;
                const vEntrada = inputE.value;
                const vInter = containerLinhasDinamicas.querySelector(`.in-inter[data-linha="${linha}"]`).value;
                await fetch('salvar_faixas.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plano, linha, grupo, valorEntrada: vEntrada, valorInter: vInter, valorPremium: vInter })
                });
            }
            modalConfig.style.display = 'none';
            selPlano.dispatchEvent(new Event('change'));
        } catch (err) { alert("Erro ao salvar."); }
        finally { btnSave.innerText = "Salvar Todas as Faixas do Grupo"; btnSave.disabled = false; }
    };

    // --- CONTROLES DE FECHAR MODAIS ---
    document.getElementById('close-modal').onclick = () => modalConfig.style.display = 'none';
    document.getElementById('close-summary').onclick = () => modalSummary.style.display = 'none';
    
    document.getElementById('btn-config').onclick = () => {
        const plano = selPlano.value;
        if (!plano) { alert("Selecione o plano primeiro"); return; }
        const effGru = Array.from(listGrupo.querySelectorAll('.item-checkbox:checked')).filter(c => c.closest('label').style.display !== 'none').map(c => c.value);
        modalSelGrupo.value = "";
        if (effGru.length === 1) { modalSelGrupo.value = effGru[0]; modalSelGrupo.dispatchEvent(new Event('change')); }
        else { msgFiltros.style.display = 'block'; areaFaixas.style.display = 'none'; }
        modalConfig.style.display = 'block';
    };

    window.onclick = (e) => { 
        if (e.target == modalConfig) modalConfig.style.display = 'none'; 
        if (e.target == modalSummary) modalSummary.style.display = 'none';
    };

    function limparFiltros() { produtosBase = []; atualizarKanban(); }
});