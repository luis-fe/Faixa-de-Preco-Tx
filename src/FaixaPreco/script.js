document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 

    // Elementos da Tela Principal
    const selPlano = document.getElementById('filter-plano');
    const listColecao = document.getElementById('list-colecao');
    const listLinha = document.getElementById('list-linha');
    const listGrupo = document.getElementById('list-grupo');

    // Elementos do Modal
    const modal = document.getElementById('configModal');
    const modalTitle = document.getElementById('modal-plano-title');
    const modalSelLinha = document.getElementById('modal-filter-linha');
    const modalSelGrupo = document.getElementById('modal-filter-grupo');
    const interMaxInput = document.getElementById('inter-max');
    const premiumLabel = document.getElementById('premium-min-label');

    // --- BUSCAR DADOS QUANDO MUDAR O PLANO ---
    selPlano.addEventListener('change', () => {
        const plano = selPlano.value;
        if (!plano) {
            limparFiltros();
            return;
        }

        fetch(`buscar_produtos.php?plano=${encodeURIComponent(plano)}`)
            .then(res => res.json())
            .then(data => {
                console.log("Dados recebidos do banco:", data); // Para debug no F12
                
                produtosBase = data.map(p => ({
                    ref: p.referencia || 'N/A',
                    desc: p.descricao || '',
                    colecao: p.colecao || 'GERAL',
                    linha: p.linha || 'GERAL',
                    grupo: p.grupo || 'GERAL',
                    // Garante que pega o preço, não importa se o Postgres enviou precoB2B ou precob2b
                    preco: parseFloat(p.precoB2B || p.precob2b || p.preco) || 0 
                }));

                // O Segredo: Popula as checkboxes do cabeçalho e os selects do modal
                gerarFiltrosCheckboxes();
                popularSelectsModal();
                
                atualizarKanban();
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString();
            })
            .catch(err => {
                console.error("Erro Crítico ao buscar dados:", err);
                alert("Erro ao conectar com o banco de dados. Veja o console (F12).");
            });
    });

    // --- CRIAR AS CHECKBOXES (Menus Suspensos) ---
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

    // --- POPULAR O MODAL (Selects únicos) ---
    function popularSelectsModal() {
        const uniqueLinhas = [...new Set(produtosBase.map(p => p.linha))].sort();
        const uniqueGrupos = [...new Set(produtosBase.map(p => p.grupo))].sort();

        modalSelLinha.innerHTML = '<option value="">TODAS AS LINHAS</option>' + 
            uniqueLinhas.map(l => `<option value="${l}">${l}</option>`).join('');
        
        modalSelGrupo.innerHTML = '<option value="">TODOS OS GRUPOS</option>' + 
            uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
    }

    // --- LÓGICA MESTRA DO KANBAN ---
    function atualizarKanban() {
        // 1. Pega os valores marcados nos Checkboxes superiores
        const getChecked = (container) => Array.from(container.querySelectorAll('input:checked')).map(c => c.value);
        const fColecoes = getChecked(listColecao);
        const fLinhasHeader = getChecked(listLinha);
        const fGruposHeader = getChecked(listGrupo);

        // 2. Pega os valores selecionados no Modal
        const fLinhaModal = modalSelLinha.value;
        const fGrupoModal = modalSelGrupo.value;

        // 3. Faixas de Preço
        const eMax = parseFloat(document.getElementById('entrada-max').value) || 0;
        const iMax = parseFloat(document.getElementById('inter-max').value) || 0;

        // 4. Filtragem Cruzada
        const filtrados = produtosBase.filter(p => {
            const matchColecao = fColecoes.includes(p.colecao);
            
            // Se o modal estiver em 'TODAS', respeita as checkboxes. Se não, força a linha do modal.
            const matchLinha = (fLinhaModal === "") ? fLinhasHeader.includes(p.linha) : (p.linha === fLinhaModal);
            const matchGrupo = (fGrupoModal === "") ? fGruposHeader.includes(p.grupo) : (p.grupo === fGrupoModal);
            
            return matchColecao && matchLinha && matchGrupo;
        });

        // 5. Limpa Colunas
        const cols = {
            entrada: document.getElementById('cards-entrada'),
            inter: document.getElementById('cards-inter'),
            premium: document.getElementById('cards-premium')
        };
        Object.values(cols).forEach(c => c.innerHTML = '');

        let cont = { e: 0, i: 0, p: 0 };

        // 6. Distribui Cards
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

        // 7. Atualiza Painéis
        document.getElementById('mix-entrada').innerText = cont.e;
        document.getElementById('mix-inter').innerText = cont.i;
        document.getElementById('mix-premium').innerText = cont.p;
        document.getElementById('total-mix').innerText = cont.e + cont.i + cont.p;
        
        document.getElementById('info-range-entrada').innerText = `Até R$ ${eMax.toFixed(2)}`;
        document.getElementById('info-range-inter').innerText = `Até R$ ${iMax.toFixed(2)}`;
        document.getElementById('info-range-premium').innerText = `Acima de R$ ${iMax.toFixed(2)}`;
    }

    // --- CONTROLES DA INTERFACE ---
    document.getElementById('btn-config').onclick = () => {
        const plano = selPlano.value;
        modalTitle.innerText = plano ? "Plano: " + plano : "⚠️ Selecione o plano primeiro";
        modalTitle.style.color = plano ? "var(--green-primary)" : "red";
        modal.style.display = 'block';
    };

    document.getElementById('close-modal').onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };

    interMaxInput.addEventListener('input', () => {
        premiumLabel.innerText = interMaxInput.value;
    });

    // --- BOTÃO SALVAR FAIXAS (COM ENVIO PARA O BANCO) ---
    document.getElementById('btn-save-ranges').onclick = () => {
        const planoAtual = selPlano.value;
        
        if (!planoAtual) {
            alert("Por favor, selecione um plano primeiro.");
            return;
        }

        // 1. Pega os botões e altera o texto para mostrar que está carregando
        const btnSave = document.getElementById('btn-save-ranges');
        const textoOriginal = btnSave.innerText;
        btnSave.innerText = "Salvando...";
        btnSave.disabled = true;

        // 2. Monta o pacote de dados
        const payload = {
            plano: planoAtual,
            linha: modalSelLinha.value,
            grupo: modalSelGrupo.value,
            valorEntrada: document.getElementById('entrada-max').value,
            valorInter: document.getElementById('inter-max').value,
            // Premium é tudo acima do Intermediário
            valorPremium: document.getElementById('inter-max').value 
        };

        // 3. Envia os dados para o servidor PHP
        fetch('salvar_faixas.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                alert("Erro do Banco de Dados: " + data.error);
            } else {
                // Se deu sucesso, atualiza o Kanban e fecha o modal
                atualizarKanban();
                modal.style.display = 'none';
            }
        })
        .catch(err => {
            console.error("Erro na comunicação:", err);
            alert("Falha ao comunicar com o servidor.");
        })
        .finally(() => {
            // Devolve o botão ao normal, independentemente de dar erro ou sucesso
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