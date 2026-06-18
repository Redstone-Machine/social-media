<script lang="ts">
  import { onMount } from 'svelte';

  let username = $state('');
  let email = $state('');
  let status = $state('');
  let loading = $state(false);
  let users: { id: string; username: string; email: string; createdAt: string }[] = $state([]);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/create-user');
      if (res.ok) {
        const body = await res.json();
        users = body.users ?? [];
      } else {
        users = [];
      }
    } catch (e) {
      users = [];
    }
  }

  async function createAccount() {
    loading = true;
    status = '';

    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email })
    });

    const result = await response.json();

    if (!response.ok) {
      status = `Error: ${result.error ?? 'Could not create user.'}`;
      if (result.details) {
        status += ` — ${result.details}`;
      }
    } else {
      status = `Created user ${result.user.username} (${result.user.email})`;
      username = '';
      email = '';
      await fetchUsers();
    }

    loading = false;
  }

  onMount(() => {
    fetchUsers();
  });
</script>

<main>
  <h1>Test database connection</h1>
  <p>Click the button below to create a test user in SQLite and verify that Prisma works.</p>

  <label>
    Username
    <input bind:value={username} placeholder="testuser" />
  </label>

  <label>
    Email
    <input type="email" bind:value={email} placeholder="test@example.com" />
  </label>

  <button onclick={createAccount} disabled={loading || !username || !email}>
    {loading ? 'Creating…' : 'Create account'}
  </button>

  {#if status}
    <p>{status}</p>
  {/if}

  <section>
    <h2>Existing users</h2>
    {#if users && users.length > 0}
      <table>
        <thead>
          <tr><th>Username</th><th>Email</th><th>Created</th></tr>
        </thead>
        <tbody>
          {#each users as u}
            <tr>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.createdAt}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p>No users yet.</p>
    {/if}
  </section>
</main>
