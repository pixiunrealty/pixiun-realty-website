const loadingEl = document.getElementById("propertyLoading");
const errorBoxEl = document.getElementById("propertyError");
const contentEl = document.getElementById("propertyContent");

const galleryEl = document.getElementById("propertyGallery");
const titleEl = document.getElementById("propertyTitle");
const locationEl = document.getElementById("propertyLocation");
const statusEl = document.getElementById("propertyStatus");
const priceEl = document.getElementById("propertyPrice");
const descriptionEl = document.getElementById("propertyDescription");
const statsEl = document.getElementById("propertyStats");

const inquiryFormEl = document.getElementById("propertyInquiryForm");
const formMessageEl = document.getElementById("propertyFormMessage");


/* =========================
   MONEY FORMAT
========================= */

function money(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(number);
}


/* =========================
   GET PROPERTY ID
========================= */

function getPropertyId() {
  const params = new URLSearchParams(
    window.location.search
  );

  return params.get("id");
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
    errorBoxEl.textContent = message;
    errorBoxEl.classList.remove("hidden");
  }

}


/* =========================
   SHOW PROPERTY
========================= */

function showProperty(property) {

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


  /* =========================
     GET IMAGES
  ========================= */

  let images = [];

  if (Array.isArray(property.image_urls)) {

    images = property.image_urls.filter(
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


  /* =========================
     FILL PROPERTY INFORMATION
  ========================= */

  titleEl.textContent =
    propertyTitle;

  locationEl.textContent =
    propertyLocation;

  statusEl.textContent =
    propertyStatus;

  priceEl.textContent =
    money(propertyPrice);

  descriptionEl.textContent =
    propertyDescription;


  /* =========================
     PROPERTY STATS
  ========================= */

  statsEl.innerHTML = `
    <span>🛏 ${bedrooms} beds</span>
    <span>🛁 ${bathrooms} baths</span>
    <span>📐 ${squareFeet} sqft</span>
    ${
      propertyType
        ? `<span>🏠 ${propertyType}</span>`
        : ""
    }
  `;


  /* =========================
     GALLERY
  ========================= */

  galleryEl.innerHTML = "";


  if (images.length > 0) {

    /* MAIN IMAGE */

    const mainImage =
      document.createElement("img");

    mainImage.className =
      "property-main-image";

    mainImage.src =
      images[0];

    mainImage.alt =
      propertyTitle;

    mainImage.onerror = function () {

      this.style.display = "none";

      const fallback =
        document.createElement("div");

      fallback.className =
        "property-no-image";

      fallback.textContent =
        "Photo unavailable";

      galleryEl.insertBefore(
        fallback,
        galleryEl.firstChild
      );

    };

    galleryEl.appendChild(
      mainImage
    );


    /* =========================
       THUMBNAILS
    ========================= */

    if (images.length > 1) {

      const thumbnails =
        document.createElement("div");

      thumbnails.className =
        "property-thumbnails";


      images.forEach(
        (image, index) => {

          const thumbnail =
            document.createElement("img");

          thumbnail.src =
            image;

          thumbnail.alt =
            `${propertyTitle} photo ${index + 1}`;

          thumbnail.className =
            "property-thumbnail";


          if (index === 0) {

            thumbnail.classList.add(
              "active"
            );

          }


          thumbnail.onerror =
            function () {

              this.style.display =
                "none";

            };


          thumbnail.addEventListener(
            "click",
            () => {

              mainImage.src =
                image;


              document
                .querySelectorAll(
                  ".property-thumbnail"
                )
                .forEach(
                  item =>
                    item.classList.remove(
                      "active"
                    )
                );


              thumbnail.classList.add(
                "active"
              );

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


  } else {

    galleryEl.innerHTML = `
      <div class="property-no-image">
        No photos available
      </div>
    `;

  }


  /* =========================
     PAGE TITLE
  ========================= */

  document.title =
    `${propertyTitle} | Pixiun Realty LLC`;


  /* =========================
     SHOW PAGE
  ========================= */

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


  /* No ID */

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


    /* =========================
       LOAD API
    ========================= */

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


    console.log(
      "Properties received:",
      properties
    );


    /* =========================
       FIND PROPERTY
    ========================= */

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


    console.log(
      "Property found:",
      property
    );


    /* =========================
       DISPLAY PROPERTY
    ========================= */

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
   PROPERTY INQUIRY FORM
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
