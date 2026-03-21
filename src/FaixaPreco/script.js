document.addEventListener('DOMContentLoaded', () => {
    let produtosBase = []; 

    const selPlano = document.getElementById('filter-plano');
    const modal = document.getElementById('configModal');
    const modalTitle = document.getElementById('modal-plano-title');
    const modalSelLinha = document.getElementById('modal-filter-linha');
    const modalSelGrupo = document.getElementById('modal-filter-grupo');
    const interMaxInput = document.getElementById('inter-max');
    const premiumLabel = document.getElementById('premium-min-label');

    // --- BUSCAR DADOS ---
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
            });
    });

    // --- CONTROLE DO MODAL ---
    document.getElementById('btn-config').onclick = () => {
        const plano = selPlano.value;
        if (!plano) {
            modalTitle.innerText = "⚠️ Selecione o plano primeiro";
            modalTitle.style.color = "red";
        } else {
            modalTitle.innerText = "Plano: " + plano;
            modalTitle.style.color = "var(--green-primary)";
            
            // Popula selects do modal
            const uniqueLinhas = [...new Set(produtosBase.map(p => p.linha))].sort();
            const uniqueGrupos = [...new Set(produtosBase.map(p => p.grupo))].sort();
            modalSelLinha.innerHTML = '<option value="">TODAS AS LINHAS</option>' + uniqueLinhas.map(l => `<option value="${l}">${l}</option>`).join('');
            modalSelGrupo.innerHTML = '<option value="">TODOS OS GRUPOS</option>' + uniqueGrupos.map(g => `<option value="${g}">${g}</option>`).join('');
        }
        modal.style.display = 'block';
    };

    document.getElementById('close-modal').onclick = () => modal.style.display = 'none';

    // Atualiza Premium em tempo real
    interMaxInput.addEventListener('input', () => {
        premiumLabel.innerText = interMaxInput.value;
    });

    // --- FUNÇÃO PRINCIPAL ---
    function atualizarKanban() {
        const eMin = parseFloat(document.getElementById('entrada-min').value) || 0;
        const eMax = parseFloat(document.getElementById('entrada-max').value) || 0;
        const iMin = parseFloat(document.getElementById('inter-min').value) || 0;
        const iMax = parseFloat(document.getElementById('inter-max').value) || 0;

        // Filtros do Modal
        const fLinha = modalSelLinha.value;
        const fGrupo = modalSelGrupo.value;

        // Atualiza Labels
        document.getElementById('info-range-entrada').innerText = `R$ ${eMin} - R$ ${eMax}`;
        document.getElementById('info-range-inter').innerText = `R$ ${iMin} - R$ ${iMax}`;
        document.getElementById('info-range-premium').innerText = `Acima de R$ ${iMax}`;

        const filtrados = produtosBase.filter(p => {
            return (!fLinha || p.linha === fLinha) && (!fGrupo || p.grupo === fGrupo);
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
    }

    document.getElementById('btn-save-ranges').onclick = () => {
        atualizarKanban();
        modal.style.display = 'none';
    };
});