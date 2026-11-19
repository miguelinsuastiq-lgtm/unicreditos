import { prepararCredito, aprobarCredito } from '../support/flujo'

let datos

const abrirModalGenerar = () => {
  cy.contains('button', 'Generar pagaré').click()
  cy.contains('h3', 'Generar pagaré').should('be.visible')
}

const modalGenerar = () => cy.contains('h3', 'Generar pagaré').parent().parent().parent()

const seleccionarCredito = () => {
  modalGenerar().find('select').then(($select) => {
    const opcion = [...$select.find('option')].find((o) => o.textContent.includes(datos.nombre))
    expect(opcion, 'el crédito aparece en la lista').to.exist
    cy.wrap($select).select(opcion.value)
  })
}

describe('Pagarés - Casos de caja negra 1 y 3 (administrador)', () => {
  before(() => {
    prepararCredito().then((s) => { datos = s })
  })

  beforeEach(() => {
    cy.login('admin')
  })

  it('Caso 1: un crédito sin monto asignado no se puede seleccionar', () => {
    cy.visit('/pagares')
    abrirModalGenerar()
    cy.contains('option', 'Selecciona un crédito con monto asignado...').should('exist')
    cy.contains('option', datos.nombre).should('not.exist')
  })

  it('Caso 1: si ningún crédito tiene monto, el sistema explica qué falta', () => {
    cy.intercept('GET', /creditos\.php\?accion=todos/, {
      body: { creditos: [{ id: 1, codigo: 'CRED-SIN-MONTO', tipo: 'Matrícula', monto: null }] },
    })
    cy.visit('/pagares')
    abrirModalGenerar()
    cy.contains('No hay créditos con monto asignado todavía.').should('be.visible')
    cy.contains('Primero ve a').should('be.visible')
  })

  it('al aprobar el crédito con monto, se puede generar su pagaré', () => {
    aprobarCredito(datos)
    cy.visit('/pagares')
    abrirModalGenerar()
    seleccionarCredito()
    modalGenerar().contains('button', 'Generar pagaré').click()
    cy.contains('h3', 'Generar pagaré').should('not.exist')
    cy.get('input[placeholder="Buscar por estudiante, cédula o número..."]')
      .clear()
      .type(`${datos.nombre}{enter}`)
    cy.contains(datos.nombre).should('be.visible')
    cy.contains('Pendiente firma').should('be.visible')
  })

  it('Caso 3: no deja generar un segundo pagaré para el mismo crédito', () => {
    cy.visit('/pagares')
    abrirModalGenerar()
    seleccionarCredito()
    modalGenerar().contains('button', 'Generar pagaré').click()
    cy.contains('Ya existe un pagaré activo para este crédito.').should('be.visible')
  })
})