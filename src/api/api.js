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
