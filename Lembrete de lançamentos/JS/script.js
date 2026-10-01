// -----------------------------------------------------------------------------
// CONFIGURAÇÃO INICIAL
// -----------------------------------------------------------------------------
// Aqui começa a conexão com o banco e as variáveis principais.

const _URL = 'https://yqfswykeybzaaysoygjd.supabase.co';
const _KEY = 'sb_publishable_d8gxS1nSdVtwxHgcmmxT1g_Jarm23Nj';
const supabaseClient = supabase.createClient(_URL, _KEY);

let table;
let dadosAcumulados = [];

function atualizarDataAtual() {
    const elementoData = document.getElementById('dataAtual');
    
    if (elementoData) {
        elementoData.textContent = new Date().toLocaleDateString('pt-BR');
    }
    
}

function mostrarMensagem(titulo, texto, tipo = 'info') {
    return Swal.fire({
        title: titulo,
        text: texto,
        icon: tipo,
        confirmButtonText: 'OK'
    });
}

function registrarErro(operacao, erro) {
    console.error(`Erro em ${operacao}:`, erro);
}

async function recarregarDados() {
    const botao = document.getElementById('btnRecarregarDados');
    if (!botao) return;

    botao.classList.add('btn-refreshing');
    botao.disabled = true;

    try {
        await carregarDadosBanco();
        mostrarMensagem('Atualizado', 'Os dados foram recarregados com sucesso.', 'success');
    } catch (erro) {
        registrarErro('recarregar dados', erro);
        mostrarMensagem('Erro', 'Não foi possível atualizar os dados.', 'error');
    } finally {
        botao.classList.remove('btn-refreshing');
        botao.disabled = false;
    }
}

// -----------------------------------------------------------------------------
// FUNÇÕES DE NORMALIZAÇÃO E CONVERSÃO
// -----------------------------------------------------------------------------
// Essas funções deixam os dados no mesmo formato para evitar erros.

function normalizarNome(nome) {
    if (!nome) return "";

    let valor = String(nome).trim().toUpperCase();

    if (valor.includes("GOV. SÃO PAULO") && !valor.includes("PMESP") && !valor.includes("SPPREV")) {
        valor = "GOV. SÃO PAULO - GERAL";
    }

    return valor.replace(/\s\s+/g, ' ');
}

// Converte datas de formatos diferentes para um objeto Date válido.


function converterDataBR(valor) {
    if (!valor) return new Date();

    if (typeof valor === 'number') {
        return new Date(Math.round((valor - 25569) * 86400 * 1000));
    }

    if (typeof valor === 'string' && valor.includes('/')) {
        const [d, m, y] = valor.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);
    }

    const data = new Date(valor);
    return isNaN(data.getTime()) ? new Date() : data;
}

// Garante que a data fique em texto no mesmo padrão antes de comparar.
// Isso evita erro ao comparar datas vindas do banco com datas da tela.
function normalizarDataParaTexto(valor) {
    if (!valor) return '';

    if (typeof valor === 'string') return valor.trim();

    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }

    if (valor && typeof valor === 'object' && typeof valor.toISOString === 'function') {
        return valor.toISOString().slice(0, 10);
    }

    return String(valor).trim();
}

// Calcula a competência usada no sistema para cada convênio e data de corte.

function calcularCompetenciaAKRK(nomeConvenio, dataRaw) {
    const dataObj = converterDataBR(dataRaw);
    let mes = dataObj.getMonth() + 1;
    let ano = dataObj.getFullYear();
    const dia = dataObj.getDate();
    const nome = String(nomeConvenio).toUpperCase();

    if (nome.includes("BARBACENA")) {
        return `${String(mes).padStart(2, '0')}/${ano}`;
    }

    if (nome.includes("IMPDC") || dia > 22) {
        mes++;
        if (mes > 12) {
            mes = 1;
            ano++;
        }
    }

    return `${String(mes).padStart(2, '0')}/${ano}`;
}

// -----------------------------------------------------------------------------
// HISTÓRICO DE DATAS DE CORTE
// -----------------------------------------------------------------------------
// Este bloco busca os meses já salvos no histórico para preencher o campo

async function carregarCompetenciasHistorico() {
    try {
        const { data, error } = await supabaseClient
            .from('historico_datas_corte')
            .select('competencia, data_corte');

        if (error) {
            throw error;
        }

        const mesesDisponiveis = [...new Set((data || [])
            .map(item => {
                const valor = normalizarDataParaTexto(item.data_corte);
                return valor ? valor.substring(0, 7) : '';
            })
            .filter(Boolean))]
            .sort((a, b) => b.localeCompare(a));

        const inputData = document.getElementById('input-historico-data');
        if (mesesDisponiveis.length && inputData) {
            inputData.min = mesesDisponiveis[mesesDisponiveis.length - 1];
            inputData.max = mesesDisponiveis[0];
            inputData.value = mesesDisponiveis[0];
        }
    } catch (erro) {
        registrarErro('carregar histórico de meses', erro);
        const inputData = document.getElementById('input-historico-data');
        if (inputData) {
            inputData.value = '';
        }
    }
}

// Exporta somente os registros do mês escolhido no campo de filtro.

async function exportarHistoricoCortes() {
    const inputData = document.getElementById('input-historico-data');
    const mesSelecionado = inputData ? inputData.value : '';

    if (!mesSelecionado) {
        return mostrarMensagem('Aviso', 'Selecione um mês para exportar.', 'warning');
    }

    try {
        const { data, error } = await supabaseClient
            .from('historico_datas_corte')
            .select('convenio, data_lancamento, data_corte, competencia');

        if (error) {
            throw error;
        }

        const registrosDoMes = (data || []).filter(item => {
            const valor = normalizarDataParaTexto(item.data_corte);
            return valor ? valor.startsWith(mesSelecionado) : false;
        });

        if (!registrosDoMes.length) {
            return mostrarMensagem('Aviso', 'Nenhum dado encontrado para o mês selecionado.', 'warning');
        }

        const dadosFormatados = registrosDoMes.map(item => ({
            'Convênio': item.convenio ? item.convenio.toUpperCase() : '',
            'Data de Lançamento': normalizarDataParaTexto(item.data_lancamento).split('-').reverse().join('/'),
            'Data de Corte': normalizarDataParaTexto(item.data_corte).split('-').reverse().join('/'),
            'Competência': item.competencia || ''
        }));

        const planilha = XLSX.utils.json_to_sheet(dadosFormatados);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, planilha, 'Histórico');

        const nomeArquivo = `Historico_Datas_Corte_${mesSelecionado}.xlsx`;
        XLSX.writeFile(workbook, nomeArquivo);
    } catch (erro) {
        registrarErro('exportar histórico de corte', erro);
        mostrarMensagem('Erro', 'Não foi possível buscar os dados do histórico. Verifique a conexão e tente novamente.', 'error');
    }
}

// -----------------------------------------------------------------------------
// CARREGAMENTO DOS DADOS DO BANCO
// -----------------------------------------------------------------------------
// Aqui a página busca os lançamentos salvos e já monta a tabela e os filtros.
async function carregarDadosBanco() {
    try {
        const { data, error } = await supabaseClient.from('lancamentos').select('*');

        if (error) {
            throw error;
        }

        if (!data || !data.length) {
            dadosAcumulados = [];
            exibirTabela(dadosAcumulados);
            gerarSelectFiltros(dadosAcumulados);
            atualizarCards();
            carregarCompetenciasHistorico();
            return;
        }

        dadosAcumulados = data.map(item => ({
            ...item,
            convenio: normalizarNome(item.convenio),
            status: item.status || 'Pendente'
        }));
        exibirTabela(dadosAcumulados);
        gerarSelectFiltros(dadosAcumulados);
        atualizarCards();
        carregarCompetenciasHistorico();
    } catch (erro) {
        registrarErro('carregar dados do banco', erro);
        mostrarMensagem('Erro ao carregar dados', 'Não foi possível carregar os lançamentos. Verifique a conexão e tente novamente.', 'error');
    }
}

// -----------------------------------------------------------------------------
// IMPORTAÇÃO DE EXCEL
// -----------------------------------------------------------------------------
// Esse passo lê a planilha e prepara os dados antes de salvar no banco.

function extrairValorDaLinha(item, aliases) {
    for (const alias of aliases) {
        const valor = item?.[alias];
        if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
            return valor;
        }
    }

    return '';
}

function formatarResumoLinha(item) {
    const campos = [];

    const convenio = item?.['Convênio'] ?? item?.['convenio'] ?? '';
    const dataCorte = item?.['Data de Corte'] ?? item?.['data_corte'] ?? '';
    const responsavel = item?.['Responsável'] ?? item?.['Responsavel'] ?? item?.['responsavel'] ?? '';

    campos.push(`Convênio: ${String(convenio).trim() || '(vazio)'}`);
    campos.push(`Data de Corte: ${String(dataCorte).trim() || '(vazio)'}`);

    if (String(responsavel).trim()) {
        campos.push(`Responsável: ${String(responsavel).trim()}`);
    }

    return campos.join(' | ');
}

function validarPlanilhaImportada(json) {
    const linhasValidas = [];
    const linhasIgnoradas = [];

    json.forEach((item, indice) => {
        const convenio = extrairValorDaLinha(item, ['Convênio', 'convenio']);
        const dataCorte = extrairValorDaLinha(item, ['Data de Corte', 'data_corte']);
        const motivos = [];
        const valorConvenio = String(item?.['Convênio'] ?? item?.['convenio'] ?? '').trim();

        if (!convenio) {
            motivos.push(valorConvenio ? `Convênio incompleto: "${valorConvenio}"` : `Convênio em branco`);
        }

        if (!dataCorte) {
            motivos.push('Data de Corte em branco');
        }

        if (motivos.length) {
            linhasIgnoradas.push({
                linha: indice + 2,
                motivo: motivos.join(' e '),
                resumo: formatarResumoLinha(item)
            });
            return;
        }

        linhasValidas.push({
            ...item,
            convenio,
            data_corte: dataCorte,
            data_lancamento: extrairValorDaLinha(item, ['Data de Lançamento', 'data_lancamento']) || dataCorte
        });
    });

    return { linhasValidas, linhasIgnoradas };
}

function criarResumoImportacao(linhasValidas, linhasIgnoradas) {
    const detalhesIgnoradas = linhasIgnoradas.slice(0, 10).map((item) => {
        return `
            <li class="mb-2">
                <strong>Linha ${item.linha}:</strong> ${item.motivo}.<br>
                <span class="text-muted">${item.resumo}</span>
            </li>`;
    }).join('') || '<li>Nenhuma linha ignorada.</li>';

    return `
        <div class="text-start">
            <p class="mb-2"><strong>${linhasValidas.length}</strong> linhas válidas para importar.</p>
            <p class="mb-3">
                <strong>${linhasIgnoradas.length}</strong> linha(s) ignoradas:
                ${linhasIgnoradas.length
                    ? 'os registros abaixo foram descartados por falta de dados obrigatórios.'
                    : 'nenhuma linha foi descartada.'}
            </p>

            ${linhasIgnoradas.length ? `
                <ul class="mb-0 ps-3">
                    ${detalhesIgnoradas}
                </ul>
            ` : ''}
        </div>
    `;
}

async function processarExcel() {
    const input = document.getElementById('inputExcel');
    if (!input.files.length) {
        return Swal.fire('Aviso', 'Selecione um arquivo Excel antes de importar.', 'warning');
    }

    const arquivo = input.files[0];
    const extensao = arquivo.name.split('.').pop()?.toLowerCase();

    if (!['xlsx', 'xls'].includes(extensao)) {
        return Swal.fire('Aviso', 'Selecione um arquivo Excel válido (.xlsx ou .xls).', 'warning');
    }

    const reader = new FileReader();
    reader.onload = async function (event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

            if (!json.length) {
                return Swal.fire('Aviso', 'A planilha está vazia. Confira o arquivo e tente novamente.', 'warning');
            }

            const { linhasValidas, linhasIgnoradas } = validarPlanilhaImportada(json);

            if (!linhasValidas.length) {
                return Swal.fire(
                    'Aviso',
                    'Nenhuma linha válida foi encontrada. Verifique se existem as colunas “Convênio” e “Data de Corte”.',
                    'warning'
                );
            }

            const previewHtml = criarResumoImportacao(linhasValidas, linhasIgnoradas);

            const confirmacao = await Swal.fire({
                title: 'Pré-visualização da importação',
                html: previewHtml,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Importar',
                cancelButtonText: 'Cancelar',
                width: '820px',
                customClass: {
                    popup: 'import-preview-modal',
                    title: 'import-preview-title',
                    content: 'import-preview-content',
                    confirmButton: 'import-preview-confirm',
                    cancelButton: 'import-preview-cancel'
                },
                buttonsStyling: false
            });

            if (!confirmacao.isConfirmed) {
                return;
            }

            const mapa = new Map();
            dadosAcumulados.forEach(item => mapa.set(normalizarNome(item.convenio), item));

            linhasValidas.forEach(item => {
                const convRaw = item.convenio;
                const convLimpo = normalizarNome(convRaw);
                const competenciaCalculada = calcularCompetenciaAKRK(convRaw, item.data_corte);
                const novoCorteISO = converterDataBR(item.data_corte).toISOString().split('T')[0];
                const responsavelPlanilha = extrairValorDaLinha(item, ['Responsável', 'Responsavel', 'responsavel']) || "";

                let statusFinal = 'Pendente';
                let idExistente = null;

                if (mapa.has(convLimpo)) {
                    const anterior = mapa.get(convLimpo);
                    if (anterior.data_corte === novoCorteISO && anterior.competencia === competenciaCalculada) {
                        statusFinal = anterior.status || 'Pendente';
                    }
                    idExistente = anterior.id;
                }

                mapa.set(convLimpo, {
                    id: idExistente && !String(idExistente).startsWith('new_') ? 'new_upd_' + idExistente : 'new_' + Math.random().toString(36).substr(2, 9),
                    convenio: convLimpo,
                    responsavel: responsavelPlanilha,
                    sistema: extrairValorDaLinha(item, ['Sistema', 'sistema']) || '',
                    data_corte: novoCorteISO,
                    data_lancamento: converterDataBR(item.data_lancamento).toISOString().split('T')[0],
                    competencia: competenciaCalculada,
                    status: statusFinal
                });
            });

            dadosAcumulados = Array.from(mapa.values());
            exibirTabela(dadosAcumulados);
            document.getElementById('btnSalvar').style.display = 'block';

            if (linhasIgnoradas.length) {
                Swal.fire(
                    'Importação concluída',
                    `Foram importadas ${linhasValidas.length} linhas. ${linhasIgnoradas.length} linha(s) ficaram fora por não terem Convênio ou Data de Corte.`,
                    'warning'
                );
                return;
            }

            Swal.fire('Sucesso', 'Planilha adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao processar a planilha:', error);
            Swal.fire('Erro', 'Não foi possível ler a planilha. Verifique se o arquivo está em um formato válido.', 'error');
        }
    };

    reader.onerror = function () {
        Swal.fire('Erro', 'Não foi possível abrir o arquivo selecionado.', 'error');
    };

    reader.readAsArrayBuffer(arquivo);
}

// -----------------------------------------------------------------------------
// TABELA PRINCIPAL E FILTROS
// -----------------------------------------------------------------------------
// Aqui a tabela é montada e os filtros são aplicados sobre os dados.

function atualizarEstadoTabela() {
    const container = document.getElementById('tabelaContainer');
    if (!container || !table) return;

    const estadoAtual = document.getElementById('tabelaEmptyState');
    if (estadoAtual) {
        estadoAtual.remove();
    }

    const totalFiltrado = table.rows({ filter: 'applied' }).count();
    if (totalFiltrado === 0) {
        const aviso = document.createElement('div');
        aviso.id = 'tabelaEmptyState';
        aviso.className = 'empty-state';

        const filtrosAtivos = $('#select-periodo').val() !== 'Todos' || $('#select-responsaveis').val() !== 'Todos' || $('.filter-check:checked').length < 2;
        const mensagem = filtrosAtivos
            ? '<i class="fas fa-filter me-2"></i> Nenhum lançamento encontrado para os filtros atuais.'
            : '<i class="fas fa-database me-2"></i> Ainda não há lançamentos na base. Importe uma planilha ou recarregue os dados.';

        aviso.innerHTML = mensagem;
        container.appendChild(aviso);
    }
}

function ordenarDadosTabela(dados) {
    return [...dados].sort((a, b) => {
        const statusA = a.status === 'Pendente' ? 0 : 1;
        const statusB = b.status === 'Pendente' ? 0 : 1;

        if (statusA !== statusB) {
            return statusA - statusB;
        }

        return String(a.convenio || '').localeCompare(String(b.convenio || ''));
    });
}

function exibirTabela(dados) {
    const dadosOrdenados = ordenarDadosTabela(dados);

    if ($.fn.DataTable.isDataTable('#tabelaLancamentos')) {
        table.clear().rows.add(dadosOrdenados).draw();
        atualizarEstadoTabela();
        return;
    }

    document.getElementById('tabelaContainer').innerHTML = `
        <table id="tabelaLancamentos" class="table table-hover w-100 align-middle">
            <thead class="table-light">
                <tr>
                    <th style="width: 40px;"><input type="checkbox" id="selectAllRows"></th>
                    <th>Convênio</th>
                    <th>Competência</th>
                    <th>Responsável</th>
                    <th>Corte</th>
                    <th class="text-center">Ação</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    table = $('#tabelaLancamentos').DataTable({
        data: dadosOrdenados,
        paging: false,
        scrollY: '60vh',
        scrollCollapse: true,
        scrollX: true,
        autoWidth: false,
        order: [],
        language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json', search: '🔍 Buscar:', searchPlaceholder: 'Buscar registros' },
        columns: [
            { data: null, orderable: false, render: (d, t, row) => (row.status !== 'Concluído') ? `<input type="checkbox" class="row-checkbox select-item" data-id="${row.id}">` : '' },
            { data: 'convenio', render: d => `<small class="fw-bold">${d}</small>` },
            { data: 'competencia', render: d => `<span class="badge bg-light text-dark border">${d}</span>` },
            { data: 'responsavel', render: d => `<span class="small text-muted">${d || ''}</span>` },
            { data: 'data_corte', render: d => `<span class="small">${new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}</span>` },
            {
                data: 'status',
                className: 'text-center',
                type: 'status',
                render: (d, t, row) => `<button class="btn ${row.status === 'Concluído' ? 'btn-success' : 'btn-outline-secondary'} btn-sm btn-status w-100" onclick="toggleStatus('${row.id}')">${row.status || 'Pendente'}</button>`
            }
        ]
    });

    $('#selectAllRows').on('click', function () {
        $('.select-item').prop('checked', this.checked);
        updateBulkUI();
    });

    $('#tabelaLancamentos tbody').on('change', '.select-item', function () {
        updateBulkUI();
    });

    table.on('draw', function () {
        atualizarEstadoTabela();
    });

    configurarFiltros();
    atualizarEstadoTabela();
}

// Aplica os filtros sem recarregar a página.

function configurarFiltros() {
    $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
        const responsavelSelecionado = $('#select-responsaveis').val();
        const competenciaSelecionada = $('#select-periodo').val();
        const statusSelecionados = $('.filter-check:checked').map(function () { return $(this).val(); }).get();
        const row = table.row(dataIndex).data();

        const matchResponsavel = (responsavelSelecionado === 'Todos' || row.responsavel === responsavelSelecionado);
        const matchCompetencia = (competenciaSelecionada === 'Todos' || row.competencia === competenciaSelecionada);
        const matchStatus = statusSelecionados.includes(row.status);

        return matchResponsavel && matchCompetencia && matchStatus;
    });
}

function limparFiltros() {
    $('#select-responsaveis').val('Todos');
    $('#select-periodo').val('Todos');
    $('.filter-check').prop('checked', true);
    table.draw();
    atualizarEstadoTabela();
}

// Preenche os campos de filtro com os valores já existentes.

function gerarSelectFiltros(dados) {
    const responsaveis = [...new Set(dados.map(item => item.responsavel))].filter(Boolean).sort();
    const selectResponsaveis = document.getElementById('select-responsaveis');
    selectResponsaveis.innerHTML = '<option value="Todos">Todos</option>' + responsaveis
        .map(r => `<option value="${r}">${r}</option>`)
        .join('');

    const competencias = [...new Set(dados.map(item => item.competencia))].filter(Boolean).sort((a, b) => b.localeCompare(a));
    const selectCompetencias = document.getElementById('select-periodo');
    selectCompetencias.innerHTML = '<option value="Todos">Todas</option>' + competencias
        .map(c => `<option value="${c}">${c}</option>`)
        .join('');
}


// -----------------------------------------------------------------------------
// AÇÕES DE STATUS
// -----------------------------------------------------------------------------
// Aqui o botão da linha altera o status de cada item.

async function toggleStatus(id) {
    const item = dadosAcumulados.find(d => String(d.id) === String(id));
    if (!item || item.status === 'Concluído') return mostrarMensagem('Ação Bloqueada', 'Item finalizado.', 'error');

    const resposta = await Swal.fire({
        title: 'Concluir?',
        text: `Marcar "${item.convenio}" como CONCLUÍDO?`,
        icon: 'question',
        showCancelButton: true
    });

    if (resposta.isConfirmed) {
        try {
            item.status = 'Concluído';
            exibirTabela(dadosAcumulados);
            atualizarCards();

            if (!String(id).startsWith('new_')) {
                const { error } = await supabaseClient.from('lancamentos').update({ status: 'Concluído' }).eq('id', id);
                if (error) throw error;
            }
        } catch (erro) {
            registrarErro('atualizar status individual', erro);
            mostrarMensagem('Erro', 'Não foi possível atualizar o status. Tente novamente.', 'error');
        }
    }
}

// Atualiza vários itens selecionados de uma vez.

async function concluirSelecionados() {
    const ids = $('.select-item:checked').map(function () {
        return $(this).data('id');
    }).get();

    if (!ids.length) {
        return mostrarMensagem('Aviso', 'Nenhum item foi selecionado.', 'warning');
    }

    const resposta = await Swal.fire({
        title: 'Ação em Massa',
        text: `Concluir ${ids.length} itens?`,
        icon: 'warning',
        showCancelButton: true
    });

    if (resposta.isConfirmed) {
        try {
            for (const id of ids) {
                const item = dadosAcumulados.find(d => String(d.id) === String(id));
                if (item && item.status === 'Pendente') {
                    item.status = 'Concluído';

                    if (!String(id).startsWith('new_')) {
                        const { error } = await supabaseClient.from('lancamentos').update({ status: 'Concluído' }).eq('id', id);
                        if (error) throw error;
                    }
                }
            }

            exibirTabela(dadosAcumulados);
            atualizarCards();
        } catch (erro) {
            registrarErro('atualizar itens em massa', erro);
            mostrarMensagem('Erro', 'Não foi possível concluir todos os itens selecionados.', 'error');
        }
    }
}

// -----------------------------------------------------------------------------
// SINCRONIZAÇÃO COM O BANCO
// -----------------------------------------------------------------------------
async function enviarParaSupabase() {
    const novos = dadosAcumulados.filter(item => String(item.id).startsWith('new_'));
    if (novos.length === 0) return;

    Swal.fire({ title: 'Sincronizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        for (const item of novos) {
            const convenioBanco = normalizarNome(item.convenio);
            const { data: registrosExistentes, error: errorExistente } = await supabaseClient
                .from('lancamentos')
                .select('id')
                .eq('convenio', convenioBanco)
                .limit(1);

            if (errorExistente) throw errorExistente;

            const payload = { ...item };
            delete payload.id;
            payload.convenio = convenioBanco;

            if (registrosExistentes && registrosExistentes.length > 0) {
                const { error: errorUpdate } = await supabaseClient.from('lancamentos').update(payload).eq('id', registrosExistentes[0].id);
                if (errorUpdate) throw errorUpdate;
            } else {
                const { error: errorInsert } = await supabaseClient.from('lancamentos').insert(payload);
                if (errorInsert) throw errorInsert;
            }

            const { error: errorHistorico } = await supabaseClient.from('historico_datas_corte').upsert({
                convenio: convenioBanco,
                data_lancamento: item.data_lancamento,
                data_corte: item.data_corte,
                competencia: item.competencia
            }, { onConflict: 'convenio, competencia' });

            if (errorHistorico) throw errorHistorico;
        }

        Swal.fire({ icon: 'success', title: 'Sincronizado!', timer: 1500, showConfirmButton: false });
        setTimeout(() => location.reload(), 1600);
    } catch (erro) {
        registrarErro('sincronizar com o Supabase', erro);
        Swal.fire({
            icon: 'error',
            title: 'Erro na sincronização',
            text: 'Não foi possível salvar todos os dados. Verifique a conexão e tente novamente.',
            confirmButtonText: 'OK'
        });
    }
}

// -----------------------------------------------------------------------------
// EXPORTAÇÃO PARA EXCEL
// -----------------------------------------------------------------------------
// Aqui o sistema gera o arquivo Excel com os dados da tela.
function obterDadosExportacao() {
    if (!table) {
        return [];
    }

    const tipo = document.getElementById('tipoExportacao').value;
    let dadosFiltrados = table.rows({ filter: 'applied' }).data().toArray();

    if (tipo !== 'Todos') {
        dadosFiltrados = dadosFiltrados.filter(d => d.status === tipo);
    }

    return dadosFiltrados;
}

function exportarParaExcel() {
    const dadosFiltrados = obterDadosExportacao();
    const tipo = document.getElementById('tipoExportacao').value;

    if (!dadosFiltrados.length) {
        return mostrarMensagem('Aviso', 'Sem dados para exportar com os filtros atuais.', 'warning');
    }

    const formatarData = (valor) => {
        if (!valor) return '';
        return new Date(valor + 'T12:00:00').toLocaleDateString('pt-BR');
    };

    const dadosExcel = dadosFiltrados.map(d => ({
        'Convênio': d.convenio,
        'Competência': d.competencia,
        'Responsável': d.responsavel,
        'Sistema': d.sistema || '',
        'Data de Corte': formatarData(d.data_corte),
        'Data de Lançamento': formatarData(d.data_lancamento),
        'Status': d.status
    }));

    try {
        const planilha = XLSX.utils.json_to_sheet(dadosExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, planilha, 'Exportação_AKRK');
        XLSX.writeFile(workbook, `Relatorio_AKRK_${tipo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
    } catch (erro) {
        registrarErro('exportar relatório em Excel', erro);
        mostrarMensagem('Erro', 'Não foi possível gerar o arquivo Excel.', 'error');
    }
}


// Atualiza os cards do topo da página com os totais atuais.

function atualizarCards() {
    document.getElementById('countTotal').innerText = dadosAcumulados.length;
    document.getElementById('countPendente').innerText = dadosAcumulados.filter(d => d.status === 'Pendente').length;
    document.getElementById('countConcluido').innerText = dadosAcumulados.filter(d => d.status === 'Concluído').length;
}

// Controla a barra de ações em massa quando algum item for marcado.

function updateBulkUI() {
    const count = $('.select-item:checked').length;
    if (count > 0) {
        $('#bulkActions').addClass('is-visible').fadeIn();
        $('#selectedCount').text(count);
    } else {
        $('#bulkActions').fadeOut();
        $('#selectAllRows').prop('checked', false);
    }
}



atualizarDataAtual();
carregarDadosBanco();