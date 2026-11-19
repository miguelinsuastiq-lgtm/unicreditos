const unico = String(Date.now()).slice(-8)
const solicitud = {
  nombre: `Estudiante Cypress ${unico}`,
  cc: `1${unico}`,
  correo: `cypress.hu09.${unico}@ejemplo.com`,
}

const firmar = () => {
  cy.get('canvas')
    .trigger('mousedown', 40, 70)
    .trigger('mousemove', 100, 40)
    .trigger('mousemove', 160, 100)
    .trigger('mousemove', 220, 60)
    .trigger('mouseup')
}

const crearPreinscripcion = () => {
  cy.visit('/solicitud')
  cy.get('input[placeholder="Nombre y apellidos"]').eq(0).type(solicitud.nombre)
  cy.get('input[placeholder="Ej: 1002345678"]').type(solicitud.cc)
  cy.get('input[placeholder="tucorreo@ejemplo.com"]').type(solicitud.correo)
  cy.get('input[placeholder="Ej: 3201234567"]').type('3201234567')
  cy.get('input[placeholder="Dirección completa"]').eq(0).type('Calle 1 # 2-3')
  cy.get('input[placeholder="Nombre y apellidos"]').eq(1).type('Codeudor Cypress')
  cy.get('input[placeholder="Ej: 1010234567"]').type('1010234567')
  cy.get('input[placeholder="Ej: 3109876543"]').type('3109876543')
  cy.get('input[placeholder="Ej: 2800000"]').type('2800000')
  cy.get('input[placeholder="Dirección completa"]').eq(1).type('Carrera 4 # 5-6')
  firmar()
  cy.get('input[type="checkbox"]').check()
  cy.contains('button', 'Enviar solicitud').click()
  cy.contains('¡Solicitud enviada!', { timeout: 15000 }).should('be.visible')
}

const buscarSolicitud = () => {
  cy.get('input[placeholder="Buscar por nombre, cédula o correo..."]')
    .clear()
    .type(`${solicitud.correo}{enter}`)
  cy.contains('p', /^1 solicitud$/).should('be.visible')
  cy.contains(solicitud.nombre).should('be.visible')
}

const abrirDetalle = () => {
  buscarSolicitud()
  cy.contains('button', 'Ver detalle').click()
  cy.contains('h3', /Preinscripción #/).should('be.visible')
}

describe('HU-09 - Conversión de preinscripción en cuenta y crédito', () => {
  before(() => {
    crearPreinscripcion()
  })

  beforeEach(() => {
    cy.login('admin')
    cy.visit('/solicitudes')
  })

  it('muestra las solicitudes públicas con sus estadísticas', () => {
    cy.contains('h2', 'Solicitudes públicas').should('be.visible')
    cy.contains('Contactadas').should('be.visible')
    cy.contains('Descartadas').should('be.visible')
    cy.contains('Total').should('be.visible')
  })

  it('la preinscripción nueva aparece al buscarla por su correo', () => {
    buscarSolicitud()
    cy.contains('span', 'Nueva').should('be.visible')
  })

  it('el detalle muestra los datos del deudor y del codeudor', () => {
    abrirDetalle()
    cy.contains('Deudor (solicitante)').should('be.visible')
    cy.contains(solicitud.correo).should('be.visible')
    cy.contains('Codeudor Cypress').should('be.visible')
    cy.contains('1010234567').should('be.visible')
  })

  it('permite marcarla como contactada', () => {
    abrirDetalle()
    cy.contains('button', 'Marcar como contactada').click()
    cy.contains('span', 'Contactada').should('be.visible')
  })

  it('permite descartarla y volverla a Nueva', () => {
    abrirDetalle()
    cy.contains('button', /^Descartar$/).click()
    cy.contains('span', 'Descartada').should('be.visible')
    cy.contains('button', 'Ver detalle').click()
    cy.contains('button', 'Volver a Nueva').click()
    cy.contains('span', 'Nueva').should('be.visible')
  })

  it('convierte la preinscripción en cuenta y crédito', () => {
    abrirDetalle()
    cy.contains('button', 'Convertir en cuenta y crédito').click()
    cy.contains('Copia esto ahora', { timeout: 15000 }).should('be.visible')
    cy.contains('Contraseña temporal:').should('be.visible')
  })
})