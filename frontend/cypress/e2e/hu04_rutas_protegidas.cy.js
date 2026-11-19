describe('HU-04 - Rutas protegidas sin sesión', () => {
  const rutasProtegidas = ['/dashboard', '/creditos', '/usuarios', '/solicitudes']

  rutasProtegidas.forEach((ruta) => {
    it(`sin iniciar sesión no se puede entrar a ${ruta}`, () => {
      cy.visit(ruta)
      cy.location('pathname').should('not.eq', ruta)
    })
  })

  it('las rutas públicas sí se pueden abrir sin sesión', () => {
    cy.visit('/solicitud')
    cy.location('pathname').should('eq', '/solicitud')
    cy.contains('h1', 'Solicita tu crédito de matrícula').should('be.visible')
  })
})