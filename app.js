/**
 * AgroControl - Prototipo funcional
 * Gestión de pedidos e inventario para Agroinsumos del Llano S.A.S.
 */

const ROLES = {
  administrador: { label: 'Administrador', vistas: ['inicio', 'productos', 'inventario', 'pedidos', 'clientes', 'reportes'] },
  vendedor: { label: 'Vendedor', vistas: ['inicio', 'pedidos', 'clientes', 'productos'] },
  bodeguero: { label: 'Bodeguero', vistas: ['inicio', 'pedidos', 'inventario', 'productos'] }
};

const VISTAS = {
  inicio: { titulo: 'Panel principal', icono: '🏠' },
  productos: { titulo: 'Productos', icono: '📦' },
  inventario: { titulo: 'Inventario', icono: '🏬' },
  pedidos: { titulo: 'Pedidos', icono: '🧾' },
  clientes: { titulo: 'Clientes', icono: '👨‍🌾' },
  reportes: { titulo: 'Reportes', icono: '📊' }
};

const ESTADOS = ['registrado', 'en preparacion', 'despachado', 'entregado', 'anulado'];
const ESTADO_LABEL = { 'registrado': 'Registrado', 'en preparacion': 'En preparación', 'despachado': 'Despachado', 'entregado': 'Entregado', 'anulado': 'Anulado' };
const CATEGORIAS = ['Fertilizantes', 'Concentrados', 'Veterinarios', 'Herramientas'];
const UNIDADES = ['Bulto', 'Frasco', 'Unidad', 'Litro', 'Kilogramo'];

let sesion = null;
let vistaActual = 'inicio';

/* ---------- Utilidades ---------- */

/**
 * Atajo para document.querySelector.
 * @param {string} sel selector CSS
 * @returns {Element} elemento
 */
const $ = (sel) => document.querySelector(sel);

/**
 * Formatea un valor como pesos colombianos.
 * @param {number} v valor
 * @returns {string} valor formateado
 */
function cop(v) {
  return '$' + Math.round(v).toLocaleString('es-CO');
}

/**
 * Formatea una fecha ISO como dd/mm/aaaa.
 * @param {string} iso fecha ISO
 * @returns {string} fecha legible
 */
function fecha(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Escapa texto para insertarlo en HTML.
 * @param {*} s texto
 * @returns {string} texto seguro
 */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Muestra un mensaje temporal.
 * @param {string} msg mensaje
 * @param {boolean} [error] si es un mensaje de error
 */
function toast(msg, error) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = error ? 'toast error' : 'toast';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

/**
 * Abre el modal con el contenido indicado.
 * @param {string} titulo título del modal
 * @param {string} html contenido
 */
function abrirModal(titulo, html) {
  $('#modal-title').textContent = titulo;
  $('#modal-body').innerHTML = html;
  $('#modal').classList.remove('hidden');
}

/**
 * Cierra el modal.
 */
function cerrarModal() {
  $('#modal').classList.add('hidden');
}

/**
 * Indica si el usuario actual tiene alguno de los roles dados.
 * @param {...string} roles roles permitidos
 * @returns {boolean} true si tiene permiso
 */
function puede(...roles) {
  return sesion !== null && roles.includes(sesion.rol);
}

/**
 * Devuelve los productos activos que están en o por debajo del stock mínimo.
 * @returns {object[]} productos en alerta
 */
function productosBajoMinimo() {
  return DB.data.productos.filter((p) => p.activo && DB.stock(p.id) <= p.stockMinimo);
}

/**
 * Calcula el total de un pedido.
 * @param {object} p pedido
 * @returns {number} total
 */
function totalPedido(p) {
  return p.lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
}

/**
 * Genera la etiqueta HTML de estado de un pedido.
 * @param {string} estado estado
 * @returns {string} html
 */
function badgeEstado(estado) {
  return `<span class="badge estado-${estado.replace(' ', '-')}">${ESTADO_LABEL[estado]}</span>`;
}

/* ---------- Sesión ---------- */

/**
 * Valida credenciales e inicia sesión.
 * @param {Event} e evento submit
 */
function login(e) {
  e.preventDefault();
  const u = $('#login-user').value.trim();
  const c = $('#login-pass').value;
  const user = USERS.find((x) => x.usuario === u && x.clave === c);
  if (user) {
    sesion = user;
    try { sessionStorage.setItem('agro_sesion', user.usuario); } catch (err) { /* sin almacenamiento */ }
    $('#login-error').classList.add('hidden');
    iniciarApp();
  } else {
    $('#login-error').classList.remove('hidden');
  }
}

/**
 * Cierra la sesión actual.
 */
function logout() {
  sesion = null;
  try { sessionStorage.removeItem('agro_sesion'); } catch (err) { /* sin almacenamiento */ }
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
  $('#login-form').reset();
}

/**
 * Muestra la aplicación tras iniciar sesión.
 */
function iniciarApp() {
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  $('#user-info').innerHTML = `<strong>${esc(sesion.nombre)}</strong><br>${ROLES[sesion.rol].label}`;
  $('#reset-btn').classList.toggle('hidden', !puede('administrador'));
  navegar('inicio');
}

/**
 * Cambia a la vista indicada respetando los permisos del perfil.
 * @param {string} vista nombre de la vista
 */
function navegar(vista) {
  let destino = vista;
  if (!ROLES[sesion.rol].vistas.includes(vista)) {
    toast('Su perfil no tiene acceso a esta sección', true);
    destino = 'inicio';
  }
  vistaActual = destino;
  $('#menu').innerHTML = ROLES[sesion.rol].vistas
    .map((v) => `<a data-vista="${v}" class="${v === destino ? 'active' : ''}">${VISTAS[v].icono} ${VISTAS[v].titulo}</a>`)
    .join('');
  $('#view-title').textContent = VISTAS[destino].titulo;
  $('#sidebar').classList.remove('open');
  render();
}

/**
 * Vuelve a dibujar la vista actual y el indicador de alertas.
 */
function render() {
  const alertas = productosBajoMinimo().length;
  const badge = $('#alert-badge');
  if (alertas > 0 && puede('administrador', 'bodeguero')) {
    badge.textContent = `⚠ ${alertas} producto(s) bajo stock mínimo`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
  const renderers = { inicio: vistaInicio, productos: vistaProductos, inventario: vistaInventario, pedidos: vistaPedidos, clientes: vistaClientes, reportes: vistaReportes };
  $('#view').innerHTML = renderers[vistaActual]();
}

/* ---------- Vista: Inicio ---------- */

/**
 * Construye el panel principal.
 * @returns {string} html
 */
function vistaInicio() {
  const pedidos = DB.data.pedidos;
  const pendientes = pedidos.filter((p) => p.estado === 'registrado' || p.estado === 'en preparacion').length;
  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const ventasMes = pedidos
    .filter((p) => (p.estado === 'despachado' || p.estado === 'entregado') && new Date(p.fecha).getTime() >= limite)
    .reduce((s, p) => s + totalPedido(p), 0);
  const bajos = productosBajoMinimo();
  const recientes = [...pedidos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);

  return `
    <div class="cards">
      <div class="card kpi"><div class="label">Productos activos</div><div class="value">${DB.data.productos.filter((p) => p.activo).length}</div></div>
      <div class="card kpi"><div class="label">Pedidos pendientes</div><div class="value">${pendientes}</div></div>
      <div class="card kpi"><div class="label">Ventas últimos 30 días</div><div class="value">${cop(ventasMes)}</div></div>
      <div class="card kpi ${bajos.length ? 'alert' : ''}"><div class="label">Alertas de stock</div><div class="value">${bajos.length}</div></div>
    </div>
    <div class="panel">
      <h3>⚠ Productos en o bajo stock mínimo</h3>
      ${bajos.length === 0 ? '<p class="muted">No hay productos en alerta.</p>' : `
      <div class="table-wrap"><table>
        <tr><th>Código</th><th>Producto</th><th class="num">Existencias</th><th class="num">Stock mínimo</th></tr>
        ${bajos.map((p) => `<tr class="row-alert"><td>${p.codigo}</td><td>${esc(p.descripcion)}</td><td class="num"><strong>${DB.stock(p.id)}</strong></td><td class="num">${p.stockMinimo}</td></tr>`).join('')}
      </table></div>`}
    </div>
    <div class="panel">
      <h3>Pedidos recientes</h3>
      <div class="table-wrap"><table>
        <tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th class="num">Total</th></tr>
        ${recientes.map((p) => `<tr><td>${p.codigo}</td><td>${fecha(p.fecha)}</td><td>${esc(DB.cliente(p.clienteId).nombre)}</td><td>${badgeEstado(p.estado)}</td><td class="num">${cop(totalPedido(p))}</td></tr>`).join('')}
      </table></div>
    </div>`;
}

/* ---------- Vista: Productos ---------- */

let filtroProd = { texto: '', categoria: '' };

/**
 * Construye la vista de productos.
 * @returns {string} html
 */
function vistaProductos() {
  const t = filtroProd.texto.toLowerCase();
  const lista = DB.data.productos.filter((p) =>
    (p.codigo.toLowerCase().includes(t) || p.descripcion.toLowerCase().includes(t)) &&
    (filtroProd.categoria === '' || p.categoria === filtroProd.categoria));
  const admin = puede('administrador');

  return `
    <div class="toolbar">
      <label>Buscar<input id="f-prod-texto" placeholder="Código o descripción" value="${esc(filtroProd.texto)}"></label>
      <label>Categoría<select id="f-prod-cat"><option value="">Todas</option>${CATEGORIAS.map((c) => `<option ${c === filtroProd.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <span class="spacer"></span>
      ${admin ? '<button class="btn primary" data-accion="nuevo-producto">+ Nuevo producto</button>' : ''}
    </div>
    <div class="panel"><div class="table-wrap"><table>
      <tr><th>Código</th><th>Descripción</th><th>Categoría</th><th>Unidad</th><th class="num">Precio</th><th class="num">Existencias</th><th class="num">Mínimo</th><th>Estado</th>${admin ? '<th></th>' : ''}</tr>
      ${lista.map((p) => {
        const st = DB.stock(p.id);
        const alerta = p.activo && st <= p.stockMinimo;
        return `<tr class="${alerta ? 'row-alert' : ''}">
          <td>${p.codigo}</td><td>${esc(p.descripcion)}</td><td>${p.categoria}</td><td>${p.unidad}</td>
          <td class="num">${cop(p.precio)}</td><td class="num">${st}${alerta ? ' ⚠' : ''}</td><td class="num">${p.stockMinimo}</td>
          <td>${p.activo ? '<span class="badge ok">Activo</span>' : '<span class="badge">Inactivo</span>'}</td>
          ${admin ? `<td class="actions"><button class="btn small" data-accion="editar-producto" data-id="${p.id}">Editar</button>
            <button class="btn small" data-accion="toggle-producto" data-id="${p.id}">${p.activo ? 'Inactivar' : 'Activar'}</button></td>` : ''}
        </tr>`;
      }).join('')}
    </table></div>${lista.length === 0 ? '<p class="muted">Sin resultados.</p>' : ''}</div>`;
}

/**
 * Abre el formulario de producto (nuevo o edición).
 * @param {number} [id] id del producto a editar
 */
function formProducto(id) {
  const p = id ? DB.producto(id) : { codigo: '', descripcion: '', categoria: CATEGORIAS[0], unidad: UNIDADES[0], precio: '', stockMinimo: '' };
  abrirModal(id ? 'Editar producto' : 'Nuevo producto', `
    <form id="form-producto" data-id="${id || ''}">
      <div class="form-grid">
        <label>Código<input name="codigo" required value="${esc(p.codigo)}"></label>
        <label>Categoría<select name="categoria">${CATEGORIAS.map((c) => `<option ${c === p.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="span2">Descripción<input name="descripcion" required value="${esc(p.descripcion)}"></label>
        <label>Unidad de medida<select name="unidad">${UNIDADES.map((u) => `<option ${u === p.unidad ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <label>Precio (COP)<input name="precio" type="number" min="1" required value="${p.precio}"></label>
        <label>Stock mínimo<input name="stockMinimo" type="number" min="0" required value="${p.stockMinimo}"></label>
      </div>
      <div class="form-actions"><button type="button" class="btn" data-accion="cerrar">Cancelar</button><button class="btn primary">Guardar</button></div>
    </form>`);
}

/**
 * Guarda el producto del formulario.
 * @param {HTMLFormElement} form formulario
 */
function guardarProducto(form) {
  const f = Object.fromEntries(new FormData(form));
  const id = Number(form.dataset.id) || null;
  const codigo = f.codigo.trim().toUpperCase();
  const duplicado = DB.data.productos.some((p) => p.codigo === codigo && p.id !== id);
  if (duplicado) {
    toast(`Ya existe un producto con el código ${codigo}`, true);
  } else {
    const datos = { codigo, descripcion: f.descripcion.trim(), categoria: f.categoria, unidad: f.unidad, precio: Number(f.precio), stockMinimo: Number(f.stockMinimo) };
    if (id) {
      Object.assign(DB.producto(id), datos);
    } else {
      DB.data.productos.push({ id: DB.nextId('productos'), activo: true, ...datos });
    }
    DB.save();
    cerrarModal();
    toast('Producto guardado');
    render();
  }
}

/* ---------- Vista: Inventario ---------- */

/**
 * Construye la vista de inventario.
 * @returns {string} html
 */
function vistaInventario() {
  const movs = [...DB.data.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 25);
  return `
    <div class="toolbar"><span class="spacer"></span>
      <button class="btn primary" data-accion="nuevo-mov" data-tipo="entrada">+ Registrar entrada</button>
      <button class="btn" data-accion="nuevo-mov" data-tipo="salida">− Registrar salida / ajuste</button>
    </div>
    <div class="panel"><h3>Existencias actuales</h3><div class="table-wrap"><table>
      <tr><th>Código</th><th>Producto</th><th class="num">Existencias</th><th class="num">Reservado en pedidos</th><th class="num">Disponible</th><th class="num">Mínimo</th><th>Estado</th></tr>
      ${DB.data.productos.filter((p) => p.activo).map((p) => {
        const st = DB.stock(p.id);
        const alerta = st <= p.stockMinimo;
        return `<tr class="${alerta ? 'row-alert' : ''}"><td>${p.codigo}</td><td>${esc(p.descripcion)}</td><td class="num">${st}</td>
          <td class="num">${DB.reservado(p.id)}</td><td class="num">${DB.disponible(p.id)}</td><td class="num">${p.stockMinimo}</td>
          <td>${alerta ? '<span class="badge danger">Bajo mínimo</span>' : '<span class="badge ok">Normal</span>'}</td></tr>`;
      }).join('')}
    </table></div></div>
    <div class="panel"><h3>Últimos movimientos</h3><div class="table-wrap"><table>
      <tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Motivo</th><th class="num">Cantidad</th><th>Referencia</th><th>Usuario</th></tr>
      ${movs.map((m) => `<tr><td>${fecha(m.fecha)}</td><td>${esc(DB.producto(m.productoId).descripcion)}</td>
        <td>${m.tipo === 'entrada' ? '<span class="badge ok">Entrada</span>' : '<span class="badge warn">Salida</span>'}</td>
        <td>${m.motivo}</td><td class="num">${m.cantidad}</td><td>${esc(m.referencia)}</td><td>${m.usuario}</td></tr>`).join('')}
    </table></div></div>`;
}

/**
 * Abre el formulario de movimiento de inventario.
 * @param {string} tipo entrada o salida
 */
function formMovimiento(tipo) {
  const motivos = tipo === 'entrada' ? ['Compra', 'Devolución de cliente', 'Ajuste'] : ['Ajuste', 'Avería / vencimiento', 'Consumo interno'];
  abrirModal(tipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida / ajuste', `
    <form id="form-mov" data-tipo="${tipo}">
      <div class="form-grid">
        <label class="span2">Producto<select name="productoId" required>${DB.data.productos.filter((p) => p.activo).map((p) => `<option value="${p.id}">${p.codigo} — ${esc(p.descripcion)} (exist.: ${DB.stock(p.id)})</option>`).join('')}</select></label>
        <label>Motivo<select name="motivo">${motivos.map((m) => `<option>${m}</option>`).join('')}</select></label>
        <label>Cantidad<input name="cantidad" type="number" min="1" required></label>
        <label class="span2">Referencia / observación<input name="referencia" placeholder="Ej: Factura proveedor 1234"></label>
      </div>
      <div class="form-actions"><button type="button" class="btn" data-accion="cerrar">Cancelar</button><button class="btn primary">Registrar</button></div>
    </form>`);
}

/**
 * Guarda un movimiento de inventario.
 * @param {HTMLFormElement} form formulario
 */
function guardarMovimiento(form) {
  const f = Object.fromEntries(new FormData(form));
  const tipo = form.dataset.tipo;
  const productoId = Number(f.productoId);
  const cantidad = Number(f.cantidad);
  if (tipo === 'salida' && cantidad > DB.stock(productoId)) {
    toast(`La salida supera las existencias (${DB.stock(productoId)})`, true);
  } else {
    DB.data.movimientos.push({ id: DB.nextId('movimientos'), fecha: new Date().toISOString(), productoId, tipo, motivo: f.motivo, cantidad, referencia: f.referencia || '-', usuario: sesion.usuario });
    DB.save();
    cerrarModal();
    const p = DB.producto(productoId);
    if (DB.stock(productoId) <= p.stockMinimo) {
      toast(`⚠ ${p.descripcion} quedó en stock mínimo`, true);
    } else {
      toast('Movimiento registrado');
    }
    render();
  }
}

/* ---------- Vista: Pedidos ---------- */

let filtroPed = { estado: '', texto: '' };

/**
 * Construye la vista de pedidos.
 * @returns {string} html
 */
function vistaPedidos() {
  const t = filtroPed.texto.toLowerCase();
  let lista = DB.data.pedidos.filter((p) =>
    (filtroPed.estado === '' || p.estado === filtroPed.estado) &&
    (p.codigo.toLowerCase().includes(t) || DB.cliente(p.clienteId).nombre.toLowerCase().includes(t)));
  // El bodeguero ve primero lo que debe despachar (orden de llegada)
  if (puede('bodeguero')) {
    lista = lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  } else {
    lista = lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
  return `
    <div class="toolbar">
      <label>Buscar<input id="f-ped-texto" placeholder="Pedido o cliente" value="${esc(filtroPed.texto)}"></label>
      <label>Estado<select id="f-ped-estado"><option value="">Todos</option>${ESTADOS.map((e) => `<option value="${e}" ${e === filtroPed.estado ? 'selected' : ''}>${ESTADO_LABEL[e]}</option>`).join('')}</select></label>
      <span class="spacer"></span>
      ${puede('administrador', 'vendedor') ? '<button class="btn primary" data-accion="nuevo-pedido">+ Nuevo pedido</button>' : ''}
    </div>
    <div class="panel"><div class="table-wrap"><table>
      <tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th class="num">Ítems</th><th class="num">Total</th><th>Estado</th><th></th></tr>
      ${lista.map((p) => `<tr><td><strong>${p.codigo}</strong></td><td>${fecha(p.fecha)}</td><td>${esc(DB.cliente(p.clienteId).nombre)}</td>
        <td class="num">${p.lineas.length}</td><td class="num">${cop(totalPedido(p))}</td><td>${badgeEstado(p.estado)}</td>
        <td class="actions"><button class="btn small" data-accion="ver-pedido" data-id="${p.id}">Ver / gestionar</button></td></tr>`).join('')}
    </table></div>${lista.length === 0 ? '<p class="muted">No hay pedidos con ese filtro.</p>' : ''}</div>`;
}

/**
 * Abre el formulario de captura de pedido.
 */
function formPedido() {
  abrirModal('Nuevo pedido', `
    <form id="form-pedido">
      <label>Cliente<select name="clienteId" required>${DB.data.clientes.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}</select></label>
      <div class="lines" id="lineas"></div>
      <button type="button" class="btn small" data-accion="agregar-linea">+ Agregar producto</button>
      <div class="order-total" id="total-pedido">Total: $0</div>
      <div class="form-actions"><button type="button" class="btn" data-accion="cerrar">Cancelar</button><button class="btn primary">Registrar pedido</button></div>
    </form>`);
  agregarLinea();
}

/**
 * Agrega una línea de producto al formulario de pedido.
 */
function agregarLinea() {
  const div = document.createElement('div');
  div.className = 'line-row';
  div.innerHTML = `
    <div><select class="l-prod">${DB.data.productos.filter((p) => p.activo).map((p) => `<option value="${p.id}">${p.codigo} — ${esc(p.descripcion)}</option>`).join('')}</select>
    <div class="hint l-hint"></div></div>
    <input class="l-cant" type="number" min="1" value="1">
    <div class="line-sub num l-sub"></div>
    <button type="button" class="btn small" data-accion="quitar-linea">✕</button>`;
  $('#lineas').appendChild(div);
  recalcularPedido();
}

/**
 * Recalcula subtotales y valida disponibilidad en el formulario de pedido.
 * @returns {boolean} true si todas las líneas son válidas
 */
function recalcularPedido() {
  let total = 0;
  let valido = true;
  const acumulado = {};
  document.querySelectorAll('#lineas .line-row').forEach((row) => {
    const pid = Number(row.querySelector('.l-prod').value);
    const cant = Number(row.querySelector('.l-cant').value) || 0;
    const p = DB.producto(pid);
    acumulado[pid] = (acumulado[pid] || 0) + cant;
    const disp = DB.disponible(pid);
    const hint = row.querySelector('.l-hint');
    if (acumulado[pid] > disp || cant <= 0) {
      hint.textContent = `Disponible: ${disp} — cantidad no válida`;
      hint.className = 'hint l-hint bad';
      valido = false;
    } else {
      hint.textContent = `Disponible: ${disp} ${p.unidad.toLowerCase()}(s) · ${cop(p.precio)} c/u`;
      hint.className = 'hint l-hint';
    }
    row.querySelector('.l-sub').textContent = cop(cant * p.precio);
    total += cant * p.precio;
  });
  $('#total-pedido').textContent = `Total: ${cop(total)}`;
  return valido;
}

/**
 * Registra el pedido validando disponibilidad.
 * @param {HTMLFormElement} form formulario
 */
function guardarPedido(form) {
  const filas = document.querySelectorAll('#lineas .line-row');
  if (filas.length === 0) {
    toast('Agregue al menos un producto', true);
  } else if (!recalcularPedido()) {
    toast('Hay productos sin disponibilidad suficiente', true);
  } else {
    const lineas = [...filas].map((row) => {
      const pid = Number(row.querySelector('.l-prod').value);
      return { productoId: pid, cantidad: Number(row.querySelector('.l-cant').value), precio: DB.producto(pid).precio };
    });
    const id = DB.nextId('pedidos');
    const codigo = 'PED-' + String(id).padStart(4, '0');
    const ahora = new Date().toISOString();
    DB.data.pedidos.push({ id, codigo, fecha: ahora, clienteId: Number(form.clienteId.value), estado: 'registrado', lineas, historial: [{ fecha: ahora, estado: 'registrado', usuario: sesion.usuario }] });
    DB.save();
    cerrarModal();
    toast(`Pedido ${codigo} registrado`);
    render();
  }
}

/**
 * Devuelve los estados a los que puede pasar un pedido según el perfil.
 * @param {object} p pedido
 * @returns {string[]} estados siguientes permitidos
 */
function transiciones(p) {
  const flujo = { 'registrado': ['en preparacion', 'anulado'], 'en preparacion': ['despachado', 'anulado'], 'despachado': ['entregado'], 'entregado': [], 'anulado': [] };
  return flujo[p.estado].filter((e) => {
    let permitido = false;
    if (puede('administrador')) {
      permitido = true;
    } else if (puede('bodeguero')) {
      permitido = e !== 'anulado';
    } else if (puede('vendedor')) {
      permitido = e === 'anulado' && p.estado === 'registrado';
    }
    return permitido;
  });
}

/**
 * Muestra el detalle de un pedido con sus acciones.
 * @param {number} id id del pedido
 */
function verPedido(id) {
  const p = DB.data.pedidos.find((x) => x.id === id);
  const c = DB.cliente(p.clienteId);
  const acciones = transiciones(p);
  abrirModal(`Pedido ${p.codigo}`, `
    <p><strong>Cliente:</strong> ${esc(c.nombre)} · ${c.telefono}<br><strong>Ubicación:</strong> ${esc(c.vereda)}, ${esc(c.municipio)}<br>
    <strong>Fecha:</strong> ${fecha(p.fecha)} · <strong>Estado:</strong> ${badgeEstado(p.estado)}</p>
    <div class="table-wrap"><table>
      <tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr>
      ${p.lineas.map((l) => `<tr><td>${esc(DB.producto(l.productoId).descripcion)}</td><td class="num">${l.cantidad}</td><td class="num">${cop(l.precio)}</td><td class="num">${cop(l.cantidad * l.precio)}</td></tr>`).join('')}
    </table></div>
    <div class="order-total">Total: ${cop(totalPedido(p))}</div>
    <h4>Historial</h4>
    <ul class="muted">${p.historial.map((h) => `<li>${fecha(h.fecha)} — ${ESTADO_LABEL[h.estado]} (${h.usuario})</li>`).join('')}</ul>
    <div class="form-actions">
      ${acciones.map((e) => `<button class="btn ${e === 'anulado' ? 'danger' : 'primary'}" data-accion="cambiar-estado" data-id="${p.id}" data-estado="${e}">${e === 'anulado' ? 'Anular pedido' : 'Pasar a: ' + ESTADO_LABEL[e]}</button>`).join('')}
      <button class="btn" data-accion="cerrar">Cerrar</button>
    </div>`);
}

/**
 * Cambia el estado de un pedido. Al despachar descuenta el inventario.
 * @param {number} id id del pedido
 * @param {string} estado nuevo estado
 */
function cambiarEstado(id, estado) {
  const p = DB.data.pedidos.find((x) => x.id === id);
  let ok = true;
  if (estado === 'despachado') {
    const faltante = p.lineas.find((l) => l.cantidad > DB.stock(l.productoId));
    if (faltante) {
      ok = false;
      toast(`Sin existencias suficientes de ${DB.producto(faltante.productoId).descripcion}`, true);
    } else {
      p.lineas.forEach((l) => {
        DB.data.movimientos.push({ id: DB.nextId('movimientos'), fecha: new Date().toISOString(), productoId: l.productoId, tipo: 'salida', motivo: 'Venta', cantidad: l.cantidad, referencia: p.codigo, usuario: sesion.usuario });
      });
    }
  }
  if (ok && estado === 'anulado' && !confirm(`¿Anular el pedido ${p.codigo}?`)) {
    ok = false;
  }
  if (ok) {
    p.estado = estado;
    p.historial.push({ fecha: new Date().toISOString(), estado, usuario: sesion.usuario });
    DB.save();
    toast(`${p.codigo}: ${ESTADO_LABEL[estado]}`);
    render();
    verPedido(id);
  }
}

/* ---------- Vista: Clientes ---------- */

let filtroCli = '';

/**
 * Construye la vista de clientes.
 * @returns {string} html
 */
function vistaClientes() {
  const t = filtroCli.toLowerCase();
  const lista = DB.data.clientes.filter((c) => c.nombre.toLowerCase().includes(t) || c.documento.includes(t));
  return `
    <div class="toolbar">
      <label>Buscar<input id="f-cli-texto" placeholder="Nombre o documento" value="${esc(filtroCli)}"></label>
      <span class="spacer"></span><button class="btn primary" data-accion="nuevo-cliente">+ Nuevo cliente</button>
    </div>
    <div class="panel"><div class="table-wrap"><table>
      <tr><th>Documento</th><th>Nombre / finca</th><th>Teléfono</th><th>Vereda</th><th>Municipio</th><th class="num">Pedidos</th><th></th></tr>
      ${lista.map((c) => `<tr><td>${c.documento}</td><td>${esc(c.nombre)}</td><td>${c.telefono}</td><td>${esc(c.vereda)}</td><td>${esc(c.municipio)}</td>
        <td class="num">${DB.data.pedidos.filter((p) => p.clienteId === c.id).length}</td>
        <td class="actions"><button class="btn small" data-accion="editar-cliente" data-id="${c.id}">Editar</button></td></tr>`).join('')}
    </table></div></div>`;
}

/**
 * Abre el formulario de cliente.
 * @param {number} [id] id del cliente a editar
 */
function formCliente(id) {
  const c = id ? DB.cliente(id) : { documento: '', nombre: '', telefono: '', vereda: '', municipio: 'Cabuyaro' };
  abrirModal(id ? 'Editar cliente' : 'Nuevo cliente', `
    <form id="form-cliente" data-id="${id || ''}">
      <div class="form-grid">
        <label>Documento / NIT<input name="documento" required pattern="[0-9]{5,12}" value="${esc(c.documento)}"></label>
        <label>Teléfono<input name="telefono" required pattern="[0-9]{7,10}" value="${esc(c.telefono)}"></label>
        <label class="span2">Nombre o finca<input name="nombre" required value="${esc(c.nombre)}"></label>
        <label>Vereda / sector<input name="vereda" required value="${esc(c.vereda)}"></label>
        <label>Municipio<input name="municipio" required value="${esc(c.municipio)}"></label>
        <label class="span2" style="flex-direction:row;gap:8px;align-items:center;font-weight:400">
          <input type="checkbox" required ${id ? 'checked' : ''}> El cliente autoriza el tratamiento de sus datos personales (Ley 1581 de 2012).</label>
      </div>
      <div class="form-actions"><button type="button" class="btn" data-accion="cerrar">Cancelar</button><button class="btn primary">Guardar</button></div>
    </form>`);
}

/**
 * Guarda el cliente del formulario.
 * @param {HTMLFormElement} form formulario
 */
function guardarCliente(form) {
  const f = Object.fromEntries(new FormData(form));
  const id = Number(form.dataset.id) || null;
  const duplicado = DB.data.clientes.some((c) => c.documento === f.documento && c.id !== id);
  if (duplicado) {
    toast('Ya existe un cliente con ese documento', true);
  } else {
    const datos = { documento: f.documento, nombre: f.nombre.trim(), telefono: f.telefono, vereda: f.vereda.trim(), municipio: f.municipio.trim() };
    if (id) {
      Object.assign(DB.cliente(id), datos);
    } else {
      DB.data.clientes.push({ id: DB.nextId('clientes'), ...datos });
    }
    DB.save();
    cerrarModal();
    toast('Cliente guardado');
    render();
  }
}

/* ---------- Vista: Reportes ---------- */

let reporteActual = 'existencias';

/**
 * Genera los datos tabulares del reporte seleccionado.
 * @param {string} tipo tipo de reporte
 * @returns {{titulo: string, columnas: string[], filas: Array<Array<string|number>>}} reporte
 */
function datosReporte(tipo) {
  const prods = DB.data.productos.filter((p) => p.activo);
  const vendidos = DB.data.pedidos.filter((p) => p.estado === 'despachado' || p.estado === 'entregado');
  let rep;
  if (tipo === 'existencias') {
    rep = { titulo: 'Existencias actuales', columnas: ['Código', 'Producto', 'Categoría', 'Existencias', 'Valor inventario'],
      filas: prods.map((p) => [p.codigo, p.descripcion, p.categoria, DB.stock(p.id), cop(DB.stock(p.id) * p.precio)]) };
  } else if (tipo === 'minimo') {
    rep = { titulo: 'Productos bajo stock mínimo', columnas: ['Código', 'Producto', 'Existencias', 'Stock mínimo', 'Faltante sugerido'],
      filas: productosBajoMinimo().map((p) => [p.codigo, p.descripcion, DB.stock(p.id), p.stockMinimo, p.stockMinimo * 2 - DB.stock(p.id)]) };
  } else if (tipo === 'ventas') {
    rep = { titulo: 'Ventas por periodo', columnas: ['Pedido', 'Fecha', 'Cliente', 'Estado', 'Total'],
      filas: vendidos.map((p) => [p.codigo, fecha(p.fecha), DB.cliente(p.clienteId).nombre, ESTADO_LABEL[p.estado], cop(totalPedido(p))]) };
    const total = vendidos.reduce((s, p) => s + totalPedido(p), 0);
    rep.filas.push(['', '', '', 'TOTAL', cop(total)]);
  } else {
    const rot = prods.map((p) => {
      const salidas = DB.data.movimientos.filter((m) => m.productoId === p.id && m.tipo === 'salida' && m.motivo === 'Venta').reduce((s, m) => s + m.cantidad, 0);
      return { p, salidas };
    }).sort((a, b) => b.salidas - a.salidas);
    rep = { titulo: 'Rotación por producto', columnas: ['Código', 'Producto', 'Unidades vendidas', 'Existencias', 'Índice de rotación'],
      filas: rot.map(({ p, salidas }) => {
        const st = DB.stock(p.id);
        const indice = st > 0 ? (salidas / st).toFixed(2) : '—';
        return [p.codigo, p.descripcion, salidas, st, indice];
      }) };
  }
  return rep;
}

/**
 * Construye la vista de reportes.
 * @returns {string} html
 */
function vistaReportes() {
  const rep = datosReporte(reporteActual);
  const opciones = { existencias: 'Existencias actuales', minimo: 'Productos bajo stock mínimo', ventas: 'Ventas por periodo', rotacion: 'Rotación por producto' };
  return `
    <div class="toolbar">
      <label>Reporte<select id="f-reporte">${Object.entries(opciones).map(([k, v]) => `<option value="${k}" ${k === reporteActual ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <span class="spacer"></span>
      <button class="btn" data-accion="exportar-csv">⬇ Exportar a hoja de cálculo (CSV)</button>
      <button class="btn primary" data-accion="exportar-pdf">🖨 Exportar a PDF</button>
    </div>
    <div class="panel">
      <h3>${rep.titulo}</h3>
      <p class="muted">Agroinsumos del Llano S.A.S. · Generado el ${fecha(new Date().toISOString())} por ${esc(sesion.nombre)}</p>
      <div class="table-wrap"><table>
        <tr>${rep.columnas.map((c) => `<th>${c}</th>`).join('')}</tr>
        ${rep.filas.map((f) => `<tr>${f.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}
      </table></div>
      ${rep.filas.length === 0 ? '<p class="muted">Sin datos para este reporte.</p>' : ''}
    </div>`;
}

/**
 * Descarga el reporte actual como CSV compatible con Excel.
 */
function exportarCSV() {
  const rep = datosReporte(reporteActual);
  const lineas = [rep.columnas, ...rep.filas].map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reporte_${reporteActual}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Reporte exportado');
}

/* ---------- Eventos ---------- */

document.addEventListener('click', (e) => {
  const link = e.target.closest('#menu a');
  const btn = e.target.closest('[data-accion]');
  if (link) {
    navegar(link.dataset.vista);
  } else if (btn) {
    const id = Number(btn.dataset.id);
    const acciones = {
      'cerrar': cerrarModal,
      'nuevo-producto': () => formProducto(),
      'editar-producto': () => formProducto(id),
      'toggle-producto': () => { const p = DB.producto(id); p.activo = !p.activo; DB.save(); render(); },
      'nuevo-mov': () => formMovimiento(btn.dataset.tipo),
      'nuevo-pedido': formPedido,
      'agregar-linea': agregarLinea,
      'quitar-linea': () => { btn.closest('.line-row').remove(); recalcularPedido(); },
      'ver-pedido': () => verPedido(id),
      'cambiar-estado': () => cambiarEstado(id, btn.dataset.estado),
      'nuevo-cliente': () => formCliente(),
      'editar-cliente': () => formCliente(id),
      'exportar-csv': exportarCSV,
      'exportar-pdf': () => window.print()
    };
    if (acciones[btn.dataset.accion]) {
      e.preventDefault();
      acciones[btn.dataset.accion]();
    }
  }
});

document.addEventListener('submit', (e) => {
  const handlers = { 'login-form': login, 'form-producto': guardarProducto, 'form-mov': guardarMovimiento, 'form-pedido': guardarPedido, 'form-cliente': guardarCliente };
  const h = handlers[e.target.id];
  if (h && e.target.id === 'login-form') {
    h(e);
  } else if (h) {
    e.preventDefault();
    h(e.target);
  }
});

document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (e.target.closest('#lineas')) {
    recalcularPedido();
  } else if (id === 'f-prod-texto' || id === 'f-ped-texto' || id === 'f-cli-texto') {
    if (id === 'f-prod-texto') {
      filtroProd.texto = e.target.value;
    } else if (id === 'f-ped-texto') {
      filtroPed.texto = e.target.value;
    } else {
      filtroCli = e.target.value;
    }
    const pos = e.target.selectionStart;
    render();
    const el = document.getElementById(id);
    el.focus();
    el.setSelectionRange(pos, pos);
  }
});

document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (e.target.closest('#lineas')) {
    recalcularPedido();
  } else if (id === 'f-prod-cat') {
    filtroProd.categoria = e.target.value;
    render();
  } else if (id === 'f-ped-estado') {
    filtroPed.estado = e.target.value;
    render();
  } else if (id === 'f-reporte') {
    reporteActual = e.target.value;
    render();
  }
});

$('#logout-btn').addEventListener('click', logout);
$('#modal-close').addEventListener('click', cerrarModal);
$('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#reset-btn').addEventListener('click', () => {
  if (confirm('¿Restablecer todos los datos de demostración?')) {
    DB.reset();
    toast('Datos restablecidos');
    render();
  }
});

/* ---------- Arranque ---------- */
DB.load();
(function restaurarSesion() {
  let guardado = null;
  try { guardado = sessionStorage.getItem('agro_sesion'); } catch (err) { guardado = null; }
  const user = USERS.find((u) => u.usuario === guardado);
  if (user) {
    sesion = user;
    iniciarApp();
  }
})();
