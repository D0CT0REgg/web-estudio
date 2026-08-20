const PARTICLE_COUNT = 32;
const GLOW_RGB = "255, 221, 140"; // brillo cálido tipo luciérnaga

function createParticle(width, height) {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 1.2 + Math.random() * 1.6,
    baseAlpha: 0.25 + Math.random() * 0.45,
    driftAmplitude: 8 + Math.random() * 18,
    driftPhase: Math.random() * Math.PI * 2,
    driftSpeed: 0.15 + Math.random() * 0.25,
    riseSpeed: 6 + Math.random() * 9,
    flickerSpeed: 0.5 + Math.random() * 1.1,
    flickerPhase: Math.random() * Math.PI * 2,
  };
}

/**
 * Lanza un canvas fijo a pantalla completa con motas de luz flotando lentamente
 * hacia arriba, con parpadeo suave. Respeta prefers-reduced-motion.
 */
export function initParticles() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.id = "fx-particles";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let width = window.innerWidth;
  let height = window.innerHeight;
  let particles = [];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  function seedParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(width, height));
  }

  resize();
  seedParticles();
  window.addEventListener("resize", resize);

  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.y -= p.riseSpeed * dt;
      p.driftPhase += p.driftSpeed * dt;
      p.flickerPhase += p.flickerSpeed * dt;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }

      const x = p.x + Math.sin(p.driftPhase) * p.driftAmplitude;
      const alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(p.flickerPhase));
      const glowRadius = p.radius * 5;

      const gradient = ctx.createRadialGradient(x, p.y, 0, x, p.y, glowRadius);
      gradient.addColorStop(0, `rgba(${GLOW_RGB}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${GLOW_RGB}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, p.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
