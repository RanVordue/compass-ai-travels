import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Helper function to wait for a specified time
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
// Helper function to make OpenAI API call with retry logic
const makeOpenAIRequest = async (body, retries = 3)=>{
  for(let attempt = 1; attempt <= retries; attempt++){
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        return await response.json();
      }
      // Handle specific error codes
      if (response.status === 429) {
        console.log(`Rate limit hit, attempt ${attempt}/${retries}`);
        if (attempt < retries) {
          // Wait with exponential backoff: 2^attempt seconds
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await sleep(waitTime);
          continue;
        }
        throw new Error(`Rate limit exceeded. Please try again in a few minutes.`);
      }
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
      }
      if (response.status === 500) {
        throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
      }
      // For other errors, throw with status code
      throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed:`, error.message);
      await sleep(1000 * attempt); // Wait before retry
    }
  }
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { travelData } = await req.json();
    console.log('Received travel data:', travelData);
    // Create a detailed prompt for OpenAI
    const prompt = `Create a detailed travel itinerary based on the following preferences:

Destination: ${travelData.destination}
Travel Dates: ${travelData.startDate} to ${travelData.endDate}
Group Size: ${travelData.groupSize}
Budget Level: ${travelData.budget}
Interests: ${travelData.interests.join(', ')}
Travel Style: ${travelData.pace}
Accommodation: ${travelData.accommodation}

Please create a comprehensive day-by-day itinerary that includes:
1. Accommodation recommendations based on the specified preference (${travelData.accommodation})
2. Daily activities with specific times and durations
3. Restaurant recommendations for breakfast, lunch, and dinner
4. Estimated costs for each activity and meal
5. Transportation suggestions between locations
6. Cultural insights and local tips
7. Weather considerations
8. Budget breakdown per day

Format the response as a JSON object with the following structure:
{
  "destination": "destination name",
  "duration": number of days,
  "totalBudget": "estimated total budget range",
  "summary": "brief overview of the trip",
  "accommodations": [
    {
      "name": "accommodation name",
      "type": "hotel/airbnb/hostel/boutique/etc",
      "location": "neighborhood or area",
      "priceRange": "nightly rate range",
      "description": "why this is recommended",
      "amenities": ["key amenities"],
      "bookingTip": "helpful booking information"
    }
  ],
  "days": [
    {
      "day": 1,
      "date": "formatted date",
      "theme": "day theme",
      "activities": [
        {
          "name": "activity name",
          "time": "start time",
          "duration": "duration",
          "description": "detailed description",
          "cost": "estimated cost",
          "location": "specific location",
          "tips": "local tips"
        }
      ],
      "meals": [
        {
          "meal": "breakfast/lunch/dinner",
          "restaurant": "restaurant name",
          "cuisine": "cuisine type",
          "cost": "estimated cost",
          "description": "brief description"
        }
      ],
      "transportation": "daily transport recommendations",
      "estimatedCost": "total daily cost"
    }
  ],
  "packingList": ["essential items to pack"],
  "localTips": ["important local information"],
  "budgetBreakdown": {
    "accommodation": "cost range",
    "food": "cost range",
    "activities": "cost range",
    "transportation": "cost range"
  }
}

Make sure the itinerary is realistic, well-researched, and tailored to the specified budget and interests.`;
    // Use the updated GPT model and make the request with retry logic
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert travel planner with extensive knowledge of destinations worldwide. Create detailed, practical, and budget-conscious travel itineraries. CRITICAL: Always respond with complete, valid JSON format. Stay within token limits by being concise if needed, but ensure the JSON structure is always complete with proper closing brackets and braces.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 8000
    };
    const data = await makeOpenAIRequest(requestBody);
    const generatedContent = data.choices[0].message.content;
    console.log('OpenAI response received successfully');
    console.log('Response length:', generatedContent.length);
    console.log('Response ending:', generatedContent.slice(-100));
    // Check if response was truncated
    const wasTruncated = data.choices[0].finish_reason === 'length';
    if (wasTruncated) {
      console.warn('OpenAI response was truncated due to token limit');
    }
    // Try to parse the JSON response
    let itinerary;
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanedContent = generatedContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      // Fix common JSON syntax errors
      cleanedContent = cleanedContent.replace(/"\s*\n\s*"/g, '",\n"') // Add missing commas between properties
      .replace(/}\s*\n\s*"/g, '},\n"') // Add missing commas after objects
      .replace(/]\s*\n\s*"/g, '],\n"') // Add missing commas after arrays
      .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']'); // Remove trailing commas before closing brackets
      // If the response was truncated and doesn't end properly, try to complete it
      if (wasTruncated) {
        const openBraces = (cleanedContent.match(/{/g) || []).length;
        const closeBraces = (cleanedContent.match(/}/g) || []).length;
        const openBrackets = (cleanedContent.match(/\[/g) || []).length;
        const closeBrackets = (cleanedContent.match(/]/g) || []).length;
        // Add missing closing brackets and braces
        for(let i = 0; i < openBrackets - closeBrackets; i++){
          cleanedContent += ']';
        }
        for(let i = 0; i < openBraces - closeBraces; i++){
          cleanedContent += '}';
        }
        console.log('Attempted to complete truncated JSON');
      }
      itinerary = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response length:', generatedContent.length);
      console.error('Was truncated:', wasTruncated);
      console.error('Raw response ending:', generatedContent.slice(-200));
      // If JSON parsing fails, return a structured error response
      return new Response(JSON.stringify({
        error: 'Failed to generate proper itinerary format. The response may have been too long.',
        details: wasTruncated ? 'Response was truncated due to length. Try a shorter trip duration.' : 'Invalid JSON format',
        rawResponse: generatedContent.slice(0, 1000) + '...' // Only return first 1000 chars for debugging
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      itinerary
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in generate-itinerary function:', error);
    // Return more specific error messages to help users understand what went wrong
    let errorMessage = 'Failed to generate itinerary';
    let statusCode = 500;
    if (error.message.includes('Rate limit exceeded')) {
      errorMessage = 'OpenAI API rate limit exceeded. Please wait a few minutes and try again.';
      statusCode = 429;
    } else if (error.message.includes('Invalid OpenAI API key')) {
      errorMessage = 'Invalid OpenAI API key. Please check your configuration.';
      statusCode = 401;
    } else if (error.message.includes('OpenAI service is temporarily unavailable')) {
      errorMessage = 'OpenAI service is temporarily unavailable. Please try again later.';
      statusCode = 503;
    }
    return new Response(JSON.stringify({
      error: errorMessage,
      details: error.message
    }), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
