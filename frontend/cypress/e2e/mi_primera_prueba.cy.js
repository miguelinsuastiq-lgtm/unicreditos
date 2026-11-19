describe('Mi primera prueba con Cypress', () => {
  it('abre una página, hace clic, escribe y valida', () => {
    cy.visit('https://example.cypress.io')
    cy.contains('type').click()
    cy.url().should('include', '/commands/actions')
    cy.get('.action-email').type('estudiante@ejemplo.com')
    cy.get('.action-email')
      .should('have.value', 'estudiante@ejemplo.com')
  })

  it('envía un formulario y comprueba el mensaje', () => {
    cy.visit('https://example.cypress.io/commands/actions')
    cy.get('.action-form')
      .find('[type="text"]')
      .type('DESCUENTO10')
    cy.get('.action-form').submit()
    cy.get('.action-form')
      .next()
      .should('contain', 'Your form has been submitted!')
  })
})