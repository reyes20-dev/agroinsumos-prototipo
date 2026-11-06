/**
 * Datos de demostración y capa de persistencia del prototipo.
 * Los datos se guardan en el localStorage del navegador.
 */
const STORAGE_KEY = 'agrocontrol_db_v1';

const USERS = [
  { usuario: 'admin', clave: 'admin123', nombre: 'Carlos Rincón', rol: 'administrador' },
  { usuario: 'vendedor', clave: 'vend123', nombre: 'Laura Gómez', rol: 'vendedor' },
  { usuario: 'bodega', clave: 'bod123', nombre: 'Jhon Parrado', rol: 'bodeguero' }
];

/**
 * Construye la base de datos inicial de demostración.
 * @returns {object} base de datos con productos, clientes, movimientos y pedidos
 */
function buildSeed() {
  const hoy = new Date();
  /**
   * Devuelve una fecha ISO desplazada n días hacia atrás.
   * @param {number} n días a restar
   * @returns {string} fecha ISO
   */
  const hace = (n) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  const productos = [
    { id: 1, codigo: 'FER-001', descripcion: 'Urea 46% x 50 kg', categoria: 'Fertilizantes', unidad: 'Bulto', precio: 165000, stockMinimo: 20, activo: true },
    { id: 2, codigo: 'FER-002', descripcion: 'Triple 15 x 50 kg', categoria: 'Fertilizantes', unidad: 'Bulto', precio: 182000, stockMinimo: 15, activo: true },
    { id: 3, codigo: 'FER-003', descripcion: 'DAP 18-46-0 x 50 kg', categoria: 'Fertilizantes', unidad: 'Bulto', precio: 198000, stockMinimo: 10, activo: true },
    { id: 4, codigo: 'CON-001', descripcion: 'Concentrado ganado lechero x 40 kg', categoria: 'Concentrados', unidad: 'Bulto', precio: 92000, stockMinimo: 25, activo: true },
    { id: 5, codigo: 'CON-002', descripcion: 'Concentrado pollo engorde x 40 kg', categoria: 'Concentrados', unidad: 'Bulto', precio: 104000, stockMinimo: 20, activo: true },
    { id: 6, codigo: 'CON-003', descripcion: 'Sal mineralizada 8% x 40 kg', categoria: 'Concentrados', unidad: 'Bulto', precio: 78000, stockMinimo: 15, activo: true },
    { id: 7, codigo: 'VET-001', descripcion: 'Ivermectina 1% x 500 ml', categoria: 'Veterinarios', unidad: 'Frasco', precio: 58000, stockMinimo: 10, activo: true },
    { id: 8, codigo: 'VET-002', descripcion: 'Vacuna aftosa x 50 dosis', categoria: 'Veterinarios', unidad: 'Frasco', precio: 46000, stockMinimo: 12, activo: true },
    { id: 9, codigo: 'HER-001', descripcion: 'Machete 22" Gavilán', categoria: 'Herramientas', unidad: 'Unidad', precio: 32000, stockMinimo: 8, activo: true },
    { id: 10, codigo: 'HER-002', descripcion: 'Fumigadora de espalda 20 L', categoria: 'Herramientas', unidad: 'Unidad', precio: 185000, stockMinimo: 4, activo: true }
  ];

  const clientes = [
    { id: 1, documento: '17345210', nombre: 'Finca La Esperanza (José Daza)', telefono: '3104567890', vereda: 'Vereda Guayabal', municipio: 'Cabuyaro' },
    { id: 2, documento: '40387561', nombre: 'Hato El Porvenir (María Ruiz)', telefono: '3207654321', vereda: 'Vereda Viso de Upía', municipio: 'Cabuyaro' },
    { id: 3, documento: '900456123', nombre: 'Asociación Arroceros del Upía', telefono: '3112223344', vereda: 'Casco urbano', municipio: 'Cabuyaro' },
    { id: 4, documento: '86054321', nombre: 'Granja San Isidro (Pedro Moreno)', telefono: '3159876543', vereda: 'Vereda Los Mangos', municipio: 'Barranca de Upía' },
    { id: 5, documento: '1121876543', nombre: 'Finca Las Palmas (Ana Velásquez)', telefono: '3006781234', vereda: 'Vereda Puerto Arimena', municipio: 'Cabuyaro' }
  ];

  // Inventario inicial (entradas) y algunas salidas históricas
  const stockInicial = { 1: 60, 2: 40, 3: 18, 4: 55, 5: 22, 6: 30, 7: 14, 8: 20, 9: 25, 10: 6 };
  const movimientos = [];
  let movId = 1;
  Object.entries(stockInicial).forEach(([pid, cant]) => {
    movimientos.push({ id: movId++, fecha: hace(30), productoId: Number(pid), tipo: 'entrada', motivo: 'Compra', cantidad: cant, referencia: 'Inventario inicial', usuario: 'admin' });
  });

  const pedidos = [
    { id: 1, codigo: 'PED-0001', fecha: hace(20), clienteId: 1, estado: 'entregado', lineas: [{ productoId: 1, cantidad: 12, precio: 165000 }, { productoId: 6, cantidad: 6, precio: 78000 }], historial: [] },
    { id: 2, codigo: 'PED-0002', fecha: hace(15), clienteId: 3, estado: 'entregado', lineas: [{ productoId: 2, cantidad: 10, precio: 182000 }, { productoId: 3, cantidad: 8, precio: 198000 }], historial: [] },
    { id: 3, codigo: 'PED-0003', fecha: hace(9), clienteId: 2, estado: 'despachado', lineas: [{ productoId: 4, cantidad: 20, precio: 92000 }, { productoId: 7, cantidad: 6, precio: 58000 }], historial: [] },
    { id: 4, codigo: 'PED-0004', fecha: hace(4), clienteId: 4, estado: 'en preparacion', lineas: [{ productoId: 5, cantidad: 6, precio: 104000 }, { productoId: 9, cantidad: 4, precio: 32000 }], historial: [] },
    { id: 5, codigo: 'PED-0005', fecha: hace(1), clienteId: 5, estado: 'registrado', lineas: [{ productoId: 1, cantidad: 8, precio: 165000 }, { productoId: 8, cantidad: 3, precio: 46000 }], historial: [] }
  ];

  // Los pedidos despachados o entregados ya descontaron inventario
  pedidos.forEach((p) => {
    p.historial.push({ fecha: p.fecha, estado: 'registrado', usuario: 'vendedor' });
    if (p.estado === 'despachado' || p.estado === 'entregado') {
      p.lineas.forEach((l) => {
        movimientos.push({ id: movId++, fecha: p.fecha, productoId: l.productoId, tipo: 'salida', motivo: 'Venta', cantidad: l.cantidad, referencia: p.codigo, usuario: 'bodega' });
      });
    }
  });
  movimientos.push({ id: movId++, fecha: hace(6), productoId: 3, tipo: 'salida', motivo: 'Ajuste', cantidad: 2, referencia: 'Bulto roto en bodega', usuario: 'admin' });

  return { productos, clientes, movimientos, pedidos };
}

const DB = {
  data: null,

  /**
   * Carga los datos desde localStorage o crea los de demostración.
   */
  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (raw) {
      this.data = JSON.parse(raw);
    } else {
      this.data = buildSeed();
      this.save();
    }
  },

  /**
   * Persiste los datos en localStorage.
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('No fue posible guardar en localStorage', e);
    }
  },

  /**
   * Restaura los datos de demostración.
   */
  reset() {
    this.data = buildSeed();
    this.save();
  },

  /**
   * Calcula el siguiente id de una colección.
   * @param {string} coleccion nombre de la colección
   * @returns {number} siguiente id
   */
  nextId(coleccion) {
    const ids = this.data[coleccion].map((x) => x.id);
    let siguiente = 1;
    if (ids.length > 0) {
      siguiente = Math.max(...ids) + 1;
    }
    return siguiente;
  },

  /**
   * Calcula las existencias actuales de un producto a partir de sus movimientos.
   * @param {number} productoId id del producto
   * @returns {number} existencias
   */
  stock(productoId) {
    let total = 0;
    this.data.movimientos.forEach((m) => {
      if (m.productoId === productoId) {
        if (m.tipo === 'entrada') {
          total += m.cantidad;
        } else {
          total -= m.cantidad;
        }
      }
    });
    return total;
  },

  /**
   * Cantidad comprometida en pedidos aún no despachados.
   * @param {number} productoId id del producto
   * @param {number} [exceptoPedidoId] pedido a excluir del cálculo
   * @returns {number} cantidad reservada
   */
  reservado(productoId, exceptoPedidoId) {
    let total = 0;
    this.data.pedidos.forEach((p) => {
      const pendiente = p.estado === 'registrado' || p.estado === 'en preparacion';
      if (pendiente && p.id !== exceptoPedidoId) {
        p.lineas.forEach((l) => {
          if (l.productoId === productoId) {
            total += l.cantidad;
          }
        });
      }
    });
    return total;
  },

  /**
   * Existencias disponibles para vender (stock menos reservado).
   * @param {number} productoId id del producto
   * @param {number} [exceptoPedidoId] pedido a excluir
   * @returns {number} disponible
   */
  disponible(productoId, exceptoPedidoId) {
    return this.stock(productoId) - this.reservado(productoId, exceptoPedidoId);
  },

  /**
   * Busca un producto por id.
   * @param {number} id id del producto
   * @returns {object|undefined} producto
   */
  producto(id) {
    return this.data.productos.find((p) => p.id === id);
  },

  /**
   * Busca un cliente por id.
   * @param {number} id id del cliente
   * @returns {object|undefined} cliente
   */
  cliente(id) {
    return this.data.clientes.find((c) => c.id === id);
  }
};
