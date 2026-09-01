let supabase = null;
let editingId = null;

const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");

const loginForm = document.getElementById("loginForm");
const propertyForm = document.getElementById("propertyForm");
const logoutBtn = document.getElementById("logoutBtn");

const loginMessage = document.getElementById("loginMessage");
const formMessage = document.getElementById("formMessage");
const adminListings = document.getElementById("adminListings");


// ========================================
// SUPABASE INITIALIZATION
// ========================================

async function initializeSupabase() {
  try {

    loginMessage.textContent =
      "Connecting...";

    const configResponse =
      await fetch("/api/config", {
        cache: "no-store"
      });

    if (!configResponse.ok) {
      throw new Error(
        "Unable to load Supabase configuration."
      );
    }

    const config =
      await configResponse.json();

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
        config.key,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

    loginMessage.textContent = "";

    await checkSession();

  } catch (error) {

    console.error(
      "Supabase initialization error:",
      error
    );

    loginMessage.textContent =
      "Unable to connect to the login system. Please refresh the page.";
  }
}


// ========================================
// SESSION CHECK
// ========================================

async function checkSession() {

  if (!supabase) {
    showLogin();
    return;
  }

  try {

    const {
      data,
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error(error);
      showLogin();
      return;
    }

    if (data?.session) {
      showAdmin();
    } else {
      showLogin();
    }

  } catch (error) {

    console.error(
      "Session check error:",
      error
    );

    showLogin();
  }
}


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
// LOGIN
// ========================================

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!supabase) {

      loginMessage.textContent =
        "Login system is still connecting. Please wait a moment and try again.";

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

    if (!email || !password) {

      loginMessage.textContent =
        "Enter your email and password.";

      return;
    }

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
          "Login error:",
          error
        );

        loginMessage.textContent =
          error.message ||
          "Unable to sign in.";

        return;
      }

      if (!data?.session) {

        loginMessage.textContent =
          "Login completed, but no session was created. Please try again.";

        return;
      }

      loginMessage.textContent = "";

      showAdmin();

    } catch (error) {

      console.error(
        "Unexpected login error:",
        error
      );

      loginMessage.textContent =
        "Something went wrong while signing in. Please try again.";
    }
  }
);


// ========================================
// AUTH STATE LISTENER
// ========================================

async function setupAuthListener() {

  if (!supabase) {
    return;
  }

  supabase.auth.onAuthStateChange(
    (event, session) => {

      console.log(
        "Auth event:",
        event
      );

      if (
        event === "SIGNED_IN" &&
        session
      ) {

        showAdmin();

      }

      if (
        event === "SIGNED_OUT"
      ) {

        showLogin();

      }
    }
  );
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

    try {

      await supabase.auth.signOut();

      editingId = null;

      propertyForm.reset();

      showLogin();

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );
    }
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
// ESCAPE HTML
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

  try {

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
      throw error;
    }

    if (!data?.length) {

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
        document.createElement(
          "div"
        );

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

  } catch (error) {

    console.error(
      "Load listings error:",
      error
    );

    adminListings.innerHTML =
      `<p class="admin-error">
        Unable to load properties.
      </p>`;
  }
}


// ========================================
// LOAD PROPERTY IMAGES
// ========================================

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
      image =>
        image.Image_url
    )
    .filter(Boolean);
}


// ========================================
// CREATE / UPDATE PROPERTY
// ========================================

propertyForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!supabase) {

      formMessage.textContent =
        "The admin system is still connecting.";

      return;
    }

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

    try {

      // ================================
      // UPDATE
      // ================================

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
          throw error;
        }

        formMessage.textContent =
          "Property updated successfully.";

      }

      // ================================
      // CREATE
      // ================================

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
        "Property save error:",
        error
      );

      formMessage.textContent =
        error.message ||
        "Unable to save property.";
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

  if (!files.length) {
    return;
  }

  for (const file of files) {

    const filename =
      `${crypto.randomUUID()}-${file.name}`;

    const path =
      `${propertyId}/${filename}`;

    const {
      error
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

    if (error) {

      console.error(
        "Image upload error:",
        error
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
      error: imageError
    } = await supabase
      .from("Property _image")
      .insert({
        Property_id: propertyId,
        Image_url:
          urlData.publicUrl
      });

    if (imageError) {

      console.error(
        "Photo record error:",
        imageError
      );
    }
  }
}


// ========================================
// EDIT PROPERTY
// ========================================

async function editProperty(
  id
) {

  try {

    const {
      data,
      error
    } = await supabase
      .from("Properties")
      .select("*")
      .eq(
        "id",
        id
      )
      .single();

    if (error) {
      throw error;
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

    formMessage.textContent =
      "Editing property. Make your changes and save.";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {

    console.error(
      "Edit error:",
      error
    );

    alert(
      "Unable to load this property."
    );
  }
}


// ========================================
// DELETE PROPERTY
// ========================================

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

    const {
      data: images
    } = await supabase
      .from("Property _image")
      .select("Image_url")
      .eq(
        "Property_id",
        id
      );


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


    const paths =
      (images || [])
        .map(image => {

          const url =
            image.Image_url;

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
        })
        .filter(Boolean);


    if (paths.length) {

      const {
        error: storageError
      } =
        await supabase.storage
          .from("property-images")
          .remove(paths);

      if (storageError) {
        console.error(
          "Storage delete error:",
          storageError
        );
      }
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
      error.message ||
      "Unable to delete this property."
    );
  }
}


// ========================================
// UPDATE FORM BUTTON
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
// START APPLICATION
// ========================================

async function startAdmin() {

  await initializeSupabase();

  await setupAuthListener();
}

startAdmin();
