/**
 * Motor de Matching – SkillSwap
 *
 * Pesos según requerimientos:
 *   Interés/Categoría   40 %
 *   Horario compatible  30 %
 *   Nivel de habilidad  20 %
 *   Rating promedio     10 %
 */

const PESOS = {
  interes: 40,
  horario: 30,
  nivel: 20,
  rating: 10,
};

// Días por disponibilidad
const DIAS_MATUTINO = ["Lun", "Mar", "Mie", "Jue", "Vie"];
const DIAS_VESPERTINO = ["Lun", "Mar", "Mie", "Jue", "Vie"];
const HORAS_MATUTINO = [8, 9, 10, 11, 12, 13];
const HORAS_VESPERTINO = [14, 15, 16, 17, 18, 19];

function parseIntereses(interesesStr) {
  return String(interesesStr || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function horasCurso(horaInicio) {
  if (!horaInicio) return [];
  const h = parseInt(horaInicio.split(":")[0], 10);
  return [h];
}

function calcularCompatibilidadHorario(disponibilidadUsuario, habilidad) {
  if (!disponibilidadUsuario) return 0;

  const horasHab = horasCurso(habilidad.horario_hora_inicio);
  if (!horasHab.length) return 50; // sin horario definido → neutral

  const disp = String(disponibilidadUsuario).toLowerCase();
  const esMat = disp.includes("matutino");
  const esVesp = disp.includes("vespertino");

  const horasDisp = esMat
    ? HORAS_MATUTINO
    : esVesp
    ? HORAS_VESPERTINO
    : [...HORAS_MATUTINO, ...HORAS_VESPERTINO];

  return horasHab.every((h) => horasDisp.includes(h)) ? 100 : 0;
}

function calcularCompatibilidadInteres(interesesUsuario, habilidad) {
  if (!interesesUsuario || !interesesUsuario.length) return 30;

  const catHab = String(habilidad.categoria || "").toLowerCase();
  const tituloHab = String(habilidad.titulo || "").toLowerCase();
  const descHab = String(habilidad.descripcion || "").toLowerCase();

  for (const interes of interesesUsuario) {
    if (
      catHab.includes(interes) ||
      interes.includes(catHab) ||
      tituloHab.includes(interes) ||
      descHab.includes(interes)
    ) {
      return 100;
    }
  }

  // Mapeo de categorías en español
  const mapaCategoria = {
    programacion: ["programación", "codigo", "python", "javascript", "sistemas"],
    math: ["matemáticas", "algebra", "calculo", "estadística"],
    physics: ["física", "electromagnetismo"],
    chemistry: ["química", "orgánica"],
    language: ["inglés", "idioma", "redacción", "escritura"],
    writing: ["redacción", "tesis", "ensayo", "escritura"],
    general: [],
  };

  const sinonimos = mapaCategoria[catHab] || [];
  for (const interes of interesesUsuario) {
    if (sinonimos.some((s) => interes.includes(s) || s.includes(interes))) {
      return 80;
    }
  }

  return 20;
}

function calcularCompatibilidadNivel(habilidad) {
  // Sin información del nivel del usuario, asignamos compatibilidad neutral
  // En el futuro puede extenderse con nivel del usuario
  const nivel = String(habilidad.nivel || "").toLowerCase();
  if (nivel.includes("basico") || nivel.includes("básico")) return 90;
  if (nivel.includes("inter")) return 70;
  return 50;
}

function calcularRatingScore(rating) {
  const r = parseFloat(rating) || 0;
  return Math.round((r / 5) * 100);
}

/**
 * Calcula el porcentaje de match entre un usuario y una habilidad.
 * @param {Object} usuario - row de la tabla usuarios
 * @param {Object} habilidad - row de la tabla habilidades con rating promedio
 * @returns {{ percent: number, razon: string, tipo: string }}
 */
function calcularMatch(usuario, habilidad) {
  const intereses = parseIntereses(usuario.intereses);

  const scoreInteres = calcularCompatibilidadInteres(intereses, habilidad);
  const scoreHorario = calcularCompatibilidadHorario(
    usuario.disponibilidad,
    habilidad
  );
  const scoreNivel = calcularCompatibilidadNivel(habilidad);
  const scoreRating = calcularRatingScore(habilidad.avg_rating);

  const percent = Math.round(
    (scoreInteres * PESOS.interes +
      scoreHorario * PESOS.horario +
      scoreNivel * PESOS.nivel +
      scoreRating * PESOS.rating) /
      100
  );

  // Razón legible
  const razones = [];
  if (scoreInteres >= 80) razones.push("Interés compartido");
  if (scoreHorario === 100) razones.push("Horario compatible");
  if (scoreNivel >= 70) razones.push("Nivel adecuado a ti");
  if (scoreRating >= 80) razones.push("Bien calificado");
  if (!razones.length) razones.push("Recomendado por el sistema");

  // Tipo: si el horario fue el factor clave → schedule, si no → recommended
  const tipo = scoreHorario === 100 && scoreInteres < 80 ? "schedule" : "recommended";

  return {
    percent: Math.min(99, Math.max(1, percent)),
    razon: razones.join(" · "),
    tipo,
  };
}

/**
 * Calcula compatibilidad entre dos usuarios para intercambio.
 * Factores: intereses comunes, disponibilidad similar, carreras distintas (diversidad).
 */
function calcularCompatibilidadUsuarios(usuarioA, usuarioB) {
  const interesesA = parseIntereses(usuarioA.intereses);
  const interesesB = parseIntereses(usuarioB.intereses);

  // Intereses en común
  const comunes = interesesA.filter((i) =>
    interesesB.some((j) => i.includes(j) || j.includes(i))
  );
  const scoreIntereses =
    interesesA.length && interesesB.length
      ? Math.round((comunes.length / Math.max(interesesA.length, interesesB.length)) * 100)
      : 40;

  // Disponibilidad
  const dispA = String(usuarioA.disponibilidad || "").toLowerCase();
  const dispB = String(usuarioB.disponibilidad || "").toLowerCase();
  const scoreDisp = dispA && dispB && dispA === dispB ? 100 : dispA && dispB ? 50 : 30;

  // Carreras distintas = bueno para intercambio
  const scoreDiversidad =
    usuarioA.carrera !== usuarioB.carrera ? 80 : 50;

  const compat = Math.round(
    scoreIntereses * 0.5 + scoreDisp * 0.3 + scoreDiversidad * 0.2
  );

  return Math.min(99, Math.max(1, compat));
}

module.exports = { calcularMatch, calcularCompatibilidadUsuarios };