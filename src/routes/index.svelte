<script>
  import { onMount } from 'svelte';
  import { getObras, postObra, putObra, getObra_Entidade_ParametroById, getValidacoes } from '../api/api';
  import './CSS/style.css';

  let obras = [];
  let searchTerm = '';
  let showModal = false;
  let showValidationModal = false;
  let modalMode = 'create';
  let editingId = null;
  let validationData = {
    obra: null,
    entidades: [],
    validacoes: [],
    searchTerm: ''
  };
  let formData = {
    codigo: '',
    nome: '',
    data: '',
    tsst: ''
  };

  const searchFields = ['codigo', 'nome', 'data', 'tsst'];

  onMount(async () => {
    try {
      obras = await getObras();
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
    }
  });

  $: filteredObras = searchTerm
    ? obras.filter(obra =>
        searchFields.some(field =>
          obra[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : obras;

  $: sortedObras = filteredObras.slice().sort((a, b) => a.id - b.id);

  // Filtrar entidades no modal de validação
  $: filteredEntidades = validationData.searchTerm
    ? validationData.entidades.filter(entidade =>
        entidade.fornecedor?.toLowerCase().includes(validationData.searchTerm.toLowerCase()) ||
        entidade.tipo?.toLowerCase().includes(validationData.searchTerm.toLowerCase()) ||
        entidade.especialidade?.toLowerCase().includes(validationData.searchTerm.toLowerCase())
      )
    : validationData.entidades;

  // Calcular estatísticas de validação
  $: validationStats = (() => {
    const total = validationData.entidades.length;
    const validadas = validationData.entidades.filter(entidade => {
      return validationData.validacoes.some(validacao => 
        validacao.entidade_id === entidade.Id && validacao.validada === true
      );
    }).length;
    const faltamValidar = total - validadas;
    const percentagem = total > 0 ? Math.round((validadas / total) * 100) : 0;
    
    return {
      total,
      validadas,
      faltamValidar,
      percentagem
    };
  })();

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  }

  function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  function openCreateModal() {
    modalMode = 'create';
    editingId = null;
    formData = {
      codigo: '',
      nome: '',
      data: '',
      tsst: ''
    };
    showModal = true;
  }

  function openEditModal(obra) {
    modalMode = 'edit';
    editingId = obra.id;
    formData = {
      codigo: obra.codigo,
      nome: obra.nome,
      data: formatDateForInput(obra.data),
      tsst: obra.tsst
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingId = null;
  }

  async function openValidationModal(obra) {
    try {
      showValidationModal = true;
      validationData.obra = obra;
      validationData.searchTerm = '';
      
      // Carregar entidades da obra
      const entidadesData = await getObra_Entidade_ParametroById(obra.id);
      validationData.entidades = entidadesData || [];
      
      // Carregar todas as validações
      const todasValidacoes = await getValidacoes();
      
      // Filtrar validações relacionadas às entidades desta obra
      const entidadeIds = validationData.entidades.map(e => e.Id);
      validationData.validacoes = todasValidacoes.filter(v => 
        entidadeIds.includes(v.entidade_id)
      );
      
    } catch (error) {
      console.error('Erro ao carregar dados de validação:', error);
      validationData.entidades = [];
      validationData.validacoes = [];
    }
  }

  function closeValidationModal() {
    showValidationModal = false;
    validationData = {
      obra: null,
      entidades: [],
      validacoes: [],
      searchTerm: ''
    };
  }

  function isEntidadeValidada(entidade) {
    return validationData.validacoes.some(validacao => 
      validacao.entidade_id === entidade.Id && validacao.validada === true
    );
  }

  function getValidationStatus(entidade) {
    const validacao = validationData.validacoes.find(v => v.entidade_id === entidade.Id);
    if (!validacao) return 'Não validada';
    return validacao.validada ? 'Validada' : 'Pendente';
  }

  async function handleSubmit() {
    try {
      if (modalMode === 'create') {
        const newObra = await postObra(formData);
        obras = [...obras, newObra];
      } else if (modalMode === 'edit' && editingId) {
        const updatedObra = await putObra(editingId, formData);
        obras = obras.map(obra => 
          obra.id === editingId ? { ...obra, ...updatedObra } : obra
        );
      }
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
    }
  }

  function handleRowClick(obra, event) {
    if (event.target.closest('.btn-edit') || event.target.closest('.btn-validation')) {
      return;
    }
    window.open(`/obras/${obra.id}`, "_self");
  }
</script>

<div class="container">
  <div class="list-section">
    <div class="header-controls">
      <h2>Lista de Obras</h2>
      <button class="btn-primary" on:click={openCreateModal}>
        Nova Obra
      </button>
    </div>
    
    <div class="search-box">
      <input 
        type="text" 
        bind:value={searchTerm} 
        placeholder="Pesquisar por código, nome ou data..." 
      />
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Código</th>
          <th>Nome</th>
          <th>Data</th>
          <th>TSST</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedObras as obra}
          <tr class="clickable-row" on:click={(e) => handleRowClick(obra, e)}>
            <td>{obra.id}</td>
            <td>{obra.codigo}</td>
            <td>{obra.nome}</td>
            <td>{formatDate(obra.data)}</td>
            <td>{obra.tsst}</td>
            <td>
              <button 
                class="btn-validation" 
                on:click|stopPropagation={() => openValidationModal(obra)}
                title="Ver validações"
              >
                📊
              </button>
              <button 
                class="btn-edit" 
                on:click|stopPropagation={() => openEditModal(obra)}
                title="Editar obra"
              >
                ✏️
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={closeModal}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{modalMode === 'create' ? 'Nova Obra' : 'Editar Obra'}</h3>
        <button class="btn-close" on:click={closeModal}>&times;</button>
      </div>
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label for="codigo">Código:</label>
          <input 
            type="text" 
            id="codigo"
            bind:value={formData.codigo} 
            required 
          />
        </div>
        
        <div class="form-group">
          <label for="nome">Nome:</label>
          <input 
            type="text" 
            id="nome"
            bind:value={formData.nome} 
            required 
          />
        </div>
        
        <div class="form-group">
          <label for="data">Data:</label>
          <input 
            type="date" 
            id="data"
            bind:value={formData.data} 
            required 
          />
        </div>
        
        <div class="form-group">
          <label for="tsst">TSST:</label>
          <input 
            type="text" 
            id="tsst"
            bind:value={formData.tsst} 
            required 
          />
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn-secondary" on:click={closeModal}>
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            {modalMode === 'create' ? 'Criar' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showValidationModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={closeValidationModal}>
    <div class="modal validation-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Validações - {validationData.obra?.nome}</h3>
        <button class="btn-close" on:click={closeValidationModal}>&times;</button>
      </div>
      
      <div class="validation-stats">
        <div class="stats-grid">
          <div class="stat-card total">
            <h4>Total de Entidades</h4>
            <span class="stat-number">{validationStats.total}</span>
          </div>
          <div class="stat-card validated">
            <h4>Validadas</h4>
            <span class="stat-number">{validationStats.validadas}</span>
          </div>
          <div class="stat-card pending">
            <h4>Faltam Validar</h4>
            <span class="stat-number">{validationStats.faltamValidar}</span>
          </div>
          <div class="stat-card percentage">
            <h4>Conclusão</h4>
            <span class="stat-number">{validationStats.percentagem}%</span>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: {validationStats.percentagem}%"></div>
        </div>
      </div>
      
      <div class="search-box">
        <input 
          type="text" 
          bind:value={validationData.searchTerm} 
          placeholder="Pesquisar por fornecedor, tipo ou especialidade..." 
        />
      </div>
      
      <div class="entities-list">
        {#if filteredEntidades.length === 0}
          <p class="no-entities">Nenhuma entidade encontrada</p>
        {:else}
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fornecedor</th>
                <th>Tipo</th>
                <th>Especialidade</th>
                <th>Contribuinte</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredEntidades as entidade}
                <tr class={isEntidadeValidada(entidade) ? 'validated' : 'pending'}>
                  <td>{entidade.Id}</td>
                  <td>{entidade.fornecedor || 'N/A'}</td>
                  <td>{entidade.tipo || 'N/A'}</td>
                  <td>{entidade.especialidade || 'N/A'}</td>
                  <td>{entidade.contribuinte || 'N/A'}</td>
                  <td>
                    <span class="status-badge {isEntidadeValidada(entidade) ? 'validated' : 'pending'}">
                      {getValidationStatus(entidade)}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .btn-validation {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 5px;
    cursor: pointer;
    margin-right: 5px;
    font-size: 14px;
  }

  .btn-validation:hover {
    background: #45a049;
  }

  .validation-modal {
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .validation-stats {
    margin-bottom: 20px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
    margin-bottom: 15px;
  }

  .stat-card {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    border-left: 4px solid #ddd;
  }

  .stat-card.total {
    border-left-color: #6c757d;
  }

  .stat-card.validated {
    border-left-color: #28a745;
  }

  .stat-card.pending {
    border-left-color: #ffc107;
  }

  .stat-card.percentage {
    border-left-color: #007bff;
  }

  .stat-card h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  .stat-number {
    font-size: 24px;
    font-weight: bold;
    color: #333;
  }

  .progress-bar {
    background: #e9ecef;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    background: linear-gradient(90deg, #28a745, #20c997);
    height: 100%;
    transition: width 0.3s ease;
  }

  .entities-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 5px;
  }

  .entities-list table {
    width: 100%;
    margin: 0;
  }

  .entities-list tr.validated {
    background: #f8fff9;
  }

  .entities-list tr.pending {
    background: #fff9f0;
  }

  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .status-badge.validated {
    background: #d4edda;
    color: #155724;
  }

  .status-badge.pending {
    background: #fff3cd;
    color: #856404;
  }

  .no-entities {
    text-align: center;
    padding: 40px;
    color: #666;
    font-style: italic;
  }
</style>