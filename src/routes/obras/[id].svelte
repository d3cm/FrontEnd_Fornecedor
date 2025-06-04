<script>
  import { onMount } from 'svelte';
  import { getObra_Entidade_ParametroById } from '../../api/api';
  import '../CSS/style.css';

  // Pegar o ID da URL
  let id = null;
  let obraData = null;
  let loading = true;
  let error = null;
  let selectedEntity = null;
  let activeMainTab = 'fornecedores'; // 'fornecedores', 'empreitadas', 'alugueres'
  let activeSubTab = 'table'; // 'table' ou 'details'

  // Função para extrair ID da URL
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
      // Extrair ID da URL
      id = getIdFromUrl();
      
      if (!id) {
        throw new Error('ID da obra não encontrado na URL');
      }
      
      // Carregar todos os dados da obra e entidades
      obraData = await getObra_Entidade_ParametroById(id);

      if (obraData?.entidades) {
        obraData.entidades.forEach((entidade, index) => {
          console.log(`Entidade ${index}:`, {
            id: entidade.id,
            nome: entidade.fornecedor,
            tipo: entidade.tipo,
            tipoLength: entidade.tipo?.length,
            tipoCharCodes: entidade.tipo?.split('').map(c => c.charCodeAt(0))
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
    window.location.href = '/http://localhost:1337';
  }

  // Função para formatar valores numéricos (ratings de 1-5)
  function formatRating(value) {
    return value ? `${value}/5` : 'N/A';
  }

  // Função para determinar o status do fornecedor
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

  // Função para selecionar entidade e mostrar detalhes
  function selectEntity(entity) {
    selectedEntity = entity;
    activeSubTab = 'details';
  }

  function closeDetails() {
    selectedEntity = null;
    activeSubTab = 'table';
  }

  // Função para filtrar entidades por tipo - CORRIGIDA
  function getEntitiesByType(type) {
    if (!obraData || !obraData.entidades) return [];
    
    return obraData.entidades.filter(entidade => {
      if (!entidade.tipo) return false;
      
      const tipoNormalizado = entidade.tipo.toLowerCase().trim();
      const tipoFiltro = type.toLowerCase().trim();
      
      // Mapeamento flexível de tipos
      const tipoMapping = {
        'fornecedor': ['fornecedor', 'fornecedores'],
        'empreitada': ['empreitada', 'empreitadas'],
        'aluguer': ['aluguer', 'alugueres', 'aluguel', 'aluguéis']
      };
      
      // Verifica se o tipo da entidade corresponde ao filtro
      for (const [key, values] of Object.entries(tipoMapping)) {
        if (values.includes(tipoFiltro) && values.includes(tipoNormalizado)) {
          return true;
        }
      }
      
      return tipoNormalizado === tipoFiltro;
    });
  }

  // Função para obter lista atual baseada no tipo selecionado - CORRIGIDA
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
    return entities;
  }

  // Função para obter total de entidades
  function getTotalEntidades() {
    return obraData?.entidades?.length || 0;
  }

  // Função para trocar de aba principal - MELHORADA
  function switchMainTab(tabName) {
    activeMainTab = tabName;
    activeSubTab = 'table';
    selectedEntity = null;
    
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

      <!-- Sub-abas (Tabela/Detalhes) -->
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

      <!-- Conteúdo das Abas -->
      <div class="tab-content">
        {#if getCurrentEntities().length > 0} <!--remember--> 
          <!-- Aba da Tabela -->
          {#if activeSubTab === 'table'}
            <div class="table-container">
              
              <!-- Tabela para Fornecedores -->
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

              <!-- Tabela para Empreitadas - CORRIGIDA -->
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
                        <td>{alug.contribuinte}</td>
                        <td>{alug.especialidade}</td>
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

          <!-- Aba de Detalhes -->
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
{:else}
  <div class="error-message">
    <h2>Obra não encontrada</h2>
    <p>A obra solicitada não foi encontrada ou não existe.</p>
    <button class="btn-back" on:click={voltar}>← Voltar à lista</button>
  </div>
{/if}