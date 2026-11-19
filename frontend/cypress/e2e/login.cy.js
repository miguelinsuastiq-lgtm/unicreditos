describe('UniCréditos - Login', () => {
  it('carga la página de inicio', () => {
    cy.visit('/')
    cy.get('body').should('be.visible')
    cy.url().should('include', 'localhost:5173')
  })

  it('muestra el título principal y el botón de iniciar sesión', () => {
    cy.visit('/')
    cy.contains('detenga tus estudios').should('be.visible')
    cy.contains('Iniciar sesión').should('be.visible')
  })

  it('al hacer clic en Iniciar sesión lleva a /login', () => {
    cy.visit('/')
    cy.contains('Iniciar sesión').click()
    cy.location('pathname').should('eq', '/login')
  })

  it('la pantalla de login muestra un formulario con campos y botón', () => {
    cy.visit('/login')
    cy.get('form').should('be.visible')
    cy.get('input').should('have.length.at.least', 2)
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('permite escribir en los campos de usuario y contraseña', () => {
    cy.visit('/login')
    cy.get('input[placeholder*="código"]').type('2024-9999')
    cy.get('input[placeholder*="código"]').should('have.value', '2024-9999')
    cy.get('input[placeholder="Tu contraseña"]').type('clave-incorrecta')
    cy.get('input[placeholder="Tu contraseña"]').should('have.value', 'clave-incorrecta')
  })

  it('con credenciales incorrectas muestra un mensaje de error', () => {
    cy.visit('/login')
    cy.get('input[placeholder*="código"]').type('2024-9999')
    cy.get('input[placeholder="Tu contraseña"]').type('clave-incorrecta')
    cy.get('button[type="submit"]').click()
    cy.contains('Código o contraseña incorrectos.').should('be.visible')
    cy.location('pathname').should('eq', '/login')
  })
})