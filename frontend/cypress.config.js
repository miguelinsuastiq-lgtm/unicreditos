import { defineConfig } from 'cypress'
import mysql from 'mysql2/promise'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      on('task', {
        async leerCodigo2fa(codigo) {
          const conexion = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3306,
            user: config.env.db_user || 'root',
            password: config.env.db_password || '',
            database: 'unicreditos',
          })
          const [filas] = await conexion.execute(
            'SELECT codigo_2fa FROM usuarios WHERE codigo = ?',
            [codigo]
          )
          await conexion.end()
          return filas[0]?.codigo_2fa ?? null
        },
      })
      return config
    },
  },
})