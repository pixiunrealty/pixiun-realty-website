const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");
const propertyForm = document.getElementById("propertyForm");
const formMessage = document.getElementById("formMessage");
const adminListings = document.getElementById("adminListings");

let supabase = null;

async function initialize() {
  try {
    loginMessage.textContent = "Connecting...";

    const configResponse = await fetch("/api/config", {
      cache: "no-store"
    });

    if (!configResponse.ok) {
      throw new Error("Unable to load Supabase configuration.");
    }

    const config = await configResponse.json();

    if (!config.url || !config.key) {
      throw new Error("Supabase configuration is incomplete.");
    }

    const supabaseModule =
      await import("https://esm.sh/@supabase/supabase-js@2");

    supabase = supabaseModule.createClient(
      config.url,
      config.key
    );

    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (session) {
      showDashboard();
    } else {
      showLogin();
    }

  } catch (error) {
    console.error("ADMIN INITIALIZATION ERROR:", error);

    loginMessage.textContent =
      "Unable to connect to the login system. Please refresh the page.";
  }
}


/* -------------------------
   LOGIN / LOGOUT
------------------------- */

function showLogin() {
  loginSection.classList.remove("hidden");
  adminSection.classList.add("hidden");
}

function showDashboard() {
  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");

  loadListings();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabase) {
    loginMessage.textContent =
      "Login system is still connecting. Please wait a moment.";
    return;
  }

  const email =
    document.getElementById("adminEmail").value.trim();

  const password =
    document.getElementById("adminPassword").value;

  if (!email || !password) {
    loginMessage.textContent =
      "Please enter your email and password.";
    return;
  }

  loginMessage.textContent = "Signing in...";

  try {
    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data?.session) {
      throw new Error("No login session was created.");
    }

    loginForm.reset();
    loginMessage.textContent = "";

    showDashboard();

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    loginMessage.textContent =
      error?.message || "Unable to sign in.";
  }
});


logoutBtn.addEventListener("click", async () => {
  if (!supabase) return;

  logoutBtn.disabled = true;
  logoutBtn.textContent = "Signing out...";

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    showLogin();

    loginMessage.textContent =
      "You have been signed out.";

  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    alert(
      error?.message ||
      "Unable to sign out. Please try again."
    );

  } finally {
    logoutBtn.disabled = false;
    logoutBtn.textContent = "Sign out";
  }
});


/* -------------------------
   ADD PROPERTY
------------------------- */

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabase) {
    formMessage.textContent =
      "Supabase is not connected.";
    return;
  }

  formMessage.textContent =
    "Publishing property...";

  const title =
    document.getElementById("propertyTitle").value.trim();

  const description =
    document.getElementById("propertyDescription").value.trim();

  const price =
    Number(document.getElementById("propertyPrice").value);

  const locationValue =
    document.getElementById("propertyLocation").value.trim();

  const propertyType =
    document.getElementById("propertyType").value;

  const propertyStatus =
    document.getElementById("propertyStatus").value;

  const bedrooms =
    Number(document.getElementById("propertyBedrooms").value);

  const bathrooms =
    Number(document.getElementById("propertyBathrooms").value);

  const squareFeet =
    Number(document.getElementById("propertySquareFeet").value);

  const photos =
    Array.from(
      document.getElementById("propertyPhotos").files
    );

  try {

    /* Make sure user is still logged in */

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      showLogin();

      formMessage.textContent =
        "Your session has expired. Please sign in again.";

      return;
    }


    /* Create property */

    const {
      data: property,
      error: propertyError
    } = await supabase
      .from("Properties")
      .insert({
        Title: title,
        Description: description,
        Price: price,
        Location: locationValue,
        Property_type: propertyType,
        Status: propertyStatus,
        Bedrooms: bedrooms,
        Bathrooms: bathrooms,
        Square_feet: squareFeet
      })
      .select()
      .single();

    if (propertyError) {
      throw propertyError;
    }

    const propertyId = property.id;


    /* Upload photos */

    let uploadedCount = 0;

    for (const photo of photos) {

      const safeName =
        photo.name
          .replace(/[^a-zA-Z0-9._-]/g, "-");

      const filePath =
        `${propertyId}/${Date.now()}-${safeName}`;

      const {
        error: uploadError
      } = await supabase.storage
        .from("property-images")
        .upload(filePath, photo, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        console.error(
          "PHOTO UPLOAD ERROR:",
          uploadError
        );
        continue;
      }


      /* Get public URL */

      const {
        data: publicUrlData
      } = supabase.storage
        .from("property-images")
        .getPublicUrl(filePath);

      const imageUrl =
        publicUrlData?.publicUrl;

      if (!imageUrl) {
        continue;
      }


      /* Save image URL */

      const {
        error: imageError
      } = await supabase
        .from("Property _image")
        .insert({
          Property_id: propertyId,
          Image_url: imageUrl
        });

      if (imageError) {
        console.error(
          "IMAGE DATABASE ERROR:",
          imageError
        );
        continue;
      }

      uploadedCount++;
    }


    propertyForm.reset();

    formMessage.textContent =
      uploadedCount > 0
        ? `Property published successfully with ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"}.`
        : "Property published successfully.";

    await loadListings();

  } catch (error) {

    console.error(
      "PROPERTY PUBLISH ERROR:",
      error
    );

    formMessage.textContent =
      error?.message ||
      "Unable to publish property.";
  }
});


/* -------------------------
   LOAD ADMIN LISTINGS
------------------------- */

async function loadListings() {

  if (!supabase) return;

  adminListings.innerHTML =
    "<p>Loading listings...</p>";

  try {

    const {
      data: properties,
      error
    } = await supabase
      .from("Properties")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    if (!properties || properties.length === 0) {

      adminListings.innerHTML = `
        <div class="admin-empty">
          <h3>No properties yet</h3>
          <p>Your published properties will appear here.</p>
        </div>
      `;

      return;
    }

    adminListings.innerHTML = `
      <div class="admin-list-header">
        <p class="eyebrow">LISTINGS</p>
        <h2>Your properties</h2>
      </div>

      <div class="admin-list">
        ${properties.map(property => `
          <article class="admin-listing">

            <div>
              <h3>${escapeHtml(property.Title || "Untitled property")}</h3>

              <p>
                ${escapeHtml(property.Location || "Location unavailable")}
              </p>

              <strong>
                ${formatPrice(property.Price)}
              </strong>

              <small>
                ${property.Bedrooms ?? 0} bed ·
                ${property.Bathrooms ?? 0} bath ·
                ${property.Square_feet ?? 0} sq ft
              </small>
            </div>

            <button
              class="secondary delete-property"
              data-id="${property.id}"
              type="button"
            >
              Delete
            </button>

          </article>
        `).join("")}
      </div>
    `;

    document
      .querySelectorAll(".delete-property")
      .forEach(button => {

        button.addEventListener("click", () => {
          deleteProperty(button.dataset.id);
        });

      });

  } catch (error) {

    console.error(
      "LOAD LISTINGS ERROR:",
      error
    );

    adminListings.innerHTML = `
      <p class="form-message">
        Unable to load your listings.
      </p>
    `;
  }
}


/* -------------------------
   DELETE PROPERTY
------------------------- */

async function deleteProperty(propertyId) {

  if (!confirm(
    "Are you sure you want to delete this property?"
  )) {
    return;
  }

  try {

    /* Find associated images */

    const {
      data: images,
      error: imageFetchError
    } = await supabase
      .from("Property _image")
      .select("Image_url")
      .eq("Property_id", propertyId);

    if (imageFetchError) {
      console.error(
        "IMAGE FETCH ERROR:",
        imageFetchError
      );
    }


    /* Delete database image records */

    const {
      error: imageDeleteError
    } = await supabase
      .from("Property _image")
      .delete()
      .eq("Property_id", propertyId);

    if (imageDeleteError) {
      throw imageDeleteError;
    }


    /* Delete property */

    const {
      error: propertyDeleteError
    } = await supabase
      .from("Properties")
      .delete()
      .eq("id", propertyId);

    if (propertyDeleteError) {
      throw propertyDeleteError;
    }


    /* Remove storage files */

    if (images && images.length) {

      const paths = images
        .map(image => {

          const url = image.Image_url;

          if (!url) return null;

          const marker =
            "/property-images/";

          const index =
            url.indexOf(marker);

          if (index === -1) return null;

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
        } = await supabase.storage
          .from("property-images")
          .remove(paths);

        if (storageError) {
          console.error(
            "STORAGE DELETE ERROR:",
            storageError
          );
        }
      }
    }


    await loadListings();

  } catch (error) {

    console.error(
      "DELETE ERROR:",
      error
    );

    alert(
      error?.message ||
      "Unable to delete property."
    );
  }
}


/* -------------------------
   HELPERS
------------------------- */

function formatPrice(price) {

  const number = Number(price);

  if (!Number.isFinite(number)) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(number);
}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* -------------------------
   SESSION CHANGES
------------------------- */

async function watchAuth() {

  if (!supabase) return;

  supabase.auth.onAuthStateChange(
    (event, session) => {

      if (event === "SIGNED_OUT" || !session) {
        showLogin();
      }

      if (event === "SIGNED_IN" && session) {
        showDashboard();
      }

    }
  );
}


/* -------------------------
   START
------------------------- */

initialize().then(() => {
  watchAuth();
});
