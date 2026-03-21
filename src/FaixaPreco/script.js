document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; // Dados vindos do SQL

    // Elementos dos Filtros
    const selPlano = document.getElementById('filter-plano');
    const selColecao = document.getElementById('filter-colecao');
    const selLinha = document.getElementById('filter-linha');
    const selGrupo = document.getElementById('filter-grupo');

    // --- BUSCAR DADOS QUANDO O PLANO MUDAR ---
    selPlano.addEventListener('change', () => {
        const plano = selPlano.value;
        if (!plano) return;

        fetch(`buscar_produtos.php?plano=${encodeURIComponent(plano)}`)
            .then(res => res.json())
            .then(data => {
                // De/Para do Banco para o Objeto do JS
                produtosBase = data.map(item => ({
                    ref: item.referencia,
                    colecao: item.colecao,
                    linha: item.linha,
                    grupo: item.grupo,
                    preco: parseFloat(item.precoB2B) || 0
                }));

                preencherFiltrosUnicos(produtosBase);
                atualizarKanban();
                
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString();
            });
    });

    // --- LÓGICA DE FILTRAGEM ---
    const atualizarKanban = () => {
        // Pega valores múltiplos dos filtros
        const getSelectValues = (select) => Array.from(select.selectedOptions).map(opt => opt.value).filter(v => v !== "");
        
        const fColecoes = getSelectValues(selColecao);
        const fLinhas = getSelectValues(selLinha);
        const fGrupos = getSelectValues(selGrupo);

        // Faixas de Preço
        const faixas = {
            entrada: { min: parseFloat(document.getElementById('entrada-min').value) || 0, max: parseFloat(document.getElementById('entrada-max').value) || 0 },
            inter: { min: parseFloat(document.getElementById('inter-min').value) || 0, max: parseFloat(document.getElementById('inter-max').value) || 0 },
            premium: { min: parseFloat(document.getElementById('premium-min').value) || 0, max: Infinity }
        };

        // Filtra os produtos base
        const produtosFiltrados = produtosBase.filter(p => {
            const matchCol = fColecoes.length === 0 || fColecoes.includes(p.colecao);
            const matchLin = fLinhas.length === 0 || fLinhas.includes(p.linha);
            const matchGru = fGrupos.length === 0 || fGrupos.includes(p.grupo);
            return matchCol && matchLin && matchGru;
        });

        // Limpa Colunas
        const cols = {
            entrada: document.getElementById('cards-entrada'),
            inter: document.getElementById('cards-inter'),
            premium: document.getElementById('cards-premium')
        };
        Object.values(cols).forEach(c => c.innerHTML = '');

        let cont = { entrada: 0, inter: 0, premium: 0 };

        produtosFiltrados.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<span class="ref">${p.ref}</span><span class="price">${p.preco.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>`;

            if (p.preco >= faixas.entrada.min && p.preco <= faixas.entrada.max) {
                cols.entrada.appendChild(card); cont.entrada++;
            } else if (p.preco >= faixas.inter.min && p.preco <= faixas.inter.max) {
                cols.inter.appendChild(card); cont.inter++;
            } else if (p.preco >= faixas.premium.min) {
                cols.premium.appendChild(card); cont.premium++;
            }
        });

        // Atualiza indicadores
        document.getElementById('mix-entrada').innerText = cont.entrada;
        document.getElementById('mix-inter').innerText = cont.inter;
        document.getElementById('mix-premium').innerText = cont.premium;
        document.getElementById('total-mix').innerText = cont.entrada + cont.inter + cont.premium;
    };

    // Preenche as opções dos filtros baseados no que veio do SQL
    const preencherFiltrosUnicos = (lista) => {
        const unique = (attr) => [...new Set(lista.map(p => p[attr]))].filter(Boolean).sort();
        
        const render = (el, data, label) => {
            el.innerHTML = data.map(v => `<option value="${v}">${v}</option>`).join('');
        };

        render(selColecao, unique('colecao'));
        render(selLinha, unique('linha'));
        render(selGrupo, unique('grupo'));
    };

    // Eventos de mudança nos filtros múltiplos
    [selColecao, selLinha, selGrupo].forEach(el => el.addEventListener('change', atualizarKanban));

    // --- CONFIGURAÇÕES DE FAIXA ---
    document.getElementById('btn-save-ranges').onclick = () => {
        atualizarKanban();
        document.getElementById('configModal').style.display = 'none';
    };
    
    // Abrir/Fechar Modal
    document.getElementById('btn-config').onclick = () => document.getElementById('configModal').style.display = 'block';
    document.getElementById('close-modal').onclick = () => document.getElementById('configModal').style.display = 'none';
});