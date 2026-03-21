document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 

    // Elementos principais
    const selPlano = document.getElementById('filter-plano');
    const modal = document.getElementById('configModal');
    const btnConfig = document.getElementById('btn-config');
    const btnClose = document.getElementById('close-modal');
    const btnSave = document.getElementById('btn-save-ranges');
    
    // Elementos do Modal
    const modalTitle = document.getElementById('modal-plano-title');
    const modalSelLinha = document.getElementById('modal-filter-linha');
    const modalSelGrupo = document.getElementById('modal-filter-grupo');
    const interMaxInput = document.getElementById('inter-max');
    const premiumLabel = document.getElementById('premium-min-label');

    // --- 1. BUSCAR DADOS DO BANCO ---
    selPlano.addEventListener('change', () => {
        const plano = selPlano.value;
        if (!plano) return;

        fetch(`buscar_produtos.php?plano=${encodeURIComponent(plano)}`)
            .then(res => res.json())
            .then(data => {
                produtosBase = data.map(p => ({
                    ref: p.referencia,
                    desc: p.descricao,
                    linha: p.linha || 'GERAL',
                    grupo: p.grupo || 'GERAL',
                    preco: parseFloat(p.precoB2B) || 0
                }));
                atualizarKanban();
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString();
            })
            .catch(err => console.error("Erro ao carregar dados:", err));
    });

    // --- 2. CONTROLE DO MODAL (ABRIR) ---
    btnConfig.onclick = () => {
        const planoSelecionado = selPlano.value; // Importa a seleção do Kanban

        if (!planoSelecionado || planoSelecionado === "") {
            modalTitle.innerText = "⚠️ Selecione um plano primeiro";
            modalTitle.style.color = "red";
            // Limpa as opções se não houver plano
            modalSelLinha.innerHTML = '<option value="">TODAS</option>';
            modalSelGrupo.innerHTML = '<option value="">TODOS</option>';
        } else {
            modalTitle.innerText = "Configurando Plano: " + planoSelecionado;
            modalTitle.style.color = "var(--green-primary)";
            
            // Popula os selects do modal com base nos produtos carregados
            const uniqueLinhas = [...new Set(produtosBase.map(p => p.linha))].sort();
            const uniqueGrupos = [...new Set(produtosBase.map(p => p.grupo))].sort();
            
            modalSelLinha.innerHTML = '<option value="">TODAS AS LINHAS</option>' + 
                uniqueLinhas.map(l => `<option value="${l}">${l}</option>`).join('');
            
            modalSelGrupo.innerHTML = '<option value="">TODOS OS GRUPOS</option>' + 
                uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
        }
        
        modal.style.display = 'block';
    };

    // --- 3. CONTROLE DO MODAL (FECHAR) ---
    // Botão X
    btnClose.onclick = () => {
        modal.style.display = 'none';
    };

    // Fechar ao clicar fora da caixa branca
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // --- 4. LÓGICA DE FAIXAS EM TEMPO REAL ---
    interMaxInput.addEventListener('input', () => {
        premiumLabel.innerText = interMaxInput.value || "0.00";
    });

    // --- 5. ATUALIZAR KANBAN ---
    function atualizarKanban() {
        // Captura valores das faixas
        const eMax = parseFloat(document.getElementById('entrada-max').value) || 0;
        const iMin = parseFloat(document.getElementById('inter-min').value) || 0;
        const iMax = parseFloat(document.getElementById('inter-max').value) || 0;

        // Captura filtros do modal
        const fLinha = modalSelLinha.value;
        const fGrupo = modalSelGrupo.value;

        // Atualiza os textos de faixa no topo das colunas
        document.getElementById('info-range-entrada').innerText = `Até R$ ${eMax.toFixed(2)}`;
        document.getElementById('info-range-inter').innerText = `R$ ${iMin.toFixed(2)} - R$ ${iMax.toFixed(2)}`;
        document.getElementById('info-range-premium').innerText = `Acima de R$ ${iMax.toFixed(2)}`;

        // Filtra a lista base
        const filtrados = produtosBase.filter(p => {
            const matchLinha = !fLinha || p.linha === fLinha;
            const matchGrupo = !fGrupo || p.grupo === fGrupo;
            return matchLinha && matchGrupo;
        });

        // Seleciona colunas e limpa
        const cols = {
            entrada: document.getElementById('cards-entrada'),
            inter: document.getElementById('cards-inter'),
            premium: document.getElementById('cards-premium')
        };
        Object.values(cols).forEach(c => c.innerHTML = '');

        let cont = { e: 0, i: 0, p: 0 };

        // Renderiza os cards
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
            } else if (p.preco > eMax && p.preco <= iMax) {
                cols.inter.appendChild(card); cont.i++;
            } else {
                cols.premium.appendChild(card); cont.p++;
            }
        });

        // Atualiza contadores
        document.getElementById('mix-entrada').innerText = cont.e;
        document.getElementById('mix-inter').innerText = cont.i;
        document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;
    }

    // Botão Salvar
    btnSave.onclick = () => {
        atualizarKanban();
        modal.style.display = 'none';
    };
});