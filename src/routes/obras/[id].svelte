<script>
  import { onMount } from 'svelte';
  import { getObra_Entidade_ParametroById, postEntidade, getEntidades, putEntidade } from '../../api/api';
  import '../CSS/style.css'; 

  let id = null;
  let obraData = null;
  let loading = true;
  let error = null;
  let activeMainTab = 'fornecedores';
  let activeSubTab = 'table';
  let selectedExistingEntity = null;
  let showExistingEntities = false;

  let allEntidades = []; 
  let filteredEntidades = [];
  let searchTerm = '';

  let editingId = null;
  let showEditModal = false;
  let currentEntidadeType = '';
  let formData = {};
  let isSubmitting = false;
  let submitError = null;
  
  let showAddModal = false;

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

    // Lê a aba da URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['fornecedores', 'empreitadas', 'alugueres'].includes(tabParam)) {
      activeMainTab = tabParam;
    }
    
    if (!id) {
      throw new Error('ID da obra não encontrado na URL');
    }
    
    obraData = await getObra_Entidade_ParametroById(id);
    
    if (!obraData || !obraData.obra) {
      throw new Error('Obra não encontrada');
    }

    loading = false;
  } catch (err) {
    error = err.message;
    loading = false;
  }
});

onMount(() => {
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
});

function handlePopState() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  
  if (tabParam && ['fornecedores', 'empreitadas', 'alugueres'].includes(tabParam)) {
    activeMainTab = tabParam;
    loadTabData();
  }
}

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  }

  function goBack() {
    window.location.href = 'http://localhost:1337';
  }

  function calculateAverageScore(entities, type) {
  const validEntities = entities.filter(ent => {
    const status = getStatusForEntity(ent);
    return status.class !== 'eliminated';
  });

  if (validEntities.length === 0) return 0;

  const total = validEntities.reduce((sum, ent) => {
    switch(type) {
      case 'fornecedor': return sum + calculateFornecedorScore(ent);
      case 'empreitada': return sum + calculateEmpreitadaScore(ent);
      case 'aluguer': return sum + calculateAluguerScore(ent);
      default: return sum;
    }
  }, 0);

  return (total / validEntities.length).toFixed(1);
}

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

  function openEditModal(entidade) {
    editingId = entidade.id;
    currentEntidadeType = entidade.tipo;

    formData = {
      tipo: entidade.tipo,
      fornecedor: entidade.fornecedor,
      contribuinte: entidade.contribuinte || 0,
      especialidade: entidade.especialidade,
      observacoes: entidade.observacoes || '',
      id_obra: entidade.id_obra
    };

    switch(entidade.tipo) {
      case 'aluguer':
        formData = {
          ...formData,
          capacidade_resposta: entidade.parametrosAluguer?.capacidade_resposta || 1,
          qualidade_equipamento: entidade.parametrosAluguer?.qualidade_equipamento || 1,
          cumprimento_prazo: entidade.parametrosAluguer?.cumprimento_prazo || 1,
          desempenho_ambiental: entidade.parametrosAluguer?.desempenho_ambiental || 1,
          manuntencao_assistenciaTecnica: entidade.parametrosAluguer?.manuntencao_assistenciaTecnica || 1
        };
        break;
        
      case 'empreitada':
        formData = {
          ...formData,
          resposta_solitacoes: entidade.parametrosEmpreitada?.resposta_solitacoes || 1,
          respeito_normas_seguranca: entidade.parametrosEmpreitada?.respeito_normas_seguranca || 1,
          respeito_normas_ambientais: entidade.parametrosEmpreitada?.respeito_normas_ambientais || 1,
          comformidade_servico: entidade.parametrosEmpreitada?.comformidade_servico || 1,
          cumprimento_prazos: entidade.parametrosEmpreitada?.cumprimento_prazos || 1,
          capacidade_negocial: entidade.parametrosEmpreitada?.capacidade_negocial || 1,
          competencia_execucao_correcoes: entidade.parametrosEmpreitada?.competencia_execucao_correcoes || 1,
          entrega_documentacao: entidade.parametrosEmpreitada?.entrega_documentacao || 1
        };
        break;
        
      case 'fornecedor':
        formData = {
          ...formData,
          qualidade_materiais: entidade.parametrosFornecedor?.qualidade_materiais || 1,
          cumprimento_prazos: entidade.parametrosFornecedor?.cumprimento_prazos || 1,
          relacao_qualidadePreco: entidade.parametrosFornecedor?.relacao_qualidadePreco || 1,
          cumprimento_regras: entidade.parametrosFornecedor?.cumprimento_regras || 1,
          gestao_reclamacoes: entidade.parametrosFornecedor?.gestao_reclamacoes || 1
        };
        break;
    }
    
    showEditModal = true;
  }

  function closeEditModal() {
  showEditModal = false;
  formData = {};
  editingId = null;
  submitError = null;
  localStorage.removeItem('lastActiveTab');
}

  async function submitEditEntity() {
    isSubmitting = true;
    submitError = null;
    
    try {
      if (!formData.fornecedor.trim()) {
        throw new Error('Nome do fornecedor é obrigatório');
      }
      
      if (!formData.especialidade.trim()) {
        throw new Error('Especialidade é obrigatória');
      }
      
      const entityData = {
        tipo: formData.tipo,
        fornecedor: formData.fornecedor,
        contribuinte: formData.contribuinte,
        especialidade: formData.especialidade,
        observacoes: formData.observacoes,
        id_obra: formData.id_obra
      };
      
      let paramsData = {};
      switch(formData.tipo) {
        case 'aluguer':
          paramsData = {
            capacidade_resposta: formData.capacidade_resposta,
            qualidade_equipamento: formData.qualidade_equipamento,
            cumprimento_prazo: formData.cumprimento_prazo,
            desempenho_ambiental: formData.desempenho_ambiental,
            manuntencao_assistenciaTecnica: formData.manuntencao_assistenciaTecnica
          };
          break;
        case 'empreitada':
          paramsData = {
            resposta_solitacoes: formData.resposta_solitacoes,
            respeito_normas_seguranca: formData.respeito_normas_seguranca,
            respeito_normas_ambientais: formData.respeito_normas_ambientais,
            comformidade_servico: formData.comformidade_servico,
            cumprimento_prazos: formData.cumprimento_prazos,
            capacidade_negocial: formData.capacidade_negocial,
            competencia_execucao_correcoes: formData.competencia_execucao_correcoes,
            entrega_documentacao: formData.entrega_documentacao
          };
          break;
        case 'fornecedor':
          paramsData = {
            qualidade_materiais: formData.qualidade_materiais,
            cumprimento_prazos: formData.cumprimento_prazos,
            relacao_qualidadePreco: formData.relacao_qualidadePreco,
            cumprimento_regras: formData.cumprimento_regras,
            gestao_reclamacoes: formData.gestao_reclamacoes
          };
          break;
      }
      
      const dataToSend = {
        ...entityData,
        parametrosFornecedor: formData.tipo === 'fornecedor' ? paramsData : null,
        parametrosEmpreitada: formData.tipo === 'empreitada' ? paramsData : null,
        parametrosAluguer: formData.tipo === 'aluguer' ? paramsData : null
      };
      
      await putEntidade(editingId, dataToSend);
      
      
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeMainTab);
    window.location.href = url.toString();
    
  } catch (err) {
    submitError = err.message || 'Erro ao atualizar entidade';
  } finally {
    isSubmitting = false;
  }
}

  function getStatusFornecedor(fornecedor) {
    const score = calculateFornecedorScore(fornecedor);
    
    if (score <= 10) {
      return { 
        text: 'Eliminado', 
        class: 'eliminated',
        description: 'Fornecedor eliminado. É suspensa a consulta/convite a este fornecedor, até que o mesmo implemente ações corretivas que sejam aceites pela CCR, Lda'
      };
    } else if (score >= 11 && score < 15) {
      return { 
        text: 'Em Risco', 
        class: 'risk',
        description: 'Fornecedor com problemas em cumprir os requisitos estabelecidos e possível de ser eliminado da lista de fornecedores. Necessita por isso, de implementar ações de melhoria que lhe permitam ultrapassar as insuficiências apontadas'
      };
    } else if (score >= 15 && score <= 20) {
      return { 
        text: 'Bom', 
        class: 'approved',
        description: 'Fornecedor Bom - satisfaz os requisitos pretendidos.'
      };
    } else if (score >= 21 && score <= 25) {
      return { 
        text: 'Excelente', 
        class: 'excellent',
        description: 'Fornecedor Excelente - satisfaz plenamente os requisitos pretendidos e é uma referência'
      };
    }
    return { 
      text: 'Indefinido', 
      class: 'undefined',
      description: 'Classificação não disponível'
    };
  }

  function getStatusEmpreitada(empreitada) {
    const score = calculateEmpreitadaScore(empreitada);
    
    if (score <= 16) {
      return { 
        text: 'Eliminado', 
        class: 'eliminated',
        description: 'Subcontratado eliminado. É suspensa a consulta/convite a este subcontratado, até que o mesmo implemente ações corretivas que sejam aceites pela CCR, Lda'
      };
    } else if (score >= 17 && score <= 23) {
      return { 
        text: 'Em Risco', 
        class: 'risk',
        description: 'Subcontratado com problemas em cumprir os requisitos estabelecidos e possível de ser eliminado da lista de fornecedores/subcontratados. Necessita por isso, de implementar ações de melhoria que lhe permitam ultrapassar as insuficiências apontadas'
      };
    } else if (score >= 24 && score <= 32) {
      return { 
        text: 'Bom', 
        class: 'approved',
        description: 'Subcontratado Bom - satisfaz os requisitos pretendidos.'
      };
    } else if (score >= 33 && score <= 40) {
      return { 
        text: 'Excelente', 
        class: 'excellent',
        description: 'Subcontratado Excelente - satisfaz plenamente os requisitos pretendidos e é uma referência'
      };
    }
    return { 
      text: 'Indefinido', 
      class: 'undefined',
      description: 'Classificação não disponível'
    };
  }

  function getStatusAluguer(aluguer) {
    const score = calculateAluguerScore(aluguer);
    
    if (score <= 10) {
      return { 
        text: 'Eliminado', 
        class: 'eliminated',
        description: 'Fornecedor eliminado. É suspensa a consulta/convite a este fornecedor, até que o mesmo implemente ações corretivas que sejam aceites pela CCR, Lda'
      };
    } else if (score >= 11 && score < 15) {
      return { 
        text: 'Em Risco', 
        class: 'risk',
        description: 'Fornecedor com problemas em cumprir os requisitos estabelecidos e possível de ser eliminado da lista de fornecedores. Necessita por isso, de implementar ações de melhoria que lhe permitam ultrapassar as insuficiências apontadas'
      };
    } else if (score >= 15 && score <= 20) {
      return { 
        text: 'Bom', 
        class: 'approved',
        description: 'Fornecedor Bom - satisfaz os requisitos pretendidos.'
      };
    } else if (score >= 21 && score <= 25) {
      return { 
        text: 'Excelente', 
        class: 'excellent',
        description: 'Fornecedor Excelente - satisfaz plenamente os requisitos pretendidos e é uma referência'
      };
    }
    return { 
      text: 'Indefinido', 
      class: 'undefined',
      description: 'Classificação não disponível'
    };
  }

  async function loadAllEntidades() {
  try {
    const response = await getEntidades();
    if (response && Array.isArray(response)) {
      allEntidades = response;
      // Filtra apenas entidades do tipo correto
      filteredEntidades = allEntidades.filter(entidade => 
        entidade.tipo.toLowerCase() === getEntityType().toLowerCase()
      );
    } else {
      throw new Error('Resposta da API não contém um array de entidades');
    }
  } catch (err) {
    console.error('Erro ao carregar entidades:', err);
    submitError = 'Erro ao carregar entidades existentes';
    allEntidades = [];
    filteredEntidades = [];
  }
}

function filterEntidades() {
  const term = searchTerm.toLowerCase();
  
  if (!term) {
    // Se não há termo de busca, mostra todas do tipo correto
    filteredEntidades = allEntidades.filter(entidade => 
      entidade.tipo.toLowerCase() === getEntityType().toLowerCase()
    );
    return;
  }
  
  // Filtra pelo tipo E pelo termo de busca
  filteredEntidades = allEntidades.filter(entidade => 
    entidade.tipo.toLowerCase() === getEntityType().toLowerCase() && (
      entidade.fornecedor.toLowerCase().includes(term) ||
      (entidade.especialidade && entidade.especialidade.toLowerCase().includes(term)) ||
      (entidade.contribuinte && entidade.contribuinte.toString().includes(term))
    )
  );
}
  
function selectExistingEntity(entidade) {
  // Verifica se a entidade está eliminada
  const status = getStatusForEntity(entidade);
  if (status.class === 'eliminated') {
    submitError = 'Esta entidade está eliminada e não pode ser adicionada a outra obra';
    return;
  }
  if (entidade.tipo.toLowerCase() !== getEntityType().toLowerCase()) {
    submitError = `A entidade selecionada é do tipo ${entidade.tipo}, mas você está adicionando um ${getEntityType()}`;
    return;
  }

  selectedExistingEntity = entidade;
  newEntity = {
    ...newEntity,
    fornecedor: entidade.fornecedor,
    contribuinte: entidade.contribuinte,
    especialidade: entidade.especialidade,
    observacoes: entidade.observacoes || '',
    tipo: getEntityType()
  };

  function getStatusForEntity(entidade) {
  switch(entidade.tipo.toLowerCase()) {
    case 'fornecedor':
      return getStatusFornecedor(entidade);
    case 'empreitada':
      return getStatusEmpreitada(entidade);
    case 'aluguer':
      return getStatusAluguer(entidade);
    default:
      return { class: 'undefined', text: 'Indefinido' };
  }
} 

  selectedExistingEntity = entidade;
  newEntity = {
    ...newEntity,
    fornecedor: entidade.fornecedor,
    contribuinte: entidade.contribuinte,
    especialidade: entidade.especialidade,
    observacoes: entidade.observacoes || '',
    tipo: getEntityType()
  };
  
  // Copiar parâmetros se existirem
  if (entidade.parametrosFornecedor && activeMainTab === 'fornecedores') {
    newEntity.parametrosFornecedor = {...entidade.parametrosFornecedor};
  }
  if (entidade.parametrosEmpreitada && activeMainTab === 'empreitadas') {
    newEntity.parametrosEmpreitada = {...entidade.parametrosEmpreitada};
  }
  if (entidade.parametrosAluguer && activeMainTab === 'alugueres') {
    newEntity.parametrosAluguer = {...entidade.parametrosAluguer};
  }
  
  showExistingEntities = false;
}

onMount(() => {
  window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['fornecedores', 'empreitadas', 'alugueres'].includes(tabParam)) {
      activeMainTab = tabParam;
    }
  });
});

  function getEntitiesByType(type) {
    if (!obraData || !obraData.entidades) return [];
    
    return obraData.entidades.filter(entidade => {
      if (!entidade.tipo) return false;
      
      const tipoNormalizado = entidade.tipo.toLowerCase().trim();
      const tipoFiltro = type.toLowerCase().trim();
      
      const tipoMapping = {
        'fornecedor': ['fornecedor', 'fornecedores'],
        'empreitada': ['empreitada', 'empreitadas', 'empreiteiro', 'empreiteiros'],
        'aluguer': ['aluguer', 'alugueres', 'aluguel', 'aluguéis', 'alugadores', 'alugador']
      };
      
      if (tipoNormalizado === tipoFiltro) {
        return true;
      }
      
      for (const [key, values] of Object.entries(tipoMapping)) {
        if (values.includes(tipoFiltro) && values.includes(tipoNormalizado)) {
          return true;
        }
      }

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
    return entities;
  }

  async function loadTabData() {
  try {
    obraData = await getObra_Entidade_ParametroById(id);
  } catch (err) {
    console.error('Erro ao carregar dados da aba:', err);
  }
}

  function getTotalEntidades() {
    return obraData?.entidades?.length || 0;
  }

  function switchMainTab(tabName) {
  activeMainTab = tabName;
  activeSubTab = 'table';
  selectedEntity = null;

  const url = new URL(window.location.href);
  url.searchParams.set('tab', tabName);
  window.history.pushState({}, '', url);
  

  activeMainTab = tabName;
  activeSubTab = 'table';
}

  function openAddModal() {
    resetForm();
    showAddModal = true;
    loadAllEntidades();
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
    if (!newEntity.fornecedor.trim()) {
      throw new Error('Nome do fornecedor é obrigatório');
    }
    
    if (!newEntity.especialidade.trim()) {
      throw new Error('Especialidade é obrigatória');
    }
    
    await postEntidade(newEntity);
    
    // Fecha o modal
    closeAddModal();
    
    // Recarrega a página mantendo a aba ativa
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeMainTab);
    window.location.href = url.toString();
    
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
                  <th>Pontuação</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {#each getCurrentEntities() as forn (forn.id)}
                  <tr class="table-row {getStatusFornecedor(forn).class === 'eliminated' ? 'eliminated' : ''}">
                    <td>{forn.id}</td>
                    <td class="fornecedor-name">{forn.fornecedor}</td>
                    <td>{forn.contribuinte}</td>
                    <td>{forn.especialidade}</td>
                    <td class="rating">{calculateFornecedorScore(forn)}</td>
                    <td class="status-{getStatusFornecedor(forn).class}">
                      {getStatusFornecedor(forn).text}
                      {#if getStatusFornecedor(forn).class === 'eliminated'}
                        <span class="status-tooltip">🚫</span>
                      {/if}
                    </td>
                    <td class="actions-cell">
                      <div class="actions-buttons">
                        <button 
                          class="btn-details" 
                          on:click={() => window.location.href = `/obras/entidade/${forn.id}`}
                        >
                          Ver Detalhes
                        </button>
                        <button 
                          class="edit-button"
                          on:click={() => openEditModal(forn)}
                          disabled={getStatusFornecedor(forn).class === 'eliminated'}
                        >
                          Editar
                        </button>
                      </div>
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
                  <th>Pontuação</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {#each getCurrentEntities() as emp (emp.id)}
                  <tr class="table-row {getStatusEmpreitada(emp).class === 'eliminated' ? 'eliminated' : ''}">
                    <td>{emp.id}</td>
                    <td class="fornecedor-name">{emp.fornecedor}</td>
                    <td>{emp.contribuinte}</td>
                    <td>{emp.especialidade}</td>
                    <td class="rating">{calculateEmpreitadaScore(emp)}</td>
                    <td class="status-{getStatusEmpreitada(emp).class}">
                      {getStatusEmpreitada(emp).text}
                      {#if getStatusEmpreitada(emp).class === 'eliminated'}
                        <span class="status-tooltip">🚫</span>
                      {/if}
                    </td>
                    <td class="actions-cell">
                      <div class="actions-buttons">
                        <button 
                          class="btn-details" 
                          on:click={() => window.location.href = `/obras/entidade/${emp.id}`}
                        >
                          Ver Detalhes
                        </button>
                        <button 
                          class="edit-button"
                          on:click={() => openEditModal(emp)}
                          disabled={getStatusEmpreitada(emp).class === 'eliminated'}
                        >
                          Editar
                        </button>
                      </div>
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
                  <th>Pontuação</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {#each getCurrentEntities() as alug (alug.id)}
                  <tr class="table-row {getStatusAluguer(alug).class === 'eliminated' ? 'eliminated' : ''}">
                    <td>{alug.id}</td>
                    <td class="fornecedor-name">{alug.fornecedor}</td>
                    <td>{alug.contribuinte || 'N/A'}</td>
                    <td>{alug.especialidade || 'N/A'}</td>
                    <td class="rating">{calculateAluguerScore(alug)}</td>
                    <td class="status-{getStatusAluguer(alug).class}">
                      {getStatusAluguer(alug).text}
                      {#if getStatusAluguer(alug).class === 'eliminated'}
                        <span class="status-tooltip">🚫</span>
                      {/if}
                    </td>
                    <td class="actions-cell">
                      <div class="actions-buttons">
                        <button 
                          class="btn-details" 
                          on:click={() => window.location.href = `/obras/entidade/${alug.id}`}
                        >
                          Ver Detalhes
                        </button>
                        <button 
                          class="edit-button"
                          on:click={() => openEditModal(alug)}
                          disabled={getStatusAluguer(alug).class === 'eliminated'}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
          </div>
        {/if}
        {:else}
          <div class="no-data">
            <p>Nenhuma entidade do tipo "{activeMainTab}" encontrada.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  {#if showEditModal}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="modal-overlay" on:click={closeEditModal}>
      <div class="modal-content" on:click|stopPropagation>
        <div class="modal-header">
          <h3>Editar {currentEntidadeType === 'fornecedor' ? 'Fornecedor' : currentEntidadeType === 'empreitada' ? 'Empreitada' : 'Aluguer'}</h3>
          <button class="btn-close" on:click={closeEditModal}>×</button>
        </div>
        
        <div class="modal-body">
          {#if submitError}
            <div class="error-banner">
              {submitError}
            </div>
          {/if}
          
          <form on:submit|preventDefault={submitEditEntity}>
            <!-- Basic Information -->
            <div class="form-section">
              <h4>Informações Básicas</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-fornecedor">Nome *</label>
                  <input 
                    type="text" 
                    id="edit-fornecedor" 
                    bind:value={formData.fornecedor} 
                    required 
                    placeholder="Nome da entidade"
                  />
                </div>
                <div class="form-group">
                  <label for="edit-contribuinte">Contribuinte</label>
                  <input 
                    type="number" 
                    id="edit-contribuinte" 
                    bind:value={formData.contribuinte} 
                    placeholder="Número de contribuinte"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-especialidade">Especialidade *</label>
                  <input 
                    type="text" 
                    id="edit-especialidade" 
                    bind:value={formData.especialidade} 
                    required 
                    placeholder="Especialidade da entidade"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-observacoes">Observações</label>
                  <textarea 
                    id="edit-observacoes" 
                    bind:value={formData.observacoes} 
                    placeholder="Observações adicionais"
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Parameters Section -->
            <div class="form-section">
              <h4>Parâmetros de Avaliação</h4>
              
              {#if currentEntidadeType === 'fornecedor'}
                <div class="parameters-grid">
                  <div class="form-group">
                    <label for="edit-qualidade_materiais">Qualidade Materiais (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-qualidade_materiais" 
                      min="1" 
                      max="5" 
                      bind:value={formData.qualidade_materiais}
                    />
                    <span class="range-value">{formData.qualidade_materiais}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-cumprimento_prazos">Cumprimento Prazos (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-cumprimento_prazos" 
                      min="1" 
                      max="5" 
                      bind:value={formData.cumprimento_prazos}
                    />
                    <span class="range-value">{formData.cumprimento_prazos}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-relacao_qualidadePreco">Relação Qualidade/Preço (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-relacao_qualidadePreco" 
                      min="1" 
                      max="5" 
                      bind:value={formData.relacao_qualidadePreco}
                    />
                    <span class="range-value">{formData.relacao_qualidadePreco}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-cumprimento_regras">Cumprimento Regras (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-cumprimento_regras" 
                      min="1" 
                      max="5" 
                      bind:value={formData.cumprimento_regras}
                    />
                    <span class="range-value">{formData.cumprimento_regras}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-gestao_reclamacoes">Gestão Reclamações (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-gestao_reclamacoes" 
                      min="1" 
                      max="5" 
                      bind:value={formData.gestao_reclamacoes}
                    />
                    <span class="range-value">{formData.gestao_reclamacoes}</span>
                  </div>
                </div>
              {/if}

              {#if currentEntidadeType === 'empreitada'}
                <div class="parameters-grid">
                  <div class="form-group">
                    <label for="edit-resposta_solitacoes">Resposta Solicitações (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-resposta_solitacoes" 
                      min="1" 
                      max="5" 
                      bind:value={formData.resposta_solitacoes}
                    />
                    <span class="range-value">{formData.resposta_solitacoes}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-respeito_normas_seguranca">Normas Segurança (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-respeito_normas_seguranca" 
                      min="1" 
                      max="5" 
                      bind:value={formData.respeito_normas_seguranca}
                    />
                    <span class="range-value">{formData.respeito_normas_seguranca}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-respeito_normas_ambientais">Normas Ambientais (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-respeito_normas_ambientais" 
                      min="1" 
                      max="5" 
                      bind:value={formData.respeito_normas_ambientais}
                    />
                    <span class="range-value">{formData.respeito_normas_ambientais}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-comformidade_servico">Conformidade Serviço (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-comformidade_servico" 
                      min="1" 
                      max="5" 
                      bind:value={formData.comformidade_servico}
                    />
                    <span class="range-value">{formData.comformidade_servico}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-cumprimento_prazos">Cumprimento Prazos (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-cumprimento_prazos" 
                      min="1" 
                      max="5" 
                      bind:value={formData.cumprimento_prazos}
                    />
                    <span class="range-value">{formData.cumprimento_prazos}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-capacidade_negocial">Capacidade Negocial (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-capacidade_negocial" 
                      min="1" 
                      max="5" 
                      bind:value={formData.capacidade_negocial}
                    />
                    <span class="range-value">{formData.capacidade_negocial}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-competencia_execucao_correcoes">Competência Execução (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-competencia_execucao_correcoes" 
                      min="1" 
                      max="5" 
                      bind:value={formData.competencia_execucao_correcoes}
                    />
                    <span class="range-value">{formData.competencia_execucao_correcoes}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-entrega_documentacao">Entrega Documentação (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-entrega_documentacao" 
                      min="1" 
                      max="5" 
                      bind:value={formData.entrega_documentacao}
                    />
                    <span class="range-value">{formData.entrega_documentacao}</span>
                  </div>
                </div>
              {/if}

              {#if currentEntidadeType === 'aluguer'}
                <div class="parameters-grid">
                  <div class="form-group">
                    <label for="edit-capacidade_resposta">Capacidade Resposta (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-capacidade_resposta" 
                      min="1" 
                      max="5" 
                      bind:value={formData.capacidade_resposta}
                    />
                    <span class="range-value">{formData.capacidade_resposta}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-qualidade_equipamento">Qualidade Equipamento (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-qualidade_equipamento" 
                      min="1" 
                      max="5" 
                      bind:value={formData.qualidade_equipamento}
                    />
                    <span class="range-value">{formData.qualidade_equipamento}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-cumprimento_prazo">Cumprimento Prazo (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-cumprimento_prazo" 
                      min="1" 
                      max="5" 
                      bind:value={formData.cumprimento_prazo}
                    />
                    <span class="range-value">{formData.cumprimento_prazo}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-desempenho_ambiental">Desempenho Ambiental (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-desempenho_ambiental" 
                      min="1" 
                      max="5" 
                      bind:value={formData.desempenho_ambiental}
                    />
                    <span class="range-value">{formData.desempenho_ambiental}</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-manuntencao_assistenciaTecnica">Manutenção/Assist. Técnica (1-5)</label>
                    <input 
                      type="range" 
                      id="edit-manuntencao_assistenciaTecnica" 
                      min="1" 
                      max="5" 
                      bind:value={formData.manuntencao_assistenciaTecnica}
                    />
                    <span class="range-value">{formData.manuntencao_assistenciaTecnica}</span>
                  </div>
                </div>
              {/if}
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn-cancel" on:click={closeEditModal}>
            Cancelar
          </button>
          <button 
            type="button" 
            class="btn-submit" 
            on:click={submitEditEntity}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'A atualizar...' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showAddModal}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-overlay" on:click={closeAddModal}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Adicionar {activeMainTab === 'fornecedores' ? 'Fornecedor' : activeMainTab === 'empreitadas' ? 'Empreitada' : 'Aluguer'}</h3>
        <button class="btn-close" on:click={closeAddModal}>×</button>
      </div>
      

        {#if submitError}
          <div class="error-banner">
            {submitError}
          </div>
        {/if}
        
        <form on:submit|preventDefault={submitNewEntity}>
            <h4>Selecionar Entidade Existente</h4>
            <div class="search-existing">
              <div class="search-box">
                <input 
                  type="text" 
                  placeholder="Pesquisar entidades existentes..." 
                  bind:value={searchTerm}
                  on:input={filterEntidades}
                />
              </div>
              
              <!-- Tabela sempre visível -->
              <div class="existing-entities-list">
                {#if filteredEntidades.length > 0}
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Contribuinte</th>
                        <th>Especialidade</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each filteredEntidades as entidade (entidade.id)}
                        <tr>
                          <td>{entidade.fornecedor}</td>
                          <td>{entidade.contribuinte || 'N/A'}</td>
                          <td>{entidade.especialidade || 'N/A'}</td>
                          <td>
                            <button 
                              type="button" 
                              class="btn-select"
                              on:click={() => selectExistingEntity(entidade)}
                            >
                              Selecionar
                            </button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {:else}
                  <div class="no-results">
                    Nenhuma entidade do tipo "{getEntityType()}" encontrada
                    {#if searchTerm}
                      <br>para o termo "{searchTerm}"
                    {/if}
                  </div>
                {/if}
              </div>
            </div>

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

<style>
  .search-existing {
    margin-bottom: 20px;
  }
  
  .search-box {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .search-box input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .btn-toggle-list {
    padding: 0 15px;
    background: #eee;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .existing-entities-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 15px;
  }
  
  .existing-entities-list table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .existing-entities-list th, 
  .existing-entities-list td {
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    text-align: left;
  }
  
  .existing-entities-list th {
    background: #f5f5f5;
    position: sticky;
    top: 0;
  }
  
  .btn-select {
    padding: 4px 8px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
  
  .btn-select:hover {
    background: #45a049;
  }
  
  .no-results {
    padding: 10px;
    text-align: center;
    color: #666;
    border: 1px dashed #ddd;
    border-radius: 4px;
  }

  .table-row.eliminated {
  background-color: #ffebee;
}

.table-row.eliminated:hover {
  background-color: #ffcdd2;
}

.main-tab-button {
  transition: none;
}
</style>