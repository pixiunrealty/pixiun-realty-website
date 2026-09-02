import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let supabase = null;
let editingPropertyId = null;

// ==================================================
// ELEMENTS
// ==================================================

const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");

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

const formHeading = document.getElementById("formHeading");
const formMessage = document.getElementById("formMessage");

const submitPropertyBtn =
  document.getElementById("submitPropertyBtn");

const cancelEditBtn =
  document.getElementById("cancelEditBtn");

const adminListings =
  document.getElementById("adminListings");

// ==================================================
// SUPABASE
// ==================================================

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

    supabase = createClient(
      config.url,
      config.key
    );

    return true;

  } catch (error) {

    console.error(
      "Supabase initialization error:",
      error
    );

    if (loginMessage) {
      loginMessage.textContent =
        "Unable to connect to the login system. Please refresh the page.";
    }

    return false;
  }
}

// ==================================================
// LOGIN / ADMIN VISIBILITY
// ==================================================

function showLogin() {

  if (loginSection) {
    loginSection.classList.remove("hidden");
    loginSection.hidden = false;
  }

  if (adminSection) {
    adminSection.classList.add("hidden");
    adminSection.hidden = true;
  }
}


function showAdmin() {

  if (loginSection) {
    loginSection.classList.add("hidden");
    loginSection.hidden = true;
  }

  if (adminSection) {
    adminSection.classList.remove("hidden");
    adminSection.hidden = false;
  }
}

// ==================================================
// SESSION
// ==================================================

async function checkSession() {

  if (!supabase) return;

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {

    console.error(
      "Session error:",
      error
    );

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

// ==================================================
// LOGIN
// ==================================================

loginForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!supabase) return;

    const email =
      adminEmail.value.trim();

    const password =
      adminPassword.value;

    if (!email || !password) {

      loginMessage.textContent =
        "Please enter your email and password.";

      return;
    }

    loginMessage.textContent =
      "Signing in...";

    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {

      console.error(
        "Login error:",
        error
      );

      loginMessage.textContent =
        error.message;

      return;
    }

    if (!data.session) {

      loginMessage.textContent =
        "Login failed. Please try again.";

      return;
    }

    loginMessage.textContent = "";

    adminPassword.value = "";

    showAdmin();

    await loadProperties();
  }
);

// ==================================================
// LOGOUT
// ==================================================

logoutBtn?.addEventListener(
  "click",
  async () => {

    if (!supabase) return;

    const {
      error
    } = await supabase.auth.signOut();

    if (error) {

      console.error(
        "Logout error:",
        error
      );

      alert(
        "Unable to sign out. Please try again."
      );

      return;
    }

    resetPropertyForm();

    showLogin();
  }
);

// ==================================================
// LOAD PROPERTIES
// ==================================================

async function loadProperties() {

  if (!supabase || !adminListings) {
    return;
  }

  adminListings.innerHTML = `
    <p class="admin-empty">
      Loading properties...
    </p>
  `;

  const {
    data,
    error
  } = await supabase
    .from("Properties")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error(
      "Load properties error:",
      error
    );

    adminListings.innerHTML = `
      <p class="admin-error">
        Unable to load properties.
      </p>
    `;

    return;
  }

  if (!data || data.length === 0) {

    adminListings.innerHTML = `
      <p class="admin-empty">
        No properties have been published yet.
      </p>
    `;

    return;
  }

  adminListings.innerHTML = "";

  for (const property of data) {

    await renderProperty(property);
  }
}

// ==================================================
// RENDER PROPERTY
// ==================================================

async function renderProperty(property) {

  const {
    data: images,
    error
  } = await supabase
    .from("Property _image")
    .select("Image_url")
    .eq(
      "Property_id",
      property.id
    )
    .order("created_at", {
      ascending: true
    });

  if (error) {

    console.error(
      "Property image error:",
      error
    );
  }

  const imageUrls =
    images
      ? images
          .map(
            image => image.Image_url
          )
          .filter(Boolean)
      : [];

  const card =
    document.createElement("article");

  card.className =
    "admin-property-card";

  const firstImage =
    imageUrls.length
      ? imageUrls[0]
      : "";

  card.innerHTML = `

    <div class="admin-property-media">

      ${
        firstImage
          ? `
            <img
              src="${escapeHtml(firstImage)}"
              alt="${escapeHtml(
                property.Title ||
                "Property"
              )}"
              class="admin-property-image"
            >
          `
          : `
            <div class="admin-property-image admin-no-image">
              No photo
            </div>
          `
      }

    </div>


    <div class="admin-property-content">

      <div class="admin-property-status">
        ${escapeHtml(
          property.Status ||
          "Available"
        )}
      </div>

      <h3>
        ${escapeHtml(
          property.Title ||
          "Untitled property"
        )}
      </h3>

      <p class="admin-property-location">
        ${escapeHtml(
          property.Location ||
          "Location not provided"
        )}
      </p>

      <p class="admin-property-price">
        ${formatPrice(property.Price)}
      </p>

      <div class="admin-property-details">

        <span>
          ${property.Bedrooms ?? 0} Beds
        </span>

        <span>
          ${property.Bathrooms ?? 0} Baths
        </span>

        <span>
          ${property.Square_feet ?? 0} Sq Ft
        </span>

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

  const editButton =
    card.querySelector(
      ".edit-property-btn"
    );

  const deleteButton =
    card.querySelector(
      ".delete-property-btn"
    );

  editButton.addEventListener(
    "click",
    () => {
      startEditing(property);
    }
  );

  deleteButton.addEventListener(
    "click",
    () => {
      deleteProperty(
        property,
        imageUrls,
        deleteButton
      );
    }
  );

  adminListings.appendChild(card);
}

// ==================================================
// EDIT
// ==================================================

function startEditing(property) {

  editingPropertyId =
    property.id;

  propertyTitle.value =
    property.Title || "";

  propertyDescription.value =
    property.Description || "";

  propertyPrice.value =
    property.Price ?? "";

  propertyLocation.value =
    property.Location || "";

  propertyType.value =
    property.Property_type || "";

  propertyStatus.value =
    property.Status || "";

  propertyBedrooms.value =
    property.Bedrooms ?? "";

  propertyBathrooms.value =
    property.Bathrooms ?? "";

  propertySquareFeet.value =
    property.Square_feet ?? "";

  updateFormMode();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ==================================================
// FORM MODE
// ==================================================

function updateFormMode() {

  if (editingPropertyId) {

    if (formHeading) {
      formHeading.textContent =
        "Edit property";
    }

    submitPropertyBtn.textContent =
      "Save Changes";

    if (cancelEditBtn) {
      cancelEditBtn.classList.remove(
        "hidden"
      );

      cancelEditBtn.hidden =
        false;
    }

    formMessage.textContent =
      "You are editing this property. Photos are optional.";

  } else {

    if (formHeading) {
      formHeading.textContent =
        "Add a property";
    }

    submitPropertyBtn.textContent =
      "Publish property";

    if (cancelEditBtn) {
      cancelEditBtn.classList.add(
        "hidden"
      );

      cancelEditBtn.hidden =
        true;
    }

    formMessage.textContent = "";
  }
}

// ==================================================
// CANCEL EDIT
// ==================================================

cancelEditBtn?.addEventListener(
  "click",
  () => {
    resetPropertyForm();
  }
);

// ==================================================
// PROPERTY FORM
// ==================================================

propertyForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    if (!supabase) {

      formMessage.textContent =
        "Database connection unavailable.";

      return;
    }

    const propertyData = {

      Title:
        propertyTitle.value.trim(),

      Description:
        propertyDescription.value.trim(),

      Price:
        Number(propertyPrice.value),

      Location:
        propertyLocation.value.trim(),

      Property_type:
        propertyType.value,

      Status:
        propertyStatus.value,

      Bedrooms:
        propertyBedrooms.value
          ? Number(propertyBedrooms.value)
          : null,

      Bathrooms:
        propertyBathrooms.value
          ? Number(propertyBathrooms.value)
          : null,

      Square_feet:
        propertySquareFeet.value
          ? Number(propertySquareFeet.value)
          : null
    };

    const photos =
      propertyPhotos?.files
        ? Array.from(
            propertyPhotos.files
          )
        : [];

    if (!propertyData.Title) {

      formMessage.textContent =
        "Please enter a property title.";

      return;
    }

    if (!propertyData.Price) {

      formMessage.textContent =
        "Please enter a property price.";

      return;
    }

    if (!propertyData.Location) {

      formMessage.textContent =
        "Please enter the property location.";

      return;
    }

    submitPropertyBtn.disabled =
      true;

    // ==================================================
    // EDIT
    // ==================================================

    if (editingPropertyId) {

      formMessage.textContent =
        "Saving changes...";

      const {
        error
      } = await supabase
        .from("Properties")
        .update(propertyData)
        .eq(
          "id",
          editingPropertyId
        );

      if (error) {

        console.error(
          "Update error:",
          error
        );

        formMessage.textContent =
          "Unable to save changes: " +
          error.message;

        submitPropertyBtn.disabled =
          false;

        return;
      }

      if (photos.length > 0) {

        formMessage.textContent =
          "Uploading new photos...";

        try {

          await uploadPhotos(
            editingPropertyId,
            photos
          );

        } catch (error) {

          console.error(
            "Photo upload error:",
            error
          );

          formMessage.textContent =
            "Property updated, but photo upload failed: " +
            error.message;

          submitPropertyBtn.disabled =
            false;

          await loadProperties();

          return;
        }
      }

      alert(
        "Property updated successfully."
      );

      resetPropertyForm();

      submitPropertyBtn.disabled =
        false;

      await loadProperties();

      return;
    }

    // ==================================================
    // NEW PROPERTY
    // ==================================================

    if (photos.length === 0) {

      formMessage.textContent =
        "Please choose at least one property photo.";

      submitPropertyBtn.disabled =
        false;

      return;
    }

    formMessage.textContent =
      "Publishing property...";

    const {
      data: newProperty,
      error
    } = await supabase
      .from("Properties")
      .insert(propertyData)
      .select()
      .single();

    if (error) {

      console.error(
        "Create property error:",
        error
      );

      formMessage.textContent =
        "Unable to publish property: " +
        error.message;

      submitPropertyBtn.disabled =
        false;

      return;
    }

    try {

      formMessage.textContent =
        "Uploading property photos...";

      await uploadPhotos(
        newProperty.id,
        photos
      );

      alert(
        "Property published successfully."
      );

      resetPropertyForm();

      await loadProperties();

    } catch (error) {

      console.error(
        "Photo upload error:",
        error
      );

      formMessage.textContent =
        "Property created, but photo upload failed: " +
        error.message;

      await loadProperties();
    }

    submitPropertyBtn.disabled =
      false;
  }
);

// ==================================================
// UPLOAD PHOTOS
// ==================================================

async function uploadPhotos(
  propertyId,
  photos
) {

  for (const photo of photos) {

    const extension =
      photo.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const safeExtension =
      extension.replace(
        /[^a-z0-9]/g,
        ""
      );

    const fileName =
      `${propertyId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const {
      error: uploadError
    } = await supabase
      .storage
      .from("property-images")
      .upload(
        fileName,
        photo,
        {
          cacheControl: "3600",
          upsert: false
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData
    } = supabase
      .storage
      .from("property-images")
      .getPublicUrl(
        fileName
      );

    const publicUrl =
      publicUrlData?.publicUrl;

    if (!publicUrl) {
      throw new Error(
        "Unable to create photo URL."
      );
    }

    const {
      error: imageError
    } = await supabase
      .from("Property _image")
      .insert({
        Property_id: propertyId,
        Image_url: publicUrl
      });

    if (imageError) {
      throw imageError;
    }
  }
}

// ==================================================
// DELETE PROPERTY
// ==================================================

async function deleteProperty(
  property,
  imageUrls,
  deleteButton
) {

  const confirmed =
    confirm(
      `Are you sure you want to delete "${property.Title}"?\n\nThis action cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  const propertyId =
    property.id;

  try {

    if (deleteButton) {
      deleteButton.disabled =
        true;

      deleteButton.textContent =
        "Deleting...";
    }

    // ==================================================
    // 1. GET ALL IMAGE RECORDS
    // ==================================================

    const {
      data: imageRecords,
      error: imageFetchError
    } = await supabase
      .from("Property _image")
      .select(
        "id, Image_url"
      )
      .eq(
        "Property_id",
        propertyId
      );

    if (imageFetchError) {

      throw new Error(
        "Could not read the property's images: " +
        imageFetchError.message
      );
    }

    // ==================================================
    // 2. DELETE IMAGE DATABASE RECORDS
    // ==================================================

    const {
      error: imageDeleteError
    } = await supabase
      .from("Property _image")
      .delete()
      .eq(
        "Property_id",
        propertyId
      );

    if (imageDeleteError) {

      throw new Error(
        "Could not delete the property's image records: " +
        imageDeleteError.message
      );
    }

    // ==================================================
    // 3. DELETE STORAGE FILES
    // ==================================================

    if (
      imageRecords &&
      imageRecords.length > 0
    ) {

      const storagePaths =
        imageRecords
          .map(
            image =>
              getStoragePathFromPublicUrl(
                image.Image_url
              )
          )
          .filter(Boolean);

      if (
        storagePaths.length > 0
      ) {

        const {
          error: storageError
        } = await supabase
          .storage
          .from("property-images")
          .remove(
            storagePaths
          );

        if (storageError) {

          console.warn(
            "Storage cleanup warning:",
            storageError
          );
        }
      }
    }

    // ==================================================
    // 4. DELETE PROPERTY
    // ==================================================

    const {
      error: propertyDeleteError
    } = await supabase
      .from("Properties")
      .delete()
      .eq(
        "id",
        propertyId
      );

    if (propertyDeleteError) {

      throw new Error(
        "Could not delete the property: " +
        propertyDeleteError.message
      );
    }

    // ==================================================
    // 5. SUCCESS
    // ==================================================

    alert(
      "Property deleted successfully."
    );

    await loadProperties();

  } catch (error) {

    console.error(
      "DELETE PROPERTY ERROR:",
      error
    );

    alert(
      "The property was NOT deleted.\n\n" +
      error.message
    );

    await loadProperties();
  }
}

// ==================================================
// STORAGE PATH
// ==================================================

function getStoragePathFromPublicUrl(
  url
) {

  if (!url) {
    return null;
  }

  try {

    const marker =
      "/storage/v1/object/public/property-images/";

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

  } catch (error) {

    console.warn(
      "Storage path error:",
      error
    );

    return null;
  }
}

// ==================================================
// RESET FORM
// ==================================================

function resetPropertyForm() {

  editingPropertyId =
    null;

  propertyForm?.reset();

  if (propertyPhotos) {
    propertyPhotos.value = "";
  }

  updateFormMode();

  if (submitPropertyBtn) {
    submitPropertyBtn.disabled =
      false;
  }
}

// ==================================================
// FORMAT PRICE
// ==================================================

function formatPrice(price) {

  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {

    return "Price not provided";
  }

  const number =
    Number(price);

  if (Number.isNaN(number)) {
    return String(price);
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

// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

// ==================================================
// START APPLICATION
// ==================================================

const initialized =
  await initializeSupabase();

if (initialized) {

  await checkSession();

  supabase.auth.onAuthStateChange(
    async (_event, session) => {

      if (session) {

        showAdmin();

      } else {

        showLogin();
      }
    }
  );
}
