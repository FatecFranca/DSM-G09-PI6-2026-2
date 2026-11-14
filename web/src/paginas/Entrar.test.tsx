import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { cabecalhos } from '../teste/fetchFalso'
import { livro } from '../teste/fabricas'
import { caminhosChamados, comoAna, renderizarApp, usuarioAna } from '../teste/renderizar'

const DETALHE_8 = { 'GET /livros/8': { ...livro(8, 'Duna'), isbn: null, descricao: null, editora: null, avaliacao_media: null } }

async function preencherEntrada(usuario: ReturnType<typeof renderizarApp>['usuario']) {
  await usuario.type(screen.getByLabelText('E-mail'), 'ana@teste.com')
  await usuario.type(screen.getByLabelText('Senha'), '12345678')
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
}

test('mostra as abas com entrar selecionado', () => {
  renderizarApp('/entrar')
  expect(screen.getByRole('heading', { level: 1, name: 'Entrar no NextRead' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Entrar' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: 'Criar conta' })).toHaveAttribute('aria-selected', 'false')
})

test('entrar envia as credenciais e volta para o retorno pedido', async () => {
  const { usuario, chamadas } = renderizarApp('/entrar?retorno=%2Flivro%2F8', {
    ...DETALHE_8,
    'POST /auth/entrar': usuarioAna,
  })

  await preencherEntrada(usuario)

  expect(await screen.findByRole('heading', { level: 1, name: 'Duna' })).toBeInTheDocument()
  const post = chamadas.find(chamada => chamada.url === '/auth/entrar')!
  expect(post.init.body).toBe('{"email":"ana@teste.com","senha":"12345678"}')
  expect(cabecalhos(post).get('X-NextRead-Request')).toBe('1')
})

test('sem retorno vai para a biblioteca', async () => {
  const { usuario } = renderizarApp('/entrar', { 'POST /auth/entrar': usuarioAna })
  await preencherEntrada(usuario)
  expect(await screen.findByRole('heading', { level: 1, name: 'Minha biblioteca' })).toBeInTheDocument()
})

test('retorno externo e ignorado', async () => {
  const { usuario } = renderizarApp('/entrar?retorno=https%3A%2F%2Fmal.com', { 'POST /auth/entrar': usuarioAna })
  await preencherEntrada(usuario)
  expect(await screen.findByRole('heading', { level: 1, name: 'Minha biblioteca' })).toBeInTheDocument()
})

test('mostra o erro da api', async () => {
  const { usuario } = renderizarApp('/entrar', {
    'POST /auth/entrar': { status: 401, corpo: { mensagem: 'E-mail ou senha inválidos' } },
  })
  await preencherEntrada(usuario)
  expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
})

test('mostra aguarde enquanto envia', async () => {
  const { usuario } = renderizarApp('/entrar', { 'POST /auth/entrar': { status: 200, corpo: usuarioAna, atrasoMs: 80 } })
  await preencherEntrada(usuario)
  expect(screen.getByRole('button', { name: 'Aguarde...' })).toBeDisabled()
})

test('cadastro confere as senhas antes de enviar', async () => {
  const { usuario, chamadas } = renderizarApp('/entrar')
  await usuario.click(screen.getByRole('tab', { name: 'Criar conta' }))

  await usuario.type(screen.getByLabelText('Nome completo'), 'Ana Souza')
  await usuario.type(screen.getByLabelText('E-mail'), 'ana@teste.com')
  await usuario.type(screen.getByLabelText('Senha (mínimo de 8 caracteres)'), '12345678')
  await usuario.type(screen.getByLabelText('Confirme a senha'), '87654321')
  await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

  expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument()
  expect(caminhosChamados(chamadas)).not.toContain('POST /auth/cadastro')
})

test('cadastro envia nome, email e senha', async () => {
  const { usuario, chamadas } = renderizarApp('/entrar', { 'POST /auth/cadastro': usuarioAna })
  await usuario.click(screen.getByRole('tab', { name: 'Criar conta' }))

  await usuario.type(screen.getByLabelText('Nome completo'), 'Ana Souza')
  await usuario.type(screen.getByLabelText('E-mail'), 'ana@teste.com')
  await usuario.type(screen.getByLabelText('Senha (mínimo de 8 caracteres)'), '12345678')
  await usuario.type(screen.getByLabelText('Confirme a senha'), '12345678')
  await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Minha biblioteca' })).toBeInTheDocument()
  const post = chamadas.find(chamada => chamada.url === '/auth/cadastro')!
  expect(post.init.body).toBe('{"nome":"Ana Souza","email":"ana@teste.com","senha":"12345678"}')
})

test('quem ja esta logado vai direto para o destino', async () => {
  renderizarApp('/entrar', comoAna)
  expect(await screen.findByRole('heading', { level: 1, name: 'Minha biblioteca' })).toBeInTheDocument()
})

test('campos mantem os limites do formulario antigo', async () => {
  const { usuario } = renderizarApp('/entrar')
  expect(screen.getByLabelText('E-mail')).toHaveAttribute('maxlength', '255')
  expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'username')
  expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password')

  await usuario.click(screen.getByRole('tab', { name: 'Criar conta' }))
  expect(screen.getByLabelText('Nome completo')).toHaveAttribute('minlength', '2')
  expect(screen.getByLabelText('Nome completo')).toHaveAttribute('maxlength', '150')
  expect(screen.getByLabelText('Senha (mínimo de 8 caracteres)')).toHaveAttribute('minlength', '8')
  expect(screen.getByLabelText('Senha (mínimo de 8 caracteres)')).toHaveAttribute('maxlength', '100')
  expect(screen.getByLabelText('Senha (mínimo de 8 caracteres)')).toHaveAttribute('autocomplete', 'new-password')
})
