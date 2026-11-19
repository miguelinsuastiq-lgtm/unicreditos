const llenarFormulario = () => {
  cy.get('input[placeholder="Nombre y apellidos"]').eq(0).type('Estudiante Cypress')
  cy.get('input[placeholder="Ej: 1002345678"]').type('1002345678')
  cy.get('input[placeholder="tucorreo@ejemplo.com"]').type('cypress.codeudor@ejemplo.com')
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

describe('HU-08 - Firma del codeudor por enlace', () => {
  let rutaCodeudor

  before(() => {
    cy.visit('/solicitud')
    llenarFormulario()
    firmar()
    cy.get('input[type="checkbox"]').check()
    cy.contains('button', 'Enviar solicitud').click()
    cy.contains('¡Solicitud enviada!', { timeout: 15000 }).should('be.visible')
    cy.get('input[readonly]').invoke('val').then((enlace) => {
      rutaCodeudor = new URL(enlace).pathname
    })
  })

  it('un enlace inválido muestra un mensaje de error', () => {
    cy.visit('/firmar-codeudor/token-invalido-123')
    cy.contains('Este enlace no es válido o ya venció.').should('be.visible')
  })

  it('el enlace válido muestra los datos del estudiante y del codeudor', () => {
    cy.visit(rutaCodeudor)
    cy.contains('h1', 'Firma como codeudor').should('be.visible')
    cy.contains('Estudiante Cypress').should('be.visible')
    cy.contains('Codeudor Cypress').should('be.visible')
    cy.contains('1010234567').should('be.visible')
  })

  it('no deja confirmar sin firmar', () => {
    cy.visit(rutaCodeudor)
    cy.contains('button', 'Confirmar mi firma').click()
    cy.contains('Firma en el recuadro antes de continuar.').should('be.visible')
  })

  it('al firmar, queda registrada la firma del codeudor', () => {
    cy.visit(rutaCodeudor)
    firmar()
    cy.contains('button', 'Confirmar mi firma').click()
    cy.contains('¡Ya quedó tu firma!', { timeout: 15000 }).should('be.visible')
  })

  it('al abrir el enlace otra vez, ya aparece como firmado', () => {
    cy.visit(rutaCodeudor)
    cy.contains('¡Ya quedó tu firma!').should('be.visible')
  })
})