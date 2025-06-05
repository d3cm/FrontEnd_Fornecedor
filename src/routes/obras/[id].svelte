<script>
  import { onMount } from 'svelte';
  import { getObra_Entidade_ParametroById, postEntidade } from '../../api/api';
  import '../CSS/style.css';

  const API_URL = 'http://localhost:3000/api'; // Adjust according to your API URL

  let id = null;
  let obraData = null;
  let loading = true;
  let error = null;
  let selectedEntity = null;
  let activeMainTab = 'fornecedores';
  let activeSubTab = 'table';
  
  // Modal state
  let showAddModal = false;
  let isSubmitting = false;
  let submitError = null;
  
  // Form data
  let newEntity = {
    tipo: '',
    fornecedor: '',
    contribuinte: 0,
    especialidade: '',
    observacoes: '',
    id_obra: 0,
    parametrosFornecedor: null,
    parametrosEmpreitada: null,
    parametrosAluguer: null
  };

  function getIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    const idIndex = pathParts.indexOf('obras') + 1;
    if (idIndex > 0 && pathParts[idIndex]) {
      return pathParts[idIndex];
    }
    return null;
  }

  const voltar = () => {
    window.history.back();
  }

  onMount(async () => {
    try {
      id = getIdFromUrl();
      
      if (!id) {
        throw new Error('ID da obra não encontrado na URL');
      }
      
      obraData = await getObra_Entidade_ParametroById(id);

      if (obraData?.entidades) {
        obraData.entidades.forEach((entidade, index) => {
          console.log(`Entidade ${index}:`, {
            id: entidade.id,
            nome: entidade.fornecedor,
            tipo: entidade.tipo,
            tipoLength: entidade.tipo?.length,
            tipoCharCodes: entidade.tipo?.split('').map(c => c.charCodeAt(0)),
            parametrosAluguer: entidade.parametrosAluguer,
            parametrosFornecedor: entidade.parametrosFornecedor,
            parametrosEmpreitada: entidade.parametrosEmpreitada
          });
        });
      }
      
      if (!obraData || !obraData.obra) {
        throw new Error('Obra não encontrada');
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

  function goBack() {
    window.location.href = 'http://localhost:1337';
  }

  function formatRating(value) {
    return value ? `${value}/5` : 'N/A';
  }

  function getStatusFornecedor(forn) {
    const params = forn.parametrosFornecedor;
    if (!params) {
      return { text: 'Sem Parâmetros', class: 'undefined' };
    }
    
    if (!params.forn_aprovado && !params.forn_risco) {
      return { text: 'Eliminado', class: 'eliminated' };
    } else if (!params.forn_aprovado && params.forn_risco) {
      return { text: 'Em Risco', class: 'risk' };
    } else if (params.forn_aprovado) {
      return { text: 'Aprovado', class: 'approved' };
    }
    return { text: 'Indefinido', class: 'undefined' };
  }

  function selectEntity(entity) {
    selectedEntity = entity;
    activeSubTab = 'details';
  }

  function closeDetails() {
    selectedEntity = null;
    activeSubTab = 'table';
  }

  function getEntitiesByType(type) {
    if (!obraData || !obraData.entidades) return [];
    
    return obraData.entidades.filter(entidade => {
      if (!entidade.tipo) return false;
      
      const tipoNormalizado = entidade.tipo.toLowerCase().trim();
      const tipoFiltro = type.toLowerCase().trim();
      
      // Mapeamento mais abrangente para capturar variações
      const tipoMapping = {
        'fornecedor': ['fornecedor', 'fornecedores'],
        'empreitada': ['empreitada', 'empreitadas', 'empreiteiro', 'empreiteiros'],
        'aluguer': ['aluguer', 'alugueres', 'aluguel', 'aluguéis', 'alugadores', 'alugador']
      };
      
      // Primeiro, verifica correspondência exata
      if (tipoNormalizado === tipoFiltro) {
        return true;
      }
      
      // Depois verifica o mapeamento
      for (const [key, values] of Object.entries(tipoMapping)) {
        if (values.includes(tipoFiltro) && values.includes(tipoNormalizado)) {
          return true;
        }
      }
      
      // Verifica se contém a palavra-chave
      if (tipoNormalizado.includes(tipoFiltro) || tipoFiltro.includes(tipoNormalizado)) {
        return true;
      }
      
      return false;
    });
  }

  function getCurrentEntities() {
    let entities = [];
    switch(activeMainTab) {
      case 'fornecedores': 
        entities = getEntitiesByType('fornecedor');
        break;
      case 'empreitadas': 
        entities = getEntitiesByType('empreitada');
        break;
      case 'alugueres': 
        entities = getEntitiesByType('aluguer');
        break;
      default: 
        entities = [];
    }
    console.log(`Entidades para ${activeMainTab}:`, entities);
    return entities;
  }

  function getTotalEntidades() {
    return obraData?.entidades?.length || 0;
  }

  function switchMainTab(tabName) {
    activeMainTab = tabName;
    activeSubTab = 'table';
    selectedEntity = null;
  }

  // Modal functions
  function openAddModal() {
    resetForm();
    showAddModal = true;
  }

  function closeAddModal() {
    showAddModal = false;
    resetForm();
    submitError = null;
  }

  function resetForm() {
    newEntity = {
      tipo: getEntityType(),
      fornecedor: '',
      contribuinte: 0,
      especialidade: '',
      observacoes: '',
      id_obra: parseInt(id),
      parametrosFornecedor: null,
      parametrosEmpreitada: null,
      parametrosAluguer: null
    };
    
    // Set the appropriate parameters based on active tab
    switch(activeMainTab) {
      case 'fornecedores':
        newEntity.parametrosFornecedor = {
          qualidade_materiais: 1,
          cumprimento_prazos: 1,
          relacao_qualidadePreco: 1,
          cumprimento_regras: 1,
          gestao_reclamacoes: 1,
          forn_aprovado: true,
          forn_risco: false
        };
        break;
      case 'empreitadas':
        newEntity.parametrosEmpreitada = {
          resposta_solitacoes: 1,
          respeito_normas_seguranca: 1,
          respeito_normas_ambientais: 1,
          comformidade_servico: 1,
          cumprimento_prazos: 1,
          capacidade_negocial: 1,
          competencia_execucao_correcoes: 1,
          entrega_documentacao: 1
        };
        break;
      case 'alugueres':
        newEntity.parametrosAluguer = {
          capacidade_resposta: 1,
          qualidade_equipamento: 1,
          cumprimento_prazo: 1,
          desempenho_ambiental: 1,
          manuntencao_assistenciaTecnica: 1
        };
        break;
    }
  }

  function getEntityType() {
    switch(activeMainTab) {
      case 'fornecedores': return 'fornecedor';
      case 'empreitadas': return 'empreitada';
      case 'alugueres': return 'aluguer';
      default: return '';
    }
  }

  async function submitNewEntity() {
    isSubmitting = true;
    submitError = null;
    
    try {
      // Validate required fields
      if (!newEntity.fornecedor.trim()) {
        throw new Error('Nome do fornecedor é obrigatório');
      }
      
      if (!newEntity.especialidade.trim()) {
        throw new Error('Especialidade é obrigatória');
      }

      // Call postEntidade function
      const result = await postEntidade(newEntity);
      location.reload();
      // Refresh the data
      obraData = await getObra_Entidade_ParametroById(id);
      
      closeAddModal();
      
      // Show success message (you can replace this with a toast notification)
      alert('Entidade adicionada com sucesso!');
      
    } catch (err) {
      submitError = err.message || 'Erro ao adicionar entidade';
    } finally {
      isSubmitting = false;
    }
  }
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
    <button class="btn-back" on:click={voltar}>← Voltar</button>
  </div>
{:else if obraData && obraData.obra}
  <div class="obra-detail-container">
    <div class="header-section">
      <button class="btn-back" on:click={goBack}>← Voltar às Obras</button>
      <h1>
        {obraData.obra.nome}
        {#if obraData.obra.codigo}
          <span>({obraData.obra.codigo})</span>
        {/if}
      </h1>
    </div>

    <div class="obra-info">
      <div class="info-grid">
        <div class="info-item">
          <strong>Código:</strong> {obraData.obra.codigo}
        </div>
        <div class="info-item">
          <strong>Data:</strong> {formatDate(obraData.obra.data)}
        </div>
        <div class="info-item">
          <strong>TSST:</strong> {obraData.obra.tsst}
        </div>
      </div>
    </div>

    <div class="entidades-section">
      <div class="section-header">
        <h2>Entidades Associadas ({getTotalEntidades()})</h2>
      </div>

      <div class="main-tabs">
        <button 
          class="main-tab-button {activeMainTab === 'fornecedores' ? 'active' : ''}"
          on:click={() => switchMainTab('fornecedores')}
        >
          <span class="tab-title">Fornecedores</span>
          <span class="tab-count">({getEntitiesByType('fornecedor').length})</span>
        </button>
        <button 
          class="main-tab-button {activeMainTab === 'empreitadas' ? 'active' : ''}"
          on:click={() => switchMainTab('empreitadas')}
        >
          <span class="tab-title">Empreitadas</span>
          <span class="tab-count">({getEntitiesByType('empreitada').length})</span>
        </button>
        <button 
          class="main-tab-button {activeMainTab === 'alugueres' ? 'active' : ''}"
          on:click={() => switchMainTab('alugueres')}
        >
          <span class="tab-title">Alugueres</span>
          <span class="tab-count">({getEntitiesByType('aluguer').length})</span>
        </button>
      </div>

      <div class="sub-tabs">
        <button 
          class="sub-tab-button {activeSubTab === 'table' ? 'active' : ''}"
          on:click={() => {activeSubTab = 'table'; selectedEntity = null;}}
        >
          Listagem
        </button>
        <button 
          class="sub-tab-button {activeSubTab === 'details' ? 'active' : ''}"
          on:click={() => activeSubTab = 'details'}
          disabled={!selectedEntity}
        >
          Detalhes {selectedEntity ? `- ${selectedEntity.fornecedor}` : ''}
        </button>
      </div>

      <!-- Add Entity Button -->
      <div class="action-bar">
        <button class="btn-add-entity" on:click={openAddModal}>
          + Adicionar {activeMainTab === 'fornecedores' ? 'Fornecedor' : activeMainTab === 'empreitadas' ? 'Empreitada' : 'Aluguer'}
        </button>
      </div>

      <div class="tab-content">
        {#if getCurrentEntities().length > 0}
          {#if activeSubTab === 'table'}
            <div class="table-container">
              
              {#if activeMainTab === 'fornecedores'}
                <table class="entidades-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fornecedor</th>
                      <th>Contribuinte</th>
                      <th>Especialidade</th>
                      <th>Qual. Materiais</th>
                      <th>Cumpr. Prazos</th>
                      <th>Qual./Preço</th>
                      <th>Cumpr. Regras</th>
                      <th>Gestão Recl.</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each getCurrentEntities() as forn (forn.id)}
                      <tr class="table-row">
                        <td>{forn.id}</td>
                        <td class="fornecedor-name">{forn.fornecedor}</td>
                        <td>{forn.contribuinte}</td>
                        <td>{forn.especialidade}</td>
                        <td class="rating">{formatRating(forn.parametrosFornecedor?.qualidade_materiais)}</td>
                        <td class="rating">{formatRating(forn.parametrosFornecedor?.cumprimento_prazos)}</td>
                        <td class="rating">{formatRating(forn.parametrosFornecedor?.relacao_qualidadePreco)}</td>
                        <td class="rating">{formatRating(forn.parametrosFornecedor?.cumprimento_regras)}</td>
                        <td class="rating">{formatRating(forn.parametrosFornecedor?.gestao_reclamacoes)}</td>
                        <td>
                          <span class="status-badge {getStatusFornecedor(forn).class}">
                            {getStatusFornecedor(forn).text}
                          </span>
                        </td>
                        <td>
                          <button 
                            class="btn-details"
                            on:click={() => selectEntity(forn)}
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}

              {#if activeMainTab === 'empreitadas'}
                <table class="entidades-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Contribuinte</th>
                      <th>Especialidade</th>
                      <th>Resp. Solicitações</th>
                      <th>Normas Segurança</th>
                      <th>Normas Ambientais</th>
                      <th>Conformidade</th>
                      <th>Cumpr. Prazos</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each getCurrentEntities() as emp (emp.id)}
                      <tr class="table-row">
                        <td>{emp.id}</td>
                        <td class="fornecedor-name">{emp.fornecedor}</td>
                        <td>{emp.contribuinte}</td>
                        <td>{emp.especialidade}</td>
                        <td class="rating">{formatRating(emp.parametrosEmpreitada?.resposta_solitacoes)}</td>
                        <td class="rating">{formatRating(emp.parametrosEmpreitada?.respeito_normas_seguranca)}</td>
                        <td class="rating">{formatRating(emp.parametrosEmpreitada?.respeito_normas_ambientais)}</td>
                        <td class="rating">{formatRating(emp.parametrosEmpreitada?.comformidade_servico)}</td>
                        <td class="rating">{formatRating(emp.parametrosEmpreitada?.cumprimento_prazos)}</td>
                        <td>
                          <button 
                            class="btn-details"
                            on:click={() => selectEntity(emp)}
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}

              {#if activeMainTab === 'alugueres'}
                <table class="entidades-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Contribuinte</th>
                      <th>Especialidade</th>
                      <th>Cap. Resposta</th>
                      <th>Qual. Equipamento</th>
                      <th>Cumpr. Prazo</th>
                      <th>Desemp. Ambiental</th>
                      <th>Manutenção</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each getCurrentEntities() as alug (alug.id)}
                      <tr class="table-row">
                        <td>{alug.id}</td>
                        <td class="fornecedor-name">{alug.fornecedor}</td>
                        <td>{alug.contribuinte || 'N/A'}</td>
                        <td>{alug.especialidade || 'N/A'}</td>
                        <td class="rating">{formatRating(alug.parametrosAluguer?.capacidade_resposta)}</td>
                        <td class="rating">{formatRating(alug.parametrosAluguer?.qualidade_equipamento)}</td>
                        <td class="rating">{formatRating(alug.parametrosAluguer?.cumprimento_prazo)}</td>
                        <td class="rating">{formatRating(alug.parametrosAluguer?.desempenho_ambiental)}</td>
                        <td class="rating">{formatRating(alug.parametrosAluguer?.manuntencao_assistenciaTecnica)}</td>
                        <td>
                          <button 
                            class="btn-details"
                            on:click={() => selectEntity(alug)}
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              {/if}
            </div>
          {/if}

          {#if activeSubTab === 'details' && selectedEntity}
            <div class="details-container">
              <div class="details-header">
                <div>
                  <h3>{selectedEntity.fornecedor}</h3>
                  <p class="details-subtitle">ID: {selectedEntity.id} | Contribuinte: {selectedEntity.contribuinte}</p>
                </div>
                <button class="btn-close" on:click={closeDetails}>×</button>
              </div>

              <div class="details-content">
                <div class="details-grid">
                  <div class="detail-card">
                    <h4>Informações Gerais</h4>
                    <div class="detail-item">
                      <strong>Especialidade:</strong> {selectedEntity.especialidade}
                    </div>
                    <div class="detail-item">
                      <strong>Tipo:</strong> {selectedEntity.tipo}
                    </div>
                    <div class="detail-item">
                      <strong>Data Criação:</strong> {formatDate(selectedEntity.data_criacao)}
                    </div>
                    {#if activeMainTab === 'fornecedores'}
                      <div class="detail-item">
                        <strong>Status:</strong> 
                        <span class="status-badge {getStatusFornecedor(selectedEntity).class}">
                          {getStatusFornecedor(selectedEntity).text}
                        </span>
                      </div>
                    {/if}
                  </div>

                  <div class="detail-card">
                    <h4>Avaliações</h4>
                    <div class="ratings-grid">
                      
                      {#if activeMainTab === 'fornecedores'}
                        <div class="rating-item">
                          <span>Qualidade Materiais:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosFornecedor?.qualidade_materiais)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Cumprimento Prazos:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosFornecedor?.cumprimento_prazos)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Relação Qualidade/Preço:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosFornecedor?.relacao_qualidadePreco)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Cumprimento Regras:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosFornecedor?.cumprimento_regras)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Gestão Reclamações:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosFornecedor?.gestao_reclamacoes)}</span>
                        </div>
                      
                      {:else if activeMainTab === 'empreitadas'}
                        <div class="rating-item">
                          <span>Resposta Solicitações:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosEmpreitada?.resposta_solitacoes)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Normas Segurança:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosEmpreitada?.respeito_normas_seguranca)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Normas Ambientais:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosEmpreitada?.respeito_normas_ambientais)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Conformidade Serviço:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosEmpreitada?.comformidade_servico)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Cumprimento Prazos:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosEmpreitada?.cumprimento_prazos)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Capacidade Negocial:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosEmpreitada?.capacidade_negocial)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Competência Execução:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosEmpreitada?.competencia_execucao_correcoes)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Entrega Documentação:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosEmpreitada?.entrega_documentacao)}</span>
                        </div>
                      
                      {:else if activeMainTab === 'alugueres'}
                        <div class="rating-item">
                          <span>Capacidade Resposta:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosAluguer?.capacidade_resposta)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Qualidade Equipamento:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosAluguer?.qualidade_equipamento)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Cumprimento Prazo:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosAluguer?.cumprimento_prazo)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Desempenho Ambiental:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosAluguer?.desempenho_ambiental)}</span>
                        </div>
                        <div class="rating-item">
                          <span>Manutenção/Assist. Técnica:</span>
                          <span class="rating-value">{formatRating(selectedEntity.parametrosAluguer?.manuntencao_assistenciaTecnica)}</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>

                {#if selectedEntity.observacoes && selectedEntity.observacoes.trim()}
                  <div class="observacoes-card">
                    <h4>Observações</h4>
                    <div class="observacoes-content">
                      {selectedEntity.observacoes}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {:else}
          <div class="no-data">
            <p>Nenhuma entidade do tipo "{activeMainTab}" encontrada.</p>
            <p><small>Debug: Total de entidades carregadas: {obraData?.entidades?.length || 0}</small></p>
            {#if obraData?.entidades?.length > 0}
              <div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px;">
                <strong>Tipos disponíveis:</strong>
                {#each [...new Set(obraData.entidades.map(e => e.tipo))] as tipoDisponivel}
                  <span style="margin-right: 10px; padding: 2px 6px; background: #ddd; border-radius: 2px;">
                    "{tipoDisponivel}" (length: {tipoDisponivel.length})
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Add Entity Modal -->
  {#if showAddModal}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="modal-overlay" on:click={closeAddModal}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="modal-content" on:click|stopPropagation>
        <div class="modal-header">
          <h3>Adicionar {activeMainTab === 'fornecedores' ? 'Fornecedor' : activeMainTab === 'empreitadas' ? 'Empreitada' : 'Aluguer'}</h3>
          <button class="btn-close" on:click={closeAddModal}>×</button>
        </div>
        
        <div class="modal-body">
          {#if submitError}
            <div class="error-banner">
              {submitError}
            </div>
          {/if}
          
          <form on:submit|preventDefault={submitNewEntity}>
            <!-- Basic Information -->
            <div class="form-section">
              <h4>Informações Básicas</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="fornecedor">Nome *</label>
                  <input 
                    type="text" 
                    id="fornecedor" 
                    bind:value={newEntity.fornecedor} 
                    required 
                    placeholder="Nome da entidade"
                  />
                </div>
                <div class="form-group">
                  <label for="contribuinte">Contribuinte</label>
                  <input 
                    type="number" 
                    id="contribuinte" 
                    bind:value={newEntity.contribuinte} 
                    placeholder="Número de contribuinte"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="especialidade">Especialidade *</label>
                  <input 
                    type="text" 
                    id="especialidade" 
                    bind:value={newEntity.especialidade} 
                    required 
                    placeholder="Especialidade da entidade"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="observacoes">Observações</label>
                  <textarea 
                    id="observacoes" 
                    bind:value={newEntity.observacoes} 
                    placeholder="Observações adicionais"
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Parameters Section -->
            <div class="form-section">
              <h4>Parâmetros de Avaliação</h4>
              
              {#if activeMainTab === 'fornecedores'}
                <div class="parameters-grid">
                  <div class="form-group">
                    <label for="qualidade_materiais">Qualidade Materiais (1-5)</label>
                    <input 
                      type="range" 
                      id="qualidade_materiais" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosFornecedor.qualidade_materiais}
                    />
                    <span class="range-value">{newEntity.parametrosFornecedor.qualidade_materiais}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="cumprimento_prazos">Cumprimento Prazos (1-5)</label>
                    <input 
                      type="range" 
                      id="cumprimento_prazos" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosFornecedor.cumprimento_prazos}
                    />
                    <span class="range-value">{newEntity.parametrosFornecedor.cumprimento_prazos}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="relacao_qualidadePreco">Relação Qualidade/Preço (1-5)</label>
                    <input 
                      type="range" 
                      id="relacao_qualidadePreco" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosFornecedor.relacao_qualidadePreco}
                    />
                    <span class="range-value">{newEntity.parametrosFornecedor.relacao_qualidadePreco}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="cumprimento_regras">Cumprimento Regras (1-5)</label>
                    <input 
                      type="range" 
                      id="cumprimento_regras" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosFornecedor.cumprimento_regras}
                    />
                    <span class="range-value">{newEntity.parametrosFornecedor.cumprimento_regras}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="gestao_reclamacoes">Gestão Reclamações (1-5)</label>
                    <input 
                      type="range" 
                      id="gestao_reclamacoes" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosFornecedor.gestao_reclamacoes}
                    />
                    <span class="range-value">{newEntity.parametrosFornecedor.gestao_reclamacoes}</span>
                  </div>
                </div>
                
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      bind:checked={newEntity.parametrosFornecedor.forn_aprovado}
                    />
                    Fornecedor Aprovado
                  </label>
                  
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      bind:checked={newEntity.parametrosFornecedor.forn_risco}
                    />
                    Fornecedor em Risco
                  </label>
                </div>
              {/if}

              {#if activeMainTab === 'empreitadas'}
                <div class="parameters-grid">
                  <div class="form-group">
                    <label for="resposta_solitacoes">Resposta Solicitações (1-5)</label>
                    <input 
                      type="range" 
                      id="resposta_solitacoes" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosEmpreitada.resposta_solitacoes}
                    />
                    <span class="range-value">{newEntity.parametrosEmpreitada.resposta_solitacoes}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="respeito_normas_seguranca">Normas Segurança (1-5)</label>
                    <input 
                      type="range" 
                      id="respeito_normas_seguranca" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosEmpreitada.respeito_normas_seguranca}
                    />
                    <span class="range-value">{newEntity.parametrosEmpreitada.respeito_normas_seguranca}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="respeito_normas_ambientais">Normas Ambientais (1-5)</label>
                    <input 
                      type="range" 
                      id="respeito_normas_ambientais" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosEmpreitada.respeito_normas_ambientais}
                    />
                    <span class="range-value">{newEntity.parametrosEmpreitada.respeito_normas_ambientais}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="comformidade_servico">Conformidade Serviço (1-5)</label>
                    <input 
                      type="range" 
                      id="comformidade_servico" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosEmpreitada.comformidade_servico}
                    />
                    <span class="range-value">{newEntity.parametrosEmpreitada.comformidade_servico}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="cumprimento_prazos_emp">Cumprimento Prazos (1-5)</label>
                    <input 
                      type="range" 
                      id="cumprimento_prazos_emp" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosEmpreitada.cumprimento_prazos}
                    />
                    <span class="range-value">{newEntity.parametrosEmpreitada.cumprimento_prazos}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="capacidade_negocial">Capacidade Negocial (1-5)</label>
                    <input 
                      type="range" 
                      id="capacidade_negocial" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosEmpreitada.capacidade_negocial}
                    />
                    <span class="range-value">{newEntity.parametrosEmpreitada.capacidade_negocial}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="competencia_execucao_correcoes">Competência Execução (1-5)</label>
                    <input 
                      type="range" 
                      id="competencia_execucao_correcoes" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosEmpreitada.competencia_execucao_correcoes}
                    />
                    <span class="range-value">{newEntity.parametrosEmpreitada.competencia_execucao_correcoes}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="entrega_documentacao">Entrega Documentação (1-5)</label>
                    <input 
                      type="range" 
                      id="entrega_documentacao" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosEmpreitada.entrega_documentacao}
                    />
                    <span class="range-value">{newEntity.parametrosEmpreitada.entrega_documentacao}</span>
                  </div>
                </div>
              {/if}

              {#if activeMainTab === 'alugueres'}
                <div class="parameters-grid">
                  <div class="form-group">
                    <label for="capacidade_resposta">Capacidade Resposta (1-5)</label>
                    <input 
                      type="range" 
                      id="capacidade_resposta" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosAluguer.capacidade_resposta}
                    />
                    <span class="range-value">{newEntity.parametrosAluguer.capacidade_resposta}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="qualidade_equipamento">Qualidade Equipamento (1-5)</label>
                    <input 
                      type="range" 
                      id="qualidade_equipamento" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosAluguer.qualidade_equipamento}
                    />
                    <span class="range-value">{newEntity.parametrosAluguer.qualidade_equipamento}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="cumprimento_prazo">Cumprimento Prazo (1-5)</label>
                    <input 
                      type="range" 
                      id="cumprimento_prazo" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosAluguer.cumprimento_prazo}
                    />
                    <span class="range-value">{newEntity.parametrosAluguer.cumprimento_prazo}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="desempenho_ambiental">Desempenho Ambiental (1-5)</label>
                    <input 
                      type="range" 
                      id="desempenho_ambiental" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosAluguer.desempenho_ambiental}
                    />
                    <span class="range-value">{newEntity.parametrosAluguer.desempenho_ambiental}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="manuntencao_assistenciaTecnica">Manutenção/Assist. Técnica (1-5)</label>
                    <input 
                      type="range" 
                      id="manuntencao_assistenciaTecnica" 
                      min="1" 
                      max="5" 
                      bind:value={newEntity.parametrosAluguer.manuntencao_assistenciaTecnica}
                    />
                    <span class="range-value">{newEntity.parametrosAluguer.manuntencao_assistenciaTecnica}</span>
                  </div>
                </div>
              {/if}
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn-cancel" on:click={closeAddModal}>
            Cancelar
          </button>
          <button 
            type="button" 
            class="btn-submit" 
            on:click={submitNewEntity}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'A adicionar...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="error-message">
    <h2>Obra não encontrada</h2>
    <p>A obra solicitada não foi encontrada ou não existe.</p>
    <button class="btn-back" on:click={voltar}>← Voltar à lista</button>
  </div>
{/if}