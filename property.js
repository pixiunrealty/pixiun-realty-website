const loading = document.getElementById("propertyLoading");
const errorBox = document.getElementById("propertyError");
const content = document.getElementById("propertyContent");

const gallery = document.getElementById("propertyGallery");
const title = document.getElementById("propertyTitle");
const location = document.getElementById("propertyLocation");
const status = document.getElementById("propertyStatus");
const price = document.getElementById("propertyPrice");
const description = document.getElementById("propertyDescription");
const stats = document.getElementById("propertyStats");

const inquiryForm = document.getElementById("propertyInquiryForm");
const formMessage = document.getElementById("propertyFormMessage");

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

function getPropertyId() {
  const params = new URLSearchParams(
    window.location.search
  );

  return params.get("id");
}

function showError(message) {
  if (loading) {
    loading.classList.add("hidden");
  }

  if (content) {
    content.classList.add("hidden");
  }

  if (errorBox) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }
}

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


  let images = [];

  if (
    Array.isArray(property.image_urls)
  ) {
    images =
      property.image_urls.filter(
        image => image
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


  title.textContent =
    propertyTitle;

  location.textContent =
    propertyLocation;

  status.textContent =
    propertyStatus;

  price.textContent =
    money(propertyPrice);

  description.textContent =
    propertyDescription;


  stats.innerHTML = `
    <span>🛏 ${bedrooms} beds</span>
    <span>🛁 ${bathrooms} baths</span>
    <span>📐 ${squareFeet} sqft</span>
    ${
      propertyType
        ? `<span>🏠 ${propertyType}</span>`
        : ""
    }
  `;


  gallery.innerHTML = "";


  if (images.length > 0) {

    const mainImage =
      document.createElement("img");

    mainImage.className =
      "property-main-image";

    mainImage.src =
      images[0];

    mainImage.alt =
      propertyTitle;

    gallery.appendChild(
      mainImage
    );


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


      gallery.appendChild(
        thumbnails
      );

    }

  } else {

    gallery.innerHTML = `
      <div class="property-no-image">
        No photos available
      </div>
    `;

  }


  document.title =
    `${propertyTitle} | Pixiun Realty LLC`;


  loading.classList.add("hidden");

  errorBox.classList.add("hidden");

  content.classList.remove("hidden");
}


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

      const errorText =
        await response.text();

      console.error(
        "API error:",
        response.status,
        errorText
      );

      throw new Error(
        `API returned ${response.status}`
      );
    }


    const properties =
      await response.json();


    console.log(
      "Properties loaded:",
      properties
    );


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


if (inquiryForm) {

  inquiryForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      formMessage.textContent =
        "Thanks — your inquiry has been received. We'll follow up with you about this property.";

      inquiryForm.reset();

    }
  );

}


loadProperty();
