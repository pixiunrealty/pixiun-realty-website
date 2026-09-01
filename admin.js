const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");

const loginForm = document.getElementById("loginForm");
const propertyForm = document.getElementById("propertyForm");
const logoutBtn = document.getElementById("logoutBtn");

const loginMessage = document.getElementById("loginMessage");
const formMessage = document.getElementById("formMessage");
const adminListings = document.getElementById("adminListings");

let supabase = null;
let editingId = null;
let supabaseConfig = null;


// -----------------------------
// SUPABASE SETUP
// -----------------------------

async function initializeSupabase() {
  try {
    const response = await fetch("/api/config");

    if (!response.ok) {
      throw new Error("Unable to load Supabase configuration.");
    }

    supabaseConfig = await response.json();

    const { createClient } =
      await import(
        "https://esm.sh/@supabase/supabase-js@2"
      );

    supabase = createClient(
      supabaseConfig.url,
      supabaseConfig.key
    );

    checkSession();

  } catch (error) {
    console.error(error);

    loginMessage.textContent =
      "Unable to connect to the admin system.";
  }
}


// -----------------------------
// SESSION
// -----------------------------

async function checkSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    showAdmin();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginSection.classList.remove("hidden");
  adminSection.classList.add("hidden");
}

function showAdmin() {
  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");

  loadListings();
}


// -----------------------------
// LOGIN
// -----------------------------

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    loginMessage.textContent =
      "Signing in...";

    const email =
      document.getElementById("adminEmail").value.trim();

    const password =
      document.getElementById("adminPassword").value;

    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(error);

      loginMessage.textContent =
        error.message;

      return;
    }

    loginMessage.textContent = "";

    showAdmin();
  }
);


// -----------------------------
// LOGOUT
// -----------------------------

logoutBtn.addEventListener(
  "click",
  async () => {

    await supabase.auth.signOut();

    editingId = null;

    propertyForm.reset();

    showLogin();
  }
);


// -----------------------------
// MONEY
// -----------------------------

function money(value) {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }
  ).format(number);
}


// -----------------------------
// ESCAPE HTML
// -----------------------------

function esc(value) {

  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      character =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[character])
    );
}


// -----------------------------
// LOAD LISTINGS
// -----------------------------

async function loadListings() {

  adminListings.innerHTML =
    "<p>Loading properties...</p>";

  const {
    data,
    error
  } = await supabase
    .from("Properties")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(error);

    adminListings.innerHTML =
      `<p class="admin-error">
        Unable to load properties.
      </p>`;

    return;
  }

  if (!data || data.length === 0) {

    adminListings.innerHTML =
      "<p>No properties yet.</p>";

    return;
  }

  adminListings.innerHTML = "";

  for (const property of data) {

    const images =
      await loadPropertyImages(
        property.id
      );

    const image =
      images.length
        ? images[0]
        : "";

    const card =
      document.createElement("div");

    card.className =
      "admin-property";

    card.innerHTML = `

      ${
        image
          ? `
            <img
              src="${esc(image)}"
              alt="${esc(property.Title)}"
              class="admin-property-image"
            >
          `
          : `
            <div class="admin-property-image no-image">
              No photo
            </div>
          `
      }

      <div class="admin-property-info">

        <span class="status">
          ${esc(property.Status || "For Sale")}
        </span>

        <h3>
          ${esc(property.Title || "Property")}
        </h3>

        <p class="admin-location">
          ${esc(property.Location || "")}
        </p>

        <strong>
          ${money(property.Price)}
        </strong>

        <div class="admin-stats">
          <span>
            🛏 ${property.Bedrooms || 0} beds
          </span>

          <span>
            🛁 ${property.Bathrooms || 0} baths
          </span>

          <span>
            📐 ${property.Square_feet || 0} sqft
          </span>
        </div>

        <div class="admin-actions">

          <button
            type="button"
            class="admin-edit"
            data-id="${property.id}"
          >
            Edit
          </button>

          <button
            type="button"
            class="admin-delete"
            data-id="${property.id}"
          >
            Delete
          </button>

        </div>

      </div>
    `;

    adminListings.appendChild(card);
  }

  document
    .querySelectorAll(".admin-edit")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          editProperty(
            button.dataset.id
          );
        }
      );
    });

  document
    .querySelectorAll(".admin-delete")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteProperty(
            button.dataset.id
          );
        }
      );
    });
}


// -----------------------------
// LOAD PROPERTY IMAGES
// -----------------------------

async function loadPropertyImages(
  propertyId
) {

  const {
    data,
    error
  } = await supabase
    .from("Property _image")
    .select("Image_url")
    .eq(
      "Property_id",
      propertyId
    )
    .order(
      "created_at",
      {
        ascending: true
      }
    );

  if (error) {

    console.error(
      "Image loading error:",
      error
    );

    return [];
  }

  return (
    data || []
  )
    .map(
      image => image.Image_url
    )
    .filter(Boolean);
}


// -----------------------------
// CREATE / UPDATE PROPERTY
// -----------------------------

propertyForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    formMessage.textContent =
      editingId
        ? "Updating property..."
        : "Publishing property...";

    const property = {

      Title:
        document
          .getElementById("propertyTitle")
          .value
          .trim(),

      Description:
        document
          .getElementById("propertyDescription")
          .value
          .trim(),

      Price:
        Number(
          document
            .getElementById("propertyPrice")
            .value
        ),

      Location:
        document
          .getElementById("propertyLocation")
          .value
          .trim(),

      Property_type:
        document
          .getElementById("propertyType")
          .value,

      Status:
        document
          .getElementById("propertyStatus")
          .value,

      Bedrooms:
        Number(
          document
            .getElementById("propertyBedrooms")
            .value
        ),

      Bathrooms:
        Number(
          document
            .getElementById("propertyBathrooms")
            .value
        ),

      Square_feet:
        Number(
          document
            .getElementById("propertySquareFeet")
            .value
        )
    };


    // UPDATE
    if (editingId) {

      const {
        error
      } = await supabase
        .from("Properties")
        .update(property)
        .eq(
          "id",
          editingId
        );

      if (error) {

        console.error(error);

        formMessage.textContent =
          error.message;

        return;
      }

      formMessage.textContent =
        "Property updated successfully.";

    }

    // CREATE
    else {

      const {
        data,
        error
      } = await supabase
        .from("Properties")
        .insert(property)
        .select()
        .single();

      if (error) {

        console.error(error);

        formMessage.textContent =
          error.message;

        return;
      }

      await uploadImages(
        data.id
      );

      formMessage.textContent =
        "Property published successfully.";
    }


    editingId = null;

    propertyForm.reset();

    updateFormButton();

    await loadListings();
  }
);


// -----------------------------
// UPLOAD IMAGES
// -----------------------------

async function uploadImages(
  propertyId
) {

  const input =
    document.getElementById(
      "propertyPhotos"
    );

  const files =
    Array.from(
      input.files || []
    );

  if (!files.length) {
    return;
  }

  for (const file of files) {

    const extension =
      file.name
        .split(".")
        .pop()
        .toLowerCase();

    const filename =
      `${crypto.randomUUID()}-${file.name}`;

    const path =
      `${propertyId}/${filename}`;

    const {
      error: uploadError
    } = await supabase.storage
      .from("property-images")
      .upload(
        path,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        }
      );

    if (uploadError) {

      console.error(
        "Image upload error:",
        uploadError
      );

      continue;
    }

    const {
      data: urlData
    } = supabase.storage
      .from("property-images")
      .getPublicUrl(path);

    if (!urlData?.publicUrl) {
      continue;
    }

    const {
      error: imageRecordError
    } = await supabase
      .from("Property _image")
      .insert({
        Property_id: propertyId,
        Image_url: urlData.publicUrl
      });

    if (imageRecordError) {

      console.error(
        "Photo record error:",
        imageRecordError
      );
    }
  }
}


// -----------------------------
// EDIT PROPERTY
// -----------------------------

async function editProperty(
  id
) {

  const {
    data,
    error
  } = await supabase
    .from("Properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {

    console.error(error);

    alert(
      "Unable to load this property."
    );

    return;
  }

  editingId = id;

  document
    .getElementById("propertyTitle")
    .value =
      data.Title || "";

  document
    .getElementById("propertyDescription")
    .value =
      data.Description || "";

  document
    .getElementById("propertyPrice")
    .value =
      data.Price || "";

  document
    .getElementById("propertyLocation")
    .value =
      data.Location || "";

  document
    .getElementById("propertyType")
    .value =
      data.Property_type || "";

  document
    .getElementById("propertyStatus")
    .value =
      data.Status || "";

  document
    .getElementById("propertyBedrooms")
    .value =
      data.Bedrooms || "";

  document
    .getElementById("propertyBathrooms")
    .value =
      data.Bathrooms || "";

  document
    .getElementById("propertySquareFeet")
    .value =
      data.Square_feet || "";

  updateFormButton();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  formMessage.textContent =
    "Editing property. Make your changes and save.";
}


// -----------------------------
// DELETE PROPERTY
// -----------------------------

async function deleteProperty(
  id
) {

  const confirmed =
    confirm(
      "Are you sure you want to delete this property? This cannot be undone."
    );

  if (!confirmed) {
    return;
  }

  try {

    // Get image records first
    const {
      data: images
    } = await supabase
      .from("Property _image")
      .select("Image_url")
      .eq(
        "Property_id",
        id
      );


    // Delete image records
    const {
      error: imageDbError
    } = await supabase
      .from("Property _image")
      .delete()
      .eq(
        "Property_id",
        id
      );

    if (imageDbError) {
      throw imageDbError;
    }


    // Delete property
    const {
      error: propertyError
    } = await supabase
      .from("Properties")
      .delete()
      .eq(
        "id",
        id
      );

    if (propertyError) {
      throw propertyError;
    }


    // Remove storage files
    const paths =
      (images || [])
        .map(
          image => {

            const url =
              image.Image_url;

            if (!url) {
              return null;
            }

            const marker =
              "/property-images/";

            const index =
              url.indexOf(marker);

            if (index === -1) {
              return null;
            }

            return decodeURIComponent(
              url.substring(
                index + marker.length
              )
            );
          }
        )
        .filter(Boolean);

    if (paths.length) {

      await supabase.storage
        .from("property-images")
        .remove(paths);
    }


    if (editingId === id) {

      editingId = null;

      propertyForm.reset();

      updateFormButton();
    }

    await loadListings();

  } catch (error) {

    console.error(
      "Delete error:",
      error
    );

    alert(
      "Unable to delete this property."
    );
  }
}


// -----------------------------
// FORM BUTTON
// -----------------------------

function updateFormButton() {

  const button =
    propertyForm.querySelector(
      'button[type="submit"]'
    );

  if (!button) {
    return;
  }

  button.textContent =
    editingId
      ? "Update Property"
      : "Publish Property";
}


// -----------------------------
// START
// -----------------------------

initializeSupabase();
