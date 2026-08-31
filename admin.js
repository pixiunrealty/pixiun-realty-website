import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const $ = id => document.getElementById(id);
let supabase = null;

async function boot() {
  try {
    const r = await fetch('/api/config');
    const cfg = await r.json();

    if (!r.ok) throw new Error(cfg.error);

    supabase = createClient(cfg.url, cfg.key);

    const { data } = await supabase.auth.getSession();
    setAuth(data.session);

    supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session);
    });
  } catch (e) {
    $('loginMessage').textContent = 'Unable to connect to Supabase.';
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

  const { error } = await supabase.auth.signInWithPassword({
    email: $('email').value,
    password: $('password').value
  });

  $('loginMessage').textContent = error ? error.message : '';
});

$('logoutBtn').addEventListener('click', () => supabase.auth.signOut());

$('propertyForm').addEventListener('submit', async e => {
  e.preventDefault();

  const msg = $('propertyMessage');
  msg.textContent = 'Publishing...';

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Please sign in again.');

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

    const { data: row, error } = await supabase
      .from('Properties')
      .insert(property)
      .select()
      .single();

    if (error) throw error;

    const files = [...$('photos').files];

    for (const file of files) {
      const safe = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-');

      const path = `${row.id}/${crypto.randomUUID()}-${safe}`;

      const upload = await supabase.storage
        .from('property-images')
        .upload(path, file, {
          upsert: false,
          contentType: file.type
        });

      if (upload.error) throw upload.error;

      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(path);

      const { error: imageError } = await supabase
        .from('property_images')
        .insert({
          property_id: row.id,
          image_url: urlData.publicUrl
        });

      if (imageError) throw imageError;
    }

    msg.textContent = 'Property published successfully.';
    $('propertyForm').reset();
    loadAdminListings();

  } catch (err) {
    msg.textContent = err.message || 'Could not publish property.';
  }
});

async function loadAdminListings() {
  const box = $('adminListings');

  const { data, error } = await supabase
    .from('Properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    box.innerHTML = '<p class="form-message">Could not load listings.</p>';
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
