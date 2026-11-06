# AgroControl — Prototipo funcional

Prototipo funcional de la **aplicación web de gestión de pedidos e inventario** para la distribuidora **Agroinsumos del Llano S.A.S.** (Cabuyaro, Meta).

Proyecto de Software — Corporación Universitaria Iberoamericana
Estudiante: David Julián Reyes Cruz · Profesora: Ana Mosquera · 2026

## Demo en línea

👉 https://reyes20-dev.github.io/agroinsumos-prototipo/

## Usuarios de prueba

| Usuario  | Contraseña | Perfil        |
|----------|------------|---------------|
| admin    | admin123   | Administrador |
| vendedor | vend123    | Vendedor      |
| bodega   | bod123     | Bodeguero     |

## Módulos incluidos

1. **Autenticación y perfiles**: tres perfiles con permisos diferenciados.
2. **Productos**: registro, consulta, edición e inactivación (código, categoría, unidad, precio y stock mínimo).
3. **Inventario**: entradas y salidas, existencias calculadas automáticamente y alertas de stock mínimo.
4. **Pedidos**: captura con validación de disponibilidad, consecutivo único (PED-0001) y estados (registrado, en preparación, despachado, entregado, anulado). Al despachar se descuenta el inventario.
5. **Clientes**: registro y consulta de productores con autorización de tratamiento de datos (Ley 1581 de 2012).
6. **Reportes**: existencias, productos bajo stock mínimo, ventas y rotación, con exportación a CSV (Excel) y PDF.

## Instalación y ejecución

No requiere servidor, base de datos ni instalación de dependencias.

**Opción 1. En línea:** abrir el enlace de la demo.

**Opción 2. Local:**

1. Descargar el repositorio: botón verde **Code → Download ZIP** (o `git clone https://github.com/reyes20-dev/agroinsumos-prototipo.git`).
2. Descomprimir la carpeta.
3. Abrir el archivo `index.html` con un navegador moderno (Chrome, Edge o Firefox).
4. Ingresar con alguno de los usuarios de prueba.

> Los datos se guardan en el navegador (localStorage). El administrador puede usar **"Restablecer datos demo"** para volver a los datos iniciales.

## Tecnologías

HTML5, CSS3 y JavaScript (sin frameworks ni licencias), en línea con la restricción tecnológica de licenciamiento libre del proyecto.

## Estructura

```
index.html   Estructura de la aplicación
styles.css   Estilos y diseño responsivo
data.js      Datos de demostración y persistencia
app.js       Lógica de los módulos y control de permisos
```
