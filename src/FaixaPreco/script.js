document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 

    // --- ELEMENTOS DA TELA PRINCIPAL ---
    const selPlano = document.getElementById('filter-plano');
    const listColecao = document.getElementById('list-colecao');
    const listLinha = document.getElementById('list-linha');
    const listGrupo = document.getElementById('list-grupo');

    // --- ELEMENTOS DO MODAL ---
    const modal = document.getElementById('configModal');
    const modalTitle = document.getElementById('modal-plano-title');
    const modalSelLinha = document.getElementById('modal-filter-linha');
    const modalSelGrupo = document.getElementById('modal-filter-grupo');
    const interMaxInput = document.getElementById('inter-max');
    const premiumLabel = document.getElementById('premium-min-label');
    const msgFiltros = document.getElementById('msg-selecione-filtros');
    const areaFaixas = document.getElementById('config-faixas-area');
    const btnSave = document.getElementById('btn-save-ranges');

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
                produtosBase = data.map(p => ({
                    ref: p.referencia || 'N/A',
                    desc: p.descricao || '',
                    colecao: p.colecao || 'GERAL',
                    linha: p.linha || 'GERAL',
                    grupo: p.grupo || 'GERAL',
                    // Conversão de valores financeiros limpando caracteres
                    preco: parseFloat((p.precoB2B || p.precob2b || p.preco || "0").replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0,
                    precoB2C: parseFloat((p.precoB2C || p.precob2c || "0").replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0,
                    eMax: parseFloat(p.faixa_entrada_max) || 0, 
                    iMax: parseFloat(p.faixa_inter_max) || 0
                }));

                gerarFiltrosCheckboxes();
                popularSelectsModal();
                
                atualizarKanban();
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString('pt-BR');
            })
            .catch(err => {
                console.error("Erro Crítico ao buscar dados:", err);
                alert("Falha: " + err.message); 
            });
    });

    // ==========================================
    // 2. CRIAR AS CHECKBOXES (COM "SELECIONAR TUDO")
    // ==========================================
    function gerarFiltrosCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();

        const preencher = (container, data) => {
            let html = `
                <label style="border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 8px; color: var(--green-primary);">
                    <input type="checkbox" class="select-all" checked> <strong>Selecionar Tudo</strong>
                </label>
            `;
            html += data.map(val => `
                <label><input type="checkbox" class="item-checkbox" value="${val}" checked> ${val}</label>
            `).join('');
            
            container.innerHTML = html;

            const chkAll = container.querySelector('.select-all');
            const chkItems = container.querySelectorAll('.item-checkbox');

            chkAll.addEventListener('change', (e) => {
                chkItems.forEach(chk => chk.checked = e.target.checked);
                atualizarKanban();
            });

            chkItems.forEach(chk => {
                chk.addEventListener('change', () => {
                    const todosMarcados = Array.from(chkItems).every(c => c.checked);
                    chkAll.checked = todosMarcados;
                    atualizarKanban();
                });
            });
        };

        preencher(listColecao, unique('colecao'));
        preencher(listLinha, unique('linha'));
        preencher(listGrupo, unique('grupo'));
    }

    // ==========================================
    // 3. LÓGICA DO MODAL (POPULAR E ESCONDER)
    // ==========================================
    function popularSelectsModal() {
        const uniqueLinhas = [...new Set(produtosBase.map(p => p.linha))].sort();
        const uniqueGrupos = [...new Set(produtosBase.map(p => p.grupo))].sort();

        modalSelLinha.innerHTML = '<option value="" disabled selected>Selecione a Linha...</option><option value="TODAS">TODAS AS LINHAS</option>' + 
            uniqueLinhas.map(l => `<option value="${l}">${l}</option>`).join('');
        
        modalSelGrupo.innerHTML = '<option value="" disabled selected>Selecione o Grupo...</option><option value="TODOS">TODOS OS GRUPOS</option>' + 
            uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    function verificarSelecaoModal() {
        if (msgFiltros && areaFaixas) {
            if (modalSelLinha.value !== "" && modalSelGrupo.value !== "") {
                msgFiltros.style.display = 'none';
                areaFaixas.style.display = 'block';

                const amostra = produtosBase.find(p => 
                    (modalSelLinha.value === "TODAS" || p.linha === modalSelLinha.value) && 
                    (modalSelGrupo.value === "TODOS" || p.grupo === modalSelGrupo.value)
                );
                
                if (amostra) {
                    document.getElementById('entrada-max').value = amostra.eMax.toFixed(2);
                    // O mínimo do inter é sempre o max da entrada
                    document.getElementById('inter-min').value = (amostra.eMax + 0.01).toFixed(2);
                    
                    document.getElementById('inter-max').value = amostra.iMax.toFixed(2);
                    premiumLabel.innerText = amostra.iMax.toFixed(2);
                }
            } else {
                msgFiltros.style.display = 'block';
                areaFaixas.style.display = 'none';
            }
        }
    }

    modalSelLinha.addEventListener('change', verificarSelecaoModal);
    modalSelGrupo.addEventListener('change', verificarSelecaoModal);

    // ==========================================
    // 4. LÓGICA MESTRA DO KANBAN E CARDS
    // ==========================================
    function atualizarKanban() {
        const getChecked = (container) => Array.from(container.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        const fColecoes = getChecked(listColecao);
        const fLinhasHeader = getChecked(listLinha);
        const fGruposHeader = getChecked(listGrupo);

        const fLinhaModal = modalSelLinha.value;
        const fGrupoModal = modalSelGrupo.value;

        const filtrados = produtosBase.filter(p => {
            const matchColecao = fColecoes.includes(p.colecao);
            const matchLinha = (!fLinhaModal || fLinhaModal === "TODAS") ? fLinhasHeader.includes(p.linha) : (p.linha === fLinhaModal);
            const matchGrupo = (!fGrupoModal || fGrupoModal === "TODOS") ? fGruposHeader.includes(p.grupo) : (p.grupo === fGrupoModal);
            
            return matchColecao && matchLinha && matchGrupo;
        });

        const cols = {
            entrada: document.getElementById('cards-entrada'),
            inter: document.getElementById('cards-inter'),
            premium: document.getElementById('cards-premium')
        };
        Object.values(cols).forEach(c => c.innerHTML = '');

        let cont = { e: 0, i: 0, p: 0 };

        filtrados.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            
            // Lógica do Preço B2C: Só aparece se for maior que zero
            let textoB2C = '';
            if (p.precoB2C > 0) {
                textoB2C = `<span class="price-b2c">(B2C - ${p.precoB2C.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})})</span>`;
            }

            card.innerHTML = `
                <div class="info-container">
                    <span class="ref-code">${p.ref}</span>
                    <span class="description">${p.desc}</span>
                </div>
                <div class="price-container">
                    <span class="price">${p.preco.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                    ${textoB2C}
                </div>
            `;

            if (p.preco <= p.eMax) {
                cols.entrada.appendChild(card); cont.e++;
            } else if (p.preco <= p.iMax) {
                cols.inter.appendChild(card); cont.i++;
            } else {
                cols.premium.appendChild(card); cont.p++;
            }
        });

        document.getElementById('mix-entrada').innerText = cont.e;
        document.getElementById('mix-inter').innerText = cont.i;
        document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;
        
        // Regra para exibir ou ocultar as legendas de faixas nas colunas
        const infoEntrada = document.getElementById('info-range-entrada');
        const infoInter = document.getElementById('info-range-inter');
        const infoPremium = document.getElementById('info-range-premium');

        if (fLinhasHeader.length === 1 && fGruposHeader.length === 1 && filtrados.length > 0) {
            const amostra = filtrados[0]; 
            infoEntrada.innerText = `Até R$ ${amostra.eMax.toFixed(2)}`;
            infoInter.innerText = `R$ ${(amostra.eMax + 0.01).toFixed(2)} - R$ ${amostra.iMax.toFixed(2)}`;
            infoPremium.innerText = `Acima de R$ ${amostra.iMax.toFixed(2)}`;
            
            infoEntrada.style.display = 'block';
            infoInter.style.display = 'block';
            infoPremium.style.display = 'block';
        } else {
            infoEntrada.style.display = 'none';
            infoInter.style.display = 'none';
            infoPremium.style.display = 'none';
        }
    }

    // ==========================================
    // 5. CONTROLES DE INTERFACE E SINCRONIA
    // ==========================================
    document.getElementById('btn-config').onclick = () => {
        const plano = selPlano.value;
        modalTitle.innerText = plano ? "Configurando: " + plano : "⚠️ Selecione o plano primeiro";
        modalTitle.style.color = plano ? "var(--green-primary)" : "red";
        
        // Pega as linhas e grupos marcados no Kanban
        const getChecked = (container) => Array.from(container.querySelectorAll('.item-checkbox:checked')).map(c => c.value);
        const fLinhasAtuais = getChecked(listLinha);
        const fGruposAtuais = getChecked(listGrupo);

        modalSelLinha.value = "";
        modalSelGrupo.value = "";

        // Sincroniza se tiver apenas um marcado
        if (fLinhasAtuais.length === 1) modalSelLinha.value = fLinhasAtuais[0];
        if (fGruposAtuais.length === 1) modalSelGrupo.value = fGruposAtuais[0];

        verificarSelecaoModal();
        modal.style.display = 'block';
    };

    document.getElementById('close-modal').onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };

    // Atualiza campo "Acima de" e os limites de forma encadeada no modal
    document.getElementById('entrada-max').addEventListener('input', (e) => {
        document.getElementById('inter-min').value = (parseFloat(e.target.value) + 0.01).toFixed(2) || "0.00";
    });

    interMaxInput.addEventListener('input', () => {
        premiumLabel.innerText = interMaxInput.value;
    });

    // ==========================================
    // 6. SALVAR FAIXAS NO BANCO DE DADOS
    // ==========================================
    btnSave.onclick = () => {
        const planoAtual = selPlano.value;
        
        if (!planoAtual) {
            alert("Por favor, selecione um plano primeiro.");
            return;
        }

        const textoOriginal = btnSave.innerText;
        btnSave.innerText = "Salvando...";
        btnSave.disabled = true;

        const payload = {
            plano: planoAtual,
            linha: modalSelLinha.value,
            grupo: modalSelGrupo.value,
            valorEntrada: document.getElementById('entrada-max').value,
            valorInter: document.getElementById('inter-max').value,
            valorPremium: document.getElementById('inter-max').value 
        };

        fetch('salvar_faixas.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert("Erro do Banco de Dados: " + data.error);
            } else {
                modal.style.display = 'none';
                selPlano.dispatchEvent(new Event('change')); 
            }
        })
        .catch(err => {
            console.error("Erro na comunicação:", err);
            alert("Falha ao comunicar com o servidor.");
        })
        .finally(() => {
            btnSave.innerText = textoOriginal;
            btnSave.disabled = false;
        });
    };

    function limparFiltros() {
        produtosBase = [];
        listColecao.innerHTML = '';
        listLinha.innerHTML = '';
        listGrupo.innerHTML = '';
        atualizarKanban();
    }
});