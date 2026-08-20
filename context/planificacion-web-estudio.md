# Planificación — Web personal de estudio activo

## 1. Stack técnico propuesto

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | HTML + CSS + JavaScript (Vite como bundler) | Sin frameworks pesados, proyecto ligero, fácil de mantener en VS Code, compila a estático para GitHub Pages |
| Interactividad de componentes | JS modular (o Preact si crece mucho la complejidad de UI) | Timer flotante, heatmap, visor PDF y drag&drop necesitan estado, pero no justifican React completo |
| Base de datos + Auth + Storage | Supabase (PostgreSQL) | Capa gratuita generosa, SQL relacional, auth integrada, storage para PDFs |
| Hosting | GitHub Pages | Gratis, enlace público, integración directa con `git push` |
| Despliegue automático | GitHub Actions (build con Vite → deploy a Pages) | Cada push a `main` publica solo |
| Librería PDF | PDF.js | Visor embebido con zoom, sin salir de la página |
| Gráficos de estadísticas | Chart.js o similar | Heatmap, evolución temporal, distribución por asignatura |
| Firma manuscrita | Librería tipo `signature_pad` (canvas + puntero) | Compatible con lápiz digital/tableta |

Autenticación: login simple email+contraseña, cuenta única (solo tú). Row Level Security (RLS) de Supabase activado para que solo tu `user_id` pueda leer/escribir tus datos, aunque el código sea público en GitHub.

---

## 2. Estructura de la web (secciones/pantallas)

Planteada como **single-page app** con navegación lateral fija y un timer flotante persistente que se mantiene visible aunque cambies de sección.

### 🏠 Inicio / Dashboard
- Resumen del día: minutos estudiados hoy, pomodoros completados, tarea/objetivo del día
- Racha actual visible
- Acceso rápido a "Empezar sesión"

### ⏱️ Sesión de estudio (núcleo de la web)
- Selector de modo: Pomodoro (25/5 personalizable) / 52-17 / Flowtime / Cronómetro libre
- Antes de iniciar: **checklist de preparación** (agua, móvil en silencio, baño, etc. — editable)
- Selector de la **tarea del día** a la que corresponde esta sesión (asignatura/tipo/prioridad no se piden aquí, ya vienen de la tarea elegida — ver sección Tareas del día)
- Timer flotante: movible, escalable, minimizable — se mantiene visible en cualquier sección
- Al terminar sesión: se guarda automáticamente en Supabase (duración, tarea vinculada, tags copiadas de la tarea)

### 🌿 Descanso
- Se activa automáticamente al terminar un pomodoro/ciclo
- Sugerencia de actividad rotativa (estirar, 20-20-20, respirar)
- Últimos segundos: aviso de "prepárate, la siguiente sesión empieza en breve"
- Botón de **pausa de emergencia** accesible desde cualquier parte de la web (respiración guiada corta)

### 📝 Tareas del día
- Lista de tareas rápidas (no backlog largo, solo el día)
- Cada tarea: tag de asignatura (obligatoria, con variante "Brevet" activable por casilla, ver sección 3) + tag de tipo (obligatoria) + prioridad (obligatoria)
- Objetivo general del día (campo de texto destacado arriba)
- Scratchpad: bloc de notas volátil, con opción de descargar su contenido como archivo `.md` (no se guarda en Supabase, solo existe mientras no lo descargues)
- Cada tarea puede tener una o varias sesiones de estudio (pomodoros, etc.) vinculadas a ella, para que las estadísticas salgan correctamente

### 🎧 Ambiente
- Reproductor de sonidos (lluvia, cafetería, ruido blanco/marrón)
- Control de volumen independiente
- Modo pantalla completa / distracción cero

### 📜 Contrato
- Primera vez: pantalla de firma con `signature_pad` (compatible lápiz digital)
- Una vez firmado: se guarda imagen de la firma + fecha en Supabase (no se puede refirmar, es un compromiso único)
- Sección donde se puede volver a ver el contrato firmado, con espacio para un comentario corto de "tu yo pasado" (editable una única vez o en el momento de la firma)

### 📊 Estadísticas
- Heatmap estilo GitHub (minutos estudiados por día, todo el histórico)
- Total de horas por semana / mes (selector de rango)
- Gráfico de evolución de pomodoros completados
- Distribución de tiempo por asignatura (gráfico circular o de barras)
- Mejor franja horaria de concentración (basado en horas de inicio de tus sesiones)
- **Progreso de simulacros de examen**:
  - Gráfico de evolución de notas a lo largo del tiempo
  - Media por asignatura, trimestral
  - Media general, trimestral
  - Media por asignatura, histórica (todo el curso)
  - Media general, histórica (todo el curso)
  - Resumen de tipos de error más frecuentes (agregado de todos los simulacros)

### 🎯 Simulacro de examen
- **Configuración previa** (se guarda para lanzar cuando quieras):
  - Nombre del simulacro, asignatura, tags (incluyendo tags de Brevet)
  - Duración y hora de inicio programada
  - Inventario de cosas necesarias (checklist propia del examen)
  - Reglas del examen (texto libre)
  - PDF obligatorio de la hoja de examen (subida → conversión a base64 → Supabase Storage)
- **Modo examen** (al lanzarlo):
  - Pantalla completa obligatoria
  - Visor de PDF embebido (PDF.js) con zoom, sin pestañas externas
  - Timer flotante encima del PDF, movible y escalable
  - Bloqueo de navegación fuera de la sección mientras el examen está activo
  - Sin sonidos de notificación, modo silencioso
- **Al terminar (evaluación)**:
  - Junto al PDF del enunciado, se adjunta también un **PDF de corrección** (mismo mecanismo: subida → base64 → Supabase Storage), disponible solo a la hora de corregir, no durante el examen
  - La corrección se puede hacer **al momento o más tarde** (botón "Corregir ahora" / "Corregir más tarde"): si el simulacro fue la última tarea del día, tiene sentido corregir enseguida; si fue de las primeras, mejor dejarlo para el día siguiente con la cabeza más fresca
  - Al corregir: consultas el PDF de corrección y, por cada pregunta o bloque fallado/parcial, registras el **tipo de error** (ej. no sabía la teoría, despiste, falta de tiempo, no entendí el enunciado — lista editable)
  - Se introduce la **nota final** del simulacro
  - Todo esto queda guardado como parte del historial de simulacros y alimenta las estadísticas históricas (ver sección 5)

---

### ⚙️ Ajustes
- Configuración de fechas de los 3 trimestres del curso (inicio y fin de cada uno), usada para calcular las medias trimestrales de los simulacros
- Editable en cualquier momento (por si un trimestre cambia de fechas)

---

## 3. Tags fijas (definidas por ti)

**Asignaturas** (obligatoria, una por tarea):
Technologie, Histoire Géographie, Français, EPS, SVT, Physique Chimie, Anglais, Mathématiques, Éducation Musicale, Valencien, Arts Plastiques, Lengua y Literatura, Hist-Géo Española, **Otro**

**Variante "Brevet"**: casilla junto al selector de asignatura; al marcarla, sustituye las asignaturas normales por estas 7 opciones:
Brevet - Français, Brevet - Mathématiques, Brevet - Hist-Géo-EMC, Brevet - Physique-Chimie, Brevet - SVT, Brevet - Technologie, Brevet - Oral

(El valor elegido, normal o Brevet, se guarda en el mismo campo `subject_tag` — no es una columna aparte.)

**Tipo de tarea** (obligatoria):
Teoría, Ejercicios, Repaso, Ficha/Resumen, Deberes, Proyecto, Examen, Simulacro, Oral/Exposición, Lectura, **Otro**

**Prioridad** (obligatoria): Urgente, Normal, Baja

---

## 4. Esquema de base de datos (Supabase / PostgreSQL)

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
  pdf_storage_path text,          -- PDF del enunciado
  correction_pdf_storage_path text, -- PDF de corrección (solo visible al corregir)
  status text, -- 'scheduled' | 'in_progress' | 'pending_correction' | 'corrected'
  started_at timestamptz,
  ended_at timestamptz,
  corrected_at timestamptz,
  final_grade numeric            -- nota final del simulacro
)

-- Errores registrados al corregir un simulacro (uno por pregunta/bloque fallado)
exam_errors (
  id uuid primary key,
  exam_id uuid references exam_simulations,
  user_id uuid references auth.users,
  topic text,        -- tema/subtema al que pertenecía la pregunta
  error_type text,    -- 'teoria' | 'despiste' | 'tiempo' | 'comprension' | otro (lista editable)
  comment text
)

-- Configuración de fechas de trimestres (editable por ti desde una sección de ajustes)
trimesters (
  id uuid primary key,
  user_id uuid references auth.users,
  trimester_number int, -- 1, 2, 3
  academic_year text,   -- ej. '2025-2026'
  start_date date,
  end_date date
)
```

Las estadísticas (heatmap, totales, distribución por asignatura) se calculan con consultas SQL/vistas directamente sobre `sessions`, sin necesidad de tablas adicionales.

---

## 5. Estructura de carpetas del proyecto (VS Code)

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
        └── deploy.yml       (build + deploy automático a Pages)
```

---

## 6. Orden de desarrollo recomendado (fases)

1. **Base del proyecto**: estructura Vite + conexión a Supabase + login
2. **Sesión de estudio + timer** (Pomodoro/52-17/Flowtime/cronómetro) — es el núcleo, todo lo demás depende de esto
3. **Tareas del día + objetivo + scratchpad**
4. **Estadísticas** (una vez haya datos de sesiones que mostrar)
5. **Contrato firmado**
6. **Ambiente** (sonidos, modo distracción cero)
7. **Bienestar** (descansos, pausa de emergencia)
8. **Simulacro de examen** (la parte más compleja: PDF + timer flotante + modo bloqueado)
9. **Despliegue automático a GitHub Pages**

---

## 7. Pendiente de definir en próximas conversaciones
- Texto exacto del contrato
- Sonidos ambientales concretos a incluir
- Ejercicio de respiración de la pausa de emergencia

