const grid = document.getElementById("propertyGrid");
const empty = document.getElementById("emptyState");
const count = document.getElementById("listingCount");

let allProperties = [];
const activeSlides = {};


// ==================================================
// HELPERS
// ==================================================

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );
}


function money(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(number)
    : "";
}


function normalizeProperty(property) {
  return {
    id: property.id,

    title:
      property.Title ??
      property.title ??
      "Property",

    description:
      property.Description ??
      property.description ??
      "",

    price:
      property.Price ??
      property.price ??
      0,

    location:
      property.Location ??
      property.location ??
      "",

    property_type:
      property.Property_type ??
      property.property_type ??
      "",

    status:
      property.Status ??
      property.status ??
      "For Sale",

    bedrooms:
      property.Bedrooms ??
      property.bedrooms ??
      0,

    bathrooms:
      property.Bathrooms ??
      property.bathrooms ??
      0,

    square_feet:
      property.Square_feet ??
      property.square_feet ??
      0,

    image_urls:
      Array.isArray(property.image_urls)
        ? property.image_urls.filter(Boolean)
        : property.image_url
          ? [property.image_url]
          : []
  };
}


function formatStatus(status) {
  const value = String(status || "For Sale").trim();

  if (!value) {
    return "For Sale";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}


// ==================================================
// PROPERTY IMAGES
// ==================================================

function renderPropertyImages(property) {
  const images = property.image_urls;

  if (!images.length) {
    return `
      <div class="property-img property-no-image">
        <div class="no-photo-icon">⌂</div>
        <span>No photo available</span>
      </div>
    `;
  }

  const firstImage = images[0];

  const arrows =
    images.length > 1
      ? `
        <button
          class="property-photo-arrow property-photo-prev"
          type="button"
          aria-label="Previous photo"
          data-property-id="${esc(property.id)}"
          data-direction="-1"
        >
          ‹
        </button>

        <button
          class="property-photo-arrow property-photo-next"
          type="button"
          aria-label="Next photo"
          data-property-id="${esc(property.id)}"
          data-direction="1"
        >
          ›
        </button>
      `
      : "";

  const dots =
    images.length > 1
      ? `
        <div class="property-photo-dots">
          ${images
            .map(
              (_, index) => `
                <button
                  type="button"
                  class="property-photo-dot ${
                    index === 0 ? "active" : ""
                  }"
                  aria-label="View photo ${index + 1}"
                  data-property-id="${esc(property.id)}"
                  data-slide="${index}"
                ></button>
              `
            )
            .join("")}
        </div>
      `
      : "";

  return `
    <div
      class="property-img property-gallery"
      data-gallery-id="${esc(property.id)}"
    >

      <img
        class="property-gallery-image"
        src="${esc(firstImage)}"
        alt="${esc(property.title)}"
        loading="lazy"
        data-gallery-image="${esc(property.id)}"
        onerror="this.style.display='none'; this.parentElement.classList.add('image-error');"
      >

      <span class="property-photo-count">
        ${images.length} photo${images.length === 1 ? "" : "s"}
      </span>

      ${arrows}
      ${dots}

    </div>
  `;
}


// ==================================================
// RENDER PROPERTIES
// ==================================================

function render(list) {
  count.textContent =
    `${list.length} listing${list.length === 1 ? "" : "s"}`;

  grid.innerHTML = "";

  empty.classList.toggle(
    "hidden",
    list.length !== 0
  );

  if (!list.length) {
    return;
  }

  list.forEach(property => {
    const p = normalizeProperty(property);

    activeSlides[p.id] = 0;

    const card = document.createElement("article");

    card.className = "property";

    const status = formatStatus(p.status);

    const propertyType = p.property_type
      ? esc(p.property_type)
      : "Property";

    const beds =
      Number(p.bedrooms) > 0
        ? `${esc(p.bedrooms)} bed${
            Number(p.bedrooms) === 1 ? "" : "s"
          }`
        : "— beds";

    const baths =
      Number(p.bathrooms) > 0
        ? `${esc(p.bathrooms)} bath${
            Number(p.bathrooms) === 1 ? "" : "s"
          }`
        : "— baths";

    const sqft =
      Number(p.square_feet) > 0
        ? `${new Intl.NumberFormat("en-US").format(
            Number(p.square_feet)
          )} sqft`
        : "— sqft";

    card.innerHTML = `
      ${renderPropertyImages(p)}

      <div class="property-body">

        <div class="property-card-meta">

          <span class="status">
            ${esc(status)}
          </span>

          <span class="property-type">
            ${propertyType}
          </span>

        </div>

        <div class="property-top">

          <div class="property-title">
            ${esc(p.title)}
          </div>

          <div class="price">
            ${money(p.price)}
          </div>

        </div>

        <div class="property-location">
          <span aria-hidden="true">⌖</span>
          ${esc(
            p.location ||
            "Location available on request"
          )}
        </div>

        <div class="stats">

          <span>
            <strong>🛏</strong>
            ${beds}
          </span>

          <span>
            <strong>🛁</strong>
            ${baths}
          </span>

          <span>
            <strong>📐</strong>
            ${sqft}
          </span>

        </div>

        <a
          class="property-view"
          href="/property.html?id=${encodeURIComponent(p.id)}"
        >
          <span>View property</span>
          <span aria-hidden="true">→</span>
        </a>

      </div>
    `;

    grid.appendChild(card);
  });
}


// ==================================================
// PROPERTY GALLERY
// ==================================================

function changeSlide(propertyId, direction) {
  const property = allProperties.find(
    item =>
      String(item.id) === String(propertyId)
  );

  if (
    !property ||
    property.image_urls.length <= 1
  ) {
    return;
  }

  const images = property.image_urls;

  let current =
    activeSlides[propertyId] ?? 0;

  current += direction;

  if (current < 0) {
    current = images.length - 1;
  }

  if (current >= images.length) {
    current = 0;
  }

  showSlide(propertyId, current);
}


function showSlide(propertyId, index) {
  const property = allProperties.find(
    item =>
      String(item.id) === String(propertyId)
  );

  if (
    !property ||
    !property.image_urls.length
  ) {
    return;
  }

  const images = property.image_urls;

  if (index < 0) {
    index = images.length - 1;
  }

  if (index >= images.length) {
    index = 0;
  }

  activeSlides[propertyId] = index;

  const gallery =
    document.querySelector(
      `[data-gallery-id="${CSS.escape(
        String(propertyId)
      )}"]`
    );

  if (!gallery) {
    return;
  }

  const image =
    gallery.querySelector(
      `[data-gallery-image="${CSS.escape(
        String(propertyId)
      )}"]`
    );

  if (image) {
    image.src = images[index];

    image.alt =
      `${property.title} - Photo ${index + 1}`;
  }

  gallery
    .querySelectorAll(".property-photo-dot")
    .forEach((dot, dotIndex) => {
      dot.classList.toggle(
        "active",
        dotIndex === index
      );
    });
}


// ==================================================
// GALLERY CLICK EVENTS
// ==================================================

grid.addEventListener("click", event => {

  const arrow =
    event.target.closest(
      ".property-photo-arrow"
    );

  if (arrow) {
    event.preventDefault();

    const propertyId =
      arrow.dataset.propertyId;

    const direction =
      Number(arrow.dataset.direction);

    changeSlide(
      propertyId,
      direction
    );

    return;
  }

  const dot =
    event.target.closest(
      ".property-photo-dot"
    );

  if (dot) {
    event.preventDefault();

    showSlide(
      dot.dataset.propertyId,
      Number(dot.dataset.slide)
    );
  }
});


// ==================================================
// LOAD PROPERTIES
// ==================================================

async function loadProperties() {

  try {

    grid.innerHTML =
      `<div class="loading">Loading properties...</div>`;

    empty.classList.add("hidden");

    const response =
      await fetch(
        "/api/properties",
        {
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Unable to load properties."
      );
    }

    const properties =
      await response.json();

    if (!Array.isArray(properties)) {
      throw new Error(
        "Invalid property data."
      );
    }

    allProperties =
      properties.map(
        normalizeProperty
      );

    render(allProperties);

  } catch (error) {

    console.error(
      "Property loading error:",
      error
    );

    allProperties = [];

    count.textContent =
      "0 listings";

    grid.innerHTML = `
      <div class="loading">
        Properties are temporarily unavailable.
        Please try again shortly.
      </div>
    `;

    empty.classList.add("hidden");
  }
}


// ==================================================
// HOMEPAGE SEARCH
// ==================================================

function search() {

  const locationElement =
    document.getElementById(
      "searchLocation"
    );

  const typeElement =
    document.getElementById(
      "searchType"
    );

  const priceElement =
    document.getElementById(
      "searchPrice"
    );


  const locationInput =
    locationElement
      ? locationElement.value
          .trim()
          .toLowerCase()
      : "";


  const type =
    typeElement
      ? typeElement.value
          .trim()
          .toLowerCase()
      : "";


  const maxPrice =
    priceElement
      ? Number(
          priceElement.value || 0
        )
      : 0;


  const filtered =
    allProperties.filter(
      property => {

        const p =
          normalizeProperty(
            property
          );


        const propertyLocation =
          String(
            p.location || ""
          )
            .trim()
            .toLowerCase();


        const propertyType =
          String(
            p.property_type || ""
          )
            .trim()
            .toLowerCase();


        const propertyPrice =
          Number(
            p.price || 0
          );


        const matchesLocation =
          !locationInput ||
          propertyLocation.includes(
            locationInput
          );


        const matchesType =
          !type ||
          propertyType === type;


        const matchesPrice =
          !maxPrice ||
          propertyPrice <= maxPrice;


        return (
          matchesLocation &&
          matchesType &&
          matchesPrice
        );
      }
    );


  render(filtered);
}


// ==================================================
// SEARCH BUTTON
// ==================================================

const searchButton =
  document.getElementById(
    "searchBtn"
  );

if (searchButton) {

  searchButton.addEventListener(
    "click",
    search
  );
}


// ==================================================
// LOCATION ENTER KEY
// ==================================================

const searchLocation =
  document.getElementById(
    "searchLocation"
  );

if (searchLocation) {

  searchLocation.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        search();
      }
    }
  );
}


// ==================================================
// CLEAR SEARCH WHEN INPUTS ARE EMPTIED
// ==================================================

function clearSearchIfEmpty() {

  const location =
    document.getElementById(
      "searchLocation"
    );

  const type =
    document.getElementById(
      "searchType"
    );

  const price =
    document.getElementById(
      "searchPrice"
    );


  const locationEmpty =
    !location ||
    !location.value.trim();


  const typeEmpty =
    !type ||
    !type.value;


  const priceEmpty =
    !price ||
    !price.value;


  if (
    locationEmpty &&
    typeEmpty &&
    priceEmpty
  ) {
    render(allProperties);
  }
}


if (searchLocation) {

  searchLocation.addEventListener(
    "input",
    clearSearchIfEmpty
  );
}


const searchType =
  document.getElementById(
    "searchType"
  );

if (searchType) {

  searchType.addEventListener(
    "change",
    () => {

      if (!searchType.value) {
        clearSearchIfEmpty();
      }
    }
  );
}


const searchPrice =
  document.getElementById(
    "searchPrice"
  );

if (searchPrice) {

  searchPrice.addEventListener(
    "input",
    clearSearchIfEmpty
  );
}


// ==================================================
// CONTACT FORM
// ==================================================

const contactForm =
  document.getElementById(
    "contactForm"
  );

if (contactForm) {

  contactForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      const formMessage =
        document.getElementById(
          "formMessage"
        );

      if (formMessage) {

        formMessage.textContent =
          "Thanks — your inquiry is ready. Connect this form to your preferred email/CRM when you're ready to receive leads.";
      }
    }
  );
}


// ==================================================
// START
// ==================================================

loadProperties();
