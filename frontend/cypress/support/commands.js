Cypress.Commands.add('login', (rol) => {
  cy.env([`${rol}_codigo`, `${rol}_password`]).then((datos) => {
    const codigo = datos[`${rol}_codigo`]
    const password = datos[`${rol}_password`]

    cy.session(['login', rol], () => {
      cy.intercept('POST', '**/backend/api/auth.php*').as('auth')
      cy.visit('/login')
      cy.get('input[placeholder="Ingresa tu código o correo institucional"]').type(codigo)
      cy.get('input[placeholder="Tu contraseña"]').type(password, { log: false })
      cy.contains('button', 'Iniciar sesión').click()
      cy.wait('@auth', { timeout: 20000 }).its('response.statusCode').should('eq', 200)
      cy.contains('Verificación de seguridad', { timeout: 10000 }).should('be.visible')
      cy.task('leerCodigo2fa', codigo).then((codigo2fa) => {
        cy.get('input[placeholder="• • • • • •"]').type(codigo2fa)
      })
      cy.contains('button', 'Verificar').click()
      cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard')
    }, {
      validate() {
        cy.window().its('localStorage.token').should('exist')
      },
    })
  })
})