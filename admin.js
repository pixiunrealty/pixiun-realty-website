import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let supabase = null;
let editingPropertyId = null;

// --------------------------------------------------
// ELEMENTS
// --------------------------------------------------

const loginPanel = document.getElementById("loginPanel");
const adminPanel = document.getElementById("adminPanel");

const loginForm = document.getElementById("loginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const loginMessage = document.getElementById("loginMessage");

const logoutBtn = document.getElementById("logoutBtn");

const propertyForm = document.getElementById("propertyForm");
const propertyTitle = document.getElementById("propertyTitle");
const propertyDescription = document.getElementById("propertyDescription");
const propertyPrice = document.getElementById("propertyPrice");
const propertyLocation = document.getElementById("propertyLocation");
const propertyType = document.getElementById("propertyType");
const propertyStatus = document.getElementById("propertyStatus");
const propertyBedrooms = document.getElementById("propertyBedrooms");
const propertyBathrooms = document.getElementById("propertyBathrooms");
const propertySquareFeet = document.getElementById("propertySquareFeet");

const propertyPhotos = document.getElementById("propertyPhotos");

const formMessage = document.getElementById("formMessage");
const submitPropertyBtn = document.getElementById("submitPropertyBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const propertyList = document.getElementById("propertyList");

// --------------------------------------------------
// INITIALIZE SUPABASE
// --------------------------------------------------

async function initializeSupabase() {
  try {
    const response = await fetch("/api/config");

    if (!response.ok) {
      throw new Error("Unable to load Supabase configuration.");
    }

    const config = await response.json();

    if (!config.url || !config.key) {
      throw new Error("Supabase configuration is missing.");
    }

    supabase = createClient(config.url, config.key);

    return true;
  } catch (error) {
    console.error("Supabase initialization error:", error);

    if (loginMessage) {
      loginMessage.textContent =
        "Unable to connect to the login system. Please refresh the page.";
    }

    return false;
  }
}

// --------------------------------------------------
// CHECK CURRENT SESSION
// --------------------------------------------------

async function checkSession() {
  if (!supabase) return;

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    showLogin();
    return;
  }

  if (session) {
    showAdmin();
    await loadProperties();
  } else {
    showLogin();
  }
}

// --------------------------------------------------
// SHOW / HIDE PANELS
// --------------------------------------------------

function showLogin() {
  if (loginPanel) loginPanel.hidden = false;
  if (adminPanel) adminPanel.hidden = true;
}

function showAdmin() {
  if (loginPanel) loginPanel.hidden = true;
  if (adminPanel) adminPanel.hidden = false;
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabase) return;

  const email = adminEmail.value.trim();
  const password = adminPassword.value;

  if (!email || !password) {
    loginMessage.textContent = "Please enter your email and password.";
    return;
  }

  loginMessage.textContent = "Signing in...";

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login error:", error);
    loginMessage.textContent = error.message;
    return;
  }

  if (!data.session) {
    loginMessage.textContent = "Login failed. Please try again.";
    return;
  }

  loginMessage.textContent = "";

  adminPassword.value = "";

  showAdmin();
  await loadProperties();
});

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

logoutBtn?.addEventListener("click", async () => {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    alert("Unable to sign out. Please try again.");
    return;
  }

  resetPropertyForm();
  showLogin();
});

// --------------------------------------------------
// LOAD PROPERTIES
// --------------------------------------------------

async function loadProperties() {
  if (!supabase || !propertyList) return;

  propertyList.innerHTML = `
    <p class="admin-empty">
      Loading properties...
    </p>
  `;

  const { data, error } = await supabase
    .from("Properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load properties error:", error);

    propertyList.innerHTML = `
      <p class="admin-error">
        Unable to load properties.
      </p>
    `;

    return;
  }

  if (!data || data.length === 0) {
    propertyList.innerHTML = `
      <p class="admin-empty">
        No properties have been published yet.
      </p>
    `;

    return;
  }

  propertyList.innerHTML = "";

  for (const property of data) {
    await renderProperty(property);
  }
}

// --------------------------------------------------
// RENDER ONE PROPERTY
// --------------------------------------------------

async function renderProperty(property) {
  const { data: images, error } = await supabase
    .from("Property _image")
    .select("Image_url")
    .eq("Property_id", property.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Load property images error:", error);
  }

  const imageUrls = images
    ? images.map((image) => image.Image_url).filter(Boolean)
    : [];

  const card = document.createElement("article");

  card.className = "admin-property-card";

  const imageHtml = imageUrls.length
    ? `
      <img
        src="${escapeHtml(imageUrls[0])}"
        alt="${escapeHtml(property.Title || "Property")}"
        class="admin-property-image"
      >
    `
    : `
      <div class="admin-property-image admin-no-image">
        No photo
      </div>
    `;

  card.innerHTML = `
    <div class="admin-property-media">
      ${imageHtml}
    </div>

    <div class="admin-property-content">

      <div class="admin-property-status">
        ${escapeHtml(property.Status || "Available")}
      </div>

      <h3>
        ${escapeHtml(property.Title || "Untitled property")}
      </h3>

      <p class="admin-property-location">
        ${escapeHtml(property.Location || "Location not provided")}
      </p>

      <p class="admin-property-price">
        ${formatPrice(property.Price)}
      </p>

      <div class="admin-property-details">
        <span>${property.Bedrooms ?? 0} Beds</span>
        <span>${property.Bathrooms ?? 0} Baths</span>
        <span>${property.Square_feet ?? 0} Sq Ft</span>
      </div>

      <div class="admin-property-actions">

        <button
          type="button"
          class="secondary edit-property-btn"
        >
          Edit
        </button>

        <button
          type="button"
          class="danger delete-property-btn"
        >
          Delete
        </button>

      </div>

    </div>
  `;

  const editButton = card.querySelector(".edit-property-btn");
  const deleteButton = card.querySelector(".delete-property-btn");

  editButton.addEventListener("click", () => {
    startEditing(property);
  });

  deleteButton.addEventListener("click", () => {
    deleteProperty(property, imageUrls);
  });

  propertyList.appendChild(card);
}

// --------------------------------------------------
// START EDITING
// --------------------------------------------------

function startEditing(property) {
  editingPropertyId = property.id;

  propertyTitle.value = property.Title || "";
  propertyDescription.value = property.Description || "";
  propertyPrice.value = property.Price ?? "";
  propertyLocation.value = property.Location || "";
  propertyType.value = property.Property_type || "";
  propertyStatus.value = property.Status || "";
  propertyBedrooms.value = property.Bedrooms ?? "";
  propertyBathrooms.value = property.Bathrooms ?? "";
  propertySquareFeet.value = property.Square_feet ?? "";

  updateFormMode();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// --------------------------------------------------
// FORM MODE
// --------------------------------------------------

function updateFormMode() {
  if (editingPropertyId) {
    submitPropertyBtn.textContent = "Save Changes";

    if (cancelEditBtn) {
      cancelEditBtn.hidden = false;
    }

    formMessage.textContent =
      "You are editing this property. Photos are optional.";
  } else {
    submitPropertyBtn.textContent = "Publish property";

    if (cancelEditBtn) {
      cancelEditBtn.hidden = true;
    }

    formMessage.textContent = "";
  }
}

// --------------------------------------------------
// CANCEL EDIT
// --------------------------------------------------

cancelEditBtn?.addEventListener("click", () => {
  resetPropertyForm();
});

// --------------------------------------------------
// PROPERTY FORM
// --------------------------------------------------

propertyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabase) {
    formMessage.textContent =
      "The database connection is unavailable. Please refresh the page.";
    return;
  }

  const title = propertyTitle.value.trim();
  const description = propertyDescription.value.trim();
  const price = propertyPrice.value;
  const locationValue = propertyLocation.value.trim();
  const propertyTypeValue = propertyType.value;
  const status = propertyStatus.value;
  const bedrooms = propertyBedrooms.value;
  const bathrooms = propertyBathrooms.value;
  const squareFeet = propertySquareFeet.value;

  if (!title) {
    formMessage.textContent = "Please enter a property title.";
    propertyTitle.focus();
    return;
  }

  if (!price) {
    formMessage.textContent = "Please enter a property price.";
    propertyPrice.focus();
    return;
  }

  if (!locationValue) {
    formMessage.textContent = "Please enter the property location.";
    propertyLocation.focus();
    return;
  }

  const propertyData = {
    Title: title,
    Description: description,
    Price: Number(price),
    Location: locationValue,
    Property_type: propertyTypeValue,
    Status: status,
    Bedrooms: bedrooms ? Number(bedrooms) : null,
    Bathrooms: bathrooms ? Number(bathrooms) : null,
    Square_feet: squareFeet ? Number(squareFeet) : null
  };

  const photos = propertyPhotos?.files
    ? Array.from(propertyPhotos.files)
    : [];

  submitPropertyBtn.disabled = true;

  // ------------------------------------------------
  // EDIT EXISTING PROPERTY
  // ------------------------------------------------

  if (editingPropertyId) {
    formMessage.textContent = "Saving changes...";

    const { error } = await supabase
      .from("Properties")
      .update(propertyData)
      .eq("id", editingPropertyId);

    if (error) {
      console.error("Update property error:", error);

      formMessage.textContent =
        "Unable to save changes: " + error.message;

      submitPropertyBtn.disabled = false;
      return;
    }

    // If the admin selected NEW photos while editing,
    // upload them and add them to the property.
    if (photos.length > 0) {
      formMessage.textContent = "Uploading new photos...";

      try {
        await uploadPhotos(editingPropertyId, photos);
      } catch (error) {
        console.error("Photo upload error:", error);

        formMessage.textContent =
          "Property was updated, but the new photos could not be uploaded: " +
          error.message;

        submitPropertyBtn.disabled = false;

        await loadProperties();
        return;
      }
    }

    formMessage.textContent = "Property updated successfully.";

    submitPropertyBtn.disabled = false;

    resetPropertyForm();
    await loadProperties();

    return;
  }

  // ------------------------------------------------
  // CREATE NEW PROPERTY
  // ------------------------------------------------

  if (photos.length === 0) {
    formMessage.textContent =
      "Please choose at least one property photo.";

    submitPropertyBtn.disabled = false;
    return;
  }

  formMessage.textContent = "Publishing property...";

  const { data: newProperty, error } = await supabase
    .from("Properties")
    .insert(propertyData)
    .select()
    .single();

  if (error) {
    console.error("Create property error:", error);

    formMessage.textContent =
      "Unable to publish property: " + error.message;

    submitPropertyBtn.disabled = false;
    return;
  }

  try {
    formMessage.textContent = "Uploading property photos...";

    await uploadPhotos(newProperty.id, photos);

    formMessage.textContent =
      "Property published successfully.";

    resetPropertyForm();

    await loadProperties();

  } catch (error) {
    console.error("Photo upload error:", error);

    formMessage.textContent =
      "Property was created, but the photos could not be uploaded: " +
      error.message;

    await loadProperties();
  }

  submitPropertyBtn.disabled = false;
});

// --------------------------------------------------
// UPLOAD PHOTOS
// --------------------------------------------------

async function uploadPhotos(propertyId, photos) {
  for (const photo of photos) {
    const extension =
      photo.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension = extension.replace(/[^a-z0-9]/g, "");

    const fileName =
      `${propertyId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const { error: uploadError } = await supabase
      .storage
      .from("property-images")
      .upload(fileName, photo, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData
    } = supabase
      .storage
      .from("property-images")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      throw new Error("Unable to create the photo URL.");
    }

    const { error: imageInsertError } = await supabase
      .from("Property _image")
      .insert({
        Property_id: propertyId,
        Image_url: publicUrl
      });

    if (imageInsertError) {
      throw imageInsertError;
    }
  }
}

// --------------------------------------------------
// DELETE PROPERTY
// --------------------------------------------------

async function deleteProperty(property, imageUrls) {
  const confirmed = confirm(
    `Are you sure you want to delete "${property.Title}"?\n\n` +
    "This action cannot be undone."
  );

  if (!confirmed) return;

  const propertyId = property.id;

  try {
    // Disable the relevant buttons while deleting.
    const buttons = document.querySelectorAll(
      ".delete-property-btn"
    );

    buttons.forEach((button) => {
      button.disabled = true;
    });

    // ----------------------------------------------
    // 1. Delete image database records
    // ----------------------------------------------

    const {
      error: imageRecordError
    } = await supabase
      .from("Property _image")
      .delete()
      .eq("Property_id", propertyId);

    if (imageRecordError) {
      throw new Error(
        "The property's image records could not be deleted: " +
        imageRecordError.message
      );
    }

    // ----------------------------------------------
    // 2. Delete the actual files from Storage
    // ----------------------------------------------

    if (imageUrls && imageUrls.length > 0) {
      const storagePaths = imageUrls
        .map(getStoragePathFromPublicUrl)
        .filter(Boolean);

      if (storagePaths.length > 0) {
        const {
          error: storageError
        } = await supabase
          .storage
          .from("property-images")
          .remove(storagePaths);

        // Storage cleanup should not prevent the property
        // itself from being deleted.
        if (storageError) {
          console.warn(
            "Storage cleanup warning:",
            storageError
          );
        }
      }
    }

    // ----------------------------------------------
    // 3. Delete the property
    // ----------------------------------------------

    const {
      error: propertyDeleteError
    } = await supabase
      .from("Properties")
      .delete()
      .eq("id", propertyId);

    if (propertyDeleteError) {
      throw new Error(
        "The property could not be deleted: " +
        propertyDeleteError.message
      );
    }

    // ----------------------------------------------
    // 4. Reload only after successful deletion
    // ----------------------------------------------

    alert("Property deleted successfully.");

    await loadProperties();

  } catch (error) {
    console.error("DELETE PROPERTY ERROR:", error);

    alert(
      "The property was NOT deleted.\n\n" +
      error.message
    );

    await loadProperties();
  }
}

// --------------------------------------------------
// GET STORAGE PATH FROM PUBLIC URL
// --------------------------------------------------

function getStoragePathFromPublicUrl(url) {
  try {
    const marker = "/storage/v1/object/public/property-images/";

    const index = url.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      url.substring(index + marker.length)
    );
  } catch (error) {
    console.warn("Could not determine storage path:", url);
    return null;
  }
}

// --------------------------------------------------
// RESET FORM
// --------------------------------------------------

function resetPropertyForm() {
  editingPropertyId = null;

  propertyForm?.reset();

  if (propertyPhotos) {
    propertyPhotos.value = "";
  }

  updateFormMode();

  if (formMessage) {
    formMessage.textContent = "";
  }

  if (submitPropertyBtn) {
    submitPropertyBtn.disabled = false;
  }
}

// --------------------------------------------------
// FORMAT PRICE
// --------------------------------------------------

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "Price not provided";
  }

  const number = Number(price);

  if (Number.isNaN(number)) {
    return String(price);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(number);
}

// --------------------------------------------------
// ESCAPE HTML
// --------------------------------------------------

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --------------------------------------------------
// START
// --------------------------------------------------

const initialized = await initializeSupabase();

if (initialized) {
  await checkSession();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      showAdmin();
    } else {
      showLogin();
    }
  });
}
