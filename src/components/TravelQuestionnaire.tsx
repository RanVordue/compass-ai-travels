
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import debounce from 'lodash.debounce';
import { supabase } from "@/integrations/supabase/client";

interface TravelQuestionnaireProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

const TravelQuestionnaire: React.FC<TravelQuestionnaireProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    groupSize: '',
    interests: [] as string[],
    pace: '',
    accommodation: '',
    specialNeeds: '',
    additionalInfo: ''
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [cachedSuggestions, setCachedSuggestions] = useState<any[]>([]);
  const [previousQuery, setPreviousQuery] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch place suggestions from Geoapify
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setCachedSuggestions([]);
      setPreviousQuery('');
      setShowSuggestions(false);
      return;
    }

    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('autocomplete-geoapify', {
        body: { text: query }
      });

      if (error) throw error;

      console.log('Geoapify response:', data); // Debug log
      const results = data?.results || [];
      setSuggestions(results);
      setCachedSuggestions(results);
      setPreviousQuery(query);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch destination suggestions. Please try again.",
        variant: "destructive",
      });
      setSuggestions([]);
      setCachedSuggestions([]);
      setPreviousQuery('');
      setShowSuggestions(false);
    } finally {
      setIsFetching(false);
    }
  };

  const debouncedFetchSuggestions = React.useRef(debounce(fetchSuggestions, 300)).current;

  // Handle input focus to show cached suggestions
  const handleInputFocus = () => {
    if (formData.destination === previousQuery && cachedSuggestions.length > 0) {
      console.log('Re-showing suggestions:', cachedSuggestions); // Debug log
      setSuggestions(cachedSuggestions);
      setShowSuggestions(true);
    }
  };
  
  // Handle selecting a suggestion
  const handleSelectSuggestion = (place: any, event?: React.MouseEvent) => {
    // Prevent click event from bubbling to handleClickOutside
    if (event) {
      event.stopPropagation();
    }
    const placeName = `${place.city || place.name || ''}, ${place.country} ${place.state ? `, ${place.state}` : ''}`.trim();
    setFormData(prev => ({
      ...prev,
      destination: placeName
    }));
    setSuggestions([]);
    setPreviousQuery('');
    setShowSuggestions(false);
  };

  // Handle input change for destination
  const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, destination: value }));
    debouncedFetchSuggestions(value);
  };

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const interests = [
    'Food & Dining', 'Art & Museums', 'History & Culture', 'Nightlife', 
    'Shopping', 'Nature & Outdoors', 'Adventure Sports', 'Photography',
    'Architecture', 'Local Markets', 'Music & Entertainment', 'Wellness & Spa'
  ];

  const handleInterestChange = (interest: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      interests: checked 
        ? [...prev.interests, interest]
        : prev.interests.filter(i => i !== interest)
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const steps = [
    {
      title: "Trip Basics",
      description: "Tell us where and when you're traveling"
    },
    {
      title: "Budget & Group",
      description: "Help us understand your travel style"
    },
    {
      title: "Interests",
      description: "What excites you most about traveling?"
    },
    {
      title: "Final Details",
      description: "Any special requirements or preferences?"
    }
  ];

  const isStepComplete = () => {
    switch (currentStep) {
      case 0:
        return formData.destination && formData.startDate && formData.endDate;
      case 1:
        return formData.budget && formData.groupSize && formData.pace;
      case 2:
        return formData.interests.length > 0;
      case 3:
        return formData.accommodation;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Plan Your Perfect Trip
          </h1>
          <div className="flex justify-center space-x-2 mb-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`h-2 w-12 rounded-full transition-colors duration-300 ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-lg text-gray-600">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
            <CardDescription className="text-lg">
              {steps[currentStep].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 0: Trip Basics */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="relative">
                  <Label htmlFor="destination" className="text-lg font-medium">
                    Where are you going?
                  </Label>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="destination"
                      placeholder="e.g., Paris, France or Tokyo, Japan"
                      value={formData.destination}
                      onChange={handleDestinationChange}
                      onFocus={handleInputFocus}
                      className="mt-2 text-lg p-4 pl-10"
                      ref={inputRef}
                    />
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {suggestions.map((place, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={(e) => handleSelectSuggestion(place, e)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSelectSuggestion(place);
                          }}
                        >
                          <p className="text-sm font-medium">
                            {place.city || place.name || ''}, {place.country}
                            {place.state ? `, ${place.state}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            {place.formatted}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {isFetching && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="startDate" className="text-lg font-medium">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="mt-2 text-lg p-4"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-lg font-medium">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="mt-2 text-lg p-4"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Budget & Group */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-medium">What's your budget style?</Label>
                  <Select value={formData.budget} onValueChange={(value) => handleInputChange('budget', value)}>
                    <SelectTrigger className="mt-2 text-lg p-4">
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget (Under $100/day)</SelectItem>
                      <SelectItem value="mid-range">Mid-range ($100-300/day)</SelectItem>
                      <SelectItem value="luxury">Luxury ($300+/day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-lg font-medium">Group size</Label>
                  <Select value={formData.groupSize} onValueChange={(value) => handleInputChange('groupSize', value)}>
                    <SelectTrigger className="mt-2 text-lg p-4">
                      <SelectValue placeholder="How many travelers?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo traveler</SelectItem>
                      <SelectItem value="couple">Couple (2 people)</SelectItem>
                      <SelectItem value="small-group">Small group (3-5 people)</SelectItem>
                      <SelectItem value="large-group">Large group (6+ people)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-lg font-medium">Travel pace</Label>
                  <Select value={formData.pace} onValueChange={(value) => handleInputChange('pace', value)}>
                    <SelectTrigger className="mt-2 text-lg p-4">
                      <SelectValue placeholder="What pace of travel do you prefer?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relaxed">Relaxed (2-3 activities per day)</SelectItem>
                      <SelectItem value="moderate">Moderate (4-5 activities per day)</SelectItem>
                      <SelectItem value="packed">Packed (6+ activities per day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Interests */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-medium mb-4 block">
                    What interests you most? (Select all that apply)
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {interests.map((interest) => (
                      <div key={interest} className="flex items-center space-x-3">
                        <Checkbox
                          id={interest}
                          checked={formData.interests.includes(interest)}
                          onCheckedChange={(checked) => handleInterestChange(interest, checked as boolean)}
                        />
                        <Label htmlFor={interest} className="text-base">
                          {interest}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Final Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-medium">Accommodation preference</Label>
                  <Select value={formData.accommodation} onValueChange={(value) => handleInputChange('accommodation', value)}>
                    <SelectTrigger className="mt-2 text-lg p-4">
                      <SelectValue placeholder="Where do you prefer to stay?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">Hotels</SelectItem>
                      <SelectItem value="airbnb">Airbnb/Vacation rentals</SelectItem>
                      <SelectItem value="hostel">Hostels</SelectItem>
                      <SelectItem value="boutique">Boutique/Unique stays</SelectItem>
                      <SelectItem value="mixed">Mix of options</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="specialNeeds" className="text-lg font-medium">
                    Special requirements
                  </Label>
                  <Input
                    id="specialNeeds"
                    placeholder="e.g., accessibility needs, dietary restrictions, kid-friendly"
                    value={formData.specialNeeds}
                    onChange={(e) => handleInputChange('specialNeeds', e.target.value)}
                    className="mt-2 text-lg p-4"
                  />
                </div>
                <div>
                  <Label htmlFor="additionalInfo" className="text-lg font-medium">
                    Anything else we should know?
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Share any other preferences or requirements..."
                    value={formData.additionalInfo}
                    onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                    className="mt-2 text-lg p-4 min-h-[100px]"
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex items-center space-x-2 text-lg px-6 py-3"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <Button
                onClick={nextStep}
                disabled={!isStepComplete()}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-6 py-3"
              >
                <span>{currentStep === 3 ? 'Create Itinerary' : 'Next'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TravelQuestionnaire;
