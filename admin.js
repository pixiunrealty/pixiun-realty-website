import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const $ = id => document.getElementById(id);
let supabase = null;

async function boot() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();

    if (!response.ok) {
      throw new Error(config.error || 'Configuration failed.');
    }

    supabase = createClient(config.url, config.key);

    const { data } = await supabase.auth.getSession();
    setAuth(data.session);

    supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session);
    });

  } catch (error) {
    $('loginMessage').textContent =
      'Unable to connect to Supabase.';
  }
}

function setAuth(session) {
  $('loginPanel').classList.toggle('hidden', !!session);
  $('adminPanel').classList.toggle('hidden', !session);

  if (session) {
    loadAdminListings();
  }
}

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();

  $('loginMessage').textContent = 'Signing in...';

  const { error } =
    await supabase.auth.signInWithPassword({
      email: $('email').value,
      password: $('password').value
    });

  $('loginMessage').textContent =
    error ? error.message : '';
});

$('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
});

$('propertyForm').addEventListener('submit', async event => {
  event.preventDefault();

  const message = $('propertyMessage');
  message.textContent = 'Publishing property...';

  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error('Please sign in again.');
    }

    const files = Array.from($('photos').files);

    if (files.length === 0) {
      throw new Error('Please select at least one property photo.');
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

    /*
      STEP 1
      Create the property and get only its ID.
    */

    const {
      data: insertedProperty,
      error: propertyError
    } = await supabase
      .from('Properties')
      .insert(property)
      .select('id')
      .single();

    if (propertyError) {
      throw new Error(
        'PROPERTY INSERT FAILED: ' +
        propertyError.message
      );
    }

    const propertyId = insertedProperty.id;

    /*
      STEP 2
      Upload each selected image to Storage.
    */

    for (const file of files) {

      message.textContent =
        `Uploading photo ${files.indexOf(file) + 1} of ${files.length}...`;

      const safeFileName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-');

      const filePath =
        `${propertyId}/${crypto.randomUUID()}-${safeFileName}`;

      const {
        error: uploadError
      } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        throw new Error(
          'PHOTO UPLOAD FAILED: ' +
          uploadError.message
        );
      }

      /*
        STEP 3
        Get the public URL for the uploaded image.
      */

      const {
        data: publicUrlData
      } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error(
          'Could not create the photo URL.'
        );
      }

      /*
        STEP 4
        Save the image information in the
        actual table in your database:
        "Property _image"
      */

      const {
        error: imageError
      } = await supabase
        .from('Property _image')
        .insert({
          Property_id: propertyId,
          Image_url: publicUrlData.publicUrl
        });

      if (imageError) {
        throw new Error(
          'PHOTO RECORD FAILED: ' +
          imageError.message
        );
      }
    }

    message.textContent =
      'Property and photo(s) published successfully.';

    $('propertyForm').reset();

    await loadAdminListings();

  } catch (error) {

    message.textContent =
      error.message ||
      'Could not publish property.';
  }
});

async function loadAdminListings() {

  const listingsBox = $('adminListings');

  const {
    data,
    error
  } = await supabase
    .from('Properties')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (error) {

    listingsBox.innerHTML =
      '<p class="form-message">Could not load listings.</p>';

    return;
  }

  listingsBox.innerHTML =
    `<h2>Your listings (${data.length})</h2>` +
    data.map(property => `
      <div class="admin-listing">
        <strong>${escapeHtml(property.Title)}</strong>
        <span>
          ${formatMoney(property.Price)}
          · ${escapeHtml(property.Location)}
          · ${escapeHtml(property.Status)}
        </span>
      </div>
    `).join('');
}

function escapeHtml(value) {

  return String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[character])
  );
}

function formatMoney(value) {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(number);
}

boot();
