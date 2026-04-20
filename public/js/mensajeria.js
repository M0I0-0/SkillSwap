let miNombre = "";
let miSala = "general";
let socket = null;
let typingTimer = null;
let estaEscribiendo = false;
let typingEl = null;

const COLORES = ["av-purple", "av-blue", "av-amber", "av-green", "av-rose"];
const mapaColores = {};

function getColor(nombre) {
  if (!mapaColores[nombre]) {
    mapaColores[nombre] = COLORES[Object.keys(mapaColores).length % COLORES.length];
  }

  return mapaColores[nombre];
}

function getChatInitials(nombre) {
  return getInitials(nombre);
}

function actualizarUI() {
  document.getElementById("navAvatar").textContent = getChatInitials(miNombre);
  document.getElementById("salaLabel").textContent = miSala;
  document.getElementById("headerNombre").textContent = `Sala: ${miSala}`;
  document.getElementById("headerSala").textContent = `#${miSala} · tiempo real`;
  document.getElementById("headerAvatar").textContent = getChatInitials(miNombre);
  document.getElementById("inputMensaje").disabled = false;
  document.getElementById("btnEnviar").disabled = false;
}

function scrollAbajo() {
  const container = document.getElementById("mensajesContainer");
  container.scrollTop = container.scrollHeight;
}

function agregarMensaje({ nombre, texto, hora }) {
  const container = document.getElementById("mensajesContainer");
  const esMio = nombre === miNombre;

  const group = document.createElement("div");
  group.className = `msg-message-group ${esMio ? "sent" : "received"}`;

  if (!esMio) {
    const senderName = document.createElement("div");
    senderName.className = "msg-sender-name";
    senderName.textContent = nombre;
    group.appendChild(senderName);
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = texto;
  group.appendChild(bubble);

  const time = document.createElement("div");
  time.className = "msg-time";
  time.textContent = hora;
  group.appendChild(time);

  container.appendChild(group);
}

function agregarSistema(texto) {
  const element = document.createElement("div");
  element.className = "msg-system";
  element.textContent = texto;
  document.getElementById("mensajesContainer").appendChild(element);
}

function ocultarEscribiendo() {
  if (typingEl) {
    typingEl.remove();
    typingEl = null;
  }
}

function mostrarEscribiendo(nombre) {
  ocultarEscribiendo();
  typingEl = document.createElement("div");
  typingEl.className = "msg-typing-indicator";
  typingEl.innerHTML = `${nombre} está escribiendo <div class="typing-dots"><span></span><span></span><span></span></div>`;
  document.getElementById("mensajesContainer").appendChild(typingEl);
  scrollAbajo();
}

function actualizarListaUsuarios(usuarios) {
  const lista = document.getElementById("usuariosList");
  document.getElementById("headerConteo").textContent = `${usuarios.length} en la sala`;
  lista.innerHTML = "";

  usuarios.forEach((usuario) => {
    const esTu = usuario.nombre === miNombre;
    const item = document.createElement("div");
    item.className = "msg-user-item";
    item.innerHTML = `
      <div class="msg-avatar ${getColor(usuario.nombre)}">${getChatInitials(usuario.nombre)}</div>
      <div class="msg-user-info">
        <div class="msg-user-name">${usuario.nombre}</div>
        ${esTu ? '<div class="msg-user-you">Tú</div>' : ""}
      </div>
      <div class="msg-online-dot-small"></div>
    `;
    lista.appendChild(item);
  });
}

function limpiarChat() {
  document.getElementById("mensajesContainer").innerHTML = "";
  document.getElementById("usuariosList").innerHTML = "";
  document.getElementById("inputMensaje").disabled = true;
  document.getElementById("btnEnviar").disabled = true;
}

function iniciarSocket() {
  if (socket) {
    socket.disconnect();
  }

  socket = io();
  socket.emit("unirse", { nombre: miNombre, sala: miSala });

  socket.on("historial", (mensajes) => {
    document.getElementById("mensajesContainer").innerHTML = "";
    mensajes.forEach((mensaje) => agregarMensaje(mensaje));
    scrollAbajo();
  });

  socket.on("nuevoMensaje", (mensaje) => {
    agregarMensaje(mensaje);
    scrollAbajo();
  });

  socket.on("usuarioConectado", ({ nombre, usuarios }) => {
    agregarSistema(`${nombre} entró a la sala`);
    actualizarListaUsuarios(usuarios);
    scrollAbajo();
  });

  socket.on("usuarioDesconectado", ({ nombre, usuarios }) => {
    agregarSistema(`${nombre} salió de la sala`);
    actualizarListaUsuarios(usuarios);
    scrollAbajo();
  });

  socket.on("usuarioEscribiendo", ({ nombre }) => mostrarEscribiendo(nombre));
  socket.on("usuarioDejoDeEscribir", () => ocultarEscribiendo());
}

function entrarASala() {
  miSala = document.getElementById("inputSala").value;
  document.getElementById("modal").classList.add("hidden");
  limpiarChat();
  actualizarUI();
  iniciarSocket();
}

async function initMensajeria() {
  try {
    const user = await fetchCurrentUserProfile();

    if (!user) {
      redirectToLogin();
      return;
    }

    miNombre = user.fullName || user.nombres || "Usuario SkillSwap";
    actualizarUI();
    iniciarSocket();
  } catch (error) {
    console.error(error);
    redirectToLogin();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnEntrar").addEventListener("click", entrarASala);

  document.getElementById("formMensaje").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("inputMensaje");
    const texto = input.value.trim();

    if (!texto || !socket) {
      return;
    }

    socket.emit("mensaje", { texto });
    input.value = "";
    socket.emit("dejoDeEscribir");
    estaEscribiendo = false;
  });

  document.getElementById("inputMensaje").addEventListener("input", () => {
    if (!socket) {
      return;
    }

    if (!estaEscribiendo) {
      estaEscribiendo = true;
      socket.emit("escribiendo");
    }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      estaEscribiendo = false;
      socket.emit("dejoDeEscribir");
    }, 1500);
  });

  document.getElementById("btnCambiarSala").addEventListener("click", () => {
    document.getElementById("modal").classList.remove("hidden");
  });

  initMensajeria();
});
