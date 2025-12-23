// ================================
// CONFIGURACIÓN API
// ================================
const API_URL = 'https://factufacil-3a5827bb6dca.herokuapp.com';

// ================================
// VARIABLES GLOBALES
// ================================
let tipoLogin = 'invitado';
let sesion = null;
let catalogos = { regimenes: [], usosCfdi: [], empresas: [] };
let solicitudesData = [];
let usuariosData = [];
let ticketBase64 = '';
let csfBase64 = '';
let rfcTimeout = null;

// ================================
// INICIALIZACIÓN
// ================================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCatalogos();
  verificarSesion();
  setupNavigation();
  
  const params = new URLSearchParams(window.location.search);
  const empresaParam = params.get('empresa');
  if (empresaParam) {
    setTimeout(() => {
      document.getElementById('empresaId').value = empresaParam;
    }, 500);
  }
});

// ================================
// API HELPERS
// ================================
async function apiGet(endpoint) {
  const headers = {};
  if (sesion?.token) {
    headers['Authorization'] = `Bearer ${sesion.token}`;
  }
  const res = await fetch(`${API_URL}${endpoint}`, { headers });
  return res.json();
}

async function apiPost(endpoint, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (sesion?.token) {
    headers['Authorization'] = `Bearer ${sesion.token}`;
  }
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiPut(endpoint, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (sesion?.token) {
    headers['Authorization'] = `Bearer ${sesion.token}`;
  }
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiDelete(endpoint) {
  const headers = {};
  if (sesion?.token) {
    headers['Authorization'] = `Bearer ${sesion.token}`;
  }
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'DELETE',
    headers
  });
  return res.json();
}

// ================================
// CATÁLOGOS
// ================================
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
  const selectsRegimen = ['regRegimen', 'solRegimen', 'perfilRegimen'];
  const selectsUsoCfdi = ['regUsoCfdi', 'solUsoCfdi', 'perfilUsoCfdi'];
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

// ================================
// SESIÓN
// ================================
function verificarSesion() {
  const saved = localStorage.getItem('factufacil_sesion');
  if (saved) {
    sesion = JSON.parse(saved);
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
  localStorage.setItem('factufacil_sesion', JSON.stringify(data));
}

function logout() {
  sesion = null;
  localStorage.removeItem('factufacil_sesion');
  location.reload();
}

// ================================
// LOGIN / REGISTRO
// ================================
function selectTipoLogin(tipo) {
  tipoLogin = tipo;
  
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btnTipo${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).classList.add('active');
  
  const invitadoInfo = document.getElementById('invitadoInfo');
  const loginForm = document.getElementById('loginFormContainer');
  const linkRegistro = document.getElementById('linkRegistro');
  const labelUser = document.getElementById('labelLoginUser');
  
  if (tipo === 'invitado') {
    invitadoInfo.classList.remove('hidden');
    loginForm.classList.add('hidden');
  } else {
    invitadoInfo.classList.add('hidden');
    loginForm.classList.remove('hidden');
    
    if (tipo === 'cliente') {
      labelUser.textContent = 'Correo electrónico';
      document.getElementById('loginUser').placeholder = 'tu@correo.com';
      document.getElementById('loginUser').type = 'email';
      linkRegistro.classList.remove('hidden');
    } else {
      labelUser.textContent = 'Usuario';
      document.getElementById('loginUser').placeholder = 'usuario123';
      document.getElementById('loginUser').type = 'text';
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
    uso_cfdi: document.getElementById('regUsoCfdi').value
  };
  
  if (!datos.email || !datos.password || !datos.rfc || !datos.razon) {
    toast('Completa los campos obligatorios', 'error');
    return;
  }
  
  showLoading('Creando cuenta...');
  
  try {
    const result = await apiPost('/api/auth/registro', datos);
    hideLoading();
    
    if (result.success) {
      toast('Cuenta creada. Inicia sesión.', 'success');
      showLogin();
      selectTipoLogin('cliente');
      document.getElementById('loginUser').value = datos.email;
    } else {
      toast(result.mensaje || 'Error al registrar', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

// ================================
// PANELES
// ================================
function mostrarPanelInvitado() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('panelCliente').classList.remove('hidden');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('mobileHeader').classList.remove('hidden');
  document.getElementById('bottomNav').classList.remove('hidden');
  
  document.getElementById('sidebarUserName').textContent = 'Invitado';
  document.getElementById('sidebarUserType').textContent = 'Sin cuenta';
  document.getElementById('sidebarAvatar').textContent = '👤';
  
  document.querySelector('[data-view="historial"]')?.parentElement.querySelectorAll('.nav-item').forEach(n => {
    if (n.dataset.view === 'historial' || n.dataset.view === 'perfil') {
      n.style.display = 'none';
    }
  });
  
  document.querySelectorAll('.bottom-nav-item').forEach(n => {
    if (n.dataset.view === 'historial' || n.dataset.view === 'perfil') {
      n.style.display = 'none';
    }
  });
}

function mostrarPanelCliente() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('panelCliente').classList.remove('hidden');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('mobileHeader').classList.remove('hidden');
  document.getElementById('bottomNav').classList.remove('hidden');
  
  const u = sesion.usuario || {};
  document.getElementById('sidebarUserName').textContent = u.nombre || u.email || 'Cliente';
  document.getElementById('sidebarUserType').textContent = 'Cliente';
  document.getElementById('sidebarAvatar').textContent = (u.nombre || 'C')[0].toUpperCase();
  
  if (u.rfc) {
    document.getElementById('solRfc').value = u.rfc;
    document.getElementById('solRazon').value = u.razon || '';
    document.getElementById('solRegimen').value = u.regimen || '';
    document.getElementById('solCp').value = u.cp || '';
    document.getElementById('solUsoCfdi').value = u.uso_cfdi || '';
    document.getElementById('solEmail').value = u.email || '';
  }
  
  document.getElementById('perfilNombre').value = u.nombre || '';
  document.getElementById('perfilEmail').value = u.email || '';
  document.getElementById('perfilRfc').value = u.rfc || '';
  document.getElementById('perfilRazon').value = u.razon || '';
  document.getElementById('perfilRegimen').value = u.regimen || '';
  document.getElementById('perfilCp').value = u.cp || '';
  document.getElementById('perfilUsoCfdi').value = u.uso_cfdi || '';
}

function mostrarPanelEmpresa() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('panelEmpresa').classList.remove('hidden');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('mobileHeader').classList.remove('hidden');
  
  document.getElementById('sidebarNav').style.display = 'none';
  document.getElementById('sidebarNavEmpresa').style.display = 'block';
  document.getElementById('bottomNav').classList.add('hidden');
  
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

// ================================
// NAVEGACIÓN
// ================================
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (!view) return;
      
      btn.closest('.sidebar-nav').querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      
      if (view.includes('empresa')) {
        document.querySelectorAll('#panelEmpresa .content-view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`)?.classList.add('active');
        
        if (view === 'usuarios-empresa') cargarUsuariosEmpresa();
      } else {
        document.querySelectorAll('#panelCliente .content-view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`)?.classList.add('active');
        
        if (view === 'historial') cargarHistorial();
      }
    });
  });
}

function handleBottomNav(btn) {
  const view = btn.dataset.view;
  
  document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
  btn.classList.add('active');
  
  document.querySelectorAll('#panelCliente .content-view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');
  
  if (view === 'historial') cargarHistorial();
}

function toggleMobileMenu() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

// ================================
// BUSCAR RFC
// ================================
function buscarDatosPorRFC(rfc) {
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
        document.getElementById('solEmail').value = result.datos.email || '';
        
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

// ================================
// ARCHIVOS
// ================================
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
    };
    reader.readAsDataURL(file);
  }
}

// ================================
// SOLICITUDES
// ================================
async function enviarSolicitud() {
  const datos = {
    empresa_id: document.getElementById('empresaId').value,
    rfc: document.getElementById('solRfc').value.trim().toUpperCase(),
    razon: document.getElementById('solRazon').value.trim(),
    regimen: document.getElementById('solRegimen').value,
    cp: document.getElementById('solCp').value.trim(),
    uso_cfdi: document.getElementById('solUsoCfdi').value,
    email: document.getElementById('solEmail').value.trim(),
    cc: document.getElementById('solCC').value.trim(),
    monto: document.getElementById('solMonto').value,
    folio: document.getElementById('solFolio').value.trim(),
    notas: document.getElementById('solNotas').value.trim(),
    ticket: ticketBase64,
    csf: csfBase64
  };
  
  if (!datos.empresa_id || !datos.rfc || !datos.razon || !datos.email) {
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
      limpiarFormulario();
    } else {
      toast(result.mensaje || 'Error al enviar', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

function limpiarFormulario() {
  document.getElementById('solRfc').value = '';
  document.getElementById('solRazon').value = '';
  document.getElementById('solRegimen').value = '';
  document.getElementById('solCp').value = '';
  document.getElementById('solUsoCfdi').value = '';
  document.getElementById('solEmail').value = '';
  document.getElementById('solCC').value = '';
  document.getElementById('solMonto').value = '';
  document.getElementById('solFolio').value = '';
  document.getElementById('solNotas').value = '';
  
  ticketBase64 = '';
  csfBase64 = '';
  
  document.getElementById('ticketPreview').classList.add('hidden');
  document.getElementById('ticketUploadText').classList.remove('hidden');
  document.getElementById('csfPreview').classList.add('hidden');
  document.getElementById('csfUploadText').classList.remove('hidden');
  document.getElementById('rfcStatus').classList.add('hidden');
  
  document.getElementById('ticketFile').value = '';
  document.getElementById('csfFile').value = '';
}

// ================================
// HISTORIAL CLIENTE
// ================================
async function cargarHistorial() {
  if (!sesion?.usuario?.email) return;
  
  const container = document.getElementById('historialList');
  container.innerHTML = '<div class="loader"></div>';
  
  try {
    const result = await apiGet(`/api/solicitudes/mis/${sesion.usuario.email}`);
    
    if (result.success && result.data.length > 0) {
      container.innerHTML = result.data.map(s => `
        <div class="list-item">
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

// ================================
// PANEL EMPRESA
// ================================
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
    tbody.innerHTML = '<tr><td colspan="8" class="empty">No hay solicitudes</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(s => `
    <tr>
      <td>${formatFecha(s.fecha)}</td>
      <td class="tabla-cliente" onclick="verDetalle('${s.id}')">${s.razon}</td>
      <td>${s.rfc}</td>
      <td class="tabla-monto">${s.monto ? '$' + parseFloat(s.monto).toLocaleString() : '-'}</td>
      <td>${s.ticket ? `<img src="${s.ticket}" class="tabla-miniatura" onclick="verImagen('${s.ticket}')">` : '<span class="tabla-no-file">-</span>'}</td>
      <td>${s.csf ? `<button class="btn btn-sm btn-primary" onclick="window.open('${s.csf}')">Ver</button>` : '<span class="tabla-no-file">-</span>'}</td>
      <td><span class="badge badge-${getBadgeClass(s.estatus)}">${s.estatus}</span></td>
      <td class="tabla-acciones">
        ${s.estatus === 'Pendiente' && sesion.permisos !== 'lectura' ? `
          <button class="btn btn-sm btn-success" onclick="cambiarEstatus('${s.id}', 'Facturado')">✓</button>
          <button class="btn btn-sm btn-danger" onclick="cambiarEstatus('${s.id}', 'Rechazado')">✗</button>
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

// ================================
// USUARIOS EMPRESA
// ================================
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
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No hay usuarios</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(u => `
    <tr>
      <td>${u.Usuario}</td>
      <td>${u.Nombre}</td>
      <td>${u.Email || '-'}</td>
      <td><span class="badge badge-${u.Permisos === 'gestionar' ? 'done' : 'inactive'}">${u.Permisos}</span></td>
      <td>${u.Admin === 'Si' || u.Admin === 1 ? '✅' : '-'}</td>
      <td><span class="badge badge-${u.Estado === 'activo' ? 'active' : 'inactive'}">${u.Estado}</span></td>
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
  document.getElementById('usuarioEstado').value = 'activo';
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

// ================================
// QR EMPRESA
// ================================
function generarQREmpresa() {
  const alias = sesion.empresaAlias || sesion.empresaId;
  const url = `${window.location.origin}?empresa=${alias}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
  
  document.getElementById('qrEmpresaImage').src = qrUrl;
  document.getElementById('qrEmpresaDownload').href = qrUrl;
}

function compartirQR() {
  const alias = sesion.empresaAlias || sesion.empresaId;
  const url = `${window.location.origin}?empresa=${alias}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Solicita tu factura',
      text: `Escanea este enlace para solicitar tu factura de ${sesion.empresaNombre}`,
      url: url
    });
  } else {
    navigator.clipboard.writeText(url);
    toast('Enlace copiado', 'success');
  }
}

// ================================
// MODALES
// ================================
function verImagen(url) {
  document.getElementById('modalImg').src = url;
  document.getElementById('modalImagen').classList.remove('hidden');
}

function cerrarModal() {
  document.getElementById('modalImagen').classList.add('hidden');
}

function verDetalle(id) {
  const s = solicitudesData.find(x => x.id === id);
  if (!s) return;
  
  document.getElementById('detalleInfo').innerHTML = `
    <div class="info-row"><strong>Razón Social:</strong> ${s.razon}</div>
    <div class="info-row"><strong>RFC:</strong> ${s.rfc}</div>
    <div class="info-row"><strong>Régimen:</strong> ${s.regimen}</div>
    <div class="info-row"><strong>C.P.:</strong> ${s.cp}</div>
    <div class="info-row"><strong>Uso CFDI:</strong> ${s.uso_cfdi}</div>
    <div class="info-row"><strong>Email:</strong> ${s.email}</div>
    <div class="info-row"><strong>Monto:</strong> ${s.monto ? '$' + parseFloat(s.monto).toLocaleString() : '-'}</div>
    <div class="info-row"><strong>Folio:</strong> ${s.folio || '-'}</div>
    <div class="info-row"><strong>Notas:</strong> ${s.notas || '-'}</div>
  `;
  
  document.getElementById('detalleTicket').innerHTML = s.ticket 
    ? `<img src="${s.ticket}" onclick="verImagen('${s.ticket}')" style="max-width:100%; cursor:pointer;">`
    : '<p>Sin ticket</p>';
  
  document.getElementById('detalleCSF').innerHTML = s.csf
    ? `<a href="${s.csf}" target="_blank" class="btn btn-primary">Ver CSF</a>`
    : '<p>Sin CSF</p>';
  
  document.getElementById('detalleAcciones').innerHTML = s.estatus === 'Pendiente' && sesion.permisos !== 'lectura' ? `
    <button class="btn btn-success" onclick="cambiarEstatus('${s.id}', 'Facturado'); cerrarModalDetalle();">✅ Facturar</button>
    <button class="btn btn-danger" onclick="cambiarEstatus('${s.id}', 'Rechazado'); cerrarModalDetalle();">❌ Rechazar</button>
  ` : '';
  
  document.getElementById('modalDetalle').classList.remove('hidden');
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalle').classList.add('hidden');
}

// ================================
// PERFIL
// ================================
async function actualizarPerfil() {
  const datos = {
    nombre: document.getElementById('perfilNombre').value.trim(),
    password: document.getElementById('perfilPass').value,
    rfc: document.getElementById('perfilRfc').value.trim().toUpperCase(),
    razon: document.getElementById('perfilRazon').value.trim(),
    regimen: document.getElementById('perfilRegimen').value,
    cp: document.getElementById('perfilCp').value.trim(),
    uso_cfdi: document.getElementById('perfilUsoCfdi').value
  };
  
  showLoading('Guardando...');
  
  try {
    const result = await apiPut(`/api/usuarios/${sesion.usuario.email}`, datos);
    hideLoading();
    
    if (result.success) {
      if (result.usuario) {
        sesion.usuario = result.usuario;
        guardarSesion(sesion);
      }
      toast('Perfil actualizado', 'success');
      document.getElementById('perfilPass').value = '';
    } else {
      toast(result.mensaje || 'Error', 'error');
    }
  } catch (e) {
    hideLoading();
    toast('Error de conexión', 'error');
  }
}

// ================================
// UTILIDADES
// ================================
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
  setTimeout(() => t.classList.remove('show'), 3000);
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
