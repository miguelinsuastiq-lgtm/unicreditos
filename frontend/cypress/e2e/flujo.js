const campoCodigo = 'input[placeholder="Ingresa tu código o correo institucional"]'
const campoPassword = 'input[placeholder="Tu contraseña"]'
const campo2fa = 'input[placeholder="• • • • • •"]'

export const firmar = () => {
  cy.get('canvas')
    .trigger('mousedown', 40, 70)
    .trigger('mousemove', 100, 40)
    .trigger('mousemove', 160, 100)
    .trigger('mousemove', 220, 60)
    .trigger('mouseup')
}

export const nuevoEstudiante = () => {
  const unico = String(Date.now()).slice(-8)
  return {
    nombre: `Deudor Cypress ${unico}`,
    cc: `1${unico}`,
    correo: `cypress.flujo.${unico}@ejemplo.com`,
    clave: 'Cypress1234!',
  }
}

export const crearPreinscripcion = (s) => {
  cy.visit('/solicitud')
  cy.get('input[placeholder="Nombre y apellidos"]').eq(0).type(s.nombre)
  cy.get('input[placeholder="Ej: 1002345678"]').type(s.cc)
  cy.get('input[placeholder="tucorreo@ejemplo.com"]').type(s.correo)
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

export const convertirComoAdmin = (s) => {
  cy.login('admin')
  cy.visit('/solicitudes')
  cy.get('input[placeholder="Buscar por nombre, cédula o correo..."]')
    .clear()
    .type(`${s.correo}{enter}`)
  cy.contains('p', /^1 solicitud$/).should('be.visible')
  cy.contains('button', 'Ver detalle').click()
  cy.contains('button', 'Convertir en cuenta y crédito').click()
  cy.contains(/Copia esto ahora|Se usó una cuenta que ya existía/, { timeout: 20000 })
    .should('be.visible')
}

export const aprobarCredito = (s, monto = '4500000') => {
  cy.visit('/creditos')
  cy.get('input[placeholder="Buscar por nombre, código o cédula..."]')
    .clear()
    .type(`${s.nombre}{enter}`)
  cy.contains('p', /^1 registro$/).should('be.visible')
  cy.contains('button', 'Gestionar →').click()
  cy.contains('h3', 'Gestionar crédito').should('be.visible')
  cy.contains('Crédito aprobado — habilitar PowerCampus').click()
  cy.get('input[placeholder="4.500.000"]').type(monto)
  cy.get('input[type="date"]').type('2027-06-30')
  cy.contains('button', 'Guardar cambios ✓').click()
  cy.contains('Crédito actualizado', { timeout: 15000 }).should('be.visible')
  cy.contains('button', 'Aceptar').click()
}

export const generarCuotas = (s) => {
  cy.visit('/facturacion')
  cy.contains('button', '+ Generar cuotas').click()
  cy.contains('label', 'Crédito *').parent().find('select').then(($select) => {
    const opcion = [...$select.find('option')].find((o) => o.textContent.includes(s.nombre))
    expect(opcion, 'el crédito aparece en la lista de cuotas').to.exist
    cy.wrap($select).select(opcion.value)
  })
  cy.contains('button', /^Generar cuotas$/).click()
  cy.contains('h3', 'Generar cuotas').should('not.exist')
}

export const obtenerCodigoUsuario = (s) => {
  cy.visit('/usuarios')
  cy.get('input[placeholder="Buscar por nombre, código, cédula o correo..."]')
    .clear()
    .type(`${s.cc}{enter}`)
  cy.contains('p', /^1 usuario$/).should('be.visible')
  return cy.contains('p', s.cc).invoke('text').then((texto) => texto.split(' · ')[0].trim())
}

export const resetearClave = (s) => {
  cy.contains('button', 'Editar').parent().find('button').eq(2).click()
  cy.contains('h3', 'Restablecer contraseña').should('be.visible')
  cy.get('input[placeholder="Mínimo 8 caracteres"]').type(s.clave)
  cy.contains('button', 'Guardar →').click()
  cy.contains('Contraseña actualizada', { timeout: 15000 }).should('be.visible')
  cy.contains('button', 'Aceptar').click()
}

export const prepararCredito = ({ aprobar = false, cuotas = false, estudiante = false } = {}) => {
  const s = nuevoEstudiante()
  crearPreinscripcion(s)
  convertirComoAdmin(s)
  if (aprobar) aprobarCredito(s)
  if (cuotas) generarCuotas(s)
  if (estudiante) {
    obtenerCodigoUsuario(s).then((codigo) => {
      s.codigo = codigo
      resetearClave(s)
    })
  }
  return cy.wrap(s)
}

export const loginEstudiante = (codigo, clave) => {
  cy.session(['estudiante-flujo', codigo], () => {
    cy.intercept('POST', '**/backend/api/auth.php*').as('auth')
    cy.visit('/login')
    cy.get(campoCodigo).type(codigo)
    cy.get(campoPassword).type(clave, { log: false })
    cy.contains('button', 'Iniciar sesión').click()
    cy.wait('@auth', { timeout: 20000 }).its('response.statusCode').should('eq', 200)
    cy.contains('Verificación de seguridad', { timeout: 10000 }).should('be.visible')
    cy.task('leerCodigo2fa', codigo).then((codigo2fa) => {
      cy.get(campo2fa).type(codigo2fa)
    })
    cy.contains('button', 'Verificar').click()
    cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard')
  }, {
    validate() {
      cy.window().its('localStorage.token').should('exist')
    },
  })
}