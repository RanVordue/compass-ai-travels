-- Create saved_itineraries table
CREATE TABLE public.saved_itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  duration INTEGER NOT NULL,
  total_budget TEXT,
  itinerary_data JSONB NOT NULL,
  travel_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_itineraries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved itineraries" 
ON public.saved_itineraries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved itineraries" 
ON public.saved_itineraries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved itineraries" 
ON public.saved_itineraries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved itineraries" 
ON public.saved_itineraries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_itineraries_updated_at
BEFORE UPDATE ON public.saved_itineraries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();