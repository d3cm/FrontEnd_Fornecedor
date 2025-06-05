<!-- src/routes/obras/[id]/entidade/[entidadeId].svelte -->
<script>
    import { onMount } from 'svelte';
    import { getEntidadeById } from '../../api/api';
    import '../CSS/style.css';
    import { page } from '$app/stores';
  
    let entidadeData = null;
    let loading = true;
    let error = null;
    let activeMainTab = 'fornecedores'; // Será definido com base no tipo da entidade
  
    $: entidadeId = $page.params.entidadeId;
  
    onMount(async () => {
      try {
        // Carregar apenas dados da entidade
        entidadeData = await getEntidadeById(entidadeId);
        
        if (!entidadeData) {
          throw new Error('Entidade não encontrada');
        }
        
        // Definir o tipo ativo com base na entidade
        if (entidadeData.tipo) {
          const tipo = entidadeData.tipo.toLowerCase();
          if (tipo.includes('fornecedor')) activeMainTab = 'fornecedores';
          else if (tipo.includes('empreitada') || tipo.includes('empreiteiro')) activeMainTab = 'empreitadas';
          else if (tipo.includes('aluguer')) activeMainTab = 'alugueres';
        }
        
        loading = false;
      } catch (err) {
        error = err.message;
        loading = false;
      }
    });
  
    function formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-PT');
    }
  
    function voltar() {
      window.history.back();
    }
  
    // Funções de cálculo de pontuação
    function calculateFornecedorScore(fornecedor) {
      if (!fornecedor.parametrosFornecedor) return 0;
      
      const params = fornecedor.parametrosFornecedor;
      let total = 0;
      
      total += params.qualidade_materiais || 0;
      total += params.cumprimento_prazos || 0;
      total += params.relacao_qualidadePreco || 0;
      total += params.cumprimento_regras || 0;
      total += params.gestao_reclamacoes !== null ? params.gestao_reclamacoes : 3;
      
      return total;
    }
  
    function calculateEmpreitadaScore(empreitada) {
      if (!empreitada.parametrosEmpreitada) return 0;
      
      const params = empreitada.parametrosEmpreitada;
      let total = 0;
      
      total += params.resposta_solitacoes || 0;
      total += params.respeito_normas_seguranca || 0;
      total += params.respeito_normas_ambientais || 0;
      total += params.comformidade_servico || 0;
      total += params.cumprimento_prazos || 0;
      total += params.capacidade_negocial || 0;
      total += params.competencia_execucao_correcoes || 0;
      total += params.entrega_documentacao || 0;
      
      return total;
    }
  
    function calculateAluguerScore(aluguer) {
      if (!aluguer.parametrosAluguer) return 0;
      
      const params = aluguer.parametrosAluguer;
      let total = 0;
      
      total += params.capacidade_resposta || 0;
      total += params.qualidade_equipamento || 0;
      total += params.cumprimento_prazo || 0;
      total += params.desempenho_ambiental || 0;
      total += params.manuntencao_assistenciaTecnica || 0;
      
      return total;
    }
  
    // Funções de status
    function getStatusFornecedor(fornecedor) {
      const score = calculateFornecedorScore(fornecedor);
      
      if (score <= 10) return { text: 'Eliminado', class: 'eliminated', description: 'Fornecedor eliminado...' };
      else if (score >= 11 && score < 15) return { text: 'Em Risco', class: 'risk', description: 'Fornecedor com problemas...' };
      else if (score >= 15 && score <= 20) return { text: 'Bom', class: 'approved', description: 'Fornecedor Bom...' };
      else if (score >= 21 && score <= 25) return { text: 'Excelente', class: 'excellent', description: 'Fornecedor Excelente...' };
      return { text: 'Indefinido', class: 'undefined', description: 'Classificação não disponível' };
    }
  
    function getStatusEmpreitada(empreitada) {
      const score = calculateEmpreitadaScore(empreitada);
      
      if (score <= 16) return { text: 'Eliminado', class: 'eliminated', description: 'Subcontratado eliminado...' };
      else if (score >= 17 && score <= 23) return { text: 'Em Risco', class: 'risk', description: 'Subcontratado com problemas...' };
      else if (score >= 24 && score <= 32) return { text: 'Bom', class: 'approved', description: 'Subcontratado Bom...' };
      else if (score >= 33 && score <= 40) return { text: 'Excelente', class: 'excellent', description: 'Subcontratado Excelente...' };
      return { text: 'Indefinido', class: 'undefined', description: 'Classificação não disponível' };
    }
  
    function getStatusAluguer(aluguer) {
      const score = calculateAluguerScore(aluguer);
      
      if (score <= 10) return { text: 'Eliminado', class: 'eliminated', description: 'Fornecedor eliminado...' };
      else if (score >= 11 && score < 15) return { text: 'Em Risco', class: 'risk', description: 'Fornecedor com problemas...' };
      else if (score >= 15 && score <= 20) return { text: 'Bom', class: 'approved', description: 'Fornecedor Bom...' };
      else if (score >= 21 && score <= 25) return { text: 'Excelente', class: 'excellent', description: 'Fornecedor Excelente...' };
      return { text: 'Indefinido', class: 'undefined', description: 'Classificação não disponível' };
    }
  </script>
  
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregando detalhes da entidade...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <h2>Erro ao carregar dados</h2>
      <p>{error}</p>
      <button class="btn-back" on:click={voltar}>← Voltar</button>
    </div>
  {:else if entidadeData}
    <div class="obra-detail-container">
      <div class="header-section">
        <button class="btn-back" on:click={voltar}>← Voltar</button>
        <h1>
          Detalhes da Entidade
          <span>{entidadeData.fornecedor}</span>
        </h1>
        <div class="breadcrumbs">
          <span>Detalhes da Entidade</span>
        </div>
      </div>
  
      <div class="details-container">
        <div class="details-header">
          <div>
            <h3>{entidadeData.fornecedor}</h3>
            <p class="details-subtitle">ID: {entidadeData.id} | Contribuinte: {entidadeData.contribuinte}</p>
          </div>
        </div>
  
        <div class="details-content">
          <div class="details-grid">
            <div class="detail-card">
              <h4>Informações Gerais</h4>
              <div class="detail-item">
                <strong>Especialidade:</strong> {entidadeData.especialidade}
              </div>
              <div class="detail-item">
                <strong>Tipo:</strong> {entidadeData.tipo}
              </div>
              <div class="detail-item">
                <strong>Data Criação:</strong> {formatDate(entidadeData.data_criacao)}
              </div>
              <div class="detail-item">
                <strong>Classificação Total:</strong> 
                {#if activeMainTab === 'fornecedores'}
                  {calculateFornecedorScore(entidadeData)} pontos
                {:else if activeMainTab === 'empreitadas'}
                  {calculateEmpreitadaScore(entidadeData)} pontos
                {:else if activeMainTab === 'alugueres'}
                  {calculateAluguerScore(entidadeData)} pontos
                {/if}
              </div>
              <div class="detail-item">
                <strong>Status:</strong> 
                {#if activeMainTab === 'fornecedores'}
                  <span class="status-{getStatusFornecedor(entidadeData).class}">{getStatusFornecedor(entidadeData).text}</span>
                  <p class="status-description">{getStatusFornecedor(entidadeData).description}</p>
                {:else if activeMainTab === 'empreitadas'}
                  <span class="status-{getStatusEmpreitada(entidadeData).class}">{getStatusEmpreitada(entidadeData).text}</span>
                  <p class="status-description">{getStatusEmpreitada(entidadeData).description}</p>
                {:else if activeMainTab === 'alugueres'}
                  <span class="status-{getStatusAluguer(entidadeData).class}">{getStatusAluguer(entidadeData).text}</span>
                  <p class="status-description">{getStatusAluguer(entidadeData).description}</p>
                {/if}
              </div>
            </div>
  
            <div class="detail-card">
              <h4>Avaliações</h4>
              <div class="ratings-grid">
                {#if activeMainTab === 'fornecedores'}
                  <div class="rating-item">
                    <span>Qualidade Materiais:</span>
                    <span class="rating-value">{entidadeData.parametrosFornecedor?.qualidade_materiais || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Cumprimento Prazos:</span>
                    <span class="rating-value">{entidadeData.parametrosFornecedor?.cumprimento_prazos || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Relação Qualidade/Preço:</span>
                    <span class="rating-value">{entidadeData.parametrosFornecedor?.relacao_qualidadePreco || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Cumprimento Regras:</span>
                    <span class="rating-value">{entidadeData.parametrosFornecedor?.cumprimento_regras || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Gestão Reclamações:</span>
                    <span class="rating-value">
                      {entidadeData.parametrosFornecedor?.gestao_reclamacoes !== null 
                        ? `${entidadeData.parametrosFornecedor.gestao_reclamacoes}/5`
                        : '3/5 (não aplicável)'}
                    </span>
                  </div>
                {:else if activeMainTab === 'empreitadas'}
                  <div class="rating-item">
                    <span>Resposta Solicitações:</span>
                    <span class="rating-value">{entidadeData.parametrosEmpreitada?.resposta_solitacoes || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Respeito Normas Segurança:</span>
                    <span class="rating-value">{entidadeData.parametrosEmpreitada?.respeito_normas_seguranca || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Respeito Normas Ambientais:</span>
                    <span class="rating-value">{entidadeData.parametrosEmpreitada?.respeito_normas_ambientais || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Conformidade Serviço:</span>
                    <span class="rating-value">{entidadeData.parametrosEmpreitada?.comformidade_servico || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Cumprimento Prazos:</span>
                    <span class="rating-value">{entidadeData.parametrosEmpreitada?.cumprimento_prazos || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Capacidade Negocial:</span>
                    <span class="rating-value">{entidadeData.parametrosEmpreitada?.capacidade_negocial || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Competência Execução/Correções:</span>
                    <span class="rating-value">{entidadeData.parametrosEmpreitada?.competencia_execucao_correcoes || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Entrega Documentação:</span>
                    <span class="rating-value">{entidadeData.parametrosEmpreitada?.entrega_documentacao || 0}/5</span>
                  </div>
                {:else if activeMainTab === 'alugueres'}
                  <div class="rating-item">
                    <span>Capacidade Resposta:</span>
                    <span class="rating-value">{entidadeData.parametrosAluguer?.capacidade_resposta || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Qualidade Equipamento:</span>
                    <span class="rating-value">{entidadeData.parametrosAluguer?.qualidade_equipamento || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Cumprimento Prazo:</span>
                    <span class="rating-value">{entidadeData.parametrosAluguer?.cumprimento_prazo || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Desempenho Ambiental:</span>
                    <span class="rating-value">{entidadeData.parametrosAluguer?.desempenho_ambiental || 0}/5</span>
                  </div>
                  <div class="rating-item">
                    <span>Manutenção/Assistência Técnica:</span>
                    <span class="rating-value">{entidadeData.parametrosAluguer?.manuntencao_assistenciaTecnica || 0}/5</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
  
          {#if entidadeData.observacoes && entidadeData.observacoes.trim()}
            <div class="observacoes-card">
              <h4>Observações</h4>
              <div class="observacoes-content">
                {entidadeData.observacoes}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="error-message">
      <h2>Entidade não encontrada</h2>
      <p>A entidade solicitada não foi encontrada ou não existe.</p>
      <button class="btn-back" on:click={voltar}>← Voltar</button>
    </div>
  {/if}