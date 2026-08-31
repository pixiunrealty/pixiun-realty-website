export default async function handler(req, res) {
  try {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return res.status(500).json({
        error: "Supabase environment variables are missing."
      });
    }

    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`
    };

    // Get all properties
    const propertiesResponse = await fetch(
      `${url}/rest/v1/Properties?select=*&order=created_at.desc`,
      {
        headers
      }
    );

    if (!propertiesResponse.ok) {
      const text = await propertiesResponse.text();

      return res.status(propertiesResponse.status).send(text);
    }

    const properties = await propertiesResponse.json();

    // Get all property images
    const imagesResponse = await fetch(
      `${url}/rest/v1/Property%20_image?select=*`,
      {
        headers
      }
    );

    if (!imagesResponse.ok) {
      const text = await imagesResponse.text();

      return res.status(imagesResponse.status).send(text);
    }

    const images = await imagesResponse.json();

    // Attach images to their matching property
    const result = properties.map(property => {

      const propertyImages = images
        .filter(image =>
          String(image.Property_id) === String(property.id)
        )
        .map(image => image.Image_url)
        .filter(Boolean);

      return {
        ...property,

        image_urls: propertyImages,

        image_url: propertyImages[0] || ""
      };
    });

    res.setHeader(
      "Cache-Control",
      "s-maxage=30, stale-while-revalidate=300"
    );

    return res.status(200).json(result);

  } catch (error) {

    console.error("Properties API error:", error);

    return res.status(500).json({
      error: "Unable to load properties."
    });
  }
}
