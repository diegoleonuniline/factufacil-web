// ============================================
// CONFIGURACIÓN
// ============================================
const API_URL = 'https://factufacil-3a5827bb6dca.herokuapp.com';

// ============================================
// VARIABLES GLOBALES
// ============================================
let tipoLogin = 'invitado';
let sesion = null;
let catalogos = { regimenes: [], usosCfdi: [], empresas: [] };
let razonesSociales = [];
let solicitudesData = [];
let usuariosData = [];
let ticketBase64 = '';
let csfBase64 = '';
let regCsfBase64 = '';
let razonCsfBase64 = '';
let perfilCsfBase64 = '';
let rfcTimeout = null;
let razonSeleccionadaId = null;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCatalogos();
  verificarSesion();
  setupEventListeners();
  
  // Verificar parámetro empresa en URL
  const params = new URLSearchParams(window.location.search);
  const empresaParam = params.get('empresa');
  if (empresaParam) {
    sessionStorage.setItem('empresaPreseleccionada', empresaParam);
  }
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Navegación sidebar cliente
  document.querySelectorAll('#sidebarNav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (!view) return;
      navegarA(view);
      cerrarMenuMobile();
    });
  });
  
  // Navegación sidebar empresa
  document.querySelectorAll('#sidebarNavEmpresa .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (!view) return;
      
      document.querySelectorAll('#sidebarNavEmpresa .nav-item').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('#panelEmpresa .content-view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${view}`)?.classList.add('active');
      
      if (view === 'usuarios-empresa') cargarUsuariosEmpresa();
      cerrarMenuMobile();
    });
  });
  
  // Cerrar modales con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cerrarModalImagen();
      cerrarModalDetalle();
      cerrarModalUsuario();
      cerrarModalRazon();
      cerrarModalDetalleCliente();
    }
  });
}

// ============================================
// API HELPERS
// ============================================
async function apiGet(endpoint) {
  const headers = {};
  if (sesion?.token) headers['Authorization'] = `Bearer ${sesion.token}`;
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, { headers });
    return res.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, mensaje: 'Error de conexión' };
  }
}

async function apiPost(endpoint, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (sesion?.token) headers['Authorization'] = `Bearer ${sesion.token}`;
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, mensaje: 'Error de conexión' };
  }
}

async function apiPut(endpoint, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (sesion?.token) headers['Authorization'] = `Bearer ${sesion.token}`;
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, mensaje: 'Error de conexión' };
  }
}

async function apiDelete(endpoint) {
  const headers = {};
  if (sesion?.token) headers['Authorization'] = `Bearer ${sesion.token}`;
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    });
    return res.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, mensaje: 'Error de conexión' };
  }
}

// ============================================
// CATÁLOGOS
// ============================================
async function cargarCatalogos() {
  try {
    const data = await apiGet('/api/catalogos');
    if (data.success) {
      catalogos = data;
      llenarSelectsCatalogos();
    }
  } catch (e) {
    console.error('Error cargando catálogos:', e);
  }
}

function llenarSelectsCatalogos() {
  const selectsRegimen = ['regRegimen', 'solRegimen', 'perfilRegimen', 'razonRegimen'];
  const selectsUsoCfdi = ['regUsoCfdi', 'solUsoCfdi', 'perfilUsoCfdi', 'razonUsoCfdi'];
  const selectsEmpresa = ['empresaId'];

  selectsRegimen.forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.innerHTML = '<option value="">Selecciona...</option>';
      catalogos.regimenes.forEach(r => {
        sel.innerHTML += `<option value="${r.clave}">${r.clave} - ${r.descripcion}</option>`;
      });
    }
  });

  selectsUsoCfdi.forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.innerHTML = '<option value="">Selecciona...</option>';
      catalogos.usosCfdi.forEach(u => {
        sel.innerHTML += `<option value="${u.clave}">${u.clave} - ${u.descripcion}</option>`;
      });
    }
  });

  selectsEmpresa.forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.innerHTML = '<option value="">Selecciona una tienda...</option>';
      catalogos.empresas.forEach(e => {
        sel.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
      });
    }
  });
}

// ============================================
// SESIÓN
// ============================================
function verificarSesion() {
  const saved = localStorage.getItem('factufacil_sesion');
  if (saved) {
    sesion = JSON.parse(saved);
    razonesSociales = sesion.razones || [];
    
    if (sesion.tipo === 'empresa') {
      mostrarPanelEmpresa();
    } else if (sesion.tipo === 'cliente') {
      mostrarPanelCliente();
    } else {
      mostrarPanelInvitado();
    }
  }
}

function guardarSesion(data) {
  sesion = data;
  razonesSociales = data.razones || [];
  localStorage.setItem('factufacil_sesion', JSON.stringify(data));
}

function logout() {
  sesion = null;
  razonesSociales = [];
  localStorage.removeItem('factufacil_sesion');
  location.reload();
}

// ============================================
// LOGIN / REGISTRO
// ============================================
function selectTipoLogin(tipo) {
  tipoLogin = tipo;
  
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btnTipo${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).classList.add('active');
  
  const invitadoInfo = document.getElementById('invitadoInfo');
  const loginForm = document.getElementById('loginFormContainer');
  const linkRegistro = document.getElementById('linkRegistro');
  const labelUser = document.getElementById('labelLoginUser');
  const inputUser = document.getElementById('loginUser');
  
  if (tipo === 'invitado') {
    invitadoInfo.classList.remove('hidden');
    loginForm.classList.add('hidden');
  } else {
    invitadoInfo.classList.add('hidden');
    loginForm.classList.remove('hidden');
    
    if (tipo === 'cliente') {
      labelUser.textContent = 'Correo electrónico';
      inputUser.placeholder = 'tu@correo.com';
      inputUser.type = 'email';
      linkRegistro.classList.remove('hidden');
    } else {
      labelUser.textContent = 'Usuario';
      inputUser.placeholder = 'usuario123';
      inputUser.type = 'text';
      linkRegistro.classList.add('hidden');
    }
  }
}

function continuarInvitado() {
  guardarSesion({ tipo: 'invitado' });
  mostrarPanelInvitado();
}

async function login() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  
  if (!user || !pass) {
    toast('Completa todos los campos', 'error');
    return;
  }
  
  showLoading('Iniciando sesión...');
  
  try {
    let result;
    if (tipoLogin === 'empresa') {
      result = await apiPost('/api/auth/login-empresa', { usuario: user, password: pass });
    } else {
      result = await apiPost('/api/auth/login-usuario', { email: user, password: pass });
    }
    
    hideLoading();
    
    if (result.success) {
      guardarSesion(result);
      if (result.tipo === 'empresa') {
        mostrarPanelEmpresa();
      } else {
        mostrarPanelCliente();
      }
      toast('¡Bienvenido!', 'success');
    } else {
      toast(result.mensaje || 'Error al iniciar sesión', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

function showRegistro() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('registroSection').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('registroSection').classList.add('hidden');
  document.getElementById('loginSection').classList.remove('hidden');
}

async function registrar() {
  const datos = {
    nombre: document.getElementById('regNombre').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    password: document.getElementById('regPass').value,
    rfc: document.getElementById('regRfc').value.trim().toUpperCase(),
    razon: document.getElementById('regRazon').value.trim(),
    regimen: document.getElementById('regRegimen').value,
    cp: document.getElementById('regCp').value.trim(),
    uso_cfdi: document.getElementById('regUsoCfdi').value,
    csf: regCsfBase64 || null
  };
  
  if (!datos.email || !datos.password || !datos.rfc || !datos.razon || !datos.regimen || !datos.cp || !datos.uso_cfdi) {
    toast('Completa todos los campos obligatorios', 'error');
    return;
  }
  
  showLoading('Creando cuenta...');
  
  try {
    const result = await apiPost('/api/auth/registro', datos);
    hideLoading();
    
    if (result.success) {
      toast('¡Cuenta creada! Inicia sesión.', 'success');
      showLogin();
      selectTipoLogin('cliente');
      document.getElementById('loginUser').value = datos.email;
      
      // Limpiar formulario
      document.getElementById('regNombre').value = '';
      document.getElementById('regEmail').value = '';
      document.getElementById('regPass').value = '';
      document.getElementById('regRfc').value = '';
      document.getElementById('regRazon').value = '';
      document.getElementById('regRegimen').value = '';
      document.getElementById('regCp').value = '';
      document.getElementById('regUsoCfdi').value = '';
      regCsfBase64 = '';
      document.getElementById('regCsfText').textContent = '📄 Subir CSF (opcional)';
    } else {
      toast(result.mensaje || 'Error al registrar', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

// ============================================
// PANELES
// ============================================
function mostrarPanelInvitado() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('registroSection').classList.add('hidden');
  document.getElementById('panelCliente').classList.remove('hidden');
  document.getElementById('panelEmpresa').classList.add('hidden');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('mobileHeader').classList.remove('hidden');
  document.getElementById('bottomNav').classList.remove('hidden');
  
  document.getElementById('sidebarUserName').textContent = 'Invitado';
  document.getElementById('sidebarUserType').textContent = 'Sin cuenta';
  document.getElementById('sidebarAvatar').textContent = '👤';
  
  // Ocultar opciones que requieren cuenta
  document.querySelectorAll('#sidebarNav .nav-item').forEach(n => {
    const view = n.dataset.view;
    if (view === 'dashboard' || view === 'historial' || view === 'perfil') {
      n.style.display = 'none';
    } else {
      n.style.display = 'flex';
    }
  });
  
  document.querySelectorAll('#bottomNav .bottom-nav-item').forEach(n => {
    const view = n.dataset.view;
    if (view === 'dashboard' || view === 'historial' || view === 'perfil') {
      n.style.display = 'none';
    } else {
      n.style.display = 'flex';
    }
  });
  
  // Ocultar selector de razón social
  document.getElementById('selectorRazon')?.classList.add('hidden');
  
  // Preseleccionar empresa si viene de QR
  setTimeout(() => {
    const empresaPre = sessionStorage.getItem('empresaPreseleccionada');
    if (empresaPre) {
      const select = document.getElementById('empresaId');
      if (select) {
        select.value = empresaPre;
        sessionStorage.removeItem('empresaPreseleccionada');
      }
    }
  }, 300);
  
  // Ir a solicitar
  navegarA('solicitar');
}

function mostrarPanelCliente() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('registroSection').classList.add('hidden');
  document.getElementById('panelCliente').classList.remove('hidden');
  document.getElementById('panelEmpresa').classList.add('hidden');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('mobileHeader').classList.remove('hidden');
  document.getElementById('bottomNav').classList.remove('hidden');
  document.getElementById('sidebarNav').style.display = 'block';
  document.getElementById('sidebarNavEmpresa').style.display = 'none';
  
  const u = sesion.usuario || {};
  document.getElementById('sidebarUserName').textContent = u.nombre || u.email || 'Cliente';
  document.getElementById('sidebarUserType').textContent = 'Cliente';
  document.getElementById('sidebarAvatar').textContent = (u.nombre || 'C')[0].toUpperCase();
  document.getElementById('dashboardNombre').textContent = u.nombre || 'Usuario';
  
  // Mostrar todas las opciones
  document.querySelectorAll('#sidebarNav .nav-item').forEach(n => n.style.display = 'flex');
  document.querySelectorAll('#bottomNav .bottom-nav-item').forEach(n => n.style.display = 'flex');
  
  // Cargar perfil
  document.getElementById('perfilNombre').value = u.nombre || '';
  document.getElementById('perfilEmail').value = u.email || '';
  
  if (u.csf) {
    document.getElementById('perfilCsfActual').classList.remove('hidden');
    perfilCsfBase64 = u.csf;
  }
  
  // Mostrar selector de razón social
  document.getElementById('selectorRazon')?.classList.remove('hidden');
  cargarSelectorRazones();
  cargarListaRazones();
  
  // Preseleccionar empresa si viene de QR
  setTimeout(() => {
    const empresaPre = sessionStorage.getItem('empresaPreseleccionada');
    if (empresaPre) {
      const select = document.getElementById('empresaId');
      if (select) {
        select.value = empresaPre;
        sessionStorage.removeItem('empresaPreseleccionada');
      }
      navegarA('solicitar');
      return;
    }
  }, 300);
  
  // Cargar dashboard
  cargarDashboard();
  navegarA('dashboard');
}

function mostrarPanelEmpresa() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('registroSection').classList.add('hidden');
  document.getElementById('panelCliente').classList.add('hidden');
  document.getElementById('panelEmpresa').classList.remove('hidden');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('mobileHeader').classList.remove('hidden');
  document.getElementById('bottomNav').classList.add('hidden');
  
  document.getElementById('sidebarNav').style.display = 'none';
  document.getElementById('sidebarNavEmpresa').style.display = 'block';
  
  document.getElementById('sidebarUserName').textContent = sesion.usuario || 'Empresa';
  document.getElementById('sidebarUserType').textContent = sesion.empresaNombre || 'Empresa';
  document.getElementById('sidebarAvatar').textContent = '🏢';
  
  document.getElementById('empresaNombre').textContent = sesion.empresaNombre || 'Solicitudes';
  
  if (!sesion.admin) {
    document.querySelector('[data-view="usuarios-empresa"]')?.classList.add('hidden');
  }
  
  cargarSolicitudesEmpresa();
  generarQREmpresa();
}

// ============================================
// NAVEGACIÓN CLIENTE
// ============================================
function navegarA(view) {
  // Actualizar sidebar
  document.querySelectorAll('#sidebarNav .nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === view);
  });
  
  // Actualizar bottom nav
  document.querySelectorAll('#bottomNav .bottom-nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === view);
  });
  
  // Mostrar vista
  document.querySelectorAll('#panelCliente .content-view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');
  
  // Cargar datos según vista
  if (view === 'dashboard') cargarDashboard();
  if (view === 'historial') cargarHistorial();
}

function handleBottomNav(btn) {
  const view = btn.dataset.view;
  navegarA(view);
}

// ============================================
// MENÚ MOBILE
// ============================================
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('show');
  overlay.classList.toggle('hidden');
}

function cerrarMenuMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('show');
  overlay.classList.add('hidden');
}

// ============================================
// DASHBOARD
// ============================================
async function cargarDashboard() {
  if (sesion?.tipo !== 'cliente') return;
  
  try {
    const result = await apiGet('/api/clientes/dashboard');
    
    if (result.success) {
      document.getElementById('statTotal').textContent = result.stats.total || 0;
      document.getElementById('statPendientes').textContent = result.stats.pendientes || 0;
      document.getElementById('statFacturadas').textContent = result.stats.facturadas || 0;
      document.getElementById('statRechazadas').textContent = result.stats.rechazadas || 0;
      
      const container = document.getElementById('ultimasSolicitudes');
      if (result.ultimas && result.ultimas.length > 0) {
        container.innerHTML = result.ultimas.map(s => `
          <div class="list-item" onclick="verDetalleSolicitudCliente('${s.id}')">
            <div class="list-header">
              <div class="list-title">${s.tienda}</div>
              <div class="list-amount">${s.monto ? '$' + parseFloat(s.monto).toLocaleString() : '-'}</div>
            </div>
            <div class="list-meta">
              <span>${formatFecha(s.fecha)}</span>
              <span class="badge badge-${getBadgeClass(s.estatus)}">${s.estatus}</span>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>No tienes solicitudes aún</p></div>';
      }
    }
  } catch (e) {
    console.error('Error cargando dashboard:', e);
  }
}

// ============================================
// RAZONES SOCIALES
// ============================================
function cargarSelectorRazones() {
  const select = document.getElementById('solRazonSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">Nueva razón social...</option>';
  razonesSociales.forEach(r => {
    const pred = r.predeterminada ? ' ⭐' : '';
    select.innerHTML += `<option value="${r.id}">${r.rfc} - ${r.razon}${pred}</option>`;
  });
  
  // Seleccionar la predeterminada
  const predeterminada = razonesSociales.find(r => r.predeterminada);
  if (predeterminada) {
    select.value = predeterminada.id;
    cargarDatosRazon(predeterminada.id);
  }
}

function cargarDatosRazon(razonId) {
  razonSeleccionadaId = razonId || null;
  
  if (!razonId) {
    // Limpiar campos para nueva razón
    document.getElementById('solRfc').value = '';
    document.getElementById('solRazon').value = '';
    document.getElementById('solRegimen').value = '';
    document.getElementById('solCp').value = '';
    document.getElementById('solUsoCfdi').value = '';
    document.getElementById('solEmail').value = sesion?.usuario?.email || '';
    document.getElementById('csfFromRazon').classList.add('hidden');
    csfBase64 = '';
    return;
  }
  
  const razon = razonesSociales.find(r => r.id == razonId);
  if (razon) {
    document.getElementById('solRfc').value = razon.rfc || '';
    document.getElementById('solRazon').value = razon.razon || '';
    document.getElementById('solRegimen').value = razon.regimen || '';
    document.getElementById('solCp').value = razon.cp || '';
    document.getElementById('solUsoCfdi').value = razon.uso_cfdi || '';
    document.getElementById('solEmail').value = sesion?.usuario?.email || '';
    
    // Si la razón tiene CSF, mostrar indicador
    if (razon.csf) {
      document.getElementById('csfFromRazon').classList.remove('hidden');
      csfBase64 = razon.csf;
    } else {
      document.getElementById('csfFromRazon').classList.add('hidden');
    }
  }
}

function cargarListaRazones() {
  const container = document.getElementById('listaRazones');
  if (!container) return;
  
  if (razonesSociales.length === 0) {
    container.innerHTML = '<div class="empty"><p>No tienes razones sociales registradas</p></div>';
    return;
  }
  
  container.innerHTML = razonesSociales.map(r => `
    <div class="razon-item ${r.predeterminada ? 'predeterminada' : ''}">
      <div class="razon-header">
        <span class="razon-rfc">${r.rfc}</span>
        ${r.predeterminada ? '<span class="razon-badge">⭐ Predeterminada</span>' : ''}
      </div>
      <div class="razon-nombre">${r.razon}</div>
      <div class="razon-actions">
        ${!r.predeterminada ? `<button class="btn btn-sm btn-secondary" onclick="establecerPredeterminada(${r.id})">⭐ Predeterminar</button>` : ''}
        <button class="btn btn-sm btn-primary" onclick="editarRazon(${r.id})">✏️ Editar</button>
        ${razonesSociales.length > 1 ? `<button class="btn btn-sm btn-danger" onclick="eliminarRazon(${r.id})">🗑️</button>` : ''}
      </div>
    </div>
  `).join('');
}

function abrirModalNuevaRazon() {
  document.getElementById('modalRazonTitulo').textContent = 'Nueva Razón Social';
  document.getElementById('razonEditId').value = '';
  document.getElementById('razonRfc').value = '';
  document.getElementById('razonNombre').value = '';
  document.getElementById('razonRegimen').value = '';
  document.getElementById('razonCp').value = '';
  document.getElementById('razonUsoCfdi').value = '';
  razonCsfBase64 = '';
  document.getElementById('razonCsfText').textContent = '📄 Subir CSF (opcional)';
  document.getElementById('modalRazon').classList.remove('hidden');
}

function editarRazon(id) {
  const razon = razonesSociales.find(r => r.id == id);
  if (!razon) return;
  
  document.getElementById('modalRazonTitulo').textContent = 'Editar Razón Social';
  document.getElementById('razonEditId').value = id;
  document.getElementById('razonRfc').value = razon.rfc || '';
  document.getElementById('razonNombre').value = razon.razon || '';
  document.getElementById('razonRegimen').value = razon.regimen || '';
  document.getElementById('razonCp').value = razon.cp || '';
  document.getElementById('razonUsoCfdi').value = razon.uso_cfdi || '';
  razonCsfBase64 = razon.csf || '';
  document.getElementById('razonCsfText').textContent = razon.csf ? '✅ CSF cargada' : '📄 Subir CSF (opcional)';
  document.getElementById('modalRazon').classList.remove('hidden');
}

function cerrarModalRazon() {
  document.getElementById('modalRazon').classList.add('hidden');
}

async function guardarRazonSocial() {
  const id = document.getElementById('razonEditId').value;
  const datos = {
    rfc: document.getElementById('razonRfc').value.trim().toUpperCase(),
    razon: document.getElementById('razonNombre').value.trim(),
    regimen: document.getElementById('razonRegimen').value,
    cp: document.getElementById('razonCp').value.trim(),
    uso_cfdi: document.getElementById('razonUsoCfdi').value,
    csf: razonCsfBase64 || null
  };
  
  if (!datos.rfc || !datos.razon || !datos.regimen || !datos.cp || !datos.uso_cfdi) {
    toast('Completa todos los campos obligatorios', 'error');
    return;
  }
  
  showLoading('Guardando...');
  
  try {
    let result;
    if (id) {
      result = await apiPut(`/api/clientes/razones/${id}`, datos);
    } else {
      result = await apiPost('/api/clientes/razones', datos);
    }
    
    hideLoading();
    
    if (result.success) {
      toast(id ? 'Razón actualizada' : 'Razón agregada', 'success');
      cerrarModalRazon();
      await recargarRazones();
    } else {
      toast(result.mensaje || 'Error al guardar', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

async function establecerPredeterminada(id) {
  showLoading('Actualizando...');
  
  try {
    const result = await apiPut(`/api/clientes/razones/${id}/predeterminada`, {});
    hideLoading();
    
    if (result.success) {
      toast('Razón predeterminada actualizada', 'success');
      await recargarRazones();
    } else {
      toast(result.mensaje || 'Error', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

async function eliminarRazon(id) {
  if (!confirm('¿Eliminar esta razón social?')) return;
  
  showLoading('Eliminando...');
  
  try {
    const result = await apiDelete(`/api/clientes/razones/${id}`);
    hideLoading();
    
    if (result.success) {
      toast('Razón eliminada', 'success');
      await recargarRazones();
    } else {
      toast(result.mensaje || 'Error', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

async function recargarRazones() {
  try {
    const result = await apiGet('/api/clientes/razones');
    if (result.success) {
      razonesSociales = result.razones;
      sesion.razones = razonesSociales;
      localStorage.setItem('factufacil_sesion', JSON.stringify(sesion));
      cargarSelectorRazones();
      cargarListaRazones();
    }
  } catch (e) {
    console.error('Error recargando razones:', e);
  }
}

// ============================================
// BUSCAR RFC
// ============================================
function buscarDatosPorRFC(rfc) {
  // Si el usuario tiene sesión y razones, no buscar automáticamente
  if (sesion?.tipo === 'cliente' && razonesSociales.length > 0) return;
  
  clearTimeout(rfcTimeout);
  
  const rfcLimpio = rfc.trim().toUpperCase();
  if (rfcLimpio.length < 12) {
    document.getElementById('rfcStatus').classList.add('hidden');
    return;
  }
  
  document.getElementById('rfcLoader').classList.remove('hidden');
  
  rfcTimeout = setTimeout(async () => {
    try {
      const result = await apiGet(`/api/rfc/${rfcLimpio}`);
      document.getElementById('rfcLoader').classList.add('hidden');
      
      const status = document.getElementById('rfcStatus');
      
      if (result.success && result.datos) {
        document.getElementById('solRazon').value = result.datos.razon || '';
        document.getElementById('solRegimen').value = result.datos.regimen || '';
        document.getElementById('solCp').value = result.datos.cp || '';
        document.getElementById('solUsoCfdi').value = result.datos.uso_cfdi || '';
        
        if (result.datos.csf) {
          csfBase64 = result.datos.csf;
          document.getElementById('csfFromRazon').classList.remove('hidden');
        }
        
        status.className = 'rfc-status found';
        status.innerHTML = '✅ Datos encontrados y autocompletados';
        status.classList.remove('hidden');
      } else {
        status.className = 'rfc-status new';
        status.innerHTML = '📝 RFC nuevo - Completa los datos';
        status.classList.remove('hidden');
      }
    } catch (e) {
      document.getElementById('rfcLoader').classList.add('hidden');
    }
  }, 800);
}

// ============================================
// ARCHIVOS
// ============================================
function previewTicket(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      ticketBase64 = e.target.result;
      document.getElementById('ticketPreview').src = ticketBase64;
      document.getElementById('ticketPreview').classList.remove('hidden');
      document.getElementById('ticketUploadText').classList.add('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function previewCSF(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      csfBase64 = e.target.result;
      document.getElementById('csfPreview').textContent = '✅ ' + file.name;
      document.getElementById('csfPreview').classList.remove('hidden');
      document.getElementById('csfUploadText').classList.add('hidden');
      document.getElementById('csfFromRazon')?.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
}

function previewRegCSF(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      regCsfBase64 = e.target.result;
      document.getElementById('regCsfText').textContent = '✅ ' + file.name;
    };
    reader.readAsDataURL(file);
  }
}

function previewRazonCSF(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      razonCsfBase64 = e.target.result;
      document.getElementById('razonCsfText').textContent = '✅ ' + file.name;
    };
    reader.readAsDataURL(file);
  }
}

function previewPerfilCSF(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      perfilCsfBase64 = e.target.result;
      document.getElementById('perfilCsfText').textContent = '✅ ' + file.name;
    };
    reader.readAsDataURL(file);
  }
}

function verCSFPerfil() {
  if (perfilCsfBase64 || sesion?.usuario?.csf) {
    verImagen(perfilCsfBase64 || sesion.usuario.csf);
  }
}

// ============================================
// SOLICITUDES
// ============================================
async function enviarSolicitud() {
  const datos = {
    empresa_id: document.getElementById('empresaId').value,
    razon_id: razonSeleccionadaId,
    rfc: document.getElementById('solRfc').value.trim().toUpperCase(),
    razon: document.getElementById('solRazon').value.trim(),
    regimen: document.getElementById('solRegimen').value,
    cp: document.getElementById('solCp').value.trim(),
    uso_cfdi: document.getElementById('solUsoCfdi').value,
    email: document.getElementById('solEmail').value.trim(),
    monto: document.getElementById('solMonto').value,
    folio: document.getElementById('solFolio').value.trim(),
    notas: document.getElementById('solNotas').value.trim(),
    ticket: ticketBase64,
    csf: csfBase64
  };
  
  if (!datos.empresa_id) {
    toast('Selecciona una tienda', 'error');
    return;
  }
  
  if (!datos.rfc || !datos.razon || !datos.email) {
    toast('Completa los campos obligatorios', 'error');
    return;
  }
  
  if (!ticketBase64) {
    toast('Sube una imagen del ticket', 'error');
    return;
  }
  
  showLoading('Enviando solicitud...');
  
  try {
    const result = await apiPost('/api/solicitudes', datos);
    hideLoading();
    
    if (result.success) {
      toast('¡Solicitud enviada correctamente!', 'success');
      limpiarFormularioSolicitud();
      
      if (sesion?.tipo === 'cliente') {
        cargarDashboard();
        navegarA('dashboard');
      }
    } else {
      toast(result.mensaje || 'Error al enviar', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

function limpiarFormularioSolicitud() {
  if (sesion?.tipo !== 'cliente') {
    document.getElementById('solRfc').value = '';
    document.getElementById('solRazon').value = '';
    document.getElementById('solRegimen').value = '';
    document.getElementById('solCp').value = '';
    document.getElementById('solUsoCfdi').value = '';
    document.getElementById('solEmail').value = '';
  }
  
  document.getElementById('solCC').value = '';
  document.getElementById('solMonto').value = '';
  document.getElementById('solFolio').value = '';
  document.getElementById('solNotas').value = '';
  
  ticketBase64 = '';
  
  document.getElementById('ticketPreview').classList.add('hidden');
  document.getElementById('ticketUploadText').classList.remove('hidden');
  document.getElementById('csfPreview').classList.add('hidden');
  document.getElementById('csfUploadText').classList.remove('hidden');
  document.getElementById('rfcStatus').classList.add('hidden');
  
  document.getElementById('ticketFile').value = '';
  document.getElementById('csfFile').value = '';
}

// ============================================
// HISTORIAL CLIENTE
// ============================================
async function cargarHistorial() {
  if (sesion?.tipo !== 'cliente') return;
  
  const container = document.getElementById('historialList');
  container.innerHTML = '<div class="loader"></div>';
  
  try {
    const result = await apiGet('/api/solicitudes/mis');
    
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(s => `
        <div class="list-item" onclick="verDetalleSolicitudCliente('${s.id}')">
          <div class="list-header">
            <div class="list-title">${s.tienda}</div>
            <div class="list-amount">${s.monto ? '$' + parseFloat(s.monto).toLocaleString() : '-'}</div>
          </div>
          <div class="list-details">
            <strong>RFC:</strong> ${s.rfc}<br>
            <strong>Folio:</strong> ${s.folio || '-'}
          </div>
          <div class="list-meta">
            <span>${formatFecha(s.fecha)}</span>
            <span class="badge badge-${getBadgeClass(s.estatus)}">${s.estatus}</span>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>No tienes solicitudes</p></div>';
    }
  } catch (e) {
    container.innerHTML = '<div class="empty"><p>Error al cargar</p></div>';
  }
}

async function verDetalleSolicitudCliente(uuid) {
  showLoading('Cargando...');
  
  try {
    const result = await apiGet(`/api/solicitudes/${uuid}`);
    hideLoading();
    
    if (result.success && result.solicitud) {
      const s = result.solicitud;
      
      document.getElementById('detalleClienteBody').innerHTML = `
        <div class="modal-detalle-grid">
          <div class="modal-detalle-section">
            <h3>📋 Información General</h3>
            <div class="detalle-row"><span class="detalle-label">Tienda</span><span class="detalle-value">${s.tienda}</span></div>
            <div class="detalle-row"><span class="detalle-label">Fecha</span><span class="detalle-value">${formatFecha(s.fecha)}</span></div>
            <div class="detalle-row"><span class="detalle-label">Estatus</span><span class="detalle-value"><span class="badge badge-${getBadgeClass(s.estatus)}">${s.estatus}</span></span></div>
            <div class="detalle-row"><span class="detalle-label">Monto</span><span class="detalle-value" style="font-weight:700;color:var(--success);">${s.monto ? '$' + parseFloat(s.monto).toLocaleString() : '-'}</span></div>
            <div class="detalle-row"><span class="detalle-label">Folio</span><span class="detalle-value">${s.folio || '-'}</span></div>
          </div>
          <div class="modal-detalle-section">
            <h3>💳 Datos Fiscales</h3>
            <div class="detalle-row"><span class="detalle-label">RFC</span><span class="detalle-value">${s.rfc}</span></div>
            <div class="detalle-row"><span class="detalle-label">Razón Social</span><span class="detalle-value">${s.razon}</span></div>
            <div class="detalle-row"><span class="detalle-label">Régimen</span><span class="detalle-value">${s.regimen || '-'}</span></div>
            <div class="detalle-row"><span class="detalle-label">C.P.</span><span class="detalle-value">${s.cp || '-'}</span></div>
            <div class="detalle-row"><span class="detalle-label">Uso CFDI</span><span class="detalle-value">${s.uso_cfdi || '-'}</span></div>
            <div class="detalle-row"><span class="detalle-label">Email</span><span class="detalle-value">${s.email}</span></div>
          </div>
        </div>
        ${s.notas ? `<div class="modal-detalle-section"><h3>📝 Notas</h3><p>${s.notas}</p></div>` : ''}
        <div class="modal-detalle-grid">
          <div class="modal-detalle-section">
            <h3>📷 Ticket</h3>
            ${s.ticket ? `<img src="${s.ticket}" style="max-width:100%;border-radius:8px;cursor:pointer;" onclick="verImagen('${s.ticket}')">` : '<p>Sin ticket</p>'}
          </div>
          <div class="modal-detalle-section">
            <h3>📄 CSF</h3>
            ${s.csf ? `<button class="btn btn-primary" onclick="verImagen('${s.csf}')">Ver CSF</button>` : '<p>Sin CSF</p>'}
          </div>
        </div>
      `;
      
      document.getElementById('modalDetalleCliente').classList.remove('hidden');
    } else {
      toast('No se pudo cargar el detalle', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

function cerrarModalDetalleCliente() {
  document.getElementById('modalDetalleCliente').classList.add('hidden');
}

// ============================================
// PERFIL CLIENTE
// ============================================
async function actualizarPerfil() {
  const datos = {
    nombre: document.getElementById('perfilNombre').value.trim(),
    password: document.getElementById('perfilPass').value,
    csf: perfilCsfBase64 || null
  };
  
  showLoading('Guardando...');
  
  try {
    const result = await apiPut('/api/clientes/perfil', datos);
    hideLoading();
    
    if (result.success) {
      if (result.usuario) {
        sesion.usuario = result.usuario;
        guardarSesion(sesion);
        document.getElementById('sidebarUserName').textContent = result.usuario.nombre || 'Cliente';
        document.getElementById('dashboardNombre').textContent = result.usuario.nombre || 'Usuario';
      }
      if (result.razones) {
        razonesSociales = result.razones;
        cargarSelectorRazones();
        cargarListaRazones();
      }
      toast('Perfil actualizado', 'success');
      document.getElementById('perfilPass').value = '';
      
      if (result.usuario?.csf) {
        document.getElementById('perfilCsfActual').classList.remove('hidden');
      }
    } else {
      toast(result.mensaje || 'Error', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

// ============================================
// PANEL EMPRESA - SOLICITUDES
// ============================================
async function cargarSolicitudesEmpresa() {
  const tbody = document.getElementById('solicitudesEmpresa');
  tbody.innerHTML = '<tr><td colspan="8"><div class="loader"></div></td></tr>';
  
  try {
    const data = await apiGet(`/api/solicitudes/empresa/${sesion.empresaId}`);
    solicitudesData = Array.isArray(data) ? data : [];
    renderSolicitudesEmpresa(solicitudesData);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="8">Error al cargar</td></tr>';
  }
}

function renderSolicitudesEmpresa(data) {
  const tbody = document.getElementById('solicitudesEmpresa');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty" style="padding:40px;">No hay solicitudes</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(s => `
    <tr>
      <td>${formatFecha(s.fecha)}</td>
      <td class="tabla-cliente" onclick="verDetalle('${s.id}')">${s.razon}</td>
      <td>${s.rfc}</td>
      <td class="tabla-monto">${s.monto ? '$' + parseFloat(s.monto).toLocaleString() : '-'}</td>
      <td>${s.ticket ? `<img src="${s.ticket}" class="tabla-miniatura" onclick="event.stopPropagation(); verImagen('${s.ticket}')">` : '<span class="tabla-no-file">-</span>'}</td>
      <td>${s.csf ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); verImagen('${s.csf}')">Ver</button>` : '<span class="tabla-no-file">-</span>'}</td>
      <td><span class="badge badge-${getBadgeClass(s.estatus)}">${s.estatus}</span></td>
      <td class="tabla-acciones">
        ${s.estatus === 'Pendiente' && sesion.permisos !== 'lectura' ? `
          <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); cambiarEstatus('${s.id}', 'Facturado')">✓</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); cambiarEstatus('${s.id}', 'Rechazado')">✗</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function aplicarFiltros() {
  const estado = document.getElementById('filtroEstado').value;
  const desde = document.getElementById('filtroDesde').value;
  const hasta = document.getElementById('filtroHasta').value;
  const buscar = document.getElementById('filtroBuscar').value.toLowerCase();
  
  let filtered = [...solicitudesData];
  
  if (estado) filtered = filtered.filter(s => s.estatus === estado);
  if (desde) filtered = filtered.filter(s => s.fecha >= desde);
  if (hasta) filtered = filtered.filter(s => s.fecha <= hasta + 'T23:59:59');
  if (buscar) filtered = filtered.filter(s => 
    s.rfc.toLowerCase().includes(buscar) || 
    s.razon.toLowerCase().includes(buscar) ||
    s.email.toLowerCase().includes(buscar)
  );
  
  renderSolicitudesEmpresa(filtered);
}

async function cambiarEstatus(id, estatus) {
  showLoading('Actualizando...');
  
  try {
    const result = await apiPut(`/api/solicitudes/${id}/estatus`, { estatus });
    hideLoading();
    
    if (result.success) {
      toast('Estatus actualizado', 'success');
      cargarSolicitudesEmpresa();
    } else {
      toast(result.mensaje || 'Error', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

function verDetalle(id) {
  const s = solicitudesData.find(x => x.id === id);
  if (!s) return;
  
  document.getElementById('detalleInfo').innerHTML = `
    <div class="detalle-row"><span class="detalle-label">Razón Social</span><span class="detalle-value">${s.razon}</span></div>
    <div class="detalle-row"><span class="detalle-label">RFC</span><span class="detalle-value">${s.rfc}</span></div>
    <div class="detalle-row"><span class="detalle-label">Régimen</span><span class="detalle-value">${s.regimen || '-'}</span></div>
    <div class="detalle-row"><span class="detalle-label">C.P.</span><span class="detalle-value">${s.cp || '-'}</span></div>
    <div class="detalle-row"><span class="detalle-label">Uso CFDI</span><span class="detalle-value">${s.uso_cfdi || '-'}</span></div>
    <div class="detalle-row"><span class="detalle-label">Email</span><span class="detalle-value">${s.email}</span></div>
    <div class="detalle-row"><span class="detalle-label">Monto</span><span class="detalle-value" style="font-weight:700;color:var(--success);">${s.monto ? '$' + parseFloat(s.monto).toLocaleString() : '-'}</span></div>
    <div class="detalle-row"><span class="detalle-label">Folio</span><span class="detalle-value">${s.folio || '-'}</span></div>
    <div class="detalle-row"><span class="detalle-label">Notas</span><span class="detalle-value">${s.notas || '-'}</span></div>
  `;
  
  document.getElementById('detalleTicket').innerHTML = s.ticket 
    ? `<img src="${s.ticket}" onclick="verImagen('${s.ticket}')" style="max-width:100%; cursor:pointer; border-radius:8px;">`
    : '<p style="color:var(--gray-400);">Sin ticket</p>';
  
  document.getElementById('detalleCSF').innerHTML = s.csf
    ? `<button class="btn btn-primary" onclick="verImagen('${s.csf}')">Ver CSF</button>`
    : '<p style="color:var(--gray-400);">Sin CSF</p>';
  
  document.getElementById('detalleAcciones').innerHTML = s.estatus === 'Pendiente' && sesion.permisos !== 'lectura' ? `
    <button class="btn btn-success" onclick="cambiarEstatus('${s.id}', 'Facturado'); cerrarModalDetalle();">✅ Marcar Facturado</button>
    <button class="btn btn-danger" onclick="cambiarEstatus('${s.id}', 'Rechazado'); cerrarModalDetalle();">❌ Rechazar</button>
  ` : `<span class="badge badge-${getBadgeClass(s.estatus)}" style="font-size:14px;padding:10px 20px;">${s.estatus}</span>`;
  
  document.getElementById('modalDetalle').classList.remove('hidden');
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalle').classList.add('hidden');
}

// ============================================
// PANEL EMPRESA - USUARIOS
// ============================================
async function cargarUsuariosEmpresa() {
  const tbody = document.getElementById('usuariosEmpresa');
  tbody.innerHTML = '<tr><td colspan="7"><div class="loader"></div></td></tr>';
  
  try {
    const data = await apiGet(`/api/usuarios-empresa/${sesion.empresaId}`);
    usuariosData = Array.isArray(data) ? data : [];
    renderUsuariosEmpresa(usuariosData);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7">Error al cargar</td></tr>';
  }
}

function renderUsuariosEmpresa(data) {
  const tbody = document.getElementById('usuariosEmpresa');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty" style="padding:40px;">No hay usuarios</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(u => `
    <tr>
      <td>${u.Usuario}</td>
      <td>${u.Nombre}</td>
      <td>${u.Email || '-'}</td>
      <td><span class="badge badge-${u.Permisos === 'gestionar' ? 'done' : 'inactive'}">${u.Permisos}</span></td>
      <td>${u.Admin === 'Si' || u.Admin === 1 ? '✅' : '-'}</td>
      <td><span class="badge badge-${String(u.Estado).toLowerCase() === 'activo' ? 'active' : 'inactive'}">${u.Estado}</span></td>
      <td class="tabla-acciones">
        <button class="btn btn-sm btn-primary" onclick="editarUsuario(${u.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${u.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function abrirModalNuevoUsuario() {
  document.getElementById('modalUsuarioTitulo').textContent = 'Nuevo Usuario';
  document.getElementById('usuarioEditId').value = '';
  document.getElementById('usuarioNombreAcceso').value = '';
  document.getElementById('usuarioNombreCompleto').value = '';
  document.getElementById('usuarioEmail').value = '';
  document.getElementById('usuarioPassword').value = '';
  document.getElementById('usuarioPassword').required = true;
  document.getElementById('usuarioPermisos').value = 'lectura';
  document.getElementById('usuarioAdmin').value = 'No';
  document.getElementById('usuarioEstado').value = 'Activo';
  document.getElementById('modalUsuario').classList.remove('hidden');
}

function editarUsuario(id) {
  const u = usuariosData.find(x => x.id === id);
  if (!u) return;
  
  document.getElementById('modalUsuarioTitulo').textContent = 'Editar Usuario';
  document.getElementById('usuarioEditId').value = id;
  document.getElementById('usuarioNombreAcceso').value = u.Usuario;
  document.getElementById('usuarioNombreCompleto').value = u.Nombre;
  document.getElementById('usuarioEmail').value = u.Email || '';
  document.getElementById('usuarioPassword').value = '';
  document.getElementById('usuarioPassword').required = false;
  document.getElementById('usuarioPermisos').value = u.Permisos;
  document.getElementById('usuarioAdmin').value = u.Admin === 'Si' || u.Admin === 1 ? 'Si' : 'No';
  document.getElementById('usuarioEstado').value = u.Estado;
  document.getElementById('modalUsuario').classList.remove('hidden');
}

function cerrarModalUsuario() {
  document.getElementById('modalUsuario').classList.add('hidden');
}

async function guardarUsuarioEmpresa() {
  const id = document.getElementById('usuarioEditId').value;
  const datos = {
    empresaId: sesion.empresaId,
    usuario: document.getElementById('usuarioNombreAcceso').value.trim(),
    nombre: document.getElementById('usuarioNombreCompleto').value.trim(),
    email: document.getElementById('usuarioEmail').value.trim(),
    password: document.getElementById('usuarioPassword').value,
    permisos: document.getElementById('usuarioPermisos').value,
    admin: document.getElementById('usuarioAdmin').value,
    estado: document.getElementById('usuarioEstado').value
  };
  
  if (!datos.usuario || !datos.nombre) {
    toast('Completa los campos obligatorios', 'error');
    return;
  }
  
  if (!id && !datos.password) {
    toast('La contraseña es obligatoria para nuevos usuarios', 'error');
    return;
  }
  
  showLoading('Guardando...');
  
  try {
    let result;
    if (id) {
      result = await apiPut(`/api/usuarios-empresa/${id}`, datos);
    } else {
      result = await apiPost('/api/usuarios-empresa', datos);
    }
    
    hideLoading();
    
    if (result.success) {
      toast('Usuario guardado', 'success');
      cerrarModalUsuario();
      cargarUsuariosEmpresa();
    } else {
      toast(result.mensaje || 'Error', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  
  showLoading('Eliminando...');
  
  try {
    const result = await apiDelete(`/api/usuarios-empresa/${id}`);
    hideLoading();
    
    if (result.success) {
      toast('Usuario eliminado', 'success');
      cargarUsuariosEmpresa();
    } else {
      toast(result.mensaje || 'Error', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

// ============================================
// QR EMPRESA
// ============================================
function generarQREmpresa() {
  const alias = sesion.empresaAlias || sesion.empresaId;
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
  const url = `${baseUrl}?empresa=${alias}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=1e293b`;
  
  document.getElementById('qrEmpresaImage').src = qrUrl;
  document.getElementById('qrEmpresaDownload').href = qrUrl;
}

function compartirQR() {
  const alias = sesion.empresaAlias || sesion.empresaId;
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
  const url = `${baseUrl}?empresa=${alias}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Solicita tu factura',
      text: `Escanea este enlace para solicitar tu factura de ${sesion.empresaNombre}`,
      url: url
    });
  } else {
    navigator.clipboard.writeText(url);
    toast('Enlace copiado al portapapeles', 'success');
  }
}

// ============================================
// MODALES DE IMAGEN
// ============================================
function verImagen(url) {
  document.getElementById('modalImg').src = url;
  document.getElementById('modalImagen').classList.remove('hidden');
}

function cerrarModalImagen(event) {
  if (event && event.target.id !== 'modalImagen' && !event.target.classList.contains('modal-close')) {
    return;
  }
  document.getElementById('modalImagen').classList.add('hidden');
}

// ============================================
// UTILIDADES
// ============================================
function showLoading(text = 'Procesando...') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3500);
}

function formatFecha(fecha) {
  if (!fecha) return '-';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getBadgeClass(estatus) {
  switch (estatus) {
    case 'Pendiente': return 'pending';
    case 'Facturado': return 'done';
    case 'Rechazado': return 'rejected';
    default: return 'inactive';
  }
}
