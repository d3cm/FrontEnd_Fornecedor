<script>
  import { onMount } from 'svelte';
  import { getObras, postObra, putObra } from '../api/api';
  import './CSS/style.css';

  let obras = [];
  let searchTerm = '';
  let showModal = false;
  let modalMode = 'create';
  let editingId = null;
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
    if (event.target.closest('.btn-edit')) {
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
