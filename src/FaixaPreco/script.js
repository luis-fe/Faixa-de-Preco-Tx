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
            .then(res => res.json())
            .then(data => {
                produtosBase = data.map(p => ({
                    ref: p.referencia || 'N/A',
                    desc: p.descricao || '',
                    colecao: p.colecao || 'GERAL',
                    linha: p.linha || 'GERAL',
                    grupo: p.grupo || 'GERAL',
                    preco: parseFloat(p.precoB2B || p.precob2b || p.preco) || 0,
                    // Recebe o limite dinâmico de cada produto do banco de dados (1/3 e 2/3 ou salvo)
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
                alert("Erro ao conectar com o banco de dados. Veja o console (F12).");
            });
    });

    // ==========================================
    // 2. CRIAR AS CHECKBOXES (MENUS SUSPENSOS)
    // ==========================================
    function gerarFiltrosCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();

        const preencher = (container, data) => {
            container.innerHTML = data.map(val => `
                <label><input type="checkbox" value="${val}" checked> ${val}</label>
            `).join('');
            
            // Faz o Kanban atualizar em tempo real ao clicar nas checkboxes
            container.querySelectorAll('input').forEach(chk => {
                chk.addEventListener('change', atualizarKanban);
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

        // Adiciona um valor vazio bloqueado para obrigar o clique
        modalSelLinha.innerHTML = '<option value="" disabled selected>Selecione a Linha...</option><option value="TODAS">TODAS AS LINHAS</option>' + 
            uniqueLinhas.map(l => `<option value="${l}">${l}</option>`).join('');
        
        modalSelGrupo.innerHTML = '<option value="" disabled selected>Selecione o Grupo...</option><option value="TODOS">TODOS OS GRUPOS</option>' + 
            uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    // Esconde a área de faixas até que Linha e Grupo sejam escolhidos
    function verificarSelecaoModal() {
        if (msgFiltros && areaFaixas) {
            if (modalSelLinha.value !== "" && modalSelGrupo.value !== "") {
                msgFiltros.style.display = 'none';
                areaFaixas.style.display = 'block';

                // PROCURA o primeiro produto correspondente para preencher as caixas de preço com a regra atual
                const amostra = produtosBase.find(p => 
                    (modalSelLinha.value === "TODAS" || p.linha === modalSelLinha.value) && 
                    (modalSelGrupo.value === "TODOS" || p.grupo === modalSelGrupo.value)
                );
                
                if (amostra) {
                    document.getElementById('entrada-max').value = amostra.eMax.toFixed(2);
                    document.getElementById('inter-max').value = amostra.iMax.toFixed(2);
                    premiumLabel.innerText = amostra.iMax.toFixed(2);
                }
            } else {
                msgFiltros.style.display = 'block';
                areaFaixas.style.display = 'none';
            }
        }
    }

    // Escuta as mudanças nos selects do modal
    modalSelLinha.addEventListener('change', verificarSelecaoModal);
    modalSelGrupo.addEventListener('change', verificarSelecaoModal);

    // ==========================================
    // 4. LÓGICA MESTRA DO KANBAN
    // ==========================================
    function atualizarKanban() {
        const getChecked = (container) => Array.from(container.querySelectorAll('input:checked')).map(c => c.value);
        const fColecoes = getChecked(listColecao);
        const fLinhasHeader = getChecked(listLinha);
        const fGruposHeader = getChecked(listGrupo);

        const fLinhaModal = modalSelLinha.value;
        const fGrupoModal = modalSelGrupo.value;

        // Filtragem Cruzada
        const filtrados = produtosBase.filter(p => {
            const matchColecao = fColecoes.includes(p.colecao);
            
            // Se o modal estiver em 'TODAS' ou vazio, respeita as checkboxes. Se não, força a linha do modal.
            const matchLinha = (!fLinhaModal || fLinhaModal === "TODAS") ? fLinhasHeader.includes(p.linha) : (p.linha === fLinhaModal);
            const matchGrupo = (!fGrupoModal || fGrupoModal === "TODOS") ? fGruposHeader.includes(p.grupo) : (p.grupo === fGrupoModal);
            
            return matchColecao && matchLinha && matchGrupo;
        });

        // Limpa Colunas
        const cols = {
            entrada: document.getElementById('cards-entrada'),
            inter: document.getElementById('cards-inter'),
            premium: document.getElementById('cards-premium')
        };
        Object.values(cols).forEach(c => c.innerHTML = '');

        let cont = { e: 0, i: 0, p: 0 };

        // Distribui Cards com base nos limites próprios de cada produto (1/3, 2/3 ou salvos)
        filtrados.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="info-container">
                    <span class="ref-code">${p.ref}</span>
                    <span class="description">${p.desc}</span>
                </div>
                <span class="price">${p.preco.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
            `;

            if (p.preco <= p.eMax) {
                cols.entrada.appendChild(card); cont.e++;
            } else if (p.preco <= p.iMax) {
                cols.inter.appendChild(card); cont.i++;
            } else {
                cols.premium.appendChild(card); cont.p++;
            }
        });

        // Atualiza Painéis e Legendas
        document.getElementById('mix-entrada').innerText = cont.e;
        document.getElementById('mix-inter').innerText = cont.i;
        document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;
        
        document.getElementById('info-range-entrada').innerText = `Até 1/3 do Mix (Dinâmico)`;
        document.getElementById('info-range-inter').innerText = `Até 2/3 do Mix (Dinâmico)`;
        document.getElementById('info-range-premium').innerText = `Acima de 2/3 (Dinâmico)`;
    }

    // ==========================================
    // 5. CONTROLES DE INTERFACE (BOTÕES)
    // ==========================================
    document.getElementById('btn-config').onclick = () => {
        const plano = selPlano.value;
        modalTitle.innerText = plano ? "Configurando: " + plano : "⚠️ Selecione o plano primeiro";
        modalTitle.style.color = plano ? "var(--green-primary)" : "red";
        
        // Reseta o modal toda vez que ele abre
        modalSelLinha.value = "";
        modalSelGrupo.value = "";
        verificarSelecaoModal();

        modal.style.display = 'block';
    };

    document.getElementById('close-modal').onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };

    interMaxInput.addEventListener('input', () => {
        premiumLabel.innerText = interMaxInput.value;
    });

    // ==========================================
    // 6. SALVAR FAIXAS NO BANCO DE DADOS E RECARREGAR
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
                
                // MÁGICA: Dispara o "change" no select. 
                // Isso faz o JS refazer o "fetch" no banco de dados automaticamente!
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

    // ==========================================
    // 7. FUNÇÃO AUXILIAR
    // ==========================================
    function limparFiltros() {
        produtosBase = [];
        listColecao.innerHTML = '';
        listLinha.innerHTML = '';
        listGrupo.innerHTML = '';
        atualizarKanban();
    }
});