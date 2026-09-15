const loadingEl =
  document.getElementById("propertyLoading");

const errorBoxEl =
  document.getElementById("propertyError");

const contentEl =
  document.getElementById("propertyContent");

const galleryEl =
  document.getElementById("propertyGallery");

const titleEl =
  document.getElementById("propertyTitle");

const locationEl =
  document.getElementById("propertyLocation");

const statusEl =
  document.getElementById("propertyStatus");

const typeEl =
  document.getElementById("propertyType");

const priceEl =
  document.getElementById("propertyPrice");

const descriptionEl =
  document.getElementById("propertyDescription");

const statsEl =
  document.getElementById("propertyStats");

const inquiryFormEl =
  document.getElementById("propertyInquiryForm");

const formMessageEl =
  document.getElementById("propertyFormMessage");


let currentProperty = null;
let propertyImages = [];
let currentImageIndex = 0;


/* =========================
   MONEY
========================= */

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


/* =========================
   GET PROPERTY ID
========================= */

function getPropertyId() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id");
}


/* =========================
   FORMAT STATUS
========================= */

function formatStatus(value) {

  const text =
    String(value || "For Sale")
      .trim();

  if (!text) {
    return "For Sale";
  }

  return text
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(
      /\b\w/g,
      letter => letter.toUpperCase()
    );
}


/* =========================
   FORMAT NUMBER
========================= */

function number(value) {

  const parsed =
    Number(value);

  if (!Number.isFinite(parsed)) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-US"
  ).format(parsed);
}


/* =========================
   SHOW ERROR
========================= */

function showError(message) {

  if (loadingEl) {
    loadingEl.classList.add("hidden");
  }

  if (contentEl) {
    contentEl.classList.add("hidden");
  }

  if (errorBoxEl) {

    errorBoxEl.textContent =
      message;

    errorBoxEl.classList.remove(
      "hidden"
    );
  }
}


/* =========================
   GET PROPERTY IMAGES
========================= */

function getImages(property) {

  let images = [];

  if (
    Array.isArray(
      property.image_urls
    )
  ) {

    images =
      property.image_urls.filter(
        image =>
          typeof image === "string" &&
          image.trim() !== ""
      );

  }

  if (
    images.length === 0 &&
    property.image_url
  ) {

    images = [
      property.image_url
    ];

  }

  return images;
}


/* =========================
   RENDER GALLERY
========================= */

function renderGallery() {

  galleryEl.innerHTML = "";

  currentImageIndex = 0;


  if (!propertyImages.length) {

    galleryEl.innerHTML = `
      <div class="property-no-image">
        <div>
          <div class="no-photo-icon">⌂</div>
          <span>No photos available</span>
        </div>
      </div>
    `;

    return;
  }


  const galleryFrame =
    document.createElement("div");

  galleryFrame.className =
    "property-detail-gallery-frame";


  /* =========================
     MAIN IMAGE
  ========================== */

  const mainImage =
    document.createElement("img");

  mainImage.className =
    "property-main-image";

  mainImage.src =
    propertyImages[0];

  mainImage.alt =
    currentProperty.title ||
    "Property";

  mainImage.onerror =
    function () {

      this.style.display =
        "none";

      const fallback =
        document.createElement("div");

      fallback.className =
        "property-no-image";

      fallback.textContent =
        "Photo unavailable";

      galleryFrame.prepend(
        fallback
      );
    };


  galleryFrame.appendChild(
    mainImage
  );


  /* =========================
     PHOTO COUNTER
  ========================== */

  if (propertyImages.length > 1) {

    const counter =
      document.createElement("div");

    counter.className =
      "property-detail-photo-count";

    counter.textContent =
      `1 / ${propertyImages.length}`;

    galleryFrame.appendChild(
      counter
    );


    /* =========================
       PREVIOUS BUTTON
    ========================== */

    const previous =
      document.createElement("button");

    previous.type = "button";

    previous.className =
      "property-photo-arrow property-photo-prev";

    previous.setAttribute(
      "aria-label",
      "Previous photo"
    );

    previous.innerHTML =
      "‹";

    previous.addEventListener(
      "click",
      () => {
        changeImage(-1);
      }
    );

    galleryFrame.appendChild(
      previous
    );


    /* =========================
       NEXT BUTTON
    ========================== */

    const next =
      document.createElement("button");

    next.type = "button";

    next.className =
      "property-photo-arrow property-photo-next";

    next.setAttribute(
      "aria-label",
      "Next photo"
    );

    next.innerHTML =
      "›";

    next.addEventListener(
      "click",
      () => {
        changeImage(1);
      }
    );

    galleryFrame.appendChild(
      next
    );

  }


  galleryEl.appendChild(
    galleryFrame
  );


  /* =========================
     THUMBNAILS
  ========================== */

  if (propertyImages.length > 1) {

    const thumbnails =
      document.createElement("div");

    thumbnails.className =
      "property-thumbnails";


    propertyImages.forEach(
      (image, index) => {

        const thumbnail =
          document.createElement("button");

        thumbnail.type = "button";

        thumbnail.className =
          "property-thumbnail-button";


        if (index === 0) {
          thumbnail.classList.add(
            "active"
          );
        }


        const thumbnailImage =
          document.createElement("img");

        thumbnailImage.src =
          image;

        thumbnailImage.alt =
          `${currentProperty.title || "Property"} photo ${index + 1}`;

        thumbnailImage.className =
          "property-thumbnail";


        thumbnailImage.onerror =
          function () {

            thumbnail.style.display =
              "none";

          };


        thumbnail.appendChild(
          thumbnailImage
        );


        thumbnail.addEventListener(
          "click",
          () => {
            showImage(index);
          }
        );


        thumbnails.appendChild(
          thumbnail
        );

      }
    );


    galleryEl.appendChild(
      thumbnails
    );
  }
}


/* =========================
   SHOW IMAGE
========================= */

function showImage(index) {

  if (!propertyImages.length) {
    return;
  }


  if (index < 0) {
    index =
      propertyImages.length - 1;
  }


  if (
    index >= propertyImages.length
  ) {
    index = 0;
  }


  currentImageIndex =
    index;


  const mainImage =
    galleryEl.querySelector(
      ".property-main-image"
    );


  if (mainImage) {

    mainImage.src =
      propertyImages[index];

    mainImage.alt =
      `${currentProperty.title || "Property"} photo ${index + 1}`;

  }


  const counter =
    galleryEl.querySelector(
      ".property-detail-photo-count"
    );


  if (counter) {

    counter.textContent =
      `${index + 1} / ${propertyImages.length}`;

  }


  galleryEl
    .querySelectorAll(
      ".property-thumbnail-button"
    )
    .forEach(
      (thumbnail, thumbnailIndex) => {

        thumbnail.classList.toggle(
          "active",
          thumbnailIndex === index
        );

      }
    );
}


/* =========================
   CHANGE IMAGE
========================= */

function changeImage(direction) {

  showImage(
    currentImageIndex + direction
  );
}


/* =========================
   KEYBOARD GALLERY
========================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      !contentEl ||
      contentEl.classList.contains(
        "hidden"
      ) ||
      propertyImages.length <= 1
    ) {
      return;
    }


    if (event.key === "ArrowLeft") {
      changeImage(-1);
    }


    if (event.key === "ArrowRight") {
      changeImage(1);
    }

  }
);


/* =========================
   SHOW PROPERTY
========================= */

function showProperty(property) {

  currentProperty =
    property;


  const propertyTitle =
    property.Title ??
    property.title ??
    "Property";


  const propertyDescription =
    property.Description ??
    property.description ??
    "No description available.";


  const propertyPrice =
    property.Price ??
    property.price ??
    0;


  const propertyLocation =
    property.Location ??
    property.location ??
    "";


  const propertyType =
    property.Property_type ??
    property.property_type ??
    "";


  const propertyStatus =
    property.Status ??
    property.status ??
    "For Sale";


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


  propertyImages =
    getImages(property);


  /* =========================
     BASIC INFORMATION
  ========================== */

  titleEl.textContent =
    propertyTitle;


  locationEl.textContent =
    propertyLocation ||
    "Location available on request";


  statusEl.textContent =
    formatStatus(
      propertyStatus
    );


  if (typeEl) {

    typeEl.textContent =
      propertyType
        ? String(propertyType)
            .replace(/_/g, " ")
            .toUpperCase()
        : "";

    typeEl.classList.toggle(
      "hidden",
      !propertyType
    );
  }


  priceEl.textContent =
    money(propertyPrice);


  descriptionEl.textContent =
    propertyDescription;


  /* =========================
     STATS
  ========================== */

  statsEl.innerHTML = `

    <span>
      <strong>${number(bedrooms)}</strong>
      ${Number(bedrooms) === 1 ? "Bedroom" : "Bedrooms"}
    </span>

    <span>
      <strong>${number(bathrooms)}</strong>
      ${Number(bathrooms) === 1 ? "Bathroom" : "Bathrooms"}
    </span>

    <span>
      <strong>${number(squareFeet)}</strong>
      Sq Ft
    </span>

    ${
      propertyType
        ? `
          <span>
            <strong>${formatStatus(propertyType)}</strong>
          </span>
        `
        : ""
    }

  `;


  /* =========================
     GALLERY
  ========================== */

  renderGallery();


  /* =========================
     PAGE TITLE
  ========================== */

  document.title =
    `${propertyTitle} | Pixiun Realty LLC`;


  /* =========================
     SHOW PAGE
  ========================== */

  loadingEl.classList.add(
    "hidden"
  );

  errorBoxEl.classList.add(
    "hidden"
  );

  contentEl.classList.remove(
    "hidden"
  );
}


/* =========================
   LOAD PROPERTY
========================= */

async function loadProperty() {

  const id =
    getPropertyId();


  if (!id) {

    showError(
      "No property was selected."
    );

    return;
  }


  try {

    console.log(
      "Loading property:",
      id
    );


    const response =
      await fetch(
        "/api/properties",
        {
          method: "GET",

          headers: {
            Accept:
              "application/json"
          },

          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `API returned ${response.status}`
      );
    }


    const properties =
      await response.json();


    if (!Array.isArray(properties)) {

      throw new Error(
        "Invalid property data."
      );
    }


    const property =
      properties.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (!property) {

      showError(
        `Property #${id} could not be found.`
      );

      return;
    }


    showProperty(
      property
    );


  } catch (error) {

    console.error(
      "Property page error:",
      error
    );


    showError(
      "Unable to load this property. Please try again."
    );
  }
}


/* =========================
   INQUIRY FORM
========================= */

if (inquiryFormEl) {

  inquiryFormEl.addEventListener(
    "submit",
    event => {

      event.preventDefault();


      if (formMessageEl) {

        formMessageEl.textContent =
          "Thanks — your inquiry has been received. We'll follow up with you about this property.";

      }


      inquiryFormEl.reset();

    }
  );
}


/* =========================
   START
========================= */

loadProperty();
