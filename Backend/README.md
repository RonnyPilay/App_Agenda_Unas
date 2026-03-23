# Backend de Juli's Agenda

API en Node.js + Express conectada a Postgres (Neon) para administrar turnos y calcular ganancias.

## Requisitos

- Node.js 18 o superior
- Cuenta en [Neon](https://neon.tech/) con una base de datos Postgres creada

## Configuración inicial

1. Instala dependencias (ya ejecutado si abriste el repo final, pero por si acaso):
   ```bash
   npm install
   ```
2. Duplica `.env.example` a `.env` y completa:
   - `DATABASE_URL`: cadena de conexión de Neon (habilita `sslmode=require`).
   - `PORT` (opcional, default 4000).
3. En Neon, ejecuta `schema.sql` para crear la tabla `turnos`.
4. Arranca en modo desarrollo:
   ```bash
   npm run dev
   ```
   o producción:
   ```bash
   npm start
   ```

## Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/turnos` | Lista todos los turnos (ordenados por fecha/hora). |
| GET | `/api/turnos/:id` | Obtiene un turno por ID. |
| POST | `/api/turnos` | Crea un turno. Campos obligatorios: `fecha`, `hora`, `nombre`. |
| PUT | `/api/turnos/:id` | Actualiza un turno existente. |
| DELETE | `/api/turnos/:id` | Elimina un turno. |
| GET | `/api/ganancias?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | Calcula turnos, total cobrado y ganancia en un rango. |

### Ejemplo de payload (POST / PUT `/api/turnos`)

```json
{
  "fecha": "2026-03-22",
  "hora": "10:30",
  "nombre": "Lucía Pérez",
  "valor": 60000,
  "ganancia": 25000,
  "detalles": "Uñas soft pink"
}
```

## Notas sobre Neon

- Si usas el *connection string* clásico, basta con `DATABASE_URL` y el backend usará `pg.Pool` con SSL habilitado.
- También puedes crear un usuario exclusivo para la app y restringir permisos.
- Si necesitas WebSockets (edge functions), agrega `NEON_DATABASE_URL` y adapta `db/pool.js` para usar `@neondatabase/serverless`.

## Scripts disponibles

- `npm run dev`: inicia con `nodemon`, recargando al cambiar archivos.
- `npm start`: ejecuta la API una sola vez (modo producción).
- `npm test`: por ahora ejecuta una verificación sintáctica mínima (`npm run lint`).

## Próximos pasos sugeridos

- Añadir autenticación (token simple o JWT) si compartes la API.
- Conectar el frontend para persistir turnos reales en vez de `localStorage`.
- Agregar pruebas unitarias/integración con herramientas como Vitest o Jest.
