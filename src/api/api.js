const API_URL = 'https://localhost:7172'

// ---------------------- OBRA ---------------------- //

export async function getObras() {
  const response = await fetch(`${API_URL}/Obra`)
  return await response.json()
}

export async function getObra(Id) {
  const response = await fetch(`${API_URL}/Obra/${Id}`)
  return await response.json()
}

export async function postObra(obra) {
  const response = await fetch(`${API_URL}/Obra`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(obra),
  })
  return await response.json()
}

export async function putObra(Id, data) {
  const response = await fetch(`${API_URL}/Obra/${Id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return await response.json()
}

export async function getObra_Entidade_ParametroById(Id) {
  const response = await fetch(`${API_URL}/Obra/${Id}/Entidade/Parametro`)
  return await response.json()
}

// ---------------------- ENTIDADE ---------------------- //

export async function getEntidades() {
  const response = await fetch(`${API_URL}/Entidade`)
  return await response.json()
}

export async function getEntidadeId(Id) {
  const response = await fetch(`${API_URL}/Entidade/${Id}`)
  return await response.json()
}
export async function postEntidade(entidade) {
  const response = await fetch(`${API_URL}/Entidade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entidade),
  })
  return await response.json()
}

export async function putEntidade(id, data) {
  try {
    const response = await fetch(`${API_URL}/Entidade/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const textResponse = await response.text()

    // Tentar parsear como JSON, se falhar, usar o texto direto
    try {
      const jsonResponse = textResponse ? JSON.parse(textResponse) : null

      if (!response.ok) {
        const error = new Error(jsonResponse?.message || 'Erro ao atualizar entidade')
        error.response = jsonResponse
        throw error
      }

      return jsonResponse
    } catch (e) {
      // Se não for JSON válido, criar um erro com a mensagem original
      if (!response.ok) {
        const error = new Error(textResponse || 'Erro ao atualizar entidade')
        error.response = { message: textResponse }
        throw error
      }
      return null
    }
  } catch (error) {
    console.error('Error in putEntidade:', error)
    throw error
  }
}

// ---------------------- VALIDAÇÕES ---------------------- //

export async function getValidacoes() {
  try {
    const response = await fetch(`${API_URL}/Validacoes`)
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }
    const data = await response.json()

    // Verifica se a resposta contém um array de validações
    if (!Array.isArray(data)) {
      console.error('Resposta inválida - esperado array:', data)
      return []
    }

    // Verifica se cada validação tem o campo entidade_id
    const validacoesValidas = data.filter((v) => {
      if (!v.entidade_id) {
        console.warn('Validação sem entidade_id:', v)
        return false
      }
      return true
    })

    return validacoesValidas
  } catch (error) {
    console.error('Erro em getValidacoes:', error)
    return []
  }
}

export async function getValidacaoId(Id) {
  const response = await fetch(`${API_URL}/Validacoes/${Id}`)
  return await response.json()
}

export async function postValidacao(validacao) {
  try {
    const response = await fetch(`${API_URL}/Validacoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validacao),
    })

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }

    const text = await response.text()
    return text ? JSON.parse(text) : { success: true }
  } catch (error) {
    console.error('Erro em postValidacao:', error)
    throw error
  }
}

export async function putValidacao(Id, data) {
  const response = await fetch(`${API_URL}/Validacoes/${Id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return await response.json()
}

export async function getValidacao_Entidade_ParametroById(Id) {
  try {
    console.log(`Buscando validação com ID: ${Id}`)
    const response = await fetch(`${API_URL}/Validacoes/${Id}/Entidade/Parametro`)

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`Dados recebidos para validação ${Id}:`, data)
    return data
  } catch (error) {
    console.error(`Erro ao buscar validação ${Id}:`, error)
    throw error
  }
}
