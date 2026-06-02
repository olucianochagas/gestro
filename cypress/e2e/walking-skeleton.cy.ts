describe('Walking skeleton: Identidade + Projetos', () => {
  const email = 'ana@example.com'
  const password = 'Str0ng!Pass'

  it('cadastra, entra, cria e vê um projeto', () => {
    // Cadastro
    cy.visit('/signup')
    cy.get('#name').type('Ana')
    cy.get('#email').type(email)
    cy.get('#password').type(password)
    cy.contains('button', 'Cadastrar').click()

    // Redireciona para login com aviso
    cy.url().should('include', '/login')
    cy.contains('Conta criada!')

    // Login
    cy.get('#email').type(email)
    cy.get('#password').type(password)
    cy.contains('button', 'Entrar').click()

    // Dashboard
    cy.url().should('include', '/dashboard')
    cy.contains('Olá, Ana')

    // Lista vazia
    cy.contains('Ver projetos').click()
    cy.url().should('include', '/projects')
    cy.contains('Nenhum projeto ainda')

    // Cria projeto
    cy.contains('Novo projeto').click()
    cy.get('#name').type('Gestrô Core')
    cy.get('#key').type('GES')
    cy.get('#description').type('Núcleo da plataforma')
    cy.contains('button', 'Criar projeto').click()

    // Detalhe
    cy.url().should('include', '/projects/GES')
    cy.contains('Gestrô Core')
    cy.contains('GES')

    // Aparece na lista
    cy.visit('/projects')
    cy.contains('GES — Gestrô Core')

    // Logout volta para login
    cy.visit('/dashboard')
    cy.contains('button', 'Sair').click()
    cy.url().should('include', '/login')
  })

  it('bloqueia rota protegida sem sessão (proxy)', () => {
    cy.clearCookies()
    cy.visit('/projects')
    cy.url().should('include', '/login')
  })
})
