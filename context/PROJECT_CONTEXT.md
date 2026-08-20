# PROJECT_CONTEXT.md — Web personal de estudio activo

> Este documento resume toda la planificación acordada en conversaciones previas (fuera de Claude Code). El objetivo es que cualquier sesión de Claude Code pueda continuar el trabajo sin necesidad de que el usuario vuelva a explicar el contexto desde cero.

---

## 1. Objetivo del proyecto

Crear una web personal, de uso individual, enfocada **exclusivamente en el estudio activo** (lo que ocurre durante una sesión de estudio en el momento presente): temporizadores, tareas del día, ambiente de concentración, bienestar y estadísticas de rendimiento propio.

**Distinción clave y motivo de ser del proyecto**: esta web NO sustituye a Notion ni a ninguna herramienta de gestión a largo plazo. No debe contener apuntes, calendario de eventos, planificación de contenidos, ni ningún tipo de información de gestión externa. Todo lo que hay en la web gira en torno a "estudiar ahora mismo" o a "cómo he estudiado hasta ahora" (estadísticas propias derivadas del uso de la web), nunca a "qué tengo que estudiar en el futuro" o "qué contenido tengo que repasar".

El usuario está en el sistema educativo francés y se está preparando activamente para el **Brevet** (examen nacional francés de final de collège), de ahí las tags específicas relacionadas con esa prueba.

---

## 2. Decisiones tomadas (cronológicas, con motivo)

1. **Ámbito de la web**: solo estudio activo, nunca gestión a largo plazo (Notion cubre eso).
2. **Estadísticas históricas SÍ se incluyen**, porque son datos generados por el propio uso de la web (rendimiento propio), no información de gestión externa como apuntes o calendario.
3. **Hosting**: GitHub Pages. Motivo: gratuito, aloja sitios estáticos, da URL pública por enlace, se integra bien con `git push` desde VS Code, que es el editor que usa el usuario.
4. **Persistencia de datos**: se descartó el sistema de `window.storage` propio de los artifacts de Claude.ai porque no funciona fuera de esa interfaz. Se decidió usar un backend real en la nube.
5. **Backend elegido: Supabase** (frente a Firebase). Motivo: PostgreSQL relacional encaja mejor con el modelo de datos (sesiones → tags → asignaturas → estadísticas agregadas) que un modelo NoSQL; capa gratuita generosa (500MB BD, 1GB storage, 50.000 usuarios activos/mes); auth integrada; SDK de JS sencillo.
6. **Autenticación**: login simple email+contraseña, cuenta única (solo el usuario). Row Level Security (RLS) de Supabase activado para que, aunque el código sea público en GitHub, solo el propio usuario pueda leer/escribir sus datos.
7. **Necesidad de multi-dispositivo confirmada**: el usuario estudiará desde varios dispositivos, por eso se descartó la opción de guardar todo solo en `localStorage`/`IndexedDB` del navegador (opción que no sincroniza entre dispositivos).
8. **Stack frontend propuesto**: HTML + CSS + JavaScript con Vite como bundler (sin framework pesado). Alternativa mencionada si la complejidad de UI crece: Preact. **Este punto se propuso pero no llegó a confirmarse explícitamente por el usuario** — revisar/confirmar al empezar la Fase 1.
9. **Editor de desarrollo**: VS Code (ya lo usa el usuario habitualmente).
10. **Firma del contrato**: manuscrita real con lápiz digital sobre tableta (el usuario tiene una), mediante librería tipo `signature_pad` sobre canvas — **no** un campo de texto con fuente manuscrita.
11. **Gestión de asignaturas (tags)**: lista **fija y cerrada**, definida una vez por el usuario, no editable dinámicamente desde la web (ver lista completa en sección 5).
12. **Scratchpad**: es volátil (no se guarda en Supabase). La única forma de "exportarlo" es **descargarlo como archivo `.md`** — se descartó explícitamente la opción de copiar al portapapeles.
13. **Contador de distracciones durante la sesión**: funcionalidad **descartada explícitamente** por el usuario. No debe implementarse. (Se planteó en la fase de brainstorming inicial pero el usuario pidió quitarla del documento de planificación.)
14. **Tags opcionales de sesión/tarea**: de las tres propuestas (Prioridad, Dificultad, Energía), el usuario **solo confirmó Prioridad** (Urgente/Normal/Baja). Dificultad y Energía quedaron descartadas, no confirmadas — no implementar salvo que el usuario las pida explícitamente más adelante.
15. **PDF del simulacro de examen**: debe poder subirse y verse **embebido dentro de la propia web** (no en pestaña externa), usando PDF.js, con opción de zoom. Se eligió explícitamente la opción de guardar el PDF convertido a base64 en Supabase (con límite práctico de ~3.5MB por archivo dado el límite de 5MB por campo tras la conversión a base64), en vez de enlace externo (Google Drive) o subida manual cada vez.
16. **Timer durante el simulacro de examen**: debe quedar flotante encima del PDF (tipo overlay/picture-in-picture), **movible y escalable/redimensionable** por el usuario, no fijo en una posición.
17. **Evaluación del simulacro tras terminar**:
    - Se adjunta un **segundo PDF** (de corrección), independiente del PDF del enunciado, visible solo durante la corrección, no durante el examen.
    - La corrección puede hacerse **al momento o más tarde** (el mismo día o al día siguiente), decisión libre del usuario en cada caso, no automatizada.
    - Por cada pregunta/bloque fallado o parcial se registra el **tipo de error** (no el tema/subtema en detalle como categoría separada obligatoria, sino el tipo: p.ej. no sabía la teoría, despiste, falta de tiempo, no entendí el enunciado — lista pensada como editable).
    - Se registra una **nota final** por simulacro.
18. **Estadísticas de simulacros**: deben incluir gráfico de evolución de notas, media por asignatura trimestral, media general trimestral, media por asignatura histórica, y media general histórica.
19. **Trimestres**: como el usuario no conoce aún las fechas exactas del curso, se decidió **no fijarlas por código**. En su lugar, se añade una sección de Ajustes donde el usuario introduce manualmente el primer y último día de cada uno de los 3 trimestres, editable en cualquier momento.
20. **Documento de planificación entregado**: `planificacion-web-estudio.md`, ya revisado y corregido con comentarios del usuario (ver sección 7 de este documento para los cambios aplicados).
21. **Tag de asignatura "Otro" añadida** a la lista fija, para tareas/sesiones que no encajen en ninguna asignatura concreta del currículo listado. También se añadió "Otro" a la lista de tipo de tarea, y el tipo de tarea pasó a ser **obligatorio** (antes era opcional).
22. **Las tags "Brevet específicas" dejan de ser asignaturas independientes**: pasan a ser una variante del selector de asignatura, activada con una casilla "Brevet" que, al marcarla, sustituye las asignaturas normales por 7 opciones específicas: Brevet - Français, Brevet - Mathématiques, Brevet - Hist-Géo-EMC, Brevet - Physique-Chimie, Brevet - SVT, Brevet - Technologie, Brevet - Oral. Se elimina "DNB Blanc" de esta lista (el simulacro completo de examen ya tiene su propia sección dedicada, no necesita una tag de asignatura aparte).
23. **Las tags (asignatura, tipo de tarea, prioridad) se seleccionan en las TAREAS del día (`daily_tasks`), no en cada sesión/pomodoro.** Al iniciar una sesión de estudio (Pomodoro/52-17/Flowtime/cronómetro), el usuario elige a qué tarea del día corresponde esa sesión (`sessions.task_id`), y las tags de esa tarea se copian a la sesión en el momento de crearla — así las estadísticas se siguen calculando consultando directamente `sessions` (sin joins), y no se rompen si la tarea se edita o se borra más adelante. Motivo: sacar estadísticas correctas por asignatura/tipo requiere que cada bloque de estudio quede vinculado a una tarea concreta, no a tags sueltas re-introducidas cada vez.
24. **"Tareas del día" se construyó antes de lo previsto en el orden de fases** (adelantada desde la fase 3 original a la fase 2), porque la Sesión de estudio depende de poder elegir/crear/editar tareas para vincular las sesiones correctamente. Incluye objetivo del día, lista completa (crear/editar/eliminar/marcar hecha/reordenar arrastrando, con orden persistido en `daily_tasks.position`), y el scratchpad volátil descargable como `.md`.
25. **Vista de Sesión maximizada durante una sesión activa**: mientras hay una sesión en curso y estás en la sección "Sesión de estudio", se oculta el sidebar y se muestra un panel a pantalla completa con el estado en vivo, que cambia de color según la fase: verde (trabajo/concentración), mostaza (descanso), naranja con pulso de aviso (últimos 30 segundos de descanso antes de volver a concentración), gris (pausado). El timer flotante (visible en el resto de secciones) se oculta mientras se ve este panel, para no duplicar controles.
26. **Prioridad pasó a ser obligatoria** (antes era la única tag opcional confirmada). Ahora las tres categorías de tags de una tarea son obligatorias: asignatura, tipo y prioridad.
27. **Nota/detalle de texto libre opcional en cada tarea** (`daily_tasks.notes`), aparte de las tags. Se edita junto al título en el alta rápida y en la edición de la tarea.

---

## 3. Requisitos funcionales (resumen por sección)

### Gestión del tiempo
- Pomodoro timer 25/5 con duración personalizable
- Modo 52/17
- Modo Flowtime (cronómetro libre, el usuario decide cuándo parar)
- Cronómetro simple de estudio libre

### Sesión de estudio (pantalla núcleo)
- Selector de modo de temporización (los 4 anteriores)
- Checklist de preparación antes de empezar (editable, ej. agua, móvil en silencio, baño)
- Selector de la tarea del día a la que corresponde esta sesión (las tags de asignatura/tipo/prioridad **no** se piden aquí, vienen ya definidas en la tarea elegida — ver sección "Tareas del día")
- Timer flotante: movible, escalable, minimizable, visible en cualquier sección de la web mientras hay una sesión activa
- Guardado automático en Supabase al terminar la sesión (duración planeada/real, tarea vinculada, tags copiadas de la tarea, si se completó)

### Tareas del día
- Lista de tareas rápidas (solo del día, no backlog a largo plazo)
- Cada tarea requiere: tag de asignatura obligatoria (con variante "Brevet" activable por casilla, ver sección 5) + tag de tipo obligatoria + prioridad obligatoria
- Campo de objetivo general del día (texto libre destacado)
- Scratchpad volátil descargable como `.md`
- Cada tarea puede tener una o varias sesiones de estudio (pomodoros, etc.) vinculadas a ella

### Ambiente
- Reproductor de sonidos ambientales (lluvia, cafetería, ruido blanco/marrón)
- Control de volumen
- Modo pantalla completa / distracción cero

### Contrato de compromiso
- Firma manuscrita única (con lápiz digital, vía canvas) la primera vez que se usa la web
- Una vez firmado no se puede volver a firmar (es un compromiso único)
- Vista posterior del contrato firmado con la firma real y un comentario corto opcional del "yo pasado"

### Bienestar / pausas activas
- Temporizador de descanso automático tras cada ciclo, con sugerencia de actividad rotativa (estirar, regla 20-20-20, respirar)
- Aviso en los últimos segundos del descanso avisando que la siguiente sesión va a empezar
- Botón de pausa de emergencia accesible desde cualquier sección (ejercicio de respiración corto guiado)

### Estadísticas históricas
- Heatmap estilo GitHub (minutos estudiados por día, histórico completo)
- Total de horas por semana/mes (rango seleccionable)
- Gráfico de evolución de pomodoros completados
- Distribución de tiempo por asignatura
- Mejor franja horaria de concentración (según horas de inicio de sesiones)
- Progreso de simulacros: evolución de notas, medias trimestrales y medias históricas (por asignatura y generales), resumen de tipos de error más frecuentes

### Simulacro de examen
- Configuración previa guardable: nombre, asignatura, tags (incluyendo tags específicas de Brevet), duración, hora de inicio programada, inventario de cosas necesarias, reglas del examen (texto libre), PDF del enunciado obligatorio para poder lanzar el simulacro
- Modo examen: pantalla completa, visor PDF embebido con zoom (PDF.js), timer flotante movible/escalable encima del PDF, bloqueo de navegación fuera de la sección, sin notificaciones
- Evaluación posterior: PDF de corrección adjunto aparte, corrección inmediata o diferida, registro de tipo de error por pregunta/bloque fallado, nota final

### Ajustes
- Configuración de fechas de inicio/fin de los 3 trimestres del curso académico, editable en cualquier momento

---

## 4. Arquitectura propuesta

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | HTML + CSS + JavaScript, con Vite como bundler | Ligero, sin curva de aprendizaje de framework, compila a estático para GitHub Pages |
| Interactividad de componentes complejos | JS modular (o Preact si la complejidad de UI lo justifica) | Timer flotante, heatmap, visor PDF y drag&drop necesitan estado local |
| Base de datos + Auth + Storage | Supabase (PostgreSQL) | Ver decisión #5 |
| Hosting | GitHub Pages | Ver decisión #3 |
| CI/CD | GitHub Actions (build con Vite → deploy a Pages en cada push a `main`) | Automatización del despliegue |
| Visor de PDF | PDF.js | Renderizado embebido con zoom, sin salir de la página |
| Gráficos | Chart.js (o librería equivalente) | Heatmap, evolución temporal, distribución por asignatura, progreso de notas |
| Firma manuscrita | Librería tipo `signature_pad` sobre `<canvas>` | Compatible con lápiz digital/tableta |

**Nota**: la elección exacta de framework/no-framework para el frontend (punto 8 de decisiones) se propuso pero no se confirmó de forma explícita. Confirmarlo al empezar la Fase 1.

### Estructura de carpetas propuesta

```
web-estudio/
├── index.html
├── vite.config.js
├── package.json
├── .env.local              (claves de Supabase, NO se sube a GitHub)
├── .gitignore
├── src/
│   ├── main.js
│   ├── supabaseClient.js
│   ├── styles/
│   │   └── global.css
│   ├── components/
│   │   ├── timer/
│   │   ├── tasks/
│   │   ├── contract/
│   │   ├── stats/
│   │   ├── exam/
│   │   └── ambient/
│   └── lib/
│       ├── pdfViewer.js
│       └── signaturePad.js
└── .github/
    └── workflows/
        └── deploy.yml
```

### Esquema de base de datos (Supabase / PostgreSQL)

```sql
-- Sesiones de estudio (Pomodoro, 52-17, Flowtime, cronómetro)
sessions (
  id uuid primary key,
  user_id uuid references auth.users,
  task_id uuid references daily_tasks, -- tarea del día a la que corresponde esta sesión
  mode text, -- 'pomodoro' | '52-17' | 'flowtime' | 'stopwatch'
  planned_duration_min int,
  actual_duration_min int,
  started_at timestamptz,
  ended_at timestamptz,
  subject_tag text not null, -- copiado de daily_tasks.subject_tag al crear la sesión
  task_type_tag text,        -- copiado de daily_tasks.task_type_tag al crear la sesión
  extra_tags jsonb,          -- copiado de daily_tasks.extra_tags al crear la sesión
  completed boolean default false
)

-- Tareas rápidas del día
daily_tasks (
  id uuid primary key,
  user_id uuid references auth.users,
  date date,
  title text,
  subject_tag text not null,
  task_type_tag text not null,
  extra_tags jsonb,
  notes text, -- nota/detalle libre, opcional
  done boolean default false,
  position int default 0, -- orden manual (drag & drop) dentro del día
  created_at timestamptz
)

-- Objetivo general del día
daily_goals (
  id uuid primary key,
  user_id uuid references auth.users,
  date date unique,
  goal_text text
)

-- Contrato firmado (registro único)
contract (
  id uuid primary key,
  user_id uuid references auth.users,
  signature_image text, -- base64 o ruta en Storage
  signed_at timestamptz,
  past_self_comment text
)

-- Simulacros de examen
exam_simulations (
  id uuid primary key,
  user_id uuid references auth.users,
  title text,
  subject_tag text,
  extra_tags jsonb,
  scheduled_at timestamptz,
  duration_min int,
  needed_items jsonb,
  rules_text text,
  pdf_storage_path text,             -- PDF del enunciado
  correction_pdf_storage_path text,  -- PDF de corrección (solo visible al corregir)
  status text, -- 'scheduled' | 'in_progress' | 'pending_correction' | 'corrected'
  started_at timestamptz,
  ended_at timestamptz,
  corrected_at timestamptz,
  final_grade numeric
)

-- Errores registrados al corregir un simulacro (uno por pregunta/bloque fallado)
exam_errors (
  id uuid primary key,
  exam_id uuid references exam_simulations,
  user_id uuid references auth.users,
  topic text,
  error_type text, -- 'teoria' | 'despiste' | 'tiempo' | 'comprension' | otro (lista editable)
  comment text
)

-- Configuración de fechas de trimestres (editable desde Ajustes)
trimesters (
  id uuid primary key,
  user_id uuid references auth.users,
  trimester_number int, -- 1, 2, 3
  academic_year text,   -- ej. '2025-2026'
  start_date date,
  end_date date
)
```

Las estadísticas generales (heatmap, totales, distribución por asignatura, mejor franja horaria) se calculan mediante consultas SQL/vistas directamente sobre `sessions`, sin tablas adicionales.

### Orden de desarrollo recomendado (fases)

1. Base del proyecto: estructura Vite + conexión a Supabase + login
2. Sesión de estudio + timer (Pomodoro/52-17/Flowtime/cronómetro) — núcleo del proyecto
3. Tareas del día + objetivo + scratchpad
4. Estadísticas (una vez haya datos de sesiones reales)
5. Contrato firmado
6. Ambiente (sonidos, modo distracción cero)
7. Bienestar (descansos, pausa de emergencia)
8. Simulacro de examen (la parte más compleja: PDF + timer flotante + modo bloqueado + evaluación)
9. Despliegue automático a GitHub Pages

Este orden fue una propuesta razonada por dependencias (ej. estadísticas necesita que exista ya el registro de sesiones), no una decisión estricta del usuario — se puede reordenar si conviene.

---

## 5. Tags fijas (cerradas, definidas por el usuario)

**Asignaturas** (obligatoria, una por tarea):
Technologie, Histoire Géographie, Français, EPS, SVT, Physique Chimie, Anglais, Mathématiques, Éducation Musicale, Valencien, Arts Plastiques, Lengua y Literatura, Hist-Géo Española, **Otro**

**Variante "Brevet"**: junto al selector de asignatura hay una casilla **Brevet**. Al marcarla, el selector cambia y muestra en su lugar estas 7 opciones específicas (en vez de las asignaturas normales):
Brevet - Français, Brevet - Mathématiques, Brevet - Hist-Géo-EMC, Brevet - Physique-Chimie, Brevet - SVT, Brevet - Technologie, Brevet - Oral

El valor final seleccionado (normal o Brevet) se guarda igualmente en el único campo `subject_tag` de la tarea — la casilla solo cambia qué lista de opciones se muestra, no añade una columna nueva.

**Tipo de tarea** (obligatoria):
Teoría, Ejercicios, Repaso, Ficha/Resumen, Deberes, Proyecto, Examen, Simulacro, Oral/Exposición, Lectura, **Otro**

**Prioridad** (obligatoria): Urgente, Normal, Baja

Las tags de "tipo de tarea" fueron propuestas por Claude y aceptadas por el usuario sin cambios (salvo "Otro", añadido después junto con el de asignatura). Las asignaturas, "Otro", la variante Brevet y la lista de prioridad fueron aportadas/confirmadas directamente por el usuario.

---

## 6. Restricciones y límites técnicos conocidos

- El storage de tipo `window.storage` (API de artifacts de Claude.ai) **no es aplicable** a este proyecto porque se aloja fuera de esa interfaz — este dato es solo relevante como explicación histórica de por qué se eligió Supabase, no como restricción técnica del proyecto en sí.
- Límite práctico de tamaño de PDF si se guarda como base64 en Supabase: cada campo tiene un límite duro, y la conversión a base64 aumenta el tamaño del archivo original en ~33%. Los PDFs (enunciado y corrección) deben ser ligeros (idealmente por debajo de ~3.5MB en origen).
- El código de la web será público en GitHub (repositorio del proyecto), aunque el sitio publicado en GitHub Pages también sea de acceso público mediante enlace. Por eso es imprescindible que las claves sensibles de Supabase no se suban al repositorio (`.env.local` en `.gitignore`) y que RLS esté correctamente configurado para proteger los datos del usuario a nivel de fila.
- La web es de un único usuario (no hay multiusuario ni gestión de otras cuentas).

---

## 7. Cosas explícitamente descartadas (no implementar salvo nueva petición del usuario)

- Contador de distracciones durante la sesión de estudio.
- Tags opcionales de Dificultad y Energía (solo Prioridad quedó confirmada).
- Copiar el scratchpad al portapapeles como método de exportación (solo descarga como `.md`).
- Cualquier apunte, calendario, o contenido de gestión a largo plazo dentro de esta web (eso vive en Notion, fuera del alcance de este proyecto).
- Gestión dinámica/editable de la lista de asignaturas desde la web (la lista es fija, definida una vez).

---

## 8. Pendiente de definir (no resuelto aún, requiere input del usuario)

- **Texto exacto del contrato de compromiso** (el contenido que se firma).
- **Sonidos ambientales concretos** a incluir en el reproductor (más allá de las categorías ya mencionadas: lluvia, cafetería, ruido blanco/marrón).
- **Ejercicio de respiración concreto** para la pausa de emergencia (duración, guía paso a paso).
- **Confirmación del stack frontend** (Vite + JS vanilla vs. Preact u otra alternativa) — se propuso pero no se confirmó explícitamente.
- Cómo se gestionará visualmente/técnicamente el "topic" (tema/subtema) del campo `topic` en `exam_errors` — se mencionó como idea pero no se detalló su origen (¿lista libre?, ¿ligada a la asignatura?).

---

## 9. Preferencias del usuario a tener en cuenta

- Prefiere que se le pregunte antes de asumir decisiones de diseño ambiguas, en vez de que se inventen valores por defecto sin confirmar.
- Usa VS Code como editor habitual.
- Tiene lápiz digital con tableta gráfica (relevante para cualquier futura funcionalidad de dibujo/entrada manuscrita).
- Está cursando el sistema educativo francés, preparando el Brevet — cualquier terminología o funcionalidad relacionada con exámenes debe considerar el contexto francés (trimestres, tipos de prueba, nomenclatura de asignaturas en francés para varias de ellas).
- Quiere previamente planificar en detalle antes de que se genere código, con preguntas de por medio para evitar confusiones (ver reglas de conversación en la sección 10).

---

## 10. Reglas de conversación para Claude Code en este proyecto

- **Antes de crear o modificar código, planificar exhaustivamente primero.** No generar código directamente a partir de una petición ambigua.
- **Preguntar todo lo necesario antes de implementar**, para evitar confusiones y malentendidos. Ser claro en las preguntas.
- No dar por hecho ni inventar decisiones de diseño que no estén en este documento ni hayan sido confirmadas por el usuario — si algo no está definido (ver sección 8), preguntar antes de asumir un valor por defecto.
- Mantener la distinción de alcance del proyecto: nunca añadir funcionalidades de gestión a largo plazo (apuntes, calendario, planificación de contenidos) aunque parezcan naturales o útiles — eso vive en Notion, fuera de este proyecto.
