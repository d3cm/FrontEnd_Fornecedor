<script>
import { onMount } from 'svelte';
import {
  getObra_Entidade_ParametroById,
  putEntidade,
  getEntidadeId,
  postValidacao,
  getValidacoes,
  getValidacaoId,
  getValidacao_Entidade_ParametroById
} from '../../../api/api';

import {} from '../../CSS/finalizacao.css';

export let id;
let obraData = null;
let loading = true;
let error = null;
let showValidationModal = false;
let entidadeSelecionada = null;
let validacaoSelecionada = null;
let novaClassificacao = 'Bom';
let motivoAlteracao = '';
let diretorResponsavel = '';
let validacoesPorEntidade = {};
let jsPDF = null;
let generatingPDF = false;

const tiposEntidades = {
  fornecedor: 'Fornecedores',
  empreitada: 'Empreitadas',
  aluguer: 'Alugueres'
};

const classificacoesPossiveis = ['Excelente', 'Bom', 'Em Risco', 'Eliminado'];

const calcularPontuacao = (entidade) => {
  if (!entidade || !entidade.tipo) return 0;
  
  const tipo = entidade.tipo.toLowerCase();
  
  if (tipo === 'fornecedor' && entidade.parametrosFornecedor) {
    const p = entidade.parametrosFornecedor;
    return (p.qualidade_materiais || 0) + (p.cumprimento_prazos || 0) + 
           (p.relacao_qualidadePreco || 0) + (p.cumprimento_regras || 0) + 
           (p.gestao_reclamacoes || 0);
  }
  
  if (tipo === 'empreitada' && entidade.parametrosEmpreitada) {
    const p = entidade.parametrosEmpreitada;
    return (p.resposta_solitacoes || 0) + (p.respeito_normas_seguranca || 0) +
           (p.respeito_normas_ambientais || 0) + (p.comformidade_servico || 0) +
           (p.cumprimento_prazos || 0) + (p.capacidade_negocial || 0) +
           (p.competencia_execucao_correcoes || 0) + (p.entrega_documentacao || 0);
  }
  
  if (tipo === 'aluguer' && entidade.parametrosAluguer) {
    const p = entidade.parametrosAluguer;
    return (p.capacidade_resposta || 0) + (p.qualidade_equipamento || 0) +
           (p.cumprimento_prazo || 0) + (p.desempenho_ambiental || 0) +
           (p.manuntencao_assistenciaTecnica || 0);
  }
  
  return 0;
};

const getStatus = (pontuacao, tipo) => {
  if (!pontuacao || !tipo) return { texto: 'N/A', classe: '', descricao: 'Dados insuficientes' };
  
  tipo = tipo.toLowerCase();
  
  if (tipo === 'fornecedor' || tipo === 'aluguer') {
    if (pontuacao <= 10) return { texto: 'Eliminado', classe: 'eliminado' };
    if (pontuacao < 15) return { texto: 'Em Risco', classe: 'risco' };
    if (pontuacao <= 20) return { texto: 'Bom', classe: 'bom' };
    return { texto: 'Excelente', classe: 'excelente' };
  } else if (tipo === 'empreitada') {
    if (pontuacao <= 16) return { texto: 'Eliminado', classe: 'eliminado' };
    if (pontuacao <= 23) return { texto: 'Em Risco', classe: 'risco' };
    if (pontuacao <= 32) return { texto: 'Bom', classe: 'bom' };
    return { texto: 'Excelente', classe: 'excelente' };
  }
  
  return { texto: 'N/A', classe: '', descricao: 'Tipo desconhecido' };
};

const carregarValidacoes = async () => {
  try {
    const todasValidacoes = await getValidacoes();
    validacoesPorEntidade = {};
    
    if (Array.isArray(todasValidacoes)) {
      todasValidacoes.forEach(validacao => {
        if (validacao && validacao.entidade_id) {
          if (!validacoesPorEntidade[validacao.entidade_id]) {
            validacoesPorEntidade[validacao.entidade_id] = [];
          }
          validacoesPorEntidade[validacao.entidade_id].push(validacao);
        }
      });
    }
  } catch (err) {
    console.error('Erro ao carregar validações:', err);
    validacoesPorEntidade = {};
  }
};

const abrirModalValidacao = async (entidade) => {
  try {
    const validacoes = validacoesPorEntidade[entidade.id] || [];
    
    if (validacoes.length > 0) {
      const ultimaValidacao = validacoes[validacoes.length - 1];
      validacaoSelecionada = await getValidacaoId(ultimaValidacao.id);
      entidadeSelecionada = await getEntidadeId(entidade.id);
      novaClassificacao = validacaoSelecionada.classificacao || 'Bom';
      diretorResponsavel = validacaoSelecionada.diretor_responsavel || '';
    } else {
      entidadeSelecionada = await getEntidadeId(entidade.id);
      validacaoSelecionada = null;
      const statusCalculado = getStatus(calcularPontuacao(entidadeSelecionada), entidadeSelecionada.tipo);
      novaClassificacao = statusCalculado.texto;
      diretorResponsavel = '';
    }

    showValidationModal = true;
  } catch (err) {
    console.error('Erro ao abrir modal:', err);
    alert('Não foi possível carregar os detalhes da entidade/validação');
  }
};

const fecharModal = () => {
  showValidationModal = false;
  entidadeSelecionada = null;
  validacaoSelecionada = null;
  novaClassificacao = 'Bom';
  motivoAlteracao = '';
  diretorResponsavel = '';
};

const validarEntidade = async () => {
  if (!diretorResponsavel || diretorResponsavel.trim() === '') {
    alert('Por favor, indique o diretor responsável pela validação');
    return;
  }

  try {
    const statusCalculado = getStatus(calcularPontuacao(entidadeSelecionada), entidadeSelecionada.tipo);
    const alterarClassificacao = novaClassificacao !== statusCalculado.texto;
    
    if (alterarClassificacao && (!motivoAlteracao || motivoAlteracao.trim() === '')) {
      alert('Por favor, indique o motivo da alteração da classificação');
      return;
    }
    
    const validacaoData = {
      entidade_id: entidadeSelecionada.id,
      observacoes_diretor: alterarClassificacao 
        ? `Classificação alterada de "${statusCalculado.texto}" para "${novaClassificacao}". Motivo: ${motivoAlteracao}`
        : 'Validação sem alterações - classificação automática mantida',
      diretor_responsavel: diretorResponsavel.trim(),
      validada: true,
      classificacao: novaClassificacao
    };

    const novaValidacao = await postValidacao(validacaoData);

    const dadosAtualizacao = {
      ...entidadeSelecionada,
      validada: true,
      classificacao: novaClassificacao,
      diretor_responsavel: diretorResponsavel.trim(),
      observacoes_diretor: validacaoData.observacoes_diretor
    };

    await putEntidade(entidadeSelecionada.id, dadosAtualizacao);

    if (!validacoesPorEntidade[entidadeSelecionada.id]) {
      validacoesPorEntidade[entidadeSelecionada.id] = [];
    }
    validacoesPorEntidade[entidadeSelecionada.id].push(novaValidacao);
    
    fecharModal();
    await carregarValidacoes();
    
    // Recarregar página para atualizar interface
    location.reload();
  } catch (err) {
    console.error('Erro na validação:', err);
    alert('Erro durante o processo de validação: ' + (err.message || 'Erro desconhecido'));
  }
};

const formatDate = (dateString) => {
  if (!dateString || dateString === '-infinity' || dateString === 'null') return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('pt-PT') + ' ' + date.toLocaleTimeString('pt-PT').slice(0, 5);
  } catch (err) {
    return 'N/A';
  }
};

const formatContribuinte = (num) => {
  if (!num) return 'N/A';
  const numStr = num.toString().replace(/\D/g, '');
  if (numStr.length === 9) {
    return numStr.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  return numStr;
};

const filtrarEntidades = (tipo) => {
  if (!obraData?.entidades || !Array.isArray(obraData.entidades)) return [];
  return obraData.entidades.filter(e => e?.tipo?.toLowerCase() === tipo?.toLowerCase());
};

const filtrarEntidadesValidadas = (tipo) => {
  const entidadesDoTipo = filtrarEntidades(tipo);
  const validadas = [];
  
  entidadesDoTipo.forEach(entidade => {
    const validacoes = validacoesPorEntidade[entidade.id] || [];
    if (validacoes.length > 0) {
      const ultimaValidacao = validacoes[validacoes.length - 1];
      validadas.push({
        entidade: entidade,
        validacao: ultimaValidacao
      });
    }
  });
  
  return validadas;
};

const filtrarEntidadesPendentes = (tipo) => {
  const entidadesDoTipo = filtrarEntidades(tipo);
  return entidadesDoTipo.filter(entidade => {
    const validacoes = validacoesPorEntidade[entidade.id] || [];
    return validacoes.length === 0;
  });
};

const getEntidadesValidadas = () => {
  if (!obraData?.entidades || !Array.isArray(obraData.entidades)) return 0;
  return obraData.entidades.filter(entidade => {
    const validacoes = validacoesPorEntidade[entidade.id] || [];
    return validacoes.length > 0;
  }).length;
};

const getEntidadesPendentes = () => {
  if (!obraData?.entidades || !Array.isArray(obraData.entidades)) return 0;
  return obraData.entidades.filter(entidade => {
    const validacoes = validacoesPorEntidade[entidade.id] || [];
    return validacoes.length === 0;
  }).length;
};

const carregarJsPDF = async () => {
  if (!jsPDF) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        try {
          jsPDF = window.jspdf.jsPDF;
          resolve();
        } catch (err) {
          reject(new Error('Erro ao inicializar jsPDF'));
        }
      };
      script.onerror = () => {
        reject(new Error('Falha ao carregar jsPDF'));
      };
      document.head.appendChild(script);
    });
  }
};

// Função corrigida para obter dados para PDF
const obterDadosParaPDF = (filtro) => {
  const dados = [];
  
  if (!obraData?.entidades || !Array.isArray(obraData.entidades)) {
    console.warn('Dados das entidades não disponíveis');
    return dados;
  }
  
  Object.keys(tiposEntidades).forEach(tipo => {
    const entidadesValidadas = filtrarEntidadesValidadas(tipo);
    const entidadesPendentes = filtrarEntidadesPendentes(tipo);
    
    // Processar entidades validadas
    entidadesValidadas.forEach(item => {
      const entidade = item.entidade;
      const validacao = item.validacao;
      
      if (!entidade || !validacao) return;
      
      const classificacao = validacao.classificacao || 'N/A';
      
      // Aplicar filtros
      let incluir = false;
      
      switch (filtro) {
        case 'todos':
          incluir = true;
          break;
        case 'aprovados':
          incluir = ['Excelente', 'Bom'].includes(classificacao);
          break;
        case 'risco':
          incluir = classificacao === 'Em Risco';
          break;
        case 'eliminados':
          incluir = classificacao === 'Eliminado';
          break;
        default:
          incluir = true;
      }
      
      if (incluir) {
        dados.push({
          id: entidade.id || 'N/A',
          nome: entidade.fornecedor || 'N/A',
          tipo: tiposEntidades[tipo] || tipo,
          contribuinte: formatContribuinte(entidade.contribuinte),
          pontuacao: calcularPontuacao(entidade),
          status: classificacao,
          validada: true,
          dataValidacao: formatDate(validacao.data_criacao),
          diretor: validacao.diretor_responsavel || 'N/A',
          observacoes: validacao.observacoes_diretor || 'Nenhuma'
        });
      }
    });
    
    // Processar entidades pendentes (apenas no relatório completo)
    if (filtro === 'todos') {
      entidadesPendentes.forEach(entidade => {
        if (!entidade) return;
        
        const status = getStatus(calcularPontuacao(entidade), entidade.tipo);
        
        dados.push({
          id: entidade.id || 'N/A',
          nome: entidade.fornecedor || 'N/A',
          tipo: tiposEntidades[tipo] || tipo,
          contribuinte: formatContribuinte(entidade.contribuinte),
          pontuacao: calcularPontuacao(entidade),
          status: status.texto,
          validada: false,
          dataValidacao: 'Pendente',
          diretor: 'N/A',
          observacoes: 'Aguardando validação'
        });
      });
    }
  });
  
  // Ordenar por status e nome
  const ordemStatus = { 'Excelente': 0, 'Bom': 1, 'Em Risco': 2, 'Eliminado': 3, 'N/A': 4 };
  return dados.sort((a, b) => {
    const ordemA = ordemStatus[a.status] !== undefined ? ordemStatus[a.status] : 4;
    const ordemB = ordemStatus[b.status] !== undefined ? ordemStatus[b.status] : 4;
    return ordemA - ordemB || (a.nome || '').localeCompare(b.nome || '');
  });
};

// Função corrigida para gerar PDF
const gerarPDF = async (tipoRelatorio = 'completo') => {
  try {
    console.log('Iniciando geração de PDF:', tipoRelatorio);
    generatingPDF = true;
    
    await carregarJsPDF();
    
    if (!obraData) {
      throw new Error('Dados da obra não disponíveis');
    }

    const dados = obterDadosParaPDF(tipoRelatorio);
    console.log('Dados obtidos para PDF:', dados.length, 'entidades');
    
    if (dados.length === 0) {
      alert(`Nenhuma entidade encontrada para o relatório "${getTituloRelatorio(tipoRelatorio)}"`);
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    let yPosition = 20;
    const leftMargin = 10;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - leftMargin * 2;

    // Função para adicionar nova página
    const adicionarNovaPagina = () => {
      doc.addPage('landscape');
      yPosition = 20;
      desenharCabecalhoTabela();
    };

    // Função para desenhar cabeçalho da tabela
    const desenharCabecalhoTabela = () => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(220, 220, 220);
      doc.setTextColor(0, 0, 0);
      
      const colunas = [
        { header: 'ID', width: 12 },
        { header: 'Nome', width: 40 },
        { header: 'Tipo', width: 25 },
        { header: 'NIF', width: 25 },
        { header: 'Pontos', width: 15 },
        { header: 'Status', width: 25 },
        { header: 'Validado', width: 18 },
        { header: 'Data Val.', width: 25 },
        { header: 'Diretor', width: 30 },
        { header: 'Observações', width: 50 }
      ];
      
      let xPos = leftMargin;
      colunas.forEach(coluna => {
        doc.rect(xPos, yPosition, coluna.width, 8, 'F');
        doc.text(coluna.header, xPos + 2, yPosition + 6);
        xPos += coluna.width;
      });
      
      yPosition += 8;
      return colunas;
    };

    // Cabeçalho do relatório
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(`Relatório: ${getTituloRelatorio(tipoRelatorio)}`, leftMargin, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Obra: ${obraData.obra?.nome || 'N/A'} (${obraData.obra?.codigo || 'N/A'})`, leftMargin, yPosition);
    yPosition += 6;
    doc.text(`Data do relatório: ${new Date().toLocaleDateString('pt-PT')}`, leftMargin, yPosition);
    yPosition += 6;
    doc.text(`Total de entidades: ${dados.length}`, leftMargin, yPosition);
    yPosition += 12;

    // Desenhar cabeçalho da tabela
    const colunas = desenharCabecalhoTabela();

    // Desenhar linhas da tabela
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    dados.forEach((entidade, index) => {
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 30) {
        adicionarNovaPagina();
      }

      // Alternar cores das linhas
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(leftMargin, yPosition, contentWidth, 6, 'F');
      }
      
      // Preencher células
      let xPos = leftMargin;
      const valores = [
        entidade.id?.toString() || 'N/A',
        entidade.nome || 'N/A',
        entidade.tipo || 'N/A',
        entidade.contribuinte || 'N/A',
        entidade.pontuacao?.toString() || '0',
        entidade.status || 'N/A',
        entidade.validada ? 'Sim' : 'Não',
        entidade.dataValidacao || 'N/A',
        entidade.diretor || 'N/A',
        (entidade.observacoes || 'Nenhuma').substring(0, 50) + (entidade.observacoes && entidade.observacoes.length > 50 ? '...' : '')
      ];
      
      colunas.forEach((coluna, colIndex) => {
        let valor = valores[colIndex] || 'N/A';
        
        // Aplicar cor baseada no status
        if (coluna.header === 'Status') {
          const statusCor = getCorStatus(valor);
          if (statusCor) {
            doc.setFillColor(statusCor.background[0] || 255, statusCor.background[1] || 255, statusCor.background[2] || 255);
            doc.rect(xPos, yPosition, coluna.width, 6, 'F');
          }
        }
        
        // Truncar texto se necessário
        if (valor.length > 20 && coluna.header !== 'Observações') {
          valor = valor.substring(0, 17) + '...';
        }
        
        doc.setTextColor(0, 0, 0);
        doc.text(valor, xPos + 1, yPosition + 4);
        xPos += coluna.width;
      });
      
      yPosition += 6;
    });

    // Rodapé
    yPosition += 10;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-PT')}`, leftMargin, yPosition);
    
    // Salvar PDF
    const nomeArquivo = `Relatorio_${getTituloRelatorio(tipoRelatorio).replace(/[^a-zA-Z0-9]/g, '_')}_${obraData.obra?.codigo || 'obra'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    console.log('Salvando PDF:', nomeArquivo);
    doc.save(nomeArquivo);
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    alert(`Erro ao gerar PDF: ${error.message}`);
  } finally {
    generatingPDF = false;
  }
};

const getTituloRelatorio = (tipo) => {
  switch (tipo) {
    case 'completo': 
    case 'todos': 
      return 'Todas as Entidades';
    case 'aprovados': 
      return 'Entidades Aprovadas';
    case 'risco': 
      return 'Entidades em Risco';
    case 'eliminados': 
      return 'Lista Negra';
    default: 
      return 'Relatório';
  }
};

const getCorStatus = (status) => {
  switch (status) {
    case 'Excelente': 
      return { text: [0, 0, 0], background: [212, 237, 218] };
    case 'Bom': 
      return { text: [0, 0, 0], background: [195, 230, 203] };
    case 'Em Risco': 
      return { text: [0, 0, 0], background: [255, 243, 205] };
    case 'Eliminado': 
      return { text: [0, 0, 0], background: [248, 215, 218] };
    default: 
      return { text: [0, 0, 0], background: [255, 255, 255] };
  }
};

onMount(async () => {
  try {
    console.log('Iniciando carregamento da página...');
    
    if (!id) {
      const path = window.location.pathname.split('/');
      const finalizacaoIndex = path.findIndex(part => part === 'finalizacao');
      id = finalizacaoIndex !== -1 && path.length > finalizacaoIndex + 1 ? path[finalizacaoIndex + 1] : null;
    }
    
    if (!id) {
      throw new Error('ID da obra não encontrado na URL');
    }
    
    console.log('Carregando dados da obra com ID:', id);
    obraData = await getObra_Entidade_ParametroById(id);
    
    if (!obraData?.obra) {
      throw new Error('Dados da obra não encontrados ou inválidos');
    }

    console.log('Dados da obra carregados:', obraData);
    console.log('Número de entidades:', obraData.entidades?.length || 0);

    await carregarValidacoes();
    console.log('Validações carregadas:', Object.keys(validacoesPorEntidade).length, 'entidades com validações');
    
    loading = false;
  } catch (err) {
    console.error('Erro no onMount:', err);
    error = err.message || 'Erro desconhecido ao carregar dados';
    loading = false;
  }
});
</script>

{#if loading}
  <div class="loading">
    <div>⏳</div>
    <p>Carregando dados da obra...</p>
  </div>
{:else if error}
  <div class="error">
    <h2>Erro ao carregar dados</h2>
    <p>{error}</p>
    <p>ID tentado: {id || 'nenhum ID encontrado'}</p>
    <button on:click={() => window.history.back()}>← Voltar</button>
  </div>
{:else if obraData && obraData.obra}
  <div class="container">
    <header>
      <div class="header-actions">
        <button on:click={() => window.history.back()}>← Voltar</button>
        <div class="pdf-buttons">
          <button on:click={() => gerarPDF('completo')} class="btn-pdf" disabled={generatingPDF}>
            {generatingPDF ? '⏳ Gerando...' : '📋 Completo'}
          </button>
          <button on:click={() => gerarPDF('aprovados')} class="btn-pdf" disabled={generatingPDF}>
            {generatingPDF ? '⏳ Gerando...' : '✅ Aprovados'}
          </button>
          <button on:click={() => gerarPDF('risco')} class="btn-pdf" disabled={generatingPDF}>
            {generatingPDF ? '⏳ Gerando...' : '⚠️ Em Risco'}
          </button>
          <button on:click={() => gerarPDF('eliminados')} class="btn-pdf btn-eliminados" disabled={generatingPDF}>
            {generatingPDF ? '⏳ Gerando...' : '🚫 Lista Negra'}
          </button>
        </div>
      </div>
      <h1>Relatório Final - {obraData.obra.nome}</h1>
      
      <div class="obra-info">
        <div>
          <h3>Informações da Obra</h3>
          <div><strong>Código:</strong> {obraData.obra.codigo || 'N/A'}</div>
          <div><strong>Data:</strong> {formatDate(obraData.obra.data)}</div>
          <div><strong>TSST:</strong> {obraData.obra.tsst || 'N/A'}</div>
        </div>
        
        <div class="stats">
          <h3>Estatísticas</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{obraData.entidades?.length || 0}</div>
              <div class="stat-label">Total Entidades</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{getEntidadesValidadas()}</div>
              <div class="stat-label">Validadas</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{getEntidadesPendentes()}</div>
              <div class="stat-label">Pendentes</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{filtrarEntidades('fornecedor').length}</div>
              <div class="stat-label">Fornecedores</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{filtrarEntidades('empreitada').length}</div>
              <div class="stat-label">Empreitadas</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{filtrarEntidades('aluguer').length}</div>
              <div class="stat-label">Alugueres</div>
            </div>
          </div>
        </div>
      </div>
    </header>
    
    <main>
      <!-- TABELA DE ENTIDADES VALIDADAS -->
      {#each Object.entries(tiposEntidades) as [tipo, label]}
        {@const entidadesValidadas = filtrarEntidadesValidadas(tipo)}
        {#if entidadesValidadas.length > 0}
          <section class="entidade-section validated-section">
            <div class="section-header">
              <h2>✓ {label} Validadas ({entidadesValidadas.length})</h2>
            </div>
            
            <table class="entidade-table validated-table">
              <thead>
                <tr>
                  <th>ID Validação</th>
                  <th>ID Entidade</th>
                  <th>Nome</th>
                  <th>NIF</th>
                  <th>Classificação Final</th>
                  <th>Diretor Responsável</th>
                  <th>Data Validação</th>
                  <th>Observações</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {#each entidadesValidadas as item}
                  {@const entidade = item.entidade}
                  {@const validacao = item.validacao}
                  
                  <tr>
                    <td>{validacao.id}</td>
                    <td>{entidade.id}</td>
                    <td>{entidade.fornecedor}</td>
                    <td>{formatContribuinte(entidade.contribuinte)}</td>
                    <td>
                      <div class={validacao.classificacao?.toLowerCase().replace(' ', '-')}>
                        {validacao.classificacao}
                      </div>
                    </td>
                    <td>{validacao.diretor_responsavel || 'N/A'}</td>
                    <td>{formatDate(validacao.data_criacao)}</td>
                    <td class="observacoes-cell">
                      {#if validacao.observacoes_diretor}
                        <div class="observacoes-preview" title={validacao.observacoes_diretor}>
                          {validacao.observacoes_diretor.length > 50 
                            ? validacao.observacoes_diretor.substring(0, 50) + '...' 
                            : validacao.observacoes_diretor}
                        </div>
                      {:else}
                        <span class="no-observations">Sem observações</span>
                      {/if}
                    </td>
                    <td>
                      <button on:click={() => abrirModalValidacao(entidade)} class="btn-view">
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </section>
        {/if}
      {/each}

      <!-- TABELA DE ENTIDADES PENDENTES DE VALIDAÇÃO -->
      {#each Object.entries(tiposEntidades) as [tipo, label]}
        {@const entidadesPendentes = filtrarEntidadesPendentes(tipo)}
        {#if entidadesPendentes.length > 0}
          <section class="entidade-section pending-section">
            <div class="section-header">
              <h2>⏳ {label} Pendentes de Validação ({entidadesPendentes.length})</h2>
            </div>
            
            <table class="entidade-table pending-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>NIF</th>
                  <th>Pontuação</th>
                  <th>Status Automático</th>
                  <th>Data Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {#each entidadesPendentes as entidade}
                  {@const statusAutomatico = getStatus(calcularPontuacao(entidade), entidade.tipo || '')}
                  
                  <tr>
                    <td>{entidade.id}</td>
                    <td>{entidade.fornecedor}</td>
                    <td>{formatContribuinte(entidade.contribuinte)}</td>
                    <td>{calcularPontuacao(entidade)}</td>
                    <td>
                      <div class={statusAutomatico.classe}>{statusAutomatico.texto}</div>
                    </td>
                    <td>{formatDate(entidade.data_criacao)}</td>
                    <td>
                      <button on:click={() => abrirModalValidacao(entidade)} class="btn-validate">
                        Validar
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </section>
        {/if}
      {/each}

      <!-- MENSAGEM QUANDO NÃO HÁ ENTIDADES -->
      {#if obraData?.entidades?.length === 0}
        <div class="no-entities">
          <p>Nenhuma entidade encontrada para esta obra</p>
        </div>
      {/if}
    </main>

    {#if showValidationModal && entidadeSelecionada}
      {@const statusCalculado = getStatus(calcularPontuacao(entidadeSelecionada), entidadeSelecionada.tipo || '')}
      {@const temValidacao = validacaoSelecionada !== null}
      
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="modal-overlay" on:click|self={fecharModal}>
        <div class="modal-content">
          <h2>{temValidacao ? 'Detalhes da Validação' : 'Validar Entidade'} (ID: {entidadeSelecionada.id})</h2>
          
          <div class="modal-grid">
            <div class="modal-field">
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <label><strong>Tipo:</strong></label>
              <div>{tiposEntidades[entidadeSelecionada.tipo] || entidadeSelecionada.tipo}</div>
            </div>
            
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <div class="modal-field">
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <label><strong>Fornecedor:</strong></label>
              <div>{entidadeSelecionada.fornecedor || 'N/A'}</div>
            </div>
            
            <div class="modal-field">
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <label><strong>NIF:</strong></label>
              <div>{formatContribuinte(entidadeSelecionada.contribuinte)}</div>
            </div>
            
            <div class="modal-field">
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <label><strong>Pontuação Calculada:</strong></label>
              <div>{calcularPontuacao(entidadeSelecionada)} pontos</div>
            </div>
            
            <div class="modal-field">
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <label><strong>Classificação Automática:</strong></label>
              <div class={statusCalculado.classe}>{statusCalculado.texto}</div>
            </div>
            
            {#if !temValidacao}
              <div class="modal-field full-width">
                <label for="classificacao-final-select"><strong>Classificação Final *</strong></label>
                <select id="classificacao-final-select" bind:value={novaClassificacao}>
                  {#each classificacoesPossiveis as classificacao}
                    <option value={classificacao}>{classificacao}</option>
                  {/each}
                </select>
              </div>
              
              <div class="modal-field full-width">
                <label for="diretor-responsavel-input"><strong>Diretor Responsável *</strong></label>
                <input id="diretor-responsavel-input" type="text" bind:value={diretorResponsavel} 
                       placeholder="Nome do diretor que autorizou a validação" required />
              </div>
              
              {#if novaClassificacao !== statusCalculado.texto}
                <div class="modal-field full-width">
                  <label for="motivo-alteracao-textarea"><strong>Motivo da Alteração *</strong></label>
                  <textarea id="motivo-alteracao-textarea" bind:value={motivoAlteracao} 
                            placeholder="Descreva o motivo pelo qual está alterando a classificação..." required></textarea>
                </div>
              {/if}
              
              <div class="modal-actions">
                <button on:click={fecharModal} class="btn-cancel">
                  Cancelar
                </button>
                <button on:click={validarEntidade} class="btn-confirm">
                  Confirmar Validação
                </button>
              </div>
            {:else}
              <div class="modal-field full-width">
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label><strong>Classificação Final:</strong></label>
                <div class={validacaoSelecionada.classificacao?.toLowerCase().replace(' ', '-')}>
                  {validacaoSelecionada.classificacao}
                </div>
              </div>
              
              <div class="modal-field full-width">
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label><strong>Diretor Responsável:</strong></label>
                <div>{validacaoSelecionada.diretor_responsavel || 'N/A'}</div>
              </div>
              
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <div class="modal-field full-width">
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label><strong>Data da Validação:</strong></label>
                <div>{formatDate(validacaoSelecionada.data_criacao)}</div>
              </div>
              
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <div class="modal-field full-width">
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label><strong>Observações:</strong></label>
                <div>{validacaoSelecionada.observacoes_diretor || 'Nenhuma'}</div>
              </div>
              
              <div class="modal-actions">
                <button on:click={fecharModal} class="btn-cancel">
                  Fechar
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}