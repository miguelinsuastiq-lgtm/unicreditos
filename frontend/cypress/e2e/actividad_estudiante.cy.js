describe('Actividad estudiante', () => {
  it('escribe y valida un correo', () => {
    cy.visit('https://example.cypress.io/commands/actions')
    cy.get('.action-email').type('miguel.prueba@ejemplo.com')
    cy.get('.action-email').should('have.value', 'miguel.prueba@ejemplo.com')
  })

  it('envía un formulario y valida el mensaje', () => {
    cy.visit('https://example.cypress.io/commands/actions')
    cy.get('.action-form')
      .find('[type="text"]')
      .type('PRUEBA2026')
    cy.get('.action-form').submit()
    cy.get('.action-form')
      .next()
      .should('contain', 'Your form has been submitted!')
  })

  it('comprueba que el campo deshabilitado no se puede editar', () => {
    cy.visit('https://example.cypress.io/commands/actions')
    cy.get('.action-disabled').should('be.disabled')
  })
})