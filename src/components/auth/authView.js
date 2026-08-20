import { supabase } from "../../supabaseClient.js";

export function renderLogin(container, { onLoggedIn }) {
  container.innerHTML = `
    <div class="centered-screen">
      <div class="auth-card fx-fade-in">
        <h1>Web estudio</h1>
        <form id="login-form">
          <input type="email" id="email" placeholder="Email" autocomplete="username" required />
          <input type="password" id="password" placeholder="Contraseña" autocomplete="current-password" required />
          <button type="submit" class="btn-primary">Entrar</button>
        </form>
        <p class="auth-status" id="auth-status"></p>
      </div>
    </div>
  `;

  const form = container.querySelector("#login-form");
  const status = container.querySelector("#auth-status");
  const button = form.querySelector("button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    status.className = "auth-status";
    button.disabled = true;

    const email = form.querySelector("#email").value.trim();
    const password = form.querySelector("#password").value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    button.disabled = false;

    if (error) {
      status.textContent = error.message;
      status.className = "auth-status error";
      return;
    }

    onLoggedIn(data.session);
  });
}
