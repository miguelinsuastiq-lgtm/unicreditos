import { prepararCredito, loginEstudiante } from '../support/flujo'

let datos

const comprobante = {
  contents: Cypress.Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  ),
  fileName: 'comprobante.png',
  mimeType: 'image/png',
}

const buscarFacturas = () => {
  cy.get('input[placeholder="Buscar por estudiante, cédula, crédito o factura..."]')
    .clear()
    .type(`${datos.nombre}{enter}`)
}

const abrirFacturaEnRevision = () => {
  cy.visit('/facturacion')
  buscarFacturas()
  cy.contains('Ver facturas →').click()
  cy.contains('span', 'En revisión').closest('div[style*="border-left"]').within(() => {
    cy.contains('button', 'Ver').click()
  })
}

describe('HU-16, HU-17 y HU-18 - Facturación y pagos', () => {
  before(() => {
    prepararCredito({ aprobar: true, cuotas: true, estudiante: true }).then((s) => { datos = s })
  })

  describe('HU-16: el administrador genera las cuotas', () => {
    beforeEach(() => {
      cy.login('admin')
    })

    it('se generan 12 facturas pendientes para el estudiante', () => {
      cy.visit('/facturacion')
      buscarFacturas()
      cy.contains('p', '1 estudiante · 12 facturas').should('be.visible')
      cy.contains('12 pendientes').should('be.visible')
    })
  })

  describe('HU-17: el estudiante reporta su pago', () => {
    beforeEach(() => {
      loginEstudiante(datos.codigo, datos.clave)
    })

    it('ve sus 12 cuotas sin pagar', () => {
      cy.visit('/facturacion')
      cy.contains('0/12').should('be.visible')
    })

    it('Escenario 2: no deja reportar el pago sin referencia ni comprobante', () => {
      cy.visit('/facturacion')
      cy.contains('button', /^Pagar$/).first().click()
      cy.contains('h3', 'Reportar pago').should('be.visible')
      cy.contains('button', 'Enviar comprobante →').click()
      cy.contains('Ingresa el número de referencia real de tu comprobante.').should('be.visible')
      cy.get('input[placeholder="El que aparece en tu comprobante real"]').type('PSE-99887766')
      cy.contains('button', 'Enviar comprobante →').click()
      cy.contains('Adjunta una foto o captura de tu comprobante de pago.').should('be.visible')
    })

    it('Caso 2: reporta el pago con comprobante y la factura pasa a En revisión', () => {
      cy.visit('/facturacion')
      cy.contains('button', /^Pagar$/).first().click()
      cy.get('input[placeholder="El que aparece en tu comprobante real"]').type('PSE-99887766')
      cy.get('input[type="file"]').selectFile(comprobante, { force: true })
      cy.contains('comprobante.png').should('be.visible')
      cy.contains('button', 'Enviar comprobante →').click()
      cy.contains('¡Comprobante enviado!', { timeout: 20000 }).should('be.visible')
      cy.contains('button', 'Aceptar').click()
      cy.contains('span', 'En revisión').should('be.visible')
      cy.contains('0/12').should('be.visible')
    })
  })

  describe('HU-18: el administrador confirma el pago', () => {
    beforeEach(() => {
      cy.login('admin')
    })

    it('Caso 2: la factura aparece en Por revisar y se puede ver el comprobante', () => {
      cy.visit('/facturacion')
      cy.contains('button', 'Por revisar').click()
      buscarFacturas()
      cy.contains('Ver facturas →').should('be.visible')
      abrirFacturaEnRevision()
      cy.contains('PSE-99887766').should('be.visible')
      cy.window().then((win) => {
        cy.stub(win, 'open').as('abrir')
      })
      cy.contains('button', 'Ver comprobante').click()
      cy.get('@abrir').should('have.been.calledOnce')
    })

    it('el formulario viene pre-llenado y al confirmar la factura queda Pagada', () => {
      abrirFacturaEnRevision()
      cy.contains('button', 'Registrar pago').click()
      cy.contains('El estudiante ya reportó este pago con comprobante.').should('be.visible')
      cy.get('input[placeholder="Ej: EFC-20240615, TRF-12345..."]')
        .should('have.value', 'PSE-99887766')
      cy.contains('button', '✓ Registrar pago').click()
      cy.contains('Pago registrado correctamente', { timeout: 20000 }).should('be.visible')
      cy.contains('button', 'Aceptar').click()
      cy.contains('span', 'Pagada').should('be.visible')
    })
  })

  describe('El estudiante ve su pago confirmado', () => {
    beforeEach(() => {
      loginEstudiante(datos.codigo, datos.clave)
    })

    it('la cuota aparece como pagada: 1 de 12', () => {
      cy.visit('/facturacion')
      cy.contains('1/12').should('be.visible')
    })
  })
})