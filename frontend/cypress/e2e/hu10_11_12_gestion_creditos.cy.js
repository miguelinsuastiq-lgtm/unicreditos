const unico = String(Date.now()).slice(-8)
const solicitud = {
  nombre: `Deudor Cypress ${unico}`,
  cc: `1${unico}`,
  correo: `cypress.hu10.${unico}@ejemplo.com`,
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

const convertirComoAdmin = () => {
  cy.login('admin')
  cy.visit('/solicitudes')
  cy.get('input[placeholder="Buscar por nombre, cédula o correo..."]')
    .clear()
    .type(`${solicitud.correo}{enter}`)
  cy.contains('p', /^1 solicitud$/).should('be.visible')
  cy.contains('button', 'Ver detalle').click()
  cy.contains('button', 'Convertir en cuenta y crédito').click()
  cy.contains(/Copia esto ahora|Se usó una cuenta que ya existía/, { timeout: 20000 })
    .should('be.visible')
}

const buscarCredito = () => {
  cy.get('input[placeholder="Buscar por nombre, código o cédula..."]')
    .clear()
    .type(`${solicitud.nombre}{enter}`)
  cy.contains('p', /^1 registro$/).should('be.visible')
}

const gestionar = () => {
  buscarCredito()
  cy.contains('button', 'Gestionar →').click()
  cy.contains('h3', 'Gestionar crédito').should('be.visible')
}

const elegirEstado = (descripcion) => cy.contains(descripcion).click()

describe('HU-10, HU-11 y HU-12 - Gestión de créditos (administrador)', () => {
  before(() => {
    crearPreinscripcion()
    convertirComoAdmin()
  })

  beforeEach(() => {
    cy.login('admin')
    cy.visit('/creditos')
  })

  it('muestra la gestión de créditos con sus estadísticas', () => {
    cy.contains('h2', 'Gestión de créditos').should('be.visible')
    cy.contains('Por revisar').should('be.visible')
    cy.contains('Aprobados/Activos').should('be.visible')
    cy.contains('Total gestionado').should('be.visible')
  })

  it('HU-10/HU-11: el modal ofrece los estados y dice quién aprueba', () => {
    gestionar()
    cy.contains('Aprueba:').should('be.visible')
    cy.contains('Revisando documentación').should('be.visible')
    cy.contains('No procede crédito interno — se orienta a Brilla o ICETEX').should('be.visible')
    cy.contains('Crédito aprobado — habilitar PowerCampus').should('be.visible')
    cy.contains('No cumple criterios').should('be.visible')
    cy.contains('button', 'Cancelar').click()
  })

  it('HU-10: cambia el estado a En validación con una observación', () => {
    gestionar()
    elegirEstado('Revisando documentación')
    cy.get('textarea[placeholder="Notas o motivo..."]').type('Prueba automatizada con Cypress')
    cy.contains('button', 'Guardar cambios ✓').click()
    cy.contains('Crédito actualizado', { timeout: 15000 }).should('be.visible')
    cy.contains('button', 'Aceptar').click()
    cy.contains('span', 'En validación').should('be.visible')
  })

  it('HU-12: no deja aprobar sin los datos financieros', () => {
    gestionar()
    elegirEstado('Crédito aprobado — habilitar PowerCampus')
    cy.contains('Datos financieros').should('be.visible')
    cy.contains('button', 'Guardar cambios ✓').click()
    cy.contains('Completa monto, cuotas y fecha de vencimiento para este estado.').should('be.visible')
    cy.contains('button', 'Cancelar').click()
  })

  it('HU-12: aprueba con monto, cuotas y vencimiento, y calcula la cuota', () => {
    gestionar()
    elegirEstado('Crédito aprobado — habilitar PowerCampus')
    cy.get('input[placeholder="4.500.000"]').type('4500000')
    cy.get('input[type="date"]').type('2027-06-30')
    cy.contains('Valor de cada cuota:').should('contain', '375.000')
    cy.contains('button', 'Guardar cambios ✓').click()
    cy.contains('Crédito actualizado', { timeout: 15000 }).should('be.visible')
    cy.contains('button', 'Aceptar').click()
    cy.contains('span', 'Aprobado').should('be.visible')
  })

  it('HU-11: al remitir a un aliado se avisa que el trámite sale de la Universidad', () => {
    gestionar()
    elegirEstado('No procede crédito interno — se orienta a Brilla o ICETEX')
    cy.contains('Se le notificará al estudiante que debe continuar el trámite directamente con')
      .should('be.visible')
    cy.contains('button', 'Cancelar').click()
  })

  it('HU-10: el filtro Aprobados muestra el crédito aprobado', () => {
    cy.contains('button', 'Aprobados').click()
    buscarCredito()
    cy.contains('span', 'Aprobado').should('be.visible')
  })
})