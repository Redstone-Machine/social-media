<script lang="ts">
  import { enhance } from '$app/forms';

  type PageData = {
    user: {
      id: string;
      username: string;
      type: string;
    } | null;
    csrfToken: string;
  };

  let { form, data } = $props<{ form: { error?: string } | null; data: PageData }>();
</script>

<svelte:head>
  <title>Login</title>
</svelte:head>

<main class="login-shell">
  <section class="login-card">
    <div class="login-copy">
      <p class="eyebrow">Social media</p>
      <h1>Log in</h1>
      <p>Use your username and password to get into the app.</p>
    </div>

    <form method="POST" use:enhance class="login-form">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <label>
        Username
        <input name="username" autocomplete="username" placeholder="admin" />
      </label>

      <label>
        Password
        <input name="password" type="password" autocomplete="current-password" placeholder="••••••••" />
      </label>

      {#if form?.error}
        <p class="error">{form.error}</p>
      {/if}

      <button type="submit">Log in</button>
    </form>

    {#if data.user}
      <p class="signed-in">Signed in as {data.user.username}</p>
    {/if}
  </section>
</main>

<style>
  .login-shell {
    min-height: calc(100vh - 4rem);
    display: grid;
    place-items: center;
    padding: 2rem;
  }

  .login-card {
    width: min(100%, 28rem);
    border: 1px solid var(--color-gray-300);
    border-radius: 1.25rem;
    padding: 2rem;
    background: var(--color-background);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
    display: grid;
    gap: 1.5rem;
  }

  .login-copy {
    display: grid;
    gap: 0.5rem;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  h1 {
    font-size: 2rem;
    line-height: 1.1;
    color: var(--color-text);
  }

  p {
    color: var(--color-text-secondary);
  }

  .login-form {
    display: grid;
    gap: 1rem;
  }

  label {
    display: grid;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .error {
    color: var(--color-error);
    font-size: 0.95rem;
  }

  .signed-in {
    font-size: 0.95rem;
  }

  button {
    margin-top: 0.5rem;
    padding: 0.85rem 1rem;
    border-radius: 0.85rem;
    background: var(--color-primary);
    color: var(--color-white);
    font-weight: 700;
    transition: transform 0.15s ease, background-color 0.15s ease;
  }

  button:hover {
    transform: translateY(-1px);
    background: var(--color-primary-dark);
  }
</style>
