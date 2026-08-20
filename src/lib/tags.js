export const SUBJECTS = [
  "Technologie",
  "Histoire Géographie",
  "Français",
  "EPS",
  "SVT",
  "Physique Chimie",
  "Anglais",
  "Mathématiques",
  "Éducation Musicale",
  "Valencien",
  "Arts Plastiques",
  "Lengua y Literatura",
  "Hist-Géo Española",
  "Otro",
];

export const BREVET_SUBJECTS = [
  "Brevet - Français",
  "Brevet - Mathématiques",
  "Brevet - Hist-Géo-EMC",
  "Brevet - Physique-Chimie",
  "Brevet - SVT",
  "Brevet - Technologie",
  "Brevet - Oral",
];

export const TASK_TYPES = [
  "Teoría",
  "Ejercicios",
  "Repaso",
  "Ficha/Resumen",
  "Deberes",
  "Proyecto",
  "Examen",
  "Simulacro",
  "Oral/Exposición",
  "Lectura",
  "Otro",
];

export const PRIORITIES = ["Urgente", "Normal", "Baja"];

export function isBrevetSubject(subjectTag) {
  return BREVET_SUBJECTS.includes(subjectTag);
}
