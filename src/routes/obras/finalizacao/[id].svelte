<script>
  import { onMount } from 'svelte';
  import {
    getObra_Entidade_ParametroById,
    putEntidade,
    getEntidadeId,
    postValidacao,
    putValidacao,
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
  let isEditingValidation = false;
  let searchTerm = '';
  let searchActive = false;
  
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
  
  const filterEntities = (entities, isValidationTable = false) => {
    if (!searchTerm) return entities;
    
    const term = searchTerm.toLowerCase();
    
    return entities.filter(item => {
      const entidade = isValidationTable ? item.entidade : item;
      
      return (
        (entidade.id?.toString().includes(term)) ||
        (entidade.fornecedor?.toLowerCase().includes(term)) ||
        (formatContribuinte(entidade.contribuinte)?.toLowerCase().includes(term)) ||
        (isValidationTable ? item.validacao.id?.toString().includes(term) : false)
      );
    });
  };
  
  const abrirModalValidacao = async (entidade, editMode = false) => {
    try {
      const validacoes = validacoesPorEntidade[entidade.id] || [];
      isEditingValidation = editMode;
      
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
      
      const currentDate = new Date().toISOString();
      
      const validacaoData = {
        entidade_id: entidadeSelecionada.id,
        observacoes_diretor: alterarClassificacao 
          ? `Classificação alterada de "${statusCalculado.texto}" para "${novaClassificacao}". Motivo: ${motivoAlteracao}`
          : 'Validação sem alterações - classificação automática mantida',
        diretor_responsavel: diretorResponsavel.trim(),
        validada: true,
        classificacao: novaClassificacao,
        data_avaliacao: currentDate
      };
  
      let novaValidacao;
      if (isEditingValidation && validacaoSelecionada) {
        novaValidacao = await putValidacao(validacaoSelecionada.id, validacaoData);
      } else {
        novaValidacao = await postValidacao(validacaoData);
      }
  
      const dadosAtualizacao = {
        ...entidadeSelecionada,
        validada: true,
        classificacao: novaClassificacao,
        diretor_responsavel: diretorResponsavel.trim(),
        observacoes_diretor: validacaoData.observacoes_diretor,
        data_avaliacao: currentDate
      };
  
      await putEntidade(entidadeSelecionada.id, dadosAtualizacao);
  
      if (!validacoesPorEntidade[entidadeSelecionada.id]) {
        validacoesPorEntidade[entidadeSelecionada.id] = [];
      }
      
      if (isEditingValidation) {
        const index = validacoesPorEntidade[entidadeSelecionada.id].findIndex(v => v.id === validacaoSelecionada.id);
        if (index !== -1) {
          validacoesPorEntidade[entidadeSelecionada.id][index] = novaValidacao;
        }
      } else {
        validacoesPorEntidade[entidadeSelecionada.id].push(novaValidacao);
      }
      
      fecharModal();
      await carregarValidacoes();
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
  
  const obterDadosParaPDF = (filtro) => {
    const dados = [];
    
    if (!obraData?.entidades || !Array.isArray(obraData.entidades)) {
      console.warn('Dados das entidades não disponíveis');
      return dados;
    }
    
    Object.keys(tiposEntidades).forEach(tipo => {
      const entidadesValidadas = filtrarEntidadesValidadas(tipo);
      const entidadesPendentes = filtrarEntidadesPendentes(tipo);
      
      entidadesValidadas.forEach(item => {
        const entidade = item.entidade;
        const validacao = item.validacao;
        
        if (!entidade || !validacao) return;
        
        const classificacao = validacao.classificacao || 'N/A';
        
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
            dataValidacao: formatDate(validacao.data_avaliacao),
            diretor: validacao.diretor_responsavel || 'N/A',
            observacoes: validacao.observacoes_diretor || 'Nenhuma'
          });
        }
      });
      
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
    
    const ordemStatus = { 'Excelente': 0, 'Bom': 1, 'Em Risco': 2, 'Eliminado': 3, 'N/A': 4 };
    return dados.sort((a, b) => {
      const ordemA = ordemStatus[a.status] !== undefined ? ordemStatus[a.status] : 4;
      const ordemB = ordemStatus[b.status] !== undefined ? ordemStatus[b.status] : 4;
      return ordemA - ordemB || (a.nome || '').localeCompare(b.nome || '');
    });
  };
  
  const splitTextIntoLines = (text, maxWidth, doc) => {
    const lines = [];
    let currentLine = '';
    
    if (!text) return [''];
    
    const words = text.split(' ');
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };
  
  const gerarPDF = async (tipoRelatorio = 'completo') => {
    try {
      generatingPDF = true;
      await carregarJsPDF();
      
      if (!obraData) {
        throw new Error('Dados da obra não disponíveis');
      }

      const dados = obterDadosParaPDF(tipoRelatorio);
      
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
      const lineHeight = 6;
      const cellPadding = 2;

      const adicionarNovaPagina = () => {
        doc.addPage('landscape');
        yPosition = 20;
      };

      const drawHorizontalLine = (x1, x2, y) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        doc.line(x1, y, x2, y);
      };

      const drawVerticalLine = (x, y1, y2) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        doc.line(x, y1, x, y2);
      };

      const drawTableBorders = (startY, endY, rowHeight = lineHeight) => {
        const tableWidth = colunas.reduce((sum, col) => sum + col.width, 0);
        
        drawHorizontalLine(leftMargin, leftMargin + tableWidth, startY);
        drawHorizontalLine(leftMargin, leftMargin + tableWidth, endY);
        
        let xPos = leftMargin;
        colunas.forEach((coluna, index) => {
          drawVerticalLine(xPos, startY, endY);
          xPos += coluna.width;
          
          if (index === colunas.length - 1) {
            drawVerticalLine(xPos, startY, endY);
          }
        });
      };

      doc.setFont('helvetica');
      doc.setFontSize(18);
      doc.text(`Relatório: ${getTituloRelatorio(tipoRelatorio)}`, leftMargin, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.text(`Obra: ${obraData.obra?.nome || 'N/A'} (${obraData.obra?.codigo || 'N/A'})`, leftMargin, yPosition);
      yPosition += lineHeight;
      doc.text(`Data do relatório: ${new Date().toLocaleDateString('pt-PT')}`, leftMargin, yPosition);
      yPosition += lineHeight;
      doc.text(`Total de entidades: ${dados.length}`, leftMargin, yPosition);
      yPosition += lineHeight * 2;

      const colunas = [
        { header: 'ID', width: 15 },
        { header: 'Nome', width: 40 },
        { header: 'Tipo', width: 25 },
        { header: 'NIF', width: 25 },
        { header: 'Pontos', width: 15 },
        { header: 'Status', width: 20 },
        { header: 'Validado', width: 15 },
        { header: 'Data Val.', width: 25 },
        { header: 'Diretor', width: 30 },
        { header: 'Observações', width: 60 }
      ];

      const drawTableHeader = () => {
        const headerStartY = yPosition;
        
        doc.setFillColor(240, 240, 240);
        const tableWidth = colunas.reduce((sum, col) => sum + col.width, 0);
        doc.rect(leftMargin, headerStartY, tableWidth, lineHeight, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        let xPos = leftMargin;
        colunas.forEach(coluna => {
          doc.text(coluna.header, xPos + cellPadding, yPosition + cellPadding + 3);
          xPos += coluna.width;
        });
        
        drawTableBorders(headerStartY, headerStartY + lineHeight);
        
        yPosition += lineHeight;
      };

      drawTableHeader();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      
      dados.forEach((entidade, index) => {
        const observacoesLines = splitTextIntoLines(
          entidade.observacoes || 'Nenhuma', 
          colunas[9].width - cellPadding * 2, 
          doc
        );
        
        const cellHeight = Math.max(lineHeight, observacoesLines.length * lineHeight);
        
        if (yPosition + cellHeight > pageHeight - 30) {
          adicionarNovaPagina();
          drawTableHeader();
        }

        const rowStartY = yPosition;
        
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          const tableWidth = colunas.reduce((sum, col) => sum + col.width, 0);
          doc.rect(leftMargin, rowStartY, tableWidth, cellHeight, 'F');
        }
        
        let xPos = leftMargin;
        
        doc.text(entidade.id?.toString() || 'N/A', xPos + cellPadding, yPosition + cellPadding + 3);
        xPos += colunas[0].width;
        
        doc.text(entidade.nome || 'N/A', xPos + cellPadding, yPosition + cellPadding + 3);
        xPos += colunas[1].width;
        
        doc.text(entidade.tipo || 'N/A', xPos + cellPadding, yPosition + cellPadding + 3);
        xPos += colunas[2].width;
        
        doc.text(entidade.contribuinte || 'N/A', xPos + cellPadding, yPosition + cellPadding + 3);
        xPos += colunas[3].width;
        
        doc.text(entidade.pontuacao?.toString() || '0', xPos + cellPadding, yPosition + cellPadding + 3);
        xPos += colunas[4].width;
        
        const statusColor = getStatusColor(entidade.status);
        doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
        doc.text(entidade.status || 'N/A', xPos + cellPadding, yPosition + cellPadding + 3);
        doc.setTextColor(0, 0, 0);
        xPos += colunas[5].width;
        
        doc.text(entidade.validada ? 'Sim' : 'Não', xPos + cellPadding, yPosition + cellPadding + 3);
        xPos += colunas[6].width;
        
        doc.text(entidade.dataValidacao || 'N/A', xPos + cellPadding, yPosition + cellPadding + 3);
        xPos += colunas[7].width;
        
        doc.text(entidade.diretor || 'N/A', xPos + cellPadding, yPosition + cellPadding + 3);
        xPos += colunas[8].width;
        
        observacoesLines.forEach((line, i) => {
          doc.text(line, xPos + cellPadding, yPosition + cellPadding + 3 + (i * lineHeight));
        });
        
        drawTableBorders(rowStartY, rowStartY + cellHeight);
        
        yPosition += cellHeight;
      });

      yPosition += lineHeight;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-PT')}`, leftMargin, yPosition);
      
      const nomeArquivo = `Relatorio_${getTituloRelatorio(tipoRelatorio).replace(/[^a-zA-Z0-9]/g, '_')}_${obraData.obra?.codigo || 'obra'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(nomeArquivo);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert(`Erro ao gerar PDF: ${error.message}`);
    } finally {
      generatingPDF = false;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Excelente':
        return { r: 0, g: 128, b: 0 };
      case 'Bom':
        return { r: 0, g: 100, b: 200 };
      case 'Em Risco':
        return { r: 255, g: 140, b: 0 };
      case 'Eliminado':
        return { r: 220, g: 20, b: 60 };
      default:
        return { r: 0, g: 0, b: 0 };
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
  
  onMount(async () => {
    try {
      if (!id) {
        const path = window.location.pathname.split('/');
        const finalizacaoIndex = path.findIndex(part => part === 'finalizacao');
        id = finalizacaoIndex !== -1 && path.length > finalizacaoIndex + 1 ? path[finalizacaoIndex + 1] : null;
      }
      
      if (!id) {
        throw new Error('ID da obra não encontrado na URL');
      }
      
      obraData = await getObra_Entidade_ParametroById(id);
      
      if (!obraData?.obra) {
        throw new Error('Dados da obra não encontrados ou inválidos');
      }
  
      await carregarValidacoes();
      loading = false;
    } catch (err) {
      console.error('Erro no onMount:', err);
      error = err.message || 'Erro desconhecido ao carregar dados';
      loading = false;
    }
  });

  const navigateToEntidade = (entidadeId) => {
    const pathParts = window.location.pathname.split('/');
    const obraId = pathParts.length > 2 ? pathParts[2] : null;
    
    if (obraId) {
      window.location.href = `/obras/entidade/${entidadeId}`;
    } else {
      window.location.href = `../entidade/${entidadeId}`;
    }
  };
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
    
    <div class="search-container">
      <input 
        type="text" 
        bind:value={searchTerm}
        placeholder="Pesquisar por NIF, nome ou ID..."
        on:input={() => searchActive = searchTerm.length > 0}
      />
      {#if searchActive}
        <button on:click={() => { searchTerm = ''; searchActive = false; }} class="clear-search">
          Limpar
        </button>
      {/if}
    </div>
    
    <main>
      {#each Object.entries(tiposEntidades) as [tipo, label]}
        {@const entidadesValidadas = filterEntities(filtrarEntidadesValidadas(tipo), true)}
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
                  <th>Classificação</th>
                  <th>Diretor</th>
                  <th>Data</th>
                  <th>Observações</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {#each entidadesValidadas as item}
                  {@const entidade = item.entidade}
                  {@const validacao = item.validacao}
                  
                  <tr on:click={() => navigateToEntidade(entidade.id)} class="clickable-row">
                    <td>{validacao.id || 'N/A'}</td>
                    <td>{entidade.id}</td>
                    <td>{entidade.fornecedor || 'N/A'}</td>
                    <td>{formatContribuinte(entidade.contribuinte)}</td>
                    <td class={validacao.classificacao?.toLowerCase().replace(' ', '-')}>
                      {validacao.classificacao || 'N/A'}
                    </td>
                    <td>{validacao.diretor_responsavel || 'N/A'}</td>
                    <td>{formatDate(validacao.data_avaliacao)}</td>
                    <td class="observacoes-cell">
                      {#if validacao.observacoes_diretor}
                        <div title={validacao.observacoes_diretor}>
                          {validacao.observacoes_diretor.length > 30 
                            ? validacao.observacoes_diretor.substring(0, 30) + '...' 
                            : validacao.observacoes_diretor}
                        </div>
                      {:else}
                        <span class="no-observations">-</span>
                      {/if}
                    </td>
                    <td>
                      <button on:click|stopPropagation={() => abrirModalValidacao(entidade, true)} class="btn-view">
                        Detalhes
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </section>
        {/if}
      {/each}
    
      {#each Object.entries(tiposEntidades) as [tipo, label]}
        {@const entidadesPendentes = filterEntities(filtrarEntidadesPendentes(tipo))}
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
                  
                  <tr on:click={() => navigateToEntidade(entidade.id)} class="clickable-row">
                    <td>{entidade.id}</td>
                    <td>{entidade.fornecedor}</td>
                    <td>{formatContribuinte(entidade.contribuinte)}</td>
                    <td>{calcularPontuacao(entidade)}</td>
                    <td>
                      <div class={statusAutomatico.classe}>{statusAutomatico.texto}</div>
                    </td>
                    <td>{formatDate(entidade.data_criacao)}</td>
                    <td>
                      <button on:click|stopPropagation={() => abrirModalValidacao(entidade)} class="btn-validate">
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
    
      {#if obraData?.entidades?.length === 0}
        <div class="no-entities">
          <p>Nenhuma entidade encontrada para esta obra</p>
        </div>
      {/if}
    </main>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    {#if showValidationModal && entidadeSelecionada}
      {@const statusCalculado = getStatus(calcularPontuacao(entidadeSelecionada), entidadeSelecionada.tipo || '')}
      {@const temValidacao = validacaoSelecionada !== null}
      
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="modal-overlay" on:click|self={fecharModal}>
        <div class="modal-content">
          <h2>{isEditingValidation ? 'Editar Validação' : 'Validar Entidade'} (ID: {entidadeSelecionada.id})</h2>
          
          <div class="modal-grid">
            <div class="modal-field">
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <label><strong>Tipo:</strong></label>
              <div>{tiposEntidades[entidadeSelecionada.tipo] || entidadeSelecionada.tipo}</div>
            </div>
            
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
            
            {#if temValidacao}
              <!-- svelte-ignore a11y-label-has-associated-control -->
              <div class="modal-field full-width">
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <label><strong>Data da Validação:</strong></label>
                <div>{formatDate(validacaoSelecionada.data_avaliacao)}</div>
              </div>
            {/if}
            
            <div class="modal-actions">
              <button on:click={fecharModal} class="btn-cancel">
                Cancelar
              </button>
              <button on:click={validarEntidade} class="btn-confirm">
                {isEditingValidation ? 'Atualizar Validação' : 'Confirmar Validação'}
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .observacoes-cell {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .observacoes-cell div {
    cursor: help;
  }

  .no-observations {
    color: #999;
    font-style: italic;
  }

  .btn-view {
    background-color: #4CAF50;
    color: white;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-view:hover {
    background-color: #45a049;
  }

  .excelente { background-color: #d4edda; color: #155724; }
  .bom { background-color: #c3e6cb; color: #0c5460; }
  .em-risco { background-color: #fff3cd; color: #856404; }
  .eliminado { background-color: #f8d7da; color: #721c24; }

  .search-container {
    margin: 20px 0;
    padding: 0 10px;
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .search-container input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    flex-grow: 1;
    font-size: 14px;
  }

  .clear-search {
    padding: 8px 12px;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .clear-search:hover {
    background-color: #e0e0e0;
  }
</style>