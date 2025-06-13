<script>
  import { onMount } from 'svelte';
  import { getObra_Entidade_ParametroById } from '../../../api/api';
  import '../../CSS/style.css';

  let id = null;
  let obraData = null;
  let loading = true;
  let error = null;
  
  // Tipos de entidades disponíveis
  const tiposEntidades = {
    fornecedor: 'Fornecedores',
    empreitada: 'Empreitadas',
    aluguer: 'Alugueres'
  };

  // Função para extrair ID da URL
  function getIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    const idIndex = pathParts.indexOf('finalizacao') + 1;
    if (idIndex > 0 && pathParts[idIndex]) {
      return pathParts[idIndex];
    }
    return null;
  }

  const voltar = () => {
    window.history.back();
  };

  // Formata data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  };

  // Calcula a pontuação baseada no tipo de entidade
  const calcularPontuacao = (entidade) => {
    if (entidade.tipo === 'fornecedor' && entidade.parametrosFornecedor) {
      const p = entidade.parametrosFornecedor;
      return (p.qualidade_materiais || 0) + (p.cumprimento_prazos || 0) + 
             (p.relacao_qualidadePreco || 0) + (p.cumprimento_regras || 0) + 
             (p.gestao_reclamacoes || 0);
    }
    
    if (entidade.tipo === 'empreitada' && entidade.parametrosEmpreitada) {
      const p = entidade.parametrosEmpreitada;
      return (p.resposta_solitacoes || 0) + (p.respeito_normas_seguranca || 0) +
             (p.respeito_normas_ambientais || 0) + (p.comformidade_servico || 0) +
             (p.cumprimento_prazos || 0) + (p.capacidade_negocial || 0) +
             (p.competencia_execucao_correcoes || 0) + (p.entrega_documentacao || 0);
    }
    
    if (entidade.tipo === 'aluguer' && entidade.parametrosAluguer) {
      const p = entidade.parametrosAluguer;
      return (p.capacidade_resposta || 0) + (p.qualidade_equipamento || 0) +
             (p.cumprimento_prazo || 0) + (p.desempenho_ambiental || 0) +
             (p.manuntencao_assistenciaTecnica || 0);
    }
    
    return 0;
  };

  // Determina o status baseado na pontuação e tipo
  const getStatus = (pontuacao, tipo) => {
    if (tipo === 'fornecedor' || tipo === 'aluguer') {
      if (pontuacao <= 10) return { texto: 'Eliminado', classe: 'eliminado', descricao: 'Entidade eliminada. Consulta/convite suspenso até implementação de ações corretivas.' };
      if (pontuacao < 15) return { texto: 'Em Risco', classe: 'risco', descricao: 'Entidade com problemas em cumprir requisitos. Necessita de ações de melhoria.' };
      if (pontuacao <= 20) return { texto: 'Bom', classe: 'bom', descricao: 'Entidade satisfaz os requisitos pretendidos.' };
      return { texto: 'Excelente', classe: 'excelente', descricao: 'Entidade satisfaz plenamente os requisitos e é uma referência.' };
    } else { // empreitada
      if (pontuacao <= 16) return { texto: 'Eliminado', classe: 'eliminado', descricao: 'Empreiteiro eliminado. Consulta/convite suspenso até implementação de ações corretivas.' };
      if (pontuacao <= 23) return { texto: 'Em Risco', classe: 'risco', descricao: 'Empreiteiro com problemas em cumprir requisitos. Necessita de ações de melhoria.' };
      if (pontuacao <= 32) return { texto: 'Bom', classe: 'bom', descricao: 'Empreiteiro satisfaz os requisitos pretendidos.' };
      return { texto: 'Excelente', classe: 'excelente', descricao: 'Empreiteiro satisfaz plenamente os requisitos e é uma referência.' };
    }
  };

  // Filtra entidades por tipo
  const filtrarEntidades = (tipo) => {
    if (!obraData || !obraData.entidades) return [];
    return obraData.entidades.filter(e => e.tipo === tipo);
  };

  // Calcula média de pontuação por tipo de entidade
  const calcularMedia = (tipo) => {
    const entidadesFiltradas = filtrarEntidades(tipo);
    if (entidadesFiltradas.length === 0) return 0;
    
    const total = entidadesFiltradas.reduce((sum, ent) => sum + calcularPontuacao(ent), 0);
    return (total / entidadesFiltradas.length).toFixed(1);
  };

  // Formata número de contribuinte
  const formatContribuinte = (num) => {
    if (!num) return 'N/A';
    return num.toString().replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  onMount(async () => {
    try {
      id = getIdFromUrl();
      
      if (!id) {
        throw new Error('ID da obra inválido ou não encontrado na URL');
      }

      obraData = await getObra_Entidade_ParametroById(id);

      if (!obraData || !obraData.obra) {
        throw new Error('A API não retornou dados válidos para a obra');
      }

      loading = false;
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      error = err.message || 'Erro desconhecido ao carregar os dados';
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="loading">
    <div class="spinner"></div>
    <p>Carregando dados da obra...</p>
  </div>
{:else if error}
  <div class="error-message">
    <h2>Erro ao carregar dados</h2>
    <p>{error}</p>
    <p class="debug-info">ID tentado: {id || 'Nenhum ID encontrado'}</p>
    <button class="btn-back" on:click={voltar}>← Voltar</button>
  </div>
{:else if obraData && obraData.obra}
  <div class="finalizacao-container">
    <header class="header">
      <button class="btn-back" on:click={voltar}>← Voltar</button>
      <h1>Relatório Final - {obraData.obra.nome}</h1>
      <div class="obra-info-grid">
        <div class="info-card">
          <h3>Informações da Obra</h3>
          <div class="info-item"><strong>Código:</strong> {obraData.obra.codigo || 'N/A'}</div>
          <div class="info-item"><strong>Data:</strong> {formatDate(obraData.obra.data)}</div>
          <div class="info-item"><strong>TSST:</strong> {obraData.obra.tsst || 'N/A'}</div>
          {#if obraData.obra.tsst2}
            <div class="info-item"><strong>TSST2:</strong> {obraData.obra.tsst2}</div>
          {/if}
        </div>
        
        <div class="stats-card">
          <h3>Estatísticas</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{obraData.entidades?.length || 0}</div>
              <div class="stat-label">Total Entidades</div>
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

    <main class="content">
      {#each Object.entries(tiposEntidades) as [tipo, label]}
        <section class="entidade-section">
          <div class="section-header">
            <h2>{label} ({filtrarEntidades(tipo).length})</h2>
            <div class="media-score">
              Média: {calcularMedia(tipo)} pontos
            </div>
          </div>
          
          {#if filtrarEntidades(tipo).length > 0}
            <table class="entidade-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Contribuinte</th>
                  <th>Especialidade</th>
                  <th>Observações</th>
                  <th>Pontuação</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {#each filtrarEntidades(tipo) as entidade}
                  <tr class:eliminado={getStatus(calcularPontuacao(entidade), tipo).classe === 'eliminado'}>
                    <td>{entidade.Id}</td>
                    <td>{entidade.fornecedor}</td>
                    <td>{formatContribuinte(entidade.contribuinte)}</td>
                    <td>{entidade.especialidade || 'N/A'}</td>
                    <td class="observacoes">{entidade.observacoes || 'Sem observações'}</td>
                    <td class="pontuacao">{calcularPontuacao(entidade)}</td>
                    <td class="status {getStatus(calcularPontuacao(entidade), tipo).classe}">
                      <div class="status-label">{getStatus(calcularPontuacao(entidade), tipo).texto}</div>
                      <div class="status-tooltip">{getStatus(calcularPontuacao(entidade), tipo).descricao}</div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <div class="sem-dados">
              <p>Nenhum(a) {label.toLowerCase()} encontrado(a) para esta obra</p>
            </div>
          {/if}
        </section>
      {/each}
    </main>

    <footer class="footer">
      <div class="footer-content">
        <p>Relatório gerado em {new Date().toLocaleDateString('pt-PT')} às {new Date().toLocaleTimeString('pt-PT')}</p>
        <p class="disclaimer">Este relatório foi gerado automaticamente com base nos dados registados no sistema.</p>
      </div>
    </footer>
  </div>
{:else}
  <div class="error-message">
    <h2>Obra não encontrada</h2>
    <p>Não foi possível encontrar os dados para a obra</p>
    <button class="btn-back" on:click={voltar}>← Voltar</button>
  </div>
{/if}