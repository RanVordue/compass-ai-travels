
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const streamHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

//test commment lmao
// Helper function to wait for a specified time
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make OpenAI streaming request
const makeOpenAIStreamRequest = async (body: any): Promise<ReadableStream> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few minutes.');
    }
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
    }
    if (response.status === 500) {
      throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
    }
    throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
  }

  return response.body!;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if this is a streaming request
  const url = new URL(req.url);
  const isStreaming = url.searchParams.get('stream') === 'true';

  try {
    const { travelData } = await req.json();
    console.log('Received travel data:', travelData);

    if (isStreaming) {
      return handleStreamingRequest(travelData);
    } else {
      return handleRegularRequest(travelData);
    }
  } catch (error) {
    console.error('Error in generate-itinerary function:', error);
    return handleError(error);
  }
});

// Handle regular non-streaming request (fallback)
const handleRegularRequest = async (travelData: any) => {
  try {

    const prompt = createPrompt(travelData);

    // Use the updated GPT model and make the request with retry logic
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert travel planner with extensive knowledge of destinations worldwide. Create detailed, practical, and budget-conscious travel itineraries. CRITICAL: Always respond with complete, valid JSON format. Stay within token limits by being concise if needed, but ensure the JSON structure is always complete with proper closing brackets and braces.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8000,
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
      itinerary = parseJSONResponse(generatedContent, wasTruncated);
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ itinerary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    throw error;
  }
};

// Handle streaming request
const handleStreamingRequest = async (travelData: any) => {
  const prompt = createPrompt(travelData);
  
  const requestBody = {
    model: 'gpt-4o-mini',
    messages: [
      { 
        role: 'system', 
        content: 'You are an expert travel planner with extensive knowledge of destinations worldwide. Create detailed, practical, and budget-conscious travel itineraries. CRITICAL: Always respond with complete, valid JSON format. Generate each day sequentially and ensure the JSON structure is always complete.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 8000,
  };

  try {
    const stream = await makeOpenAIStreamRequest(requestBody);
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    const readable = new ReadableStream({
      start(controller) {
        const parser = new StreamingJSONParser();
        
        const processChunk = async () => {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              // Send final completion event
              const finalData = `data: ${JSON.stringify({ type: 'complete' })}\n\n`;
              controller.enqueue(new TextEncoder().encode(finalData));
              controller.close();
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    parser.addChunk(content);
                    
                    // Check for complete sections
                    const updates = parser.getCompleteSections();
                    for (const update of updates) {
                      const sseData = `data: ${JSON.stringify(update)}\n\n`;
                      controller.enqueue(new TextEncoder().encode(sseData));
                    }
                  }
                } catch (e) {
                  // Skip invalid JSON chunks
                }
              }
            }

            processChunk();
          } catch (error) {
            console.error('Stream processing error:', error);
            const errorData = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorData));
            controller.close();
          }
        };

        processChunk();
      }
    });

    return new Response(readable, { headers: streamHeaders });
  } catch (error) {
    console.error('Streaming error:', error);
    const errorResponse = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`;
    return new Response(errorResponse, { headers: streamHeaders });
  }
};

// Streaming JSON Parser class
class StreamingJSONParser {
  private buffer = '';
  private sentSections = new Set<string>();

  addChunk(chunk: string) {
    this.buffer += chunk;
  }

  getCompleteSections() {
    const updates = [];
    
    try {
      // Try to find complete JSON sections
      
      // Check for complete summary
      if (!this.sentSections.has('summary')) {
        const summaryMatch = this.buffer.match(/"summary":\s*"([^"]+)"/);
        if (summaryMatch) {
          updates.push({ type: 'summary', data: summaryMatch[1] });
          this.sentSections.add('summary');
        }
      }

      // Check for complete destination
      if (!this.sentSections.has('destination')) {
        const destMatch = this.buffer.match(/"destination":\s*"([^"]+)"/);
        if (destMatch) {
          updates.push({ type: 'destination', data: destMatch[1] });
          this.sentSections.add('destination');
        }
      }

      // Check for complete days
      const dayMatches = [...this.buffer.matchAll(/"day":\s*(\d+)[\s\S]*?(?="day":\s*\d+|"packingList"|\])/g)];
      
      for (const match of dayMatches) {
        const dayNumber = parseInt(match[1]);
        const dayKey = `day-${dayNumber}`;
        
        if (!this.sentSections.has(dayKey)) {
          try {
            // Extract the complete day object
            const dayStart = match.index;
            let dayContent = this.buffer.slice(dayStart);
            
            // Find the end of this day object
            let braceCount = 0;
            let inString = false;
            let escape = false;
            let dayEnd = -1;
            
            for (let i = 0; i < dayContent.length; i++) {
              const char = dayContent[i];
              
              if (escape) {
                escape = false;
                continue;
              }
              
              if (char === '\\') {
                escape = true;
                continue;
              }
              
              if (char === '"' && !escape) {
                inString = !inString;
                continue;
              }
              
              if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                
                if (braceCount === 0 && char === '}') {
                  dayEnd = i + 1;
                  break;
                }
              }
            }
            
            if (dayEnd > 0) {
              const dayJson = '{' + dayContent.slice(0, dayEnd);
              const dayData = JSON.parse(dayJson);
              
              updates.push({ 
                type: 'day', 
                data: dayData,
                dayNumber: dayNumber
              });
              this.sentSections.add(dayKey);
            }
          } catch (e) {
            // Day not complete yet, continue
          }
        }
      }

    } catch (error) {
      // Buffer doesn't contain valid JSON yet
    }
    
    return updates;
  }
}

// Create prompt function
const createPrompt = (travelData: any) => {
  return `Create a detailed travel itinerary based on the following preferences:

Destination: ${travelData.destination}
Travel Dates: ${travelData.startDate} to ${travelData.endDate}
Group Size: ${travelData.groupSize}
Budget Level: ${travelData.budget}
Interests: ${travelData.interests.join(', ')}
Travel Style: ${travelData.pace}
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
};

// Make OpenAI request function (for fallback)
const makeOpenAIRequest = async (body: any, retries = 3): Promise<any> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return await response.json();
      }

      // Handle specific error codes
      if (response.status === 429) {
        console.log(`Rate limit hit, attempt ${attempt}/${retries}`);
        if (attempt < retries) {
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

      throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);

    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed:`, error.message);
      await sleep(1000 * attempt);
    }
  }
};

// Parse JSON response function  
const parseJSONResponse = (generatedContent: string, wasTruncated: boolean) => {

  // Clean the response by removing markdown code blocks if present
  let cleanedContent = generatedContent.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  
  // Fix common JSON syntax errors
  cleanedContent = cleanedContent
    .replace(/"\s*\n\s*"/g, '",\n"') // Add missing commas between properties
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
    for (let i = 0; i < (openBrackets - closeBrackets); i++) {
      cleanedContent += ']';
    }
    for (let i = 0; i < (openBraces - closeBraces); i++) {
      cleanedContent += '}';
    }
    
    console.log('Attempted to complete truncated JSON');
  }
  
  return JSON.parse(cleanedContent);
};

// Error handling function
const handleError = (error: any) => {
  console.error('Error in generate-itinerary function:', error);
  
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};
