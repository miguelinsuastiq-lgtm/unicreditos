const campoCodigo = 'input[placeholder="Ingresa tu código o correo institucional"]'
const campoPassword = 'input[placeholder="Tu contraseña"]'
const campo2fa = 'input[placeholder="• • • • • •"]'

const hastaPaso2 = (rol) => {
  cy.env([`${rol}_codigo`, `${rol}_password`]).then((datos) => {
    cy.visit('/login')
    cy.get(campoCodigo).type(datos[`${rol}_codigo`])
    cy.get(campoPassword).type(datos[`${rol}_password`], { log: false })
    cy.contains('button', 'Iniciar sesión').click()
    cy.contains('Verificación de seguridad').should('be.visible')
  })
}

const escribirCodigoCorrecto = (rol) => {
  cy.env([`${rol}_codigo`]).then((datos) => {
    cy.task('leerCodigo2fa', datos[`${rol}_codigo`]).then((codigo2fa) => {
      cy.get(campo2fa).type(codigo2fa)
    })
  })
}

describe('HU-03 - Inicio de sesión con verificación en dos pasos', () => {
  it('con credenciales correctas pasa al paso 2 de verificación', () => {
    hastaPaso2('estudiante')
    cy.get(campo2fa).should('be.visible')
  })

  it('el código debe tener 6 dígitos', () => {
    hastaPaso2('estudiante')
    cy.get(campo2fa).type('123')
    cy.contains('button', 'Verificar').click()
    cy.contains('El código debe tener 6 dígitos.').should('be.visible')
  })

  it('un código incorrecto no deja entrar', () => {
    hastaPaso2('estudiante')
    cy.get(campo2fa).type('000000')
    cy.contains('button', 'Verificar').click()
    cy.location('pathname').should('eq', '/login')
    cy.get(campo2fa).should('be.visible')
  })

  it('el botón Volver regresa al paso de credenciales', () => {
    hastaPaso2('estudiante')
    cy.contains('← Volver').click()
    cy.contains('button', 'Iniciar sesión').should('be.visible')
  })

  it('el estudiante entra al dashboard con el código correcto', () => {
    hastaPaso2('estudiante')
    escribirCodigoCorrecto('estudiante')
    cy.contains('button', 'Verificar').click()
    cy.location('pathname').should('eq', '/dashboard')
  })

  it('el administrador entra al dashboard con el código correcto', () => {
    hastaPaso2('admin')
    escribirCodigoCorrecto('admin')
    cy.contains('button', 'Verificar').click()
    cy.location('pathname').should('eq', '/dashboard')
  })
})

describe('HU-04 - Rutas de administrador con sesión', () => {
  it('un estudiante no puede entrar a /usuarios', () => {
    cy.login('estudiante')
    cy.visit('/usuarios')
    cy.location('pathname').should('not.eq', '/usuarios')
  })

  it('un administrador sí puede entrar a /usuarios', () => {
    cy.login('admin')
    cy.visit('/usuarios')
    cy.location('pathname').should('eq', '/usuarios')
  })
})