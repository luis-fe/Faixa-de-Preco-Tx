document.addEventListener('DOMContentLoaded', () => {

    let produtos = []; 
    let jsonAnterior = ""; 

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

    const converterPrecoExcelParaNumero = (precoString) => {
        if (!precoString) return 0;
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
        fetch('dados.json?t=' + new Date().getTime())
            .then(response => {
                if (!response.ok) throw new Error("Ainda não há dados sincronizados.");
                return response.text(); 
            })
            .then(textData => {
                if (textData !== jsonAnterior) {
                    jsonAnterior = textData; 
                    
                    const data = JSON.parse(textData); 
                    
                    produtos = data.map(item => ({
                        ref: item.ref,
                        colecao: item.colecao,
                        linha: item.linha,
                        grupo: item.grupo,
                        preco: converterPrecoExcelParaNumero(item.preco)
                    }));
                    
                    preencherFiltrosUnicos(produtos);
                    atualizarKanban();

                    // --- ATUALIZA A HORA NO RODAPÉ ---
                    const agora = new Date();
                    const horaFormatada = agora.toLocaleTimeString('pt-BR'); 
                    document.getElementById('last-sync').innerText = horaFormatada;
                }
            })
            .catch(error => {
                console.log(error.message);
            });
    };

    // Função que preenche os dropdowns
    const preencherFiltrosUnicos = (listaProdutos) => {
        const colecoes = [...new Set(listaProdutos.map(p => p.colecao))].filter(Boolean);
        const linhas = [...new Set(listaProdutos.map(p => p.linha))].filter(Boolean);
        const grupos = [...new Set(listaProdutos.map(p => p.grupo))].filter(Boolean);

        const selColecao = document.getElementById('filter-colecao');
        const selLinha = document.getElementById('filter-linha');
        const selGrupo = document.getElementById('filter-grupo');

        selColecao.innerHTML = '<option value="">COLEÇÃO</option>' + colecoes.map(c => `<option value="${c}">${c}</option>`).join('');
        selLinha.innerHTML = '<option value="">LINHA</option>' + linhas.map(l => `<option value="${l}">${l}</option>`).join('');
        selGrupo.innerHTML = '<option value="">GRUPO</option>' + grupos.map(g => `<option value="${g}">${g}</option>`).join('');
    };

    // --- EVENTOS ---
    btnSave.addEventListener('click', () => {
        atualizarKanban();
        modal.style.display = 'none';
    });

    carregarDadosDoServidor();
    setInterval(carregarDadosDoServidor, 5000);
});