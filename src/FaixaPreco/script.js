document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; // Armazena o que vem do Banco de Dados

    const selPlano = document.getElementById('filter-plano');
    const lists = {
        colecao: document.getElementById('list-colecao'),
        linha: document.getElementById('list-linha'),
        grupo: document.getElementById('list-grupo')
    };

    // --- BUSCAR DADOS DO POSTGRES ---
    selPlano.addEventListener('change', () => {
        const plano = selPlano.value;
        if (!plano) {
            limparTudo();
            return;
        }

        // Busca os produtos desse plano no banco
        fetch(`buscar_produtos.php?plano=${encodeURIComponent(plano)}`)
            .then(res => res.json())
            .then(data => {
                produtosBase = data.map(p => ({
                    ref: p.referencia,
                    desc: p.descricao,
                    colecao: p.colecao || 'OUTROS',
                    linha: p.linha || 'OUTROS',
                    grupo: p.grupo || 'OUTROS',
                    preco: parseFloat(p.precoB2B) || 0
                }));

                gerarCheckboxes(); // Cria as opções baseadas no Plano selecionado
                atualizarKanban();
                document.getElementById('last-sync').innerText = new Date().toLocaleTimeString();
            })
            .catch(err => console.error("Erro ao buscar dados:", err));
    });

    // --- GERAR CHECKBOXES DINAMICAMENTE ---
    function gerarCheckboxes() {
        const unique = (attr) => [...new Set(produtosBase.map(p => p[attr]))].sort();

        const preencher = (key, data) => {
            lists[key].innerHTML = data.map(val => `
                <label><input type="checkbox" value="${val}" data-type="${key}" checked> ${val}</label>
            `).join('');
            
            // Adiciona evento em cada checkbox novo
            lists[key].querySelectorAll('input').forEach(chk => {
                chk.addEventListener('change', atualizarKanban);
            });
        };

        preencher('colecao', unique('colecao'));
        preencher('linha', unique('linha'));
        preencher('grupo', unique('grupo'));
    }

    // --- LÓGICA DO KANBAN ---
    function atualizarKanban() {
        const getChecked = (key) => Array.from(lists[key].querySelectorAll('input:checked')).map(c => c.value);
        
        const fCol = getChecked('colecao');
        const fLin = getChecked('linha');
        const fGru = getChecked('grupo');

        // Faixas de Preço
        const eMax = parseFloat(document.getElementById('entrada-max').value) || 99.99;
        const iMax = parseFloat(document.getElementById('inter-max').value) || 299.99;

        // Filtragem
        const filtrados = produtosBase.filter(p => 
            fCol.includes(p.colecao) && fLin.includes(p.linha) && fGru.includes(p.grupo)
        );

        // Renderizar Cards
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
                <span class="ref">${p.ref} - ${p.desc}</span>
                <span class="price">R$ ${p.preco.toFixed(2)}</span>
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
    }

    function limparTudo() {
        produtosBase = [];
        Object.values(lists).forEach(l => l.innerHTML = '');
        atualizarKanban();
    }

    // Modal e Save
    document.getElementById('btn-config').onclick = () => document.getElementById('configModal').style.display = 'block';
    document.getElementById('btn-save-ranges').onclick = () => {
        atualizarKanban();
        document.getElementById('configModal').style.display = 'none';
    };
});