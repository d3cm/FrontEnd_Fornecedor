<script>
  import { onMount } from 'svelte';
  import { getEntidadeId, getObra_Entidade_ParametroById, getEntidades } from '../../../api/api';
  import '../../CSS/style.css';

  let id = null;
  let entidadeData = null;
  let obraData = null;
  let loading = true;
  let error = null;
  let groupedEntities = [];

  function getIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    const idIndex = pathParts.indexOf('entidade') + 1;
    if (idIndex > 0 && pathParts[idIndex]) {
      return pathParts[idIndex];
    }
    return null;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  }

  const voltar = () => {
    window.history.back();
  }

  function calculateFornecedorScore(fornecedor) {
    if (!fornecedor.parametrosFornecedor) return 0;
    
    const params = fornecedor.parametrosFornecedor;
    let total = 0;
    
    total += params.qualidade_materiais || 0;
    total += params.cumprimento_prazos || 0;
    total += params.relacao_qualidadePreco || 0;
    total += params.cumprimento_regras || 0;
    total += params.gestao_reclamacoes || 0;
    
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

  function calculateEntityScore(entity) {
    if (!entity.tipo) return 0;
    
    const tipo = entity.tipo.toLowerCase();
    
    if (tipo.includes('fornecedor')) return calculateFornecedorScore(entity);
    if (tipo.includes('empreitada')) return calculateEmpreitadaScore(entity);
    if (tipo.includes('aluguer')) return calculateAluguerScore(entity);
    
    return 0;
  }

  function getStatusFornecedor(fornecedor) {
    const score = calculateFornecedorScore(fornecedor);
    
    if (score <= 10) return { text: 'Eliminado', class: 'eliminated' };
    if (score >= 11 && score < 15) return { text: 'Em Risco', class: 'risk' };
    if (score >= 15 && score <= 20) return { text: 'Bom', class: 'approved' };
    if (score >= 21 && score <= 25) return { text: 'Excelente', class: 'excellent' };
    return { text: 'Indefinido', class: 'undefined' };
  }

  function getStatusEmpreitada(empreitada) {
    const score = calculateEmpreitadaScore(empreitada);
    
    if (score <= 16) return { text: 'Eliminado', class: 'eliminated' };
    if (score >= 17 && score <= 23) return { text: 'Em Risco', class: 'risk' };
    if (score >= 24 && score <= 32) return { text: 'Bom', class: 'approved' };
    if (score >= 33 && score <= 40) return { text: 'Excelente', class: 'excellent' };
    return { text: 'Indefinido', class: 'undefined' };
  }

  function getStatusAluguer(aluguer) {
    const score = calculateAluguerScore(aluguer);
    
    if (score <= 10) return { text: 'Eliminado', class: 'eliminated' };
    if (score >= 11 && score < 15) return { text: 'Em Risco', class: 'risk' };
    if (score >= 15 && score <= 20) return { text: 'Bom', class: 'approved' };
    if (score >= 21 && score <= 25) return { text: 'Excelente', class: 'excellent' };
    return { text: 'Indefinido', class: 'undefined' };
  }

  function getEntityStatus(entity) {
    if (!entity.tipo) return { text: 'Indefinido', class: 'undefined' };
    
    const tipo = entity.tipo.toLowerCase();
    
    if (tipo.includes('fornecedor')) return getStatusFornecedor(entity);
    if (tipo.includes('empreitada')) return getStatusEmpreitada(entity);
    if (tipo.includes('aluguer')) return getStatusAluguer(entity);
    
    return { text: 'Indefinido', class: 'undefined' };
  }

  function getStatusByScore(score, tipo) {
    const tipoLower = tipo.toLowerCase();
    
    if (tipoLower.includes('fornecedor')) {
      if (score <= 10) return { text: 'Eliminado', class: 'eliminated' };
      if (score >= 11 && score < 15) return { text: 'Em Risco', class: 'risk' };
      if (score >= 15 && score <= 20) return { text: 'Bom', class: 'approved' };
      if (score >= 21 && score <= 25) return { text: 'Excelente', class: 'excellent' };
    } else if (tipoLower.includes('empreitada')) {
      if (score <= 16) return { text: 'Eliminado', class: 'eliminated' };
      if (score >= 17 && score <= 23) return { text: 'Em Risco', class: 'risk' };
      if (score >= 24 && score <= 32) return { text: 'Bom', class: 'approved' };
      if (score >= 33 && score <= 40) return { text: 'Excelente', class: 'excellent' };
    } else if (tipoLower.includes('aluguer')) {
      if (score <= 10) return { text: 'Eliminado', class: 'eliminated' };
      if (score >= 11 && score < 15) return { text: 'Em Risco', class: 'risk' };
      if (score >= 15 && score <= 20) return { text: 'Bom', class: 'approved' };
      if (score >= 21 && score <= 25) return { text: 'Excelente', class: 'excellent' };
    }
    
    return { text: 'Indefinido', class: 'undefined' };
  }

  async function groupEntitiesByContribuinte() {
  try {
    const allEntities = await getEntidades();
    
    // Encontra a entidade atual na lista completa
    const currentEntity = allEntities.find(e => e.id === parseInt(id));
    if (!currentEntity || !currentEntity.contribuinte) return [];
    
    // Filtra apenas entidades com o mesmo contribuinte e tipo da entidade atual
    const filteredEntities = allEntities.filter(entity => 
      entity.contribuinte === currentEntity.contribuinte && 
      entity.tipo === currentEntity.tipo
    );
    
    if (filteredEntities.length <= 1) return [];
    
    // Calcula a média apenas para este grupo específico
    const totalScore = filteredEntities.reduce((sum, entity) => {
      return sum + calculateEntityScore(entity);
    }, 0);
    
    const averageScore = Math.round(totalScore / filteredEntities.length);
    
    return [{
      contribuinte: currentEntity.contribuinte,
      tipo: currentEntity.tipo,
      fornecedor: currentEntity.fornecedor,
      entities: filteredEntities.map(entity => ({
        ...entity,
        score: calculateEntityScore(entity)
      })),
      totalScore: totalScore,
      averageScore: averageScore,
      count: filteredEntities.length
    }];
  } catch (error) {
    console.error('Erro ao agrupar entidades:', error);
    return [];
  }
}

  onMount(async () => {
    try {
      id = getIdFromUrl();
      
      if (!id) {
        throw new Error('ID da entidade não encontrado na URL');
      }
      
      // Carregar dados da entidade individual
      entidadeData = await getEntidadeId(id);
      
      if (!entidadeData) {
        throw new Error('Entidade não encontrada');
      }
      
      if (entidadeData.id_obra) {
        obraData = await getObra_Entidade_ParametroById(entidadeData.id_obra);
      }
      
      // Carregar entidades agrupadas
      groupedEntities = await groupEntitiesByContribuinte();
      
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="loading">
    <div class="spinner"></div>
    <p>Carregando dados da entidade...</p>
  </div>
{:else if error}
  <div class="error-message">
    <h2>Erro ao carregar dados</h2>
    <p>{error}</p>
    <button class="btn-back" on:click={voltar}>← Voltar</button>
  </div>
{:else if entidadeData}
  <div class="entity-detail-container">
    <div class="header-section">
      <button class="btn-back" on:click={voltar}>← Voltar</button>
      <h1>{entidadeData.fornecedor}</h1>
      <div class="entity-id">ID: {entidadeData.id}</div>
    </div>

    <!-- Informações da entidade individual -->
    <div class="entity-info-grid">
      <div class="info-card">
        <h2>Informações Básicas</h2>
        <div class="info-item">
          <strong>Tipo:</strong> {entidadeData.tipo}
        </div>
        <div class="info-item">
          <strong>Contribuinte:</strong> {entidadeData.contribuinte || 'N/A'}
        </div>
        <div class="info-item">
          <strong>Especialidade:</strong> {entidadeData.especialidade || 'N/A'}
        </div>
        <div class="info-item">
          <strong>Data Criação:</strong> {formatDate(entidadeData.data_criacao)}
        </div>
        <div class="info-item">
          <strong>Status:</strong> 
          <span class="status-{getEntityStatus(entidadeData).class}">
            {getEntityStatus(entidadeData).text}
          </span>
        </div>
      </div>

      {#if obraData && obraData.obra}
        <div class="info-card">
          <h2>Obra Associada</h2>
          <div class="info-item">
            <strong>Nome:</strong> {obraData.obra.nome}
          </div>
          <div class="info-item">
            <strong>Código:</strong> {obraData.obra.codigo || 'N/A'}
          </div>
          <div class="info-item">
            <strong>Data:</strong> {formatDate(obraData.obra.data)}
          </div>
          <div class="info-item">
            <strong>TSST:</strong> {obraData.obra.tsst || 'N/A'}
          </div>
        </div>
      {/if}
    </div>

    <!-- Parâmetros de avaliação da entidade individual -->
    <div class="parameters-section">
      <h2>Parâmetros de Avaliação</h2>
      
      {#if entidadeData.tipo && entidadeData.tipo.toLowerCase().includes('fornecedor') && entidadeData.parametrosFornecedor}
        <div class="parameters-grid">
          <div class="parameter-item">
            <span>Qualidade Materiais:</span>
            <span class="parameter-value">{entidadeData.parametrosFornecedor.qualidade_materiais}/5</span>
          </div>
          <div class="parameter-item">
            <span>Cumprimento Prazos:</span>
            <span class="parameter-value">{entidadeData.parametrosFornecedor.cumprimento_prazos}/5</span>
          </div>
          <div class="parameter-item">
            <span>Relação Qualidade/Preço:</span>
            <span class="parameter-value">{entidadeData.parametrosFornecedor.relacao_qualidadePreco}/5</span>
          </div>
          <div class="parameter-item">
            <span>Cumprimento Regras:</span>
            <span class="parameter-value">{entidadeData.parametrosFornecedor.cumprimento_regras}/5</span>
          </div>
          <div class="parameter-item">
            <span>Gestão Reclamações:</span>
            <span class="parameter-value">{entidadeData.parametrosFornecedor.gestao_reclamacoes}/5</span>
          </div>
        </div>
      
      {:else if entidadeData.tipo && entidadeData.tipo.toLowerCase().includes('empreitada') && entidadeData.parametrosEmpreitada}
        <div class="parameters-grid">
          <div class="parameter-item">
            <span>Resposta Solicitações:</span>
            <span class="parameter-value">{entidadeData.parametrosEmpreitada.resposta_solitacoes}/5</span>
          </div>
          <div class="parameter-item">
            <span>Normas Segurança:</span>
            <span class="parameter-value">{entidadeData.parametrosEmpreitada.respeito_normas_seguranca}/5</span>
          </div>
          <div class="parameter-item">
            <span>Normas Ambientais:</span>
            <span class="parameter-value">{entidadeData.parametrosEmpreitada.respeito_normas_ambientais}/5</span>
          </div>
          <div class="parameter-item">
            <span>Conformidade Serviço:</span>
            <span class="parameter-value">{entidadeData.parametrosEmpreitada.comformidade_servico}/5</span>
          </div>
          <div class="parameter-item">
            <span>Cumprimento Prazos:</span>
            <span class="parameter-value">{entidadeData.parametrosEmpreitada.cumprimento_prazos}/5</span>
          </div>
          <div class="parameter-item">
            <span>Capacidade Negocial:</span>
            <span class="parameter-value">{entidadeData.parametrosEmpreitada.capacidade_negocial}/5</span>
          </div>
          <div class="parameter-item">
            <span>Competência Execução:</span>
            <span class="parameter-value">{entidadeData.parametrosEmpreitada.competencia_execucao_correcoes}/5</span>
          </div>
          <div class="parameter-item">
            <span>Entrega Documentação:</span>
            <span class="parameter-value">{entidadeData.parametrosEmpreitada.entrega_documentacao}/5</span>
          </div>
        </div>
      
      {:else if entidadeData.tipo && entidadeData.tipo.toLowerCase().includes('aluguer') && entidadeData.parametrosAluguer}
        <div class="parameters-grid">
          <div class="parameter-item">
            <span>Capacidade Resposta:</span>
            <span class="parameter-value">{entidadeData.parametrosAluguer.capacidade_resposta}/5</span>
          </div>
          <div class="parameter-item">
            <span>Qualidade Equipamento:</span>
            <span class="parameter-value">{entidadeData.parametrosAluguer.qualidade_equipamento}/5</span>
          </div>
          <div class="parameter-item">
            <span>Cumprimento Prazo:</span>
            <span class="parameter-value">{entidadeData.parametrosAluguer.cumprimento_prazo}/5</span>
          </div>
          <div class="parameter-item">
            <span>Desempenho Ambiental:</span>
            <span class="parameter-value">{entidadeData.parametrosAluguer.desempenho_ambiental}/5</span>
          </div>
          <div class="parameter-item">
            <span>Manutenção/Assist. Técnica:</span>
            <span class="parameter-value">{entidadeData.parametrosAluguer.manuntencao_assistenciaTecnica}/5</span>
          </div>
        </div>
      {/if}
    </div>

    {#if entidadeData.observacoes && entidadeData.observacoes.trim()}
      <div class="observations-card">
        <h2>Observações</h2>
        <div class="observations-content">
          {entidadeData.observacoes}
        </div>
      </div>
    {/if}

    <!-- Seção de entidades agrupadas -->
    <!-- Seção de entidades agrupadas -->
{#if groupedEntities.length > 0}
<div class="grouped-entities-section">
  <h2>Média da nota / obra</h2>
    {#each groupedEntities as group}
      {#if group.entities.some(e => e.id === parseInt(id))}
        <div class="grouped-entity-card">
          <div class="group-header">
            <h3>{group.fornecedor}</h3>
            <div class="group-info">
              <span class="contribuinte">Contribuinte: {group.contribuinte}</span>
              <span class="tipo">Tipo: {group.tipo}</span>
              <span class="count">Entidades: {group.count}</span>
            </div>
          </div>
          
          <div class="group-stats">
            <div class="stat-item">
              <strong>Pontuação Média:</strong> 
              <span class="score-value">{group.averageScore} pontos</span>
            </div>
            <div class="stat-item">
              <strong>Status Médio:</strong>
              <span class="status-{getStatusByScore(group.averageScore, group.tipo).class}">
                {getStatusByScore(group.averageScore, group.tipo).text}
              </span>
            </div>
          </div>

          <div class="entities-list">
            <h4>Entidades do Grupo:</h4>
            {#each group.entities as entity}
              <div class="entity-item">
                <span>ID: {entity.id}</span>
                <span class="entity-score">{entity.score} pts</span>
                <span class="status-{getEntityStatus(entity).class}">
                  {getEntityStatus(entity).text}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
</div>
{/if}
  </div>
{:else}
  <div class="error-message">
    <h2>Entidade não encontrada</h2>
    <p>A entidade solicitada não foi encontrada ou não existe.</p>
    <button class="btn-back" on:click={voltar}>← Voltar</button>
  </div>
{/if}

<style>
  .entity-detail-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .header-section {
    margin-bottom: 30px;
    position: relative;
  }

  .btn-back {
    background: #0372e9;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 20px;
  }

  .btn-back:hover {
    opacity: 0.8;
  }

  .entity-id {
    color: #666;
    font-size: 0.9em;
  }

  .entity-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
  }

  .info-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .info-item {
    margin-bottom: 10px;
  }

  .parameters-section {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 20px;
  }

  .parameters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }

  .parameter-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid #eee;
  }

  .parameter-value {
    font-weight: bold;
  }

  .observations-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 30px;
  }

  .observations-content {
    margin-top: 10px;
    white-space: pre-line;
  }

  .grouped-entities-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.grouped-entities-section h2 {
  color: #333;
  margin-bottom: 15px;
}

.grouped-info {
  color: #666;
  font-style: italic;
  margin-bottom: 15px;
}

.grouped-entities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 15px;
}

  .grouped-entity-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .group-header h3 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 1.1em;
  }

  .group-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 15px;
  }

  .group-info span {
    font-size: 0.9em;
    color: #666;
  }

  .contribuinte {
    font-weight: bold;
    color: #0372e9;
  }

  .count {
    background: #e9ecef;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    width: fit-content;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .stat-item:last-child {
    margin-bottom: 0;
  }

  .score-value {
    font-weight: bold;
    color: #0372e9;
    font-size: 1.1em;
  }

  .entities-list {
    border-top: 1px solid #eee;
    padding-top: 15px;
  }

  .entities-list h4 {
    margin: 0 0 10px 0;
    font-size: 0.9em;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .entity-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 4px;
    margin-bottom: 5px;
    font-size: 0.9em;
    transition: background-color 0.2s ease;
  }

  .entity-item:hover {
    background: #e9ecef;
  }

  .entity-item:last-child {
    margin-bottom: 0;
  }

  .entity-score {
    font-weight: bold;
    color: #333;
  }

  .status-eliminated { color: #ff4444; font-weight: bold; }
  .status-risk { color: #ffbb33; font-weight: bold; }
  .status-approved { color: #00C851; font-weight: bold; }
  .status-excellent { color: #4285F4; font-weight: bold; }
  .status-undefined { color: #aaa; }

  @media (max-width: 768px) {
    

    .entity-info-grid {
      grid-template-columns: 1fr;
    }
    
    .grouped-entities-grid {
      grid-template-columns: 1fr;
    }
    
    .entity-detail-container {
      padding: 15px;
    }
    
    .grouped-entities-section {
      padding: 20px;
    }
  }
</style>