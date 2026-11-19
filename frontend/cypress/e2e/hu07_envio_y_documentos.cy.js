const llenarFormulario = () => {
  cy.get('input[placeholder="Nombre y apellidos"]').eq(0).type('Estudiante Cypress')
  cy.get('input[placeholder="Ej: 1002345678"]').type('1002345678')
  cy.get('input[placeholder="tucorreo@ejemplo.com"]').type('cypress.prueba@ejemplo.com')
  cy.get('input[placeholder="Ej: 3201234567"]').type('3201234567')
  cy.get('input[placeholder="Dirección completa"]').eq(0).type('Calle 1 # 2-3')
  cy.get('input[placeholder="Nombre y apellidos"]').eq(1).type('Codeudor Cypress')
  cy.get('input[placeholder="Ej: 1010234567"]').type('1010234567')
  cy.get('input[placeholder="Ej: 3109876543"]').type('3109876543')
  cy.get('input[placeholder="Ej: 2800000"]').type('2800000')
  cy.get('input[placeholder="Dirección completa"]').eq(1).type('Carrera 4 # 5-6')
}

const firmar = () => {
  cy.get('canvas')
    .trigger('mousedown', 40, 70)
    .trigger('mousemove', 100, 40)
    .trigger('mousemove', 160, 100)
    .trigger('mousemove', 220, 60)
    .trigger('mouseup')
}

const enviar = () => cy.contains('button', 'Enviar solicitud').click()

describe('HU-07 - Envío de la solicitud y documentos generados', () => {
  beforeEach(() => {
    cy.visit('/solicitud')
  })

  it('exige confirmar la Carta de Instrucciones antes de enviar', () => {
    llenarFormulario()
    firmar()
    enviar()
    cy.contains('Marca la casilla de confirmación de la Carta de Instrucciones antes de enviar.')
      .should('be.visible')
  })

  it('envía la solicitud y muestra los 3 documentos generados y el enlace del codeudor', () => {
    llenarFormulario()
    firmar()
    cy.get('input[type="checkbox"]').check()
    enviar()

    cy.contains('¡Solicitud enviada!', { timeout: 15000 }).should('be.visible')
    cy.contains('Solicitud de Crédito').should('be.visible')
    cy.contains('Pagaré').should('be.visible')
    cy.contains('Autorización Centrales de Riesgo').should('be.visible')
    cy.contains('Falta la firma de tu codeudor').should('be.visible')
    cy.get('input[readonly]').invoke('val').should('include', '/firmar-codeudor/')
  })
})