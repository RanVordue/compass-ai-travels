
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
Travel Style: ${travelData.travelStyle}
Transportation: ${travelData.transportation}
Accommodation: ${travelData.accommodation}

Please create a comprehensive day-by-day itinerary that includes:
1. Daily activities with specific times and durations
2. Restaurant recommendations for breakfast, lunch, and dinner
3. Estimated costs for each activity and meal
4. Transportation suggestions between locations
5. Cultural insights and local tips
6. Weather considerations
7. Budget breakdown per day

Format the response as a JSON object with the following structure:
{
  "destination": "destination name",
  "duration": number of days,
  "totalBudget": "estimated total budget range",
  "summary": "brief overview of the trip",
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert travel planner with extensive knowledge of destinations worldwide. Create detailed, practical, and budget-conscious travel itineraries. Always respond with valid JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;
    
    console.log('OpenAI response:', generatedContent);

    // Try to parse the JSON response
    let itinerary;
    try {
      itinerary = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // If JSON parsing fails, return a structured error response
      return new Response(JSON.stringify({ 
        error: 'Failed to generate proper itinerary format',
        rawResponse: generatedContent 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ itinerary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-itinerary function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate itinerary'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
