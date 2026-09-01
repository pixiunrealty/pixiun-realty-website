const grid = document.getElementById("propertyGrid");
const empty = document.getElementById("emptyState");
const count = document.getElementById("listingCount");

let allProperties = [];


/* =========================
   ESCAPE HTML
========================= */

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


/* =========================
   FORMAT MONEY
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
   NORMALIZE PROPERTY
========================= */

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
        ? property.image_urls
        : [],

    image_url:
      property.image_url ??
      ""

  };

}


/* =========================
   RENDER PROPERTIES
========================= */

function render(list) {

  count.textContent =
    `${list.length} listing${list.length === 1 ? "" : "s"}`;

  grid.innerHTML = "";

  empty.classList.toggle(
    "hidden",
    list.length !== 0
  );


  list.forEach(property => {

    const p =
      normalizeProperty(property);


    const card =
      document.createElement("article");


    card.className =
      "property";


    /* =========================
       PROPERTY IMAGE
    ========================= */

    const image =
      p.image_urls.length > 0
        ? p.image_urls[0]
        : p.image_url;


    let imageHTML = "";


    if (image) {

      imageHTML = `
        <div class="property-img">
          <img
            src="${esc(image)}"
            alt="${esc(p.title)}"
            loading="lazy"
            onerror="
              this.style.display='none';
              this.parentElement.classList.add('image-error');
            "
          >

          <span class="image-fallback">
            Photo unavailable
          </span>

        </div>
      `;

    } else {

      imageHTML = `
        <div class="property-img image-error">

          <span>
            No photo available
          </span>

        </div>
      `;

    }


    /* =========================
       PROPERTY CARD
    ========================= */

    card.innerHTML = `

      ${imageHTML}

      <div class="property-body">

        <span class="status">
          ${esc(p.status)}
        </span>


        <div class="property-top">

          <div class="property-title">
            ${esc(p.title)}
          </div>

          <div class="price">
            ${money(p.price)}
          </div>

        </div>


        <div class="property-location">
          ${esc(p.location)}
        </div>


        <div class="stats">

          <span>
            🛏 ${esc(p.bedrooms)} beds
          </span>

          <span>
            🛁 ${esc(p.bathrooms)} baths
          </span>

          <span>
            📐 ${esc(p.square_feet)} sqft
          </span>

        </div>


        <div class="property-view">
          View property →
        </div>

      </div>

    `;


    /* =========================
       MAKE CARD CLICKABLE
    ========================= */

    card.addEventListener(
      "click",
      () => {

        window.location.href =
          `property.html?id=${encodeURIComponent(p.id)}`;

      }
    );


    grid.appendChild(card);

  });

}


/* =========================
   LOAD PROPERTIES
========================= */

async function loadProperties() {

  try {

    const response =
      await fetch(
        "/api/properties",
        {
          method: "GET",

          headers: {
            Accept:
              "application/json"
          },

          cache:
            "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `Unable to load properties. Status: ${response.status}`
      );

    }


    const properties =
      await response.json();


    console.log(
      "Properties loaded:",
      properties
    );


    allProperties =
      properties.map(
        normalizeProperty
      );


    render(
      allProperties
    );


  } catch (error) {

    console.error(
      "Property loading error:",
      error
    );


    allProperties = [];


    render([]);

  }

}


/* =========================
   PROPERTY SEARCH
========================= */

function search() {

  const locationInput =
    document
      .getElementById(
        "searchLocation"
      )
      .value
      .trim()
      .toLowerCase();


  const type =
    document
      .getElementById(
        "searchType"
      )
      .value;


  const maxPrice =
    Number(
      document
        .getElementById(
          "searchPrice"
        )
        .value || 0
    );


  const filtered =
    allProperties.filter(
      property => {

        const p =
          normalizeProperty(
            property
          );


        const locationMatches =
          !locationInput ||
          String(p.location)
            .toLowerCase()
            .includes(
              locationInput
            );


        const typeMatches =
          !type ||
          String(
            p.property_type
          )
            .toLowerCase() ===
          type.toLowerCase();


        const priceMatches =
          !maxPrice ||
          Number(
            p.price || 0
          ) <= maxPrice;


        return (
          locationMatches &&
          typeMatches &&
          priceMatches
        );

      }
    );


  render(
    filtered
  );

}


/* =========================
   SEARCH BUTTON
========================= */

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


/* =========================
   SEARCH WITH ENTER
========================= */

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

        search();

      }

    }
  );

}


/* =========================
   CONTACT FORM
========================= */

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
          "Thanks — your inquiry has been received. We'll follow up with you soon.";

      }


      contactForm.reset();

    }
  );

}


/* =========================
   START WEBSITE
========================= */

loadProperties();
