document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 

    // Elementos da Tela Principal
    const selPlano = document.getElementById('filter-plano');
    const containerColecao = document.getElementById('list-colecao');
    const containerLinha = document.getElementById('list-linha');
    const containerGrupo = document.getElementById('list-grupo');

    // Elementos do Modal
    const modal = document.getElementById('configModal');
    const modalTitle = document.getElementById('modal-plano-title');
    const modalSelLinha = document.getElementById('modal-filter-linha');
    const modalSelGrupo = document.getElementById('modal-filter-grupo');
    const interMaxInput = document.getElementById('inter-max');
    const premiumLabel = document.getElementById('premium-min-label');

    // --- 1. BUSCAR DADOS QUANDO MUDAR O PLANO ---
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
                    ref: p.referencia,
                    desc: p.descricao,
                    colecao: p.colecao || 'GERAL',
                    linha: p.linha || 'GERAL',
                    grupo: p.grupo || 'GERAL',
                    preco: parseFloat(p.precoB2B) || 0
                }));

                // AGORA SIM: Popula os filtros da tela e do modal
                gerarFiltrosCheckboxes();
                popularSelectsModal();
                
                atualizarKanban();
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString();
            })
            .catch(err => console.error("Erro ao buscar dados:", err));
    });

    // --- 2. FUNÇÃO PARA CRIAR AS CHECKBOXES (A que estava faltando!) ---
    function gerarFiltrosCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();

        const preencher = (container, data) => {
            container.innerHTML = data.map(val => `
                <label><input type="checkbox" value="${val}" checked> ${val}</label>
            `).join('');
            
            // Faz o Kanban atualizar sempre que marcar/desmarcar algo
            container.querySelectorAll('input').forEach(chk => {
                chk.addEventListener('change', atualizarKanban);
            });
        };

        preencher(containerColecao, unique('colecao'));
        preencher(containerLinha, unique('linha'));
        preencher(containerGrupo, unique('grupo'));
    }

    // Popula os selects únicos dentro do Modal
    function popularSelectsModal() {
        const uniqueLinhas = [...new Set(produtosBase.map(p => p.linha))].sort();
        const uniqueGrupos = [...new Set(produtosBase.map(p => p.grupo))].sort();

        modalSelLinha.innerHTML = '<option value="">TODAS AS LINHAS</option>' + 
            uniqueLinhas.map(l => `<option value="${l}">${l}</option>`).join('');
        
        modalSelGrupo.innerHTML = '<option value="">TODOS OS GRUPOS</option>' + 
            uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    // --- 3. LÓGICA DE FILTRAGEM DO KANBAN ---
    function atualizarKanban() {
        // Pega o que está marcado nos filtros do topo
        const getChecked = (container) => Array.from(container.querySelectorAll('input:checked')).map(c => c.value);
        
        const fColecoes = getChecked(containerColecao);
        const fLinhasHeader = getChecked(containerLinha);
        const fGruposHeader = getChecked(containerGrupo);

        // Pega o que está selecionado no Modal (Filtro Único)
        const fLinhaModal = modalSelLinha.value;
        const fGrupoModal = modalSelGrupo.value;

        // Faixas de Preço
        const eMax = parseFloat(document.getElementById('entrada-max').value) || 0;
        const iMax = parseFloat(document.getElementById('inter-max').value) || 0;

        // FILTRAGEM REAL
        const filtrados = produtosBase.filter(p => {
            const matchColecao = fColecoes.includes(p.colecao);
            const matchLinha = (!fLinhaModal) ? fLinhasHeader.includes(p.linha) : p.linha === fLinhaModal;
            const matchGrupo = (!fGrupoModal) ? fGruposHeader.includes(p.grupo) : p.grupo === fGrupoModal;
            
            return matchColecao && matchLinha && matchGrupo;
        });

        // Renderização dos cards (Igual ao seu, mas com as classes corrigidas)
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
            card.innerHTML = `
                <div class="info-container">
                    <span class="ref-code">${p.ref}</span>
                    <span class="description">${p.desc}</span>
                </div>
                <span class="price">${p.preco.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
            `;

            if (p.preco <= eMax) {
                cols.entrada.appendChild(card); cont.e++;
            } else if (p.preco <= iMax) {
                cols.inter.appendChild(card); cont.i++;
            } else {
                cols.premium.appendChild(card); cont.p++;
            }
        });

        document.getElementById('mix-entrada').innerText = cont.e;
        document.getElementById('mix-inter').innerText = cont.i;
        document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;
        
        // Atualiza as labels de faixa
        document.getElementById('info-range-entrada').innerText = `Até R$ ${eMax.toFixed(2)}`;
        document.getElementById('info-range-inter').innerText = `Até R$ ${iMax.toFixed(2)}`;
        document.getElementById('info-range-premium').innerText = `Acima de R$ ${iMax.toFixed(2)}`;
    }

    // --- 4. CONTROLE DO MODAL ---
    document.getElementById('btn-config').onclick = () => {
        const plano = selPlano.value;
        modalTitle.innerText = plano ? "Plano: " + plano : "⚠️ Selecione um plano";
        modal.style.display = 'block';
    };

    document.getElementById('close-modal').onclick = () => modal.style.display = 'none';
    
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };

    interMaxInput.addEventListener('input', () => {
        premiumLabel.innerText = interMaxInput.value;
    });

    document.getElementById('btn-save-ranges').onclick = () => {
        atualizarKanban();
        modal.style.display = 'none';
    };

    function limparFiltros() {
        produtosBase = [];
        containerColecao.innerHTML = '';
        containerLinha.innerHTML = '';
        containerGrupo.innerHTML = '';
        atualizarKanban();
    }
});