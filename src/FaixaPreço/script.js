document.addEventListener('DOMContentLoaded', () => {

    let produtos = []; // Agora começa vazio e será preenchido pelo JSON

    // --- CONTROLE DO MODAL ---
    const modal = document.getElementById('configModal');
    const btnConfig = document.getElementById('btn-config');
    const spanClose = document.getElementById('close-modal');
    const btnSave = document.getElementById('btn-save-ranges');

    btnConfig.onclick = () => modal.style.display = 'block';
    spanClose.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // --- FUNÇÕES UTILITÁRIAS ---
    const formatarMoeda = (valor) => {
        return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Função para limpar o texto de moeda que vem do Excel e transformar em Float
    const converterPrecoExcelParaNumero = (precoString) => {
        if (!precoString) return 0;
        // Remove "R$ ", espaços, troca ponto (milhar) por nada, e vírgula por ponto decimal
        let limpo = precoString.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        return parseFloat(limpo) || 0;
    };

    // --- LÓGICA DO KANBAN ---
    const atualizarKanban = () => {
        const faixas = {
            entrada: {
                min: parseFloat(document.getElementById('entrada-min').value) || 0,
                max: parseFloat(document.getElementById('entrada-max').value) || 0
            },
            inter: {
                min: parseFloat(document.getElementById('inter-min').value) || 0,
                max: parseFloat(document.getElementById('inter-max').value) || 0
            },
            premium: {
                min: parseFloat(document.getElementById('premium-min').value) || 0,
                max: parseFloat(document.getElementById('premium-max').value) || Infinity
            }
        };

        document.getElementById('info-range-entrada').innerText = `${formatarMoeda(faixas.entrada.min)} - ${formatarMoeda(faixas.entrada.max)}`;
        document.getElementById('info-range-inter').innerText = `${formatarMoeda(faixas.inter.min)} - ${formatarMoeda(faixas.inter.max)}`;
        document.getElementById('info-range-premium').innerText = `${formatarMoeda(faixas.premium.min)} - ${formatarMoeda(faixas.premium.max)}`;

        const colEntrada = document.getElementById('cards-entrada');
        const colInter = document.getElementById('cards-inter');
        const colPremium = document.getElementById('cards-premium');
        
        colEntrada.innerHTML = '';
        colInter.innerHTML = '';
        colPremium.innerHTML = '';

        let mixEntrada = 0, mixInter = 0, mixPremium = 0;

        produtos.forEach(produto => {
            const card = document.createElement('div');
            card.className = 'card';
            
            card.innerHTML = `
                <span class="ref">${produto.ref}</span>
                <span class="price">${formatarMoeda(produto.preco)}</span>
            `;

            if (produto.preco >= faixas.entrada.min && produto.preco <= faixas.entrada.max) {
                colEntrada.appendChild(card);
                mixEntrada++;
            } else if (produto.preco >= faixas.inter.min && produto.preco <= faixas.inter.max) {
                colInter.appendChild(card);
                mixInter++;
            } else if (produto.preco >= faixas.premium.min && produto.preco <= faixas.premium.max) {
                colPremium.appendChild(card);
                mixPremium++;
            }
        });

        document.getElementById('mix-entrada').innerText = mixEntrada;
        document.getElementById('mix-inter').innerText = mixInter;
        document.getElementById('mix-premium').innerText = mixPremium;
        
        document.getElementById('total-mix').innerText = mixEntrada + mixInter + mixPremium;
    };

    // --- BUSCAR DADOS DO PHP (JSON) ---
    const carregarDadosDoServidor = () => {
        // Tenta ler o arquivo gerado pelo PHP
        fetch('dados.json')
            .then(response => {
                if (!response.ok) throw new Error("Ainda não há dados sincronizados.");
                return response.json();
            })
            .then(data => {
                // Mapeia e converte o preço que veio do Excel como texto para número
                produtos = data.map(item => ({
                    ref: item.ref,
                    colecao: item.colecao,
                    linha: item.linha,
                    grupo: item.grupo,
                    preco: converterPrecoExcelParaNumero(item.preco)
                }));
                
                // Popula os filtros dinamicamente (opcional, mas muito útil)
                preencherFiltrosUnicos(produtos);

                // Atualiza a tela
                atualizarKanban();
            })
            .catch(error => {
                console.log(error.message);
            });
    };

    // Função bônus: preenche os dropdowns automaticamente com base no Excel!
    const preencherFiltrosUnicos = (listaProdutos) => {
        const colecoes = [...new Set(listaProdutos.map(p => p.colecao))].filter(Boolean);
        const linhas = [...new Set(listaProdutos.map(p => p.linha))].filter(Boolean);
        const grupos = [...new Set(listaProdutos.map(p => p.grupo))].filter(Boolean);

        const selColecao = document.getElementById('filter-colecao');
        const selLinha = document.getElementById('filter-linha');
        const selGrupo = document.getElementById('filter-grupo');

        // Mantém a primeira opção e adiciona o resto
        selColecao.innerHTML = '<option value="">COLEÇÃO</option>' + colecoes.map(c => `<option value="${c}">${c}</option>`).join('');
        selLinha.innerHTML = '<option value="">LINHA</option>' + linhas.map(l => `<option value="${l}">${l}</option>`).join('');
        selGrupo.innerHTML = '<option value="">GRUPO</option>' + grupos.map(g => `<option value="${g}">${g}</option>`).join('');
    };

    // --- EVENTOS ---
    btnSave.addEventListener('click', () => {
        atualizarKanban();
        modal.style.display = 'none';
    });

    // Inicia o carregamento assim que a página abre
    carregarDadosDoServidor();
});