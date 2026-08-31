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
    $('loginMessage').textContent =
      'Unable to connect to Supabase.';
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

  const { error } =
    await supabase.auth.signInWithPassword({
      email: $('email').value,
      password: $('password').value
    });

  $('loginMessage').textContent =
    error ? error.message : '';
});

$('logoutBtn').addEventListener('click', () => {
  supabase.auth.signOut();
});

$('propertyForm').addEventListener('submit', async e => {
  e.preventDefault();

  const msg = $('propertyMessage');

  try {
    msg.textContent = 'Step 1/3: Publishing property...';

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error('Please sign in again.');
    }

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

    const { error: propertyError } =
      await supabase
        .from('Properties')
        .insert(property);

    if (propertyError) {
      throw new Error(
        'PROPERTY INSERT FAILED: ' +
        propertyError.message
      );
    }

    msg.textContent = 'Step 2/3: Property saved. Checking photo...';

    const files = [...$('photos').files];

    if (files.length === 0) {
      msg.textContent =
        'Property published successfully. No photo selected.';
      $('propertyForm').reset();
      await loadAdminListings();
      return;
    }

    const {
      data: latestProperty,
      error: findError
    } = await supabase
      .from('Properties')
      .select('id')
      .eq('Title', property.Title)
      .eq('Location', property.Location)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError) {
      throw new Error(
        'COULD NOT FIND PROPERTY ID: ' +
        findError.message
      );
    }

    for (const file of files) {

      msg.textContent =
        'Step 2/3: Uploading photo...';

      const safe = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-');

      const path =
        `${latestProperty.id}/${crypto.randomUUID()}-${safe}`;

      const { error: uploadError } =
        await supabase.storage
          .from('property-images')
          .upload(path, file, {
            upsert: false,
            contentType: file.type
          });

      if (uploadError) {
        throw new Error(
          'PHOTO UPLOAD FAILED: ' +
          uploadError.message
        );
      }

      msg.textContent =
        'Step 3/3: Saving photo information...';

      const { data: urlData } =
        supabase.storage
          .from('property-images')
          .getPublicUrl(path);

      const { error: imageError } =
        await supabase
          .from('property_images')
          .insert({
            property_id: latestProperty.id,
            image_url: urlData.publicUrl
          });

      if (imageError) {
        throw new Error(
          'PHOTO RECORD FAILED: ' +
          imageError.message
        );
      }
    }

    msg.textContent =
      'Property and photo published successfully.';

    $('propertyForm').reset();
    await loadAdminListings();

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
