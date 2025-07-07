
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Clock, DollarSign, Calendar, Download, Edit } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

interface ItineraryDisplayProps {
  travelData: any;
  onBack: () => void;
}

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ travelData, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [itinerary, setItinerary] = useState<any>(null);

  // Simulate AI generation process
  useEffect(() => {
    const generateItinerary = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock itinerary data based on user input
      const mockItinerary = {
        destination: travelData.destination,
        duration: calculateDays(travelData.startDate, travelData.endDate),
        totalBudget: getTotalBudget(travelData.budget),
        days: generateMockDays(travelData)
      };
      
      setItinerary(mockItinerary);
      setIsLoading(false);
    };

    generateItinerary();
  }, [travelData]);

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTotalBudget = (budgetLevel: string) => {
    const budgetMap = {
      'budget': '$500-800',
      'mid-range': '$1,200-2,000',
      'luxury': '$3,000-5,000'
    };
    return budgetMap[budgetLevel as keyof typeof budgetMap] || '$1,000-1,500';
  };

  const generateMockDays = (data: any) => {
    const days = [];
    const duration = calculateDays(data.startDate, data.endDate);
    
    for (let i = 1; i <= Math.min(duration, 7); i++) {
      days.push({
        day: i,
        date: getDateString(data.startDate, i - 1),
        theme: getThemeForDay(i, data.interests),
        activities: getMockActivities(i, data.interests, data.budget),
        meals: getMockMeals(data.budget),
        estimatedCost: getDailyCost(data.budget)
      });
    }
    
    return days;
  };

  const getDateString = (startDate: string, daysToAdd: number) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + daysToAdd);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getThemeForDay = (day: number, interests: string[]) => {
    const themes = interests.length > 0 ? interests : ['Exploration', 'Culture', 'Food'];
    return themes[(day - 1) % themes.length];
  };

  const getMockActivities = (day: number, interests: string[], budget: string) => {
    const baseActivities = [
      { name: 'Morning city walk', time: '9:00 AM', duration: '2 hours', cost: '$0' },
      { name: 'Visit main attraction', time: '11:30 AM', duration: '3 hours', cost: '$25' },
      { name: 'Afternoon exploration', time: '3:00 PM', duration: '2 hours', cost: '$15' },
      { name: 'Evening experience', time: '7:00 PM', duration: '2 hours', cost: '$40' }
    ];
    
    return baseActivities;
  };

  const getMockMeals = (budget: string) => {
    return [
      { meal: 'Breakfast', suggestion: 'Local café with pastries', cost: '$12' },
      { meal: 'Lunch', suggestion: 'Traditional restaurant', cost: '$25' },
      { meal: 'Dinner', suggestion: 'Recommended local cuisine', cost: '$45' }
    ];
  };

  const getDailyCost = (budget: string) => {
    const costMap = {
      'budget': '$80-120',
      'mid-range': '$150-250',
      'luxury': '$400-600'
    };
    return costMap[budget as keyof typeof costMap] || '$150-200';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Creating Your Perfect Itinerary
            </h1>
            <div className="flex justify-center items-center space-x-2 mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-lg text-gray-600">
                Our AI is analyzing your preferences and crafting your personalized travel plan...
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {[1, 2, 3].map((day) => (
              <Card key={day} className="shadow-lg border-0">
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Planning</span>
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span>Edit Itinerary</span>
            </Button>
            <Button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700">
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </Button>
          </div>
        </div>

        {/* Itinerary Header */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent">
              Your {itinerary.destination} Adventure
            </CardTitle>
            <CardDescription className="text-lg mt-4">
              {itinerary.duration} days of unforgettable experiences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium">{itinerary.duration} Days</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-medium">Est. {itinerary.totalBudget}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                <span className="font-medium">{travelData.groupSize.replace('-', ' ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Itinerary */}
        <div className="space-y-8">
          {itinerary.days.map((day: any, index: number) => (
            <Card key={day.day} className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-orange-600 text-white">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="font-bold text-lg">{day.day}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Day {day.day}</h3>
                      <p className="text-blue-100">{day.date}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {day.theme}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Activities */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span>Daily Schedule</span>
                    </h4>
                    <div className="space-y-4">
                      {day.activities.map((activity: any, idx: number) => (
                        <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600 font-medium min-w-[80px]">
                            {activity.time}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{activity.name}</h5>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>{activity.duration}</span>
                              <span className="text-green-600 font-medium">{activity.cost}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meals & Budget */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                        <span>🍽️</span>
                        <span>Meal Recommendations</span>
                      </h4>
                      <div className="space-y-3">
                        {day.meals.map((meal: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <div>
                              <h5 className="font-medium text-gray-900">{meal.meal}</h5>
                              <p className="text-sm text-gray-600">{meal.suggestion}</p>
                            </div>
                            <span className="text-green-600 font-medium">{meal.cost}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">Estimated Daily Cost</span>
                        <span className="text-xl font-bold text-green-600">{day.estimatedCost}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="shadow-lg border-0 mt-12 bg-gradient-to-r from-blue-600 to-orange-600">
          <CardContent className="text-center py-12">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to make this trip happen?
            </h3>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Your personalized itinerary is ready! Download it, share it with travel companions, or make adjustments to fit your style.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-50">
                Download Full Itinerary
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Plan Another Trip
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ItineraryDisplay;
