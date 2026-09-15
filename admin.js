import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


let supabase = null;
let editingPropertyId = null;


/* =================================================
   DOM ELEMENTS
================================================= */

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

const submitPropertyBtn = document.getElementById("submitPropertyBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const formHeading = document.getElementById("formHeading");
const formMessage = document.getElementById("formMessage");

const propertyPhotos = document.getElementById("propertyPhotos");
const photoHelp = document.getElementById("photoHelp");
const photoLabel = document.getElementById("photoLabel");

const adminListings = document.getElementById("adminListings");

const adminInquiries = document.getElementById("adminInquiries");
const refreshInquiriesBtn = document.getElementById("refreshInquiriesBtn");


/* =================================================
   DASHBOARD STAT ELEMENTS
================================================= */

const statTotalProperties =
  document.getElementById("statTotalProperties");

const statForSale =
  document.getElementById("statForSale");

const statForRent =
  document.getElementById("statForRent");

const statNewInquiries =
  document.getElementById("statNewInquiries");


/* =================================================
   SUPABASE INITIALIZATION
================================================= */

async function initializeSupabase() {

  try {

    const response = await fetch("/api/config");

    if (!response.ok) {
      throw new Error("Unable to load Supabase configuration.");
    }

    const config = await response.json();

    if (!config.url || !config.key) {
      throw new Error("Supabase configuration is incomplete.");
    }

    supabase = createClient(
      config.url,
      config.key
    );

    return true;

  } catch (error) {

    console.error("Supabase initialization error:", error);

    loginMessage.textContent =
      "Unable to connect to Supabase.";

    return false;
  }
}


/* =================================================
   LOGIN / ADMIN VISIBILITY
================================================= */

function showLogin() {

  loginSection.classList.remove("hidden");
  adminSection.classList.add("hidden");

}


function showAdmin() {

  loginSection.classList.add("hidden");
  adminSection.classList.remove("hidden");

}


/* =================================================
   SESSION CHECK
================================================= */

async function checkSession() {

  if (!supabase) return;

  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {

    console.error("Session error:", error);

    showLogin();

    return;
  }

  if (data?.session) {

    showAdmin();

    await loadProperties();
    await loadInquiries();

  } else {

    showLogin();

  }
}


/* =================================================
   LOGIN
================================================= */

loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  loginMessage.textContent = "";

  const email = adminEmail.value.trim();
  const password = adminPassword.value;

  if (!email || !password) {

    loginMessage.textContent =
      "Enter your email and password.";

    return;
  }

  const button = loginForm.querySelector("button");

  button.disabled = true;
  button.textContent = "Signing in...";

  try {

    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    adminPassword.value = "";

    showAdmin();

    await loadProperties();
    await loadInquiries();

  } catch (error) {

    console.error("Login error:", error);

    loginMessage.textContent =
      error.message || "Unable to sign in.";

  } finally {

    button.disabled = false;
    button.textContent = "Sign in";

  }

});


/* =================================================
   LOGOUT
================================================= */

logoutBtn.addEventListener("click", async () => {

  if (!supabase) return;

  await supabase.auth.signOut();

  editingPropertyId = null;

  resetPropertyForm();

  showLogin();

});


/* =================================================
   LOAD PROPERTIES
================================================= */

async function loadProperties() {

  if (!supabase || !adminListings) return;

  adminListings.innerHTML =
    `<p class="admin-empty">Loading properties...</p>`;

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

    console.error("Load properties error:", error);

    adminListings.innerHTML =
      `<p class="admin-error">Unable to load properties.</p>`;

    updatePropertyStats([]);

    return;
  }

  updatePropertyStats(data || []);

  if (!data || data.length === 0) {

    adminListings.innerHTML =
      `<p class="admin-empty">No properties yet.</p>`;

    return;
  }

  adminListings.innerHTML = "";

  for (const property of data) {

    await renderProperty(property);

  }

}


/* =================================================
   DASHBOARD PROPERTY STATS
================================================= */

function updatePropertyStats(properties) {

  const total =
    properties.length;

  const forSale =
    properties.filter(property => {

      const status =
        String(
          property.Status ??
          property.status ??
          ""
        ).trim().toLowerCase();

      return status === "for sale";

    }).length;

  const forRent =
    properties.filter(property => {

      const status =
        String(
          property.Status ??
          property.status ??
          ""
        ).trim().toLowerCase();

      return status === "for rent";

    }).length;


  if (statTotalProperties) {
    statTotalProperties.textContent =
      String(total);
  }

  if (statForSale) {
    statForSale.textContent =
      String(forSale);
  }

  if (statForRent) {
    statForRent.textContent =
      String(forRent);
  }

}


/* =================================================
   RENDER PROPERTY
================================================= */

async function renderProperty(property) {

  const card = document.createElement("div");

  card.className = "admin-property-card";

  const {
    data: images,
    error
  } = await supabase
    .from("Property _image")
    .select("Image_url")
    .eq("Property_id", property.id)
    .order("created_at", {
      ascending: true
    });

  if (error) {

    console.error(
      "Load property images error:",
      error
    );

  }

  const imageList =
    (images || [])
      .map(item => item.Image_url)
      .filter(Boolean);

  const imageUrl =
    imageList[0] || "";

  const title =
    property.Title ??
    property.title ??
    "Untitled property";

  const description =
    property.Description ??
    property.description ??
    "";

  const price =
    property.Price ??
    property.price ??
    0;

  const location =
    property.Location ??
    property.location ??
    "";

  const type =
    property.Property_type ??
    property.property_type ??
    "";

  const status =
    property.Status ??
    property.status ??
    "";

  const bedrooms =
    property.Bedrooms ??
    property.bedrooms ??
    0;

  const bathrooms =
    property.Bathrooms ??
    property.bathrooms ??
    0;

  const squareFeet =
    property.Square_feet ??
    property.square_feet ??
    0;

  card.innerHTML = `

    ${
      imageUrl
        ? `
          <div class="admin-property-image">
            <img
              src="${escapeHtml(imageUrl)}"
              alt="${escapeHtml(title)}"
            >
          </div>
        `
        : ""
    }

    <div class="admin-property-content">

      <div class="admin-property-top">

        <div>

          <p class="eyebrow">
            ${escapeHtml(status)}
          </p>

          <h3>
            ${escapeHtml(title)}
          </h3>

        </div>

        <strong>
          ${formatPrice(price)}
        </strong>

      </div>

      <p>
        ${escapeHtml(location)}
      </p>

      <p>
        ${escapeHtml(type)}
        ·
        ${escapeHtml(String(bedrooms))} beds
        ·
        ${escapeHtml(String(bathrooms))} baths
        ·
        ${escapeHtml(String(squareFeet))} sq ft
      </p>

      <p>
        ${escapeHtml(description)}
      </p>

      <div class="admin-property-actions">

        <button
          class="secondary edit-property-btn"
          type="button"
        >
          Edit
        </button>

        <button
          class="secondary delete-property-btn"
          type="button"
        >
          Delete
        </button>

      </div>

    </div>
  `;


  const editButton =
    card.querySelector(".edit-property-btn");

  const deleteButton =
    card.querySelector(".delete-property-btn");


  editButton.addEventListener("click", () => {

    startEdit(property);

  });


  deleteButton.addEventListener("click", async () => {

    await deleteProperty(
      property,
      deleteButton
    );

  });


  adminListings.appendChild(card);

}


/* =================================================
   START EDIT
================================================= */

function startEdit(property) {

  editingPropertyId = property.id;

  propertyTitle.value =
    property.Title ??
    property.title ??
    "";

  propertyDescription.value =
    property.Description ??
    property.description ??
    "";

  propertyPrice.value =
    property.Price ??
    property.price ??
    "";

  propertyLocation.value =
    property.Location ??
    property.location ??
    "";

  propertyType.value =
    property.Property_type ??
    property.property_type ??
    "";

  propertyStatus.value =
    property.Status ??
    property.status ??
    "For Sale";

  propertyBedrooms.value =
    property.Bedrooms ??
    property.bedrooms ??
    "";

  propertyBathrooms.value =
    property.Bathrooms ??
    property.bathrooms ??
    "";

  propertySquareFeet.value =
    property.Square_feet ??
    property.square_feet ??
    "";

  formHeading.textContent =
    "Edit property";

  submitPropertyBtn.textContent =
    "Save changes";

  cancelEditBtn.classList.remove("hidden");

  formMessage.textContent =
    "Editing this property.";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =================================================
   PROPERTY FORM SUBMIT
================================================= */

propertyForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  formMessage.textContent = "";

  const title =
    propertyTitle.value.trim();

  const description =
    propertyDescription.value.trim();

  const price =
    Number(propertyPrice.value);

  const location =
    propertyLocation.value.trim();

  const type =
    propertyType.value;

  const status =
    propertyStatus.value;

  const bedrooms =
    Number(propertyBedrooms.value);

  const bathrooms =
    Number(propertyBathrooms.value);

  const squareFeet =
    Number(propertySquareFeet.value);


  if (
    !title ||
    !description ||
    !location ||
    !type ||
    !status
  ) {

    formMessage.textContent =
      "Please complete all property fields.";

    return;
  }


  submitPropertyBtn.disabled = true;

  submitPropertyBtn.textContent =
    editingPropertyId
      ? "Saving..."
      : "Publishing...";


  try {

    let propertyId = editingPropertyId;


    /* =================================================
       UPDATE
    ================================================= */

    if (editingPropertyId) {

      const {
        error
      } = await supabase
        .from("Properties")
        .update({

          Title: title,
          Description: description,
          Price: price,
          Location: location,
          Property_type: type,
          Status: status,
          Bedrooms: bedrooms,
          Bathrooms: bathrooms,
          Square_feet: squareFeet

        })
        .eq("id", editingPropertyId);


      if (error) {
        throw error;
      }


      formMessage.textContent =
        "Property updated successfully.";

    }


    /* =================================================
       CREATE
    ================================================= */

    else {

      const {
        data,
        error
      } = await supabase
        .from("Properties")
        .insert({

          Title: title,
          Description: description,
          Price: price,
          Location: location,
          Property_type: type,
          Status: status,
          Bedrooms: bedrooms,
          Bathrooms: bathrooms,
          Square_feet: squareFeet

        })
        .select()
        .single();


      if (error) {
        throw error;
      }


      propertyId = data.id;

      formMessage.textContent =
        "Property published successfully.";

    }


    /* =================================================
       PHOTO UPLOAD
    ================================================= */

    const files =
      Array.from(
        propertyPhotos.files || []
      );


    if (files.length > 0 && propertyId) {

      photoHelp.textContent =
        "Uploading photos...";

      await uploadPropertyPhotos(
        propertyId,
        files
      );

      photoHelp.textContent =
        "Photos uploaded successfully.";

    }


    await loadProperties();

    resetPropertyForm(false);

    formMessage.textContent =
      editingPropertyId
        ? "Property updated successfully."
        : "Property published successfully.";


  } catch (error) {

    console.error(
      "Property save error:",
      error
    );

    formMessage.textContent =
      error.message ||
      "Unable to save property.";

  } finally {

    submitPropertyBtn.disabled = false;

    submitPropertyBtn.textContent =
      editingPropertyId
        ? "Save changes"
        : "Publish property";

  }

});


/* =================================================
   UPLOAD PROPERTY PHOTOS
================================================= */

async function uploadPropertyPhotos(
  propertyId,
  files
) {

  for (const file of files) {

    const extension =
      file.name.includes(".")
        ? file.name.split(".").pop()
        : "jpg";

    const safeExtension =
      extension.toLowerCase();

    const fileName =
      `${crypto.randomUUID()}.${safeExtension}`;

    const filePath =
      `${propertyId}/${fileName}`;


    const {
      error: uploadError
    } = await supabase.storage
      .from("property-images")
      .upload(
        filePath,
        file,
        {
          upsert: false
        }
      );


    if (uploadError) {
      throw uploadError;
    }


    const {
      data: publicData
    } = supabase.storage
      .from("property-images")
      .getPublicUrl(filePath);


    const imageUrl =
      publicData?.publicUrl;


    if (!imageUrl) {
      throw new Error(
        "Unable to create image URL."
      );
    }


    const {
      error: imageInsertError
    } = await supabase
      .from("Property _image")
      .insert({

        Property_id: propertyId,
        Image_url: imageUrl

      });


    if (imageInsertError) {
      throw imageInsertError;
    }

  }

}


/* =================================================
   DELETE PROPERTY
================================================= */

async function deleteProperty(
  property,
  deleteButton
) {

  const title =
    property.Title ??
    property.title ??
    "this property";


  const confirmed =
    window.confirm(
      `Delete "${title}"?\n\nThis will remove the property and its images.`
    );


  if (!confirmed) {
    return;
  }


  deleteButton.disabled = true;

  deleteButton.textContent =
    "Deleting...";


  try {

    const {
      data: images,
      error: imageLoadError
    } = await supabase
      .from("Property _image")
      .select("Image_url")
      .eq("Property_id", property.id);


    if (imageLoadError) {
      throw imageLoadError;
    }


    /* =================================================
       DELETE IMAGE RECORDS
    ================================================= */

    const {
      error: imageDeleteError
    } = await supabase
      .from("Property _image")
      .delete()
      .eq("Property_id", property.id);


    if (imageDeleteError) {
      throw imageDeleteError;
    }


    /* =================================================
       DELETE STORAGE FILES
    ================================================= */

    const storagePaths = [];


    for (const image of images || []) {

      const url =
        image.Image_url;

      if (!url) continue;


      const marker =
        "/property-images/";


      const index =
        url.indexOf(marker);


      if (index !== -1) {

        const path =
          decodeURIComponent(
            url.substring(
              index + marker.length
            )
          );

        storagePaths.push(path);

      }

    }


    if (storagePaths.length > 0) {

      const {
        error: storageDeleteError
      } = await supabase.storage
        .from("property-images")
        .remove(storagePaths);


      if (storageDeleteError) {
        console.warn(
          "Storage cleanup warning:",
          storageDeleteError
        );
      }

    }


    /* =================================================
       DELETE PROPERTY
    ================================================= */

    const {
      error: propertyDeleteError
    } = await supabase
      .from("Properties")
      .delete()
      .eq("id", property.id);


    if (propertyDeleteError) {
      throw propertyDeleteError;
    }


    await loadProperties();

  } catch (error) {

    console.error(
      "Delete property error:",
      error
    );

    alert(
      error.message ||
      "Unable to delete property."
    );

    deleteButton.disabled = false;

    deleteButton.textContent =
      "Delete";

  }

}


/* =================================================
   CANCEL EDIT
================================================= */

cancelEditBtn.addEventListener(
  "click",
  () => {

    resetPropertyForm();

  }
);


/* =================================================
   RESET PROPERTY FORM
================================================= */

function resetPropertyForm(
  clearMessage = true
) {

  editingPropertyId = null;

  propertyForm.reset();

  propertyStatus.value =
    "For Sale";

  formHeading.textContent =
    "Add a property";

  submitPropertyBtn.textContent =
    "Publish property";

  cancelEditBtn.classList.add(
    "hidden"
  );

  propertyPhotos.value = "";

  photoHelp.textContent =
    "Select one or more photos for this property.";

  if (clearMessage) {
    formMessage.textContent = "";
  }

}


/* =================================================
   LOAD INQUIRIES
================================================= */

async function loadInquiries() {

  if (
    !supabase ||
    !adminInquiries
  ) {
    return;
  }


  adminInquiries.innerHTML =
    `<p class="admin-empty">Loading inquiries...</p>`;


  const {
    data,
    error
  } = await supabase
    .from("Inquiries")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    console.error(
      "Load inquiries error:",
      error
    );

    adminInquiries.innerHTML =
      `<p class="admin-error">Unable to load inquiries.</p>`;

    updateInquiryStats([]);

    return;
  }


  updateInquiryStats(data || []);


  if (!data || data.length === 0) {

    adminInquiries.innerHTML =
      `<p class="admin-empty">No customer inquiries yet.</p>`;

    return;
  }


  adminInquiries.innerHTML = "";


  data.forEach(
    inquiry => renderInquiry(inquiry)
  );

}


/* =================================================
   DASHBOARD INQUIRY STATS
================================================= */

function updateInquiryStats(inquiries) {

  const newInquiries =
    inquiries.filter(inquiry => {

      const status =
        String(
          inquiry.status ||
          "New"
        ).trim().toLowerCase();

      return status === "new";

    }).length;


  if (statNewInquiries) {

    statNewInquiries.textContent =
      String(newInquiries);

  }

}


/* =================================================
   RENDER INQUIRY
================================================= */

function renderInquiry(inquiry) {

  const card =
    document.createElement("article");

  card.className =
    "admin-inquiry-card";


  const createdAt =
    inquiry.created_at
      ? new Date(
          inquiry.created_at
        ).toLocaleString(
          "en-US",
          {
            dateStyle: "medium",
            timeStyle: "short"
          }
        )
      : "Unknown date";


  const status =
    inquiry.status ||
    "New";


  const propertyTitle =
    inquiry.property_title ||
    "General inquiry";


  const propertyLocation =
    inquiry.property_location ||
    "";


  card.innerHTML = `

    <div class="admin-inquiry-top">

      <div>

        <h3>
          ${escapeHtml(
            inquiry.name || "Unknown customer"
          )}
        </h3>

        <div class="admin-inquiry-date">
          ${escapeHtml(createdAt)}
        </div>

      </div>


      <div class="admin-inquiry-status">

        <select
          class="inquiry-status-select"
          aria-label="Inquiry status"
        >

          <option value="New"
            ${status === "New" ? "selected" : ""}
          >
            New
          </option>

          <option value="Contacted"
            ${status === "Contacted" ? "selected" : ""}
          >
            Contacted
          </option>

          <option value="Closed"
            ${status === "Closed" ? "selected" : ""}
          >
            Closed
          </option>

        </select>

      </div>

    </div>


    <div class="admin-inquiry-contact">

      <div>

        <strong>Email</strong>

        <span>
          ${escapeHtml(
            inquiry.email || "—"
          )}
        </span>

      </div>


      <div>

        <strong>Phone</strong>

        <span>
          ${escapeHtml(
            inquiry.phone || "—"
          )}
        </span>

      </div>


      <div>

        <strong>Property</strong>

        <span>
          ${escapeHtml(
            propertyTitle
          )}
        </span>

      </div>

    </div>


    ${
      propertyLocation
        ? `
          <div class="admin-inquiry-property">

            <strong>Location</strong>

            <span>
              ${escapeHtml(propertyLocation)}
            </span>

          </div>
        `
        : ""
    }


    <div class="admin-inquiry-message">

      ${escapeHtml(
        inquiry.message || ""
      )}

    </div>


    <div class="admin-inquiry-actions">

      <button
        class="admin-inquiry-delete"
        type="button"
      >
        Delete inquiry
      </button>

    </div>

  `;


  const statusSelect =
    card.querySelector(
      ".inquiry-status-select"
    );


  const deleteButton =
    card.querySelector(
      ".admin-inquiry-delete"
    );


  statusSelect.addEventListener(
    "change",
    async () => {

      await updateInquiryStatus(
        inquiry.id,
        statusSelect.value,
        statusSelect
      );

      await loadInquiries();

    }
  );


  deleteButton.addEventListener(
    "click",
    async () => {

      await deleteInquiry(
        inquiry,
        deleteButton
      );

    }
  );


  adminInquiries.appendChild(card);

}


/* =================================================
   UPDATE INQUIRY STATUS
================================================= */

async function updateInquiryStatus(
  inquiryId,
  newStatus,
  select
) {

  select.disabled = true;


  const {
    error
  } = await supabase
    .from("Inquiries")
    .update({
      status: newStatus
    })
    .eq("id", inquiryId);


  if (error) {

    console.error(
      "Update inquiry status error:",
      error
    );

    alert(
      error.message ||
      "Unable to update inquiry status."
    );

  }


  select.disabled = false;

}


/* =================================================
   DELETE INQUIRY
================================================= */

async function deleteInquiry(
  inquiry,
  deleteButton
) {

  const confirmed =
    window.confirm(
      `Delete the inquiry from ${inquiry.name || "this customer"}?`
    );


  if (!confirmed) {
    return;
  }


  deleteButton.disabled = true;

  deleteButton.textContent =
    "Deleting...";


  const {
    error
  } = await supabase
    .from("Inquiries")
    .delete()
    .eq("id", inquiry.id);


  if (error) {

    console.error(
      "Delete inquiry error:",
      error
    );

    alert(
      error.message ||
      "Unable to delete inquiry."
    );

    deleteButton.disabled = false;

    deleteButton.textContent =
      "Delete inquiry";

    return;
  }


  await loadInquiries();

}


/* =================================================
   REFRESH INQUIRIES
================================================= */

if (refreshInquiriesBtn) {

  refreshInquiriesBtn.addEventListener(
    "click",
    async () => {

      refreshInquiriesBtn.disabled = true;

      refreshInquiriesBtn.textContent =
        "Refreshing...";

      await loadInquiries();

      refreshInquiriesBtn.disabled = false;

      refreshInquiriesBtn.textContent =
        "Refresh";

    }
  );

}


/* =================================================
   HELPERS
================================================= */

function formatPrice(value) {

  const number =
    Number(value) || 0;

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }
  ).format(number);

}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =================================================
   START APP
================================================= */

async function startApp() {

  const connected =
    await initializeSupabase();

  if (!connected) {
    return;
  }

  await checkSession();


  supabase.auth.onAuthStateChange(
    async (event, session) => {

      if (
        event === "SIGNED_IN" &&
        session
      ) {

        showAdmin();

        await loadProperties();
        await loadInquiries();

      }


      if (event === "SIGNED_OUT") {

        showLogin();

      }

    }
  );

}


startApp();
