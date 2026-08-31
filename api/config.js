export default function handler(req,res){
  const url=process.env.VITE_SUPABASE_URL;
  const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) return res.status(500).json({error:'Supabase configuration is missing.'});
  res.setHeader('Cache-Control','public, max-age=300');
  res.status(200).json({url,key});
}
