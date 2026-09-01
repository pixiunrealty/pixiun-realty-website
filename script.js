const grid = document.getElementById("propertyGrid");
const empty = document.getElementById("emptyState");
const count = document.getElementById("listingCount");

let allProperties = [];

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
        ? property.image_urls
        : [],

    image_url:
      property.image_url ??
      ""
  };
}

function render(list) {
  count.textContent =
    `${list.length} listing${list.length === 1 ? "" : "s"}`;

  grid.innerHTML = "";

  empty.classList.toggle(
    "hidden",
    list.length !== 0
  );

  list.forEach(property => {
    const p = normalizeProperty(property);

    const card = document.createElement("article");

    card.className = "property";

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
            onerror="this.style.display='none'; this.parentElement.classList.add('image-error');"
          >
        </div>
      `;
    } else {
      imageHTML = `
        <div class="property-img image-error">
          <span>No photo available</span>
        </div>
      `;
    }

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

      </div>
    `;

    /*
      Make the entire property card open
      the property's details page.
    */
    card.style.cursor = "pointer";

    card.addEventListener("click", () => {
      window.location.href =
        `property.html?id=${encodeURIComponent(p.id)}`;
    });

    /*
      Allow keyboard users to open the card.
    */
    card.setAttribute("tabindex", "0");

    card.setAttribute(
      "role",
      "link"
    );

    card.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          window.location.href =
            `property.html?id=${encodeURIComponent(p.id)}`;
        }

      }
    );

    grid.appendChild(card);
  });
}

async function loadProperties() {
  try {

    const response =
      await fetch(
        "/api/properties",
        {
          headers: {
            Accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        "Unable to load properties."
      );
    }

    const properties =
      await response.json();

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

function search() {

  const location =
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

        return (

          (
            !location ||
            String(
              p.location
            )
              .toLowerCase()
              .includes(
                location
              )
          )

          &&

          (
            !type ||
            String(
              p.property_type
            )
              .toLowerCase()
            ===
            type.toLowerCase()
          )

          &&

          (
            !maxPrice ||
            Number(
              p.price || 0
            )
            <=
            maxPrice
          )

        );

      }
    );

  render(filtered);
}

document
  .getElementById(
    "searchBtn"
  )
  .addEventListener(
    "click",
    search
  );

loadProperties();

document
  .getElementById(
    "contactForm"
  )
  .addEventListener(
    "submit",
    event => {

      event.preventDefault();

      document.getElementById(
        "formMessage"
      ).textContent =
        "Thanks — your inquiry is ready. Connect this form to your preferred email/CRM when you're ready to receive leads.";

    }
  );
