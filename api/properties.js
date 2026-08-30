export default async function handler(req,res){
  try{
    const url=process.env.VITE_SUPABASE_URL;
    const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if(!url||!key){
      return res.status(500).json({
        error:"Supabase environment variables are missing."
      });
    }

    const response=await fetch(
      `${url}/rest/v1/properties?select=*&order=created_at.desc`,
      {
        headers:{
          apikey:key,
          Authorization:`Bearer ${key}`
        }
      }
    );

    const text=await response.text();

    res.setHeader(
      "Cache-Control",
      "s-maxage=30, stale-while-revalidate=300"
    );

    if(!response.ok){
      return res.status(response.status).send(text);
    }

    return res.status(200).send(text);

  }catch(e){
    return res.status(500).json({
      error:"Unable to load properties."
    });
  }
}
