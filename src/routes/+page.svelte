<script lang="ts">
  import { onMount } from 'svelte';

  type PageData = {
    user: {
      id: string;
      username: string;
      type: string;
    } | null;
  };

  let { data } = $props<{ data: PageData }>();

  let username = $state('');
  let password = $state('');
  let status = $state('');
  let loading = $state(false);
  let users: { id: string; username: string; type: string; createdAt: string }[] = $state([]);

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
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (!response.ok) {
      status = `Error: ${result.error ?? 'Could not create user.'}`;
      if (result.details) {
        status += ` — ${result.details}`;
      }
    } else {
      status = `Created user ${result.user.username} (${result.user.type})`;
      username = '';
      password = '';
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

  {#if data?.user}
    <p>Signed in as <strong>{data.user.username}</strong> ({data.user.type})</p>
  {:else}
    <p>
      Not signed in yet. Go to <a href="/login">/login</a> to log in with your account.
    </p>
  {/if}

  <label>
    Username
    <input bind:value={username} placeholder="testuser" />
  </label>

  <label>
    Password
    <input type="password" bind:value={password} placeholder="password" />
  </label>

  <button onclick={createAccount} disabled={loading || !username || !password}>
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
          <tr><th>Username</th><th>Type</th><th>Created</th></tr>
        </thead>
        <tbody>
          {#each users as u}
            <tr>
              <td>{u.username}</td>
              <td>{u.type}</td>
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
