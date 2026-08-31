import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const $ = id => document.getElementById(id);
let supabase = null;

async function boot() {
  try {
    const r = await fetch('/api/config');
    const cfg = await r.json();

    if (!r.ok) throw new Error(cfg.error);

    supabase = createClient(cfg.url, cfg.key);

    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    setAuth(data.session);

    supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session);
    });

  } catch (e) {
    $('loginMessage').textContent =
      'Unable to connect to Supabase: ' + e.message;
  }
}

function setAuth(session) {
  $('loginPanel').classList.toggle('hidden', !!session);
  $('adminPanel').classList.toggle('hidden', !session);

  if (session) loadAdminListings();
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  $('loginMessage').textContent = 'Signing in...';

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: $('email').value,
      password: $('password').value
    });

  if (error) {
    $('loginMessage').textContent = error.message;
    return;
  }

  const session = data.session;

  let tokenRole = 'unknown';

  try {
    const payload = JSON.parse(
      atob(
        session.access_token
          .split('.')[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/')
      )
    );

    tokenRole = payload.role || 'no role';
  } catch (e) {
    tokenRole = 'could not read token';
  }

  $('loginMessage').textContent =
    'LOGIN OK | Email: ' +
    data.user.email +
    ' | Token role: ' +
    tokenRole;
});

$('logoutBtn').addEventListener('click', () => {
  supabase.auth.signOut();
});

$('propertyForm').addEventListener('submit', async e => {
  e.preventDefault();

  const msg = $('propertyMessage');

  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error('No authenticated user found.');
    }

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session) {
      throw new Error('No active Supabase session.');
    }

    let tokenRole = 'unknown';

    try {
      const payload = JSON.parse(
        atob(
          session.access_token
            .split('.')[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/')
        )
      );

      tokenRole = payload.role || 'no role';
    } catch (e) {
      tokenRole = 'could not read token';
    }

    msg.textContent =
      'User: ' +
      user.email +
      ' | Supabase role: ' +
      tokenRole +
      ' | Publishing...';

    const property = {
      Title: $('title').value.trim(),
      Description: $('description').value.trim(),
      Price: Number($('price').value),
      Location: $('location').value.trim(),
      Property_type: $('propertyType').value,
      Status: $('status').value,
      Bedrooms: Number($('bedrooms').value),
      Bathrooms: Number($('bathrooms').value),
      Square_feet: Number($('squareFeet').value)
    };

    const { data: row, error } =
      await supabase
        .from('Properties')
        .insert(property)
        .select()
        .single();

    if (error) {
      throw new Error(
        'INSERT FAILED | Supabase role: ' +
        tokenRole +
        ' | ' +
        error.message
      );
    }

    msg.textContent =
      'Property inserted successfully.';

    $('propertyForm').reset();

    loadAdminListings();

  } catch (err) {
    msg.textContent =
      err.message ||
      'Could not publish property.';
  }
});

async function loadAdminListings() {
  const box = $('adminListings');

  const { data, error } =
    await supabase
      .from('Properties')
      .select('*')
      .order('created_at', {
        ascending: false
      });

  if (error) {
    box.innerHTML =
      '<p class="form-message">Could not load listings.</p>';
    return;
  }

  box.innerHTML =
    `<h2>Your listings (${data.length})</h2>` +
    data.map(p =>
      `<div class="admin-listing">
        <strong>${esc(p.Title)}</strong>
        <span>${money(p.Price)} · ${esc(p.Location)} · ${esc(p.Status)}</span>
      </div>`
    ).join('');
}

function esc(v) {
  return String(v ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c])
  );
}

function money(v) {
  const n = Number(v);

  return Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(n)
    : '';
}

boot();
