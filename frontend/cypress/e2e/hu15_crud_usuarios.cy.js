const buscador = 'input[placeholder="Buscar por nombre, código, cédula o correo..."]'

const buscar = (texto) => {
  cy.get(buscador).clear().type(texto)
  cy.contains('button', 'Buscar').click()
}

const unico = String(Date.now()).slice(-6)
const nuevo = {
  codigo: `CYP-${unico}`,
  cc: `19${unico}00`,
  nombre: `Usuario Cypress ${unico}`,
  email: `cypress.${unico}@uniautonoma.edu.co`,
  password: 'Cypress1234!',
}

const llenarNuevoUsuario = (email, password) => {
  cy.get('input[placeholder="Ej: 2024-1011"]').clear().type(nuevo.codigo)
  cy.get('input[placeholder="Ej: 1.002.345.678"]').clear().type(nuevo.cc)
  cy.get('input[placeholder="Nombre y apellidos"]').clear().type(nuevo.nombre)
  cy.get('input[placeholder="usuario@uniautonoma.edu.co"]').clear().type(email)
  cy.get('input[placeholder="Mínimo 8 caracteres"]').clear().type(password)
}

describe('HU-15 - CRUD de usuarios (administrador)', () => {
  beforeEach(() => {
    cy.login('admin')
    cy.visit('/usuarios')
  })

  it('muestra la gestión de usuarios con sus estadísticas', () => {
    cy.contains('h2', 'Gestión de usuarios').should('be.visible')
    cy.contains('Total usuarios').should('be.visible')
    cy.contains('Administrador UniCréditos').should('be.visible')
  })

  it('filtra la lista por rol', () => {
    cy.contains('button', 'Admins').click()
    cy.contains('Administrador UniCréditos').should('be.visible')
    cy.contains('span', 'Estudiante').should('not.exist')
  })

  it('busca por código y avisa cuando no hay coincidencias', () => {
    buscar('ADM-001')
    cy.contains('Administrador UniCréditos').should('be.visible')
    buscar('zzzxxx999')
    cy.contains('Sin usuarios que coincidan.').should('be.visible')
  })

  it('abre y cierra la ficha de un usuario', () => {
    cy.contains('button', 'Admins').click()
    cy.contains('button', 'Ver').click()
    cy.contains('Ficha del usuario').should('be.visible')
    cy.contains('ADM-001').should('be.visible')
    cy.contains('button', 'Cerrar').click()
    cy.contains('Ficha del usuario').should('not.exist')
  })

  it('valida los datos al crear un usuario', () => {
    cy.contains('button', '+ Nuevo usuario').click()
    cy.contains('h3', 'Nuevo usuario').should('be.visible')
    cy.contains('button', 'Crear usuario ✓').click()
    cy.contains('Completa todos los campos obligatorios.').should('be.visible')

    llenarNuevoUsuario('correo@gmail.com', nuevo.password)
    cy.contains('button', 'Crear usuario ✓').click()
    cy.contains('El correo debe ser institucional (@uniautonoma.edu.co).').should('be.visible')

    llenarNuevoUsuario(nuevo.email, '123')
    cy.contains('button', 'Crear usuario ✓').click()
    cy.contains('La contraseña debe tener mínimo 8 caracteres.').should('be.visible')
  })

  it('crea un usuario nuevo y lo encuentra en la lista', () => {
    cy.contains('button', '+ Nuevo usuario').click()
    llenarNuevoUsuario(nuevo.email, nuevo.password)
    cy.contains('button', 'Crear usuario ✓').click()
    cy.contains('Usuario creado correctamente', { timeout: 15000 }).should('be.visible')
    cy.contains('button', 'Aceptar').click()
    buscar(nuevo.codigo)
    cy.contains(nuevo.nombre).should('be.visible')
  })

  it('edita el usuario: rechaza correo no institucional y guarda uno válido', () => {
    const correoEditado = `cypress.${unico}.b@uniautonoma.edu.co`
    buscar(nuevo.codigo)
    cy.contains('button', 'Editar').click()
    cy.contains('h3', 'Editar usuario').should('be.visible')

    cy.get('input[type="email"]').clear().type('otro@gmail.com')
    cy.contains('button', 'Guardar cambios ✓').click()
    cy.contains('El correo debe ser institucional (@uniautonoma.edu.co).').should('be.visible')

    cy.get('input[type="email"]').clear().type(correoEditado)
    cy.contains('button', 'Guardar cambios ✓').click()
    cy.contains('Usuario actualizado', { timeout: 15000 }).should('be.visible')
    cy.contains('button', 'Aceptar').click()
    cy.contains(correoEditado).should('be.visible')
  })

  it('valida el mínimo de 8 caracteres al restablecer la contraseña', () => {
    buscar(nuevo.codigo)
    cy.contains('button', 'Editar').parent().find('button').eq(2).click()
    cy.contains('h3', 'Restablecer contraseña').should('be.visible')
    cy.contains('button', 'Guardar →').click()
    cy.contains('La contraseña debe tener mínimo 8 caracteres.').should('be.visible')
    cy.contains('button', 'Cancelar').click()
  })

  it('desactiva y vuelve a activar el usuario', () => {
    buscar(nuevo.codigo)
    cy.contains('button', 'Editar').parent().find('button').last().click()
    cy.contains('h3', 'Desactivar usuario').should('be.visible')
    cy.contains('button', 'Desactivar ✓').click()
    cy.contains('span', 'Inactivo').should('be.visible')

    cy.contains('button', 'Activar').click()
    cy.contains('h3', 'Activar usuario').should('be.visible')
    cy.contains('button', 'Activar ✓').click()
    cy.contains('span', 'Activo').should('be.visible')
  })
})