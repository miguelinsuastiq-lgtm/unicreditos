const llenarFormulario = () => {
  cy.get('input[placeholder="Nombre y apellidos"]').eq(0).type('Estudiante de Prueba')
  cy.get('input[placeholder="Ej: 1002345678"]').type('1002345678')
  cy.get('input[placeholder="tucorreo@ejemplo.com"]').type('prueba@ejemplo.com')
  cy.get('input[placeholder="Ej: 3201234567"]').type('3201234567')
  cy.get('input[placeholder="Dirección completa"]').eq(0).type('Calle 1 # 2-3')
  cy.get('input[placeholder="Nombre y apellidos"]').eq(1).type('Codeudor de Prueba')
  cy.get('input[placeholder="Ej: 1010234567"]').type('1010234567')
  cy.get('input[placeholder="Ej: 3109876543"]').type('3109876543')
  cy.get('input[placeholder="Ej: 2800000"]').type('2800000')
  cy.get('input[placeholder="Dirección completa"]').eq(1).type('Carrera 4 # 5-6')
}

const enviar = () => cy.contains('button', 'Enviar solicitud').click()

describe('HU-05 - Formulario de preinscripción', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('Solicitar mi crédito ahora').click()
  })

  it('abre el formulario desde la página de inicio', () => {
    cy.contains('h1', 'Solicita tu crédito de matrícula').should('be.visible')
  })

  it('permite elegir entre Matrícula, Brilla e ICETEX', () => {
    cy.contains('Crédito de Matrícula').should('be.visible')
    cy.contains('Crédito Brilla').should('be.visible')
    cy.contains('Crédito ICETEX').should('be.visible')
  })

  it('no deja enviar con los campos vacíos', () => {
    enviar()
    cy.contains('Completa todos los campos obligatorios.').should('be.visible')
  })

  it('rechaza un correo con formato inválido', () => {
    llenarFormulario()
    cy.get('input[placeholder="tucorreo@ejemplo.com"]').clear().type('correo@sinpunto')
    enviar()
    cy.contains('Ingresa un correo electrónico válido.').should('be.visible')
  })

  it('rechaza un ingreso del codeudor que no sea positivo', () => {
    llenarFormulario()
    cy.get('input[placeholder="Ej: 2800000"]').clear().type('0')
    enviar()
    cy.contains('El ingreso del codeudor debe ser un valor positivo.').should('be.visible')
  })

  it('exige la firma digital antes de enviar', () => {
    llenarFormulario()
    enviar()
    cy.contains('Firma en el recuadro antes de enviar').should('be.visible')
  })

  it('con Brilla pide documentos y oculta los datos del codeudor', () => {
    cy.contains('Crédito Brilla').click()
    cy.contains('Documentos para Brilla').should('be.visible')
    cy.contains('Datos del codeudor').should('not.exist')
  })

  it('con Brilla no deja enviar sin adjuntar los 3 documentos', () => {
    cy.contains('Crédito Brilla').click()
    cy.get('input[placeholder="Nombre y apellidos"]').type('Estudiante de Prueba')
    cy.get('input[placeholder="Ej: 1002345678"]').type('1002345678')
    cy.get('input[placeholder="tucorreo@ejemplo.com"]').type('prueba@ejemplo.com')
    cy.get('input[placeholder="Ej: 3201234567"]').type('3201234567')
    cy.get('input[placeholder="Dirección completa"]').type('Calle 1 # 2-3')
    enviar()
    cy.contains('Adjunta los 3 documentos').should('be.visible')
  })
})