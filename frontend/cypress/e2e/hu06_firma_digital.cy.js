const firmar = () => {
  cy.get('canvas')
    .trigger('mousedown', 40, 70)
    .trigger('mousemove', 100, 40)
    .trigger('mousemove', 160, 100)
    .trigger('mousemove', 220, 60)
    .trigger('mouseup')
}

describe('HU-06 - Firma digital del estudiante', () => {
  beforeEach(() => {
    cy.visit('/solicitud')
  })

  it('muestra el recuadro de firma con su instrucción', () => {
    cy.get('canvas').should('be.visible')
    cy.contains('Firma aquí con el mouse o el dedo').should('be.visible')
  })

  it('al dibujar la firma desaparece la instrucción', () => {
    firmar()
    cy.contains('Firma aquí con el mouse o el dedo').should('not.exist')
  })

  it('"Borrar y firmar de nuevo" limpia el recuadro', () => {
    firmar()
    cy.contains('Borrar y firmar de nuevo').click()
    cy.contains('Firma aquí con el mouse o el dedo').should('be.visible')
  })
})