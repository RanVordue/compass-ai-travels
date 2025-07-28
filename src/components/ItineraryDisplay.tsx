
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Clock, DollarSign, Calendar, Download, Edit, AlertCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from 'jspdf';

interface ItineraryDisplayProps {
  travelData: any;
  onBack: () => void;
}

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ travelData, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [itinerary, setItinerary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const downloadPDF = () => {
    if (!itinerary) return;

    const pdf = new jsPDF();
    let yPosition = 20;
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.width;
    const lineHeight = 7;
    
    // Helper function to add text with wrapping and page breaks
    const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      const maxWidth = pageWidth - (margin * 2);
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      lines.forEach((line: string) => {
        if (yPosition > pdf.internal.pageSize.height - 30) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      return yPosition;
    };

    // Add title
    yPosition = addText(`${itinerary.destination} Travel Itinerary`, 18, true);
    yPosition += 5;
    addText(`${itinerary.duration} days of unforgettable experiences`, 12);
    yPosition += 10;

    // Add summary if available
    if (itinerary.summary) {
      addText(itinerary.summary, 10);
      yPosition += 10;
    }

    // Add overview
    addText(`Duration: ${itinerary.duration} Days`, 10, true);
    addText(`Total Budget: ${itinerary.totalBudget}`, 10, true);
    addText(`Group Size: ${travelData.groupSize.replace('-', ' ')}`, 10, true);
    yPosition += 10;

    // Add daily itinerary
    itinerary.days?.forEach((day: any) => {
      yPosition = addText(`Day ${day.day} - ${day.theme}`, 14, true);
      if (day.date) {
        addText(`Date: ${day.date}`, 10);
      }
      yPosition += 5;

      // Activities
      if (day.activities?.length) {
        addText('Daily Schedule:', 12, true);
        day.activities.forEach((activity: any) => {
          addText(`${activity.time} - ${activity.name}`, 10, true);
          if (activity.description) {
            addText(`  ${activity.description}`, 9);
          }
          if (activity.duration) {
            addText(`  Duration: ${activity.duration}`, 9);
          }
          if (activity.cost) {
            addText(`  Cost: ${activity.cost}`, 9);
          }
          if (activity.location) {
            addText(`  Location: ${activity.location}`, 9);
          }
          if (activity.tips) {
            addText(`  Tip: ${activity.tips}`, 9);
          }
          yPosition += 3;
        });
      }

      // Meals
      if (day.meals?.length) {
        yPosition += 3;
        addText('Meal Recommendations:', 12, true);
        day.meals.forEach((meal: any) => {
          addText(`${meal.meal}: ${meal.restaurant || meal.suggestion}`, 10, true);
          if (meal.cuisine) {
            addText(`  Cuisine: ${meal.cuisine}`, 9);
          }
          if (meal.description) {
            addText(`  ${meal.description}`, 9);
          }
          if (meal.cost) {
            addText(`  Cost: ${meal.cost}`, 9);
          }
        });
      }

      // Transportation
      if (day.transportation) {
        yPosition += 3;
        addText('Transportation:', 12, true);
        addText(day.transportation, 10);
      }

      // Daily cost
      if (day.estimatedCost) {
        yPosition += 3;
        addText(`Estimated Daily Cost: ${day.estimatedCost}`, 11, true);
      }

      yPosition += 15; // Space between days
    });

    // Add additional information
    if (itinerary.packingList?.length) {
      yPosition += 5;
      addText('Packing List:', 14, true);
      itinerary.packingList.forEach((item: string) => {
        addText(`• ${item}`, 10);
      });
      yPosition += 10;
    }

    if (itinerary.localTips?.length) {
      yPosition += 5;
      addText('Local Tips:', 14, true);
      itinerary.localTips.forEach((tip: string) => {
        addText(`• ${tip}`, 10);
      });
      yPosition += 10;
    }

    if (itinerary.budgetBreakdown) {
      yPosition += 5;
      addText('Budget Breakdown:', 14, true);
      Object.entries(itinerary.budgetBreakdown).forEach(([category, cost]) => {
        addText(`${category}: ${cost}`, 10);
      });
    }

    // Save the PDF
    const fileName = `${itinerary.destination.replace(/\s+/g, '_')}_Itinerary.pdf`;
    pdf.save(fileName);
    
    toast({
      title: "PDF Downloaded!",
      description: "Your itinerary has been saved as a PDF.",
    });
  };

  useEffect(() => {
    const generateItinerary = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Generating itinerary with data:', travelData);
        
        const { data, error } = await supabase.functions.invoke('generate-itinerary', {
          body: { travelData }
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw new Error(error.message || 'Failed to generate itinerary');
        }

        if (data.error) {
          console.error('OpenAI API error:', data.error);
          throw new Error(data.error);
        }

        console.log('Generated itinerary:', data.itinerary);
        setItinerary(data.itinerary);
        
        toast({
          title: "Itinerary Generated!",
          description: "Your personalized travel plan is ready.",
        });

      } catch (err) {
        console.error('Error generating itinerary:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate itinerary');
        
        toast({
          title: "Generation Failed",
          description: "Unable to create your itinerary. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    generateItinerary();
  }, [travelData, toast]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Button
              variant="outline"
              onClick={onBack}
              className="mb-8 flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Planning</span>
            </Button>
            
            <Card className="shadow-lg border-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-4">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Oops! Something went wrong
                </h2>
                <p className="text-gray-600 mb-6">
                  We encountered an error while generating your itinerary: {error}
                </p>
                <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Button
            variant="outline"
            onClick={onBack}
            className="mb-8 flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Planning</span>
          </Button>
          <p className="text-gray-600">No itinerary data available.</p>
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
            <Button onClick={downloadPDF} className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700">
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
            {itinerary.summary && (
              <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                {itinerary.summary}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium">{itinerary.duration} Days</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-medium">{itinerary.totalBudget}</span>
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
          {itinerary.days?.map((day: any, index: number) => (
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
                      {day.activities?.map((activity: any, idx: number) => (
                        <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600 font-medium min-w-[80px]">
                            {activity.time}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{activity.name}</h5>
                            {activity.description && (
                              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>{activity.duration}</span>
                              <span className="text-green-600 font-medium">{activity.cost}</span>
                              {activity.location && <span>📍 {activity.location}</span>}
                            </div>
                            {activity.tips && (
                              <p className="text-xs text-blue-600 mt-1">💡 {activity.tips}</p>
                            )}
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
                        {day.meals?.map((meal: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <div>
                              <h5 className="font-medium text-gray-900">{meal.meal}</h5>
                              <p className="text-sm text-gray-600">
                                {meal.restaurant || meal.suggestion}
                                {meal.cuisine && ` • ${meal.cuisine}`}
                              </p>
                              {meal.description && (
                                <p className="text-xs text-gray-500 mt-1">{meal.description}</p>
                              )}
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

                    {day.transportation && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">Transportation</h5>
                        <p className="text-sm text-gray-600">{day.transportation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Information */}
        {(itinerary.packingList || itinerary.localTips || itinerary.budgetBreakdown) && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {itinerary.packingList && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">🎒 Packing List</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {itinerary.packingList.map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center space-x-2">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {itinerary.localTips && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">💡 Local Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {itinerary.localTips.map((tip: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start space-x-2">
                        <span>•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {itinerary.budgetBreakdown && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">💰 Budget Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(itinerary.budgetBreakdown).map(([category, cost]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 capitalize">{category}</span>
                        <span className="text-sm font-medium text-green-600">{cost as string}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

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
              <Button onClick={downloadPDF} size="lg" className="bg-white text-blue-600 hover:bg-gray-50">
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
