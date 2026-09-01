const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");

const loginForm = document.getElementById("loginForm");
const propertyForm = document.getElementById("propertyForm");
const logoutBtn = document.getElementById("logoutBtn");

const loginMessage = document.getElementById("loginMessage");
const formMessage = document.getElementById("formMessage");
const adminListings = document.getElementById("adminListings");

let supabase;
let editingId = null;


// ========================================
// START
// ========================================

async function start() {

  try {

    const response =
      await fetch("/api/config");

    const config =
      await response.json();

    if (!config.url || !config.key) {
      throw new Error(
        "Supabase configuration is missing."
      );
    }

    const {
      createClient
    } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );

    supabase =
      createClient(
        config.url,
        config.key
      );

    const {
      data: {
        session
      }
    } =
      await supabase.auth.getSession();

    if (session) {
      showAdmin();
    } else {
      showLogin();
    }

  } catch (error) {

    console.error(
      "ADMIN START ERROR:",
      error
    );

    loginMessage.textContent =
      "Unable to connect to the login system. Please refresh the page.";
  }
}


// ========================================
// LOGIN
// ========================================

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!supabase) {

      loginMessage.textContent =
        "Login system is still loading. Please try again.";

      return;
    }

    const email =
      document
        .getElementById("adminEmail")
        .value
        .trim();

    const password =
      document
        .getElementById("adminPassword")
        .value;

    loginMessage.textContent =
      "Signing in...";

    try {

      const {
        data,
        error
      } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) {

        console.error(
          "SUPABASE LOGIN ERROR:",
          error
        );

        loginMessage.textContent =
          error.message;

        return;
      }

      if (!data.session) {

        loginMessage.textContent =
          "Login succeeded, but no session was created.";

        return;
      }

      loginMessage.textContent = "";

      showAdmin();

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      loginMessage.textContent =
        error.message ||
        "Unable to sign in.";
    }
  }
);


// ========================================
// SHOW LOGIN
// ========================================

function showLogin() {

  loginSection.classList.remove("hidden");
  adminSection.classList.add("hidden");
}


// ========================================
// SHOW ADMIN
// ========================================

function showAdmin() {

  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");

  loadListings();
}


// ========================================
// LOGOUT
// ========================================

logoutBtn.addEventListener(
  "click",
  async () => {

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();

    editingId = null;

    propertyForm.reset();

    showLogin();
  }
);


// ========================================
// MONEY
// ========================================

function money(value) {

  const number =
    Number(value);

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


// ========================================
// ESCAPE
// ========================================

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


// ========================================
// LOAD LISTINGS
// ========================================

async function loadListings() {

  if (!supabase) {
    return;
  }

  adminListings.innerHTML =
    "<p>Loading properties...</p>";

  const {
    data,
    error
  } =
    await supabase
      .from("Properties")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {

    console.error(
      "PROPERTY LOAD ERROR:",
      error
    );

    adminListings.innerHTML =
      `<p class="admin-error">
        ${esc(error.message)}
      </p>`;

    return;
  }

  if (!data?.length) {

    adminListings.innerHTML =
      "<p>No properties yet.</p>";

    return;
  }

  adminListings.innerHTML = "";

  data.forEach(property => {

    const card =
      document.createElement("div");

    card.className =
      "admin-property";

    card.innerHTML = `

      <div class="admin-property-info">

        <span class="status">
          ${esc(property.Status || "For Sale")}
        </span>

        <h3>
          ${esc(property.Title || "Property")}
        </h3>

        <p>
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
  });

  document
    .querySelectorAll(".admin-edit")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => editProperty(
          button.dataset.id
        )
      );
    });

  document
    .querySelectorAll(".admin-delete")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => deleteProperty(
          button.dataset.id
        )
      );
    });
}


// ========================================
// CREATE / UPDATE
// ========================================

propertyForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!supabase) {
      return;
    }

    formMessage.textContent =
      editingId
        ? "Updating property..."
        : "Publishing property...";

    const property = {

      Title:
        document.getElementById(
          "propertyTitle"
        ).value.trim(),

      Description:
        document.getElementById(
          "propertyDescription"
        ).value.trim(),

      Price:
        Number(
          document.getElementById(
            "propertyPrice"
          ).value
        ),

      Location:
        document.getElementById(
          "propertyLocation"
        ).value.trim(),

      Property_type:
        document.getElementById(
          "propertyType"
        ).value,

      Status:
        document.getElementById(
          "propertyStatus"
        ).value,

      Bedrooms:
        Number(
          document.getElementById(
            "propertyBedrooms"
          ).value
        ),

      Bathrooms:
        Number(
          document.getElementById(
            "propertyBathrooms"
          ).value
        ),

      Square_feet:
        Number(
          document.getElementById(
            "propertySquareFeet"
          ).value
        )
    };

    try {

      if (editingId) {

        const {
          error
        } =
          await supabase
            .from("Properties")
            .update(property)
            .eq(
              "id",
              editingId
            );

        if (error) {
          throw error;
        }

        formMessage.textContent =
          "Property updated successfully.";

      } else {

        const {
          data,
          error
        } =
          await supabase
            .from("Properties")
            .insert(property)
            .select()
            .single();

        if (error) {
          throw error;
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

    } catch (error) {

      console.error(
        "SAVE ERROR:",
        error
      );

      formMessage.textContent =
        error.message;
    }
  }
);


// ========================================
// UPLOAD IMAGES
// ========================================

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

  for (const file of files) {

    const path =
      `${propertyId}/${crypto.randomUUID()}-${file.name}`;

    const {
      error
    } =
      await supabase.storage
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

    if (error) {

      console.error(
        "UPLOAD ERROR:",
        error
      );

      continue;
    }

    const {
      data
    } =
      supabase.storage
        .from("property-images")
        .getPublicUrl(path);

    if (!data?.publicUrl) {
      continue;
    }

    const {
      error: recordError
    } =
      await supabase
        .from("Property _image")
        .insert({
          Property_id: propertyId,
          Image_url: data.publicUrl
        });

    if (recordError) {

      console.error(
        "IMAGE RECORD ERROR:",
        recordError
      );
    }
  }
}


// ========================================
// EDIT
// ========================================

async function editProperty(id) {

  const {
    data,
    error
  } =
    await supabase
      .from("Properties")
      .select("*")
      .eq("id", id)
      .single();

  if (error) {

    alert(error.message);

    return;
  }

  editingId = id;

  document.getElementById(
    "propertyTitle"
  ).value =
    data.Title || "";

  document.getElementById(
    "propertyDescription"
  ).value =
    data.Description || "";

  document.getElementById(
    "propertyPrice"
  ).value =
    data.Price || "";

  document.getElementById(
    "propertyLocation"
  ).value =
    data.Location || "";

  document.getElementById(
    "propertyType"
  ).value =
    data.Property_type || "";

  document.getElementById(
    "propertyStatus"
  ).value =
    data.Status || "";

  document.getElementById(
    "propertyBedrooms"
  ).value =
    data.Bedrooms || "";

  document.getElementById(
    "propertyBathrooms"
  ).value =
    data.Bathrooms || "";

  document.getElementById(
    "propertySquareFeet"
  ).value =
    data.Square_feet || "";

  updateFormButton();

  formMessage.textContent =
    "Editing property.";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ========================================
// DELETE
// ========================================

async function deleteProperty(id) {

  if (
    !confirm(
      "Are you sure you want to delete this property?"
    )
  ) {
    return;
  }

  const {
    error
  } =
    await supabase
      .from("Properties")
      .delete()
      .eq("id", id);

  if (error) {

    console.error(
      "DELETE ERROR:",
      error
    );

    alert(error.message);

    return;
  }

  if (editingId === id) {

    editingId = null;

    propertyForm.reset();

    updateFormButton();
  }

  await loadListings();
}


// ========================================
// BUTTON TEXT
// ========================================

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


// ========================================
// RUN
// ========================================

start().catch(error => {
  console.error(error);

  document.getElementById("loginMessage").textContent =
    "ERROR: " + (error.message || String(error));
});
