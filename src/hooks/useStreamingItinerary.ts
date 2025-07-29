import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface ProgressUpdate {
  type: 'summary' | 'destination' | 'day' | 'complete' | 'error';
  data?: any;
  dayNumber?: number;
  error?: string;
}

interface StreamingState {
  isLoading: boolean;
  error: string | null;
  progress: string;
  destination: string | null;
  summary: string | null;
  completedDays: any[];
  isComplete: boolean;
}

export const useStreamingItinerary = (travelData: any) => {
  const [state, setState] = useState<StreamingState>({
    isLoading: false,
    error: null,
    progress: 'Initializing...',
    destination: null,
    summary: null,
    completedDays: [],
    isComplete: false,
  });
  
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const startStreaming = async () => {
    if (!travelData) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Connecting to AI travel planner...',
      destination: null,
      summary: null,
      completedDays: [],
      isComplete: false,
    }));

    try {
      // Get the project URL dynamically
      const baseUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:54321'
        : `https://${window.location.hostname.split('.')[0]}.functions.supabase.co`;
      
      const streamUrl = `${baseUrl}/functions/v1/generate-itinerary?stream=true`;
      
      // First, make a POST request to start the generation
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({ travelData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle the streaming response directly
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body available');
      }

      setState(prev => ({ ...prev, progress: 'Connected! Generating your itinerary...' }));

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6);
              if (data.trim()) {
                const update: ProgressUpdate = JSON.parse(data);
                handleProgressUpdate(update);
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }

    } catch (readerError) {
      console.error('Reader error:', readerError);
      
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setState(prev => ({ 
          ...prev, 
          progress: `Connection lost. Retrying... (${retryCountRef.current}/${maxRetries})` 
        }));
        
        setTimeout(() => {
          startStreaming();
        }, 2000);
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Connection failed after multiple retries. Please try again.',
        }));
        
        toast({
          title: "Connection Failed",
          description: "Unable to connect to the AI service. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleProgressUpdate = (update: ProgressUpdate) => {
    switch (update.type) {
      case 'destination':
        setState(prev => ({
          ...prev,
          destination: update.data,
          progress: `Exploring ${update.data}...`,
        }));
        break;

      case 'summary':
        setState(prev => ({
          ...prev,
          summary: update.data,
          progress: 'Creating trip overview...',
        }));
        break;

      case 'day':
        setState(prev => {
          const newDay = update.data;
          const dayExists = prev.completedDays.some(day => day.day === newDay.day);
          
          if (!dayExists) {
            const updatedDays = [...prev.completedDays, newDay].sort((a, b) => a.day - b.day);
            
            return {
              ...prev,
              completedDays: updatedDays,
              progress: `Day ${newDay.day} planned! Creating day ${newDay.day + 1}...`,
            };
          }
          
          return prev;
        });
        break;

      case 'complete':
        setState(prev => ({
          ...prev,
          isLoading: false,
          isComplete: true,
          progress: 'Your itinerary is complete!',
        }));
        
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        
        toast({
          title: "Itinerary Generated!",
          description: "Your personalized travel plan is ready.",
        });
        break;

      case 'error':
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: update.error || 'Unknown error occurred',
        }));
        
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        
        toast({
          title: "Generation Failed",
          description: update.error || "An error occurred while generating your itinerary.",
          variant: "destructive",
        });
        break;
    }
  };

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const retry = () => {
    cleanup();
    retryCountRef.current = 0;
    startStreaming();
  };

  useEffect(() => {
    if (travelData) {
      startStreaming();
    }

    return cleanup;
  }, [travelData]);

  return {
    ...state,
    retry,
    cleanup,
  };
};