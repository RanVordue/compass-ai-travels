// functions/geoapify-autocomplete/index.js
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
const GEOAPIFY_PLACES_API_KEY = Deno.env.get('GEOAPIFY_PLACES_API_KEY');
serve(async (req)=>{
  const { text } = await req.json();
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&type=city&limit=5&apiKey=${GEOAPIFY_PLACES_API_KEY}&format=json`;
  console.log(`Resulting URL is: ${url}`);
  const headersObject = Object.fromEntries(req.headers);
  const headersJson = JSON.stringify(headersObject, null, 2);
  console.log(`Request headers:\n${headersJson}`);
  try {
    const response = await fetch(url);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch suggestions'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
