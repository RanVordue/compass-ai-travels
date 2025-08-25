import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Clock, DollarSign, Calendar, Download, AlertCircle } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import Header from "@/components/Header";
import jsPDF from 'jspdf';

interface SavedItinerary {
  id: string;
  title: string;
  destination: string;
  duration: number;
  total_budget: string;
  itinerary_data: any;
  travel_data: any;
  created_at: string;
  user_id: string;
}

const ViewSavedItinerary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [itinerary, setItinerary] = useState<SavedItinerary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }

    if (user && id) {
      fetchItinerary();
    }
  }, [user, loading, id]);

  const fetchItinerary = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('saved_itineraries')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Itinerary not found or you do not have permission to view it.');
        } else {
          throw error;
        }
        return;
      }

      setItinerary(data);
    } catch (err) {
      console.error('Error fetching itinerary:', err);
      setError('Failed to load itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!itinerary?.itinerary_data) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    const addText = (text: string, fontSize = 12, isBold = false) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFont(undefined, 'normal');
      }
      
      const lines = doc.splitTextToSize(text, 170);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 20, yPosition);
        yPosition += fontSize * 0.5 + 2;
      });
      yPosition += 5;
    };

    const data = itinerary.itinerary_data;
    
    addText(`${data.destination} Travel Itinerary`, 18, true);
    addText(`Duration: ${data.duration} days`, 14);
    addText(`Budget: ${data.totalBudget}`, 14);
    yPosition += 10;

    if (data.dailyItinerary || data.days) {
      const days = data.dailyItinerary || data.days;
      days.forEach((day: any, index: number) => {
        addText(`Day ${day.day || index + 1}: ${day.theme || day.title || `Day ${day.day || index + 1}`}`, 16, true);
        
        if (day.activities) {
          addText('Activities:', 14, true);
          day.activities.forEach((activity: any) => {
            addText(`• ${activity.name || activity.title}`, 12);
            if (activity.description) {
              addText(`  ${activity.description}`, 11);
            }
            if (activity.time) {
              addText(`  Time: ${activity.time}`, 11);
            }
            if (activity.cost) {
              addText(`  Cost: ${activity.cost}`, 11);
            }
            if (activity.location) {
              addText(`  Location: ${activity.location}`, 11);
            }
          });
        }

        if (day.meals) {
          addText('Meals:', 14, true);
          day.meals.forEach((meal: any) => {
            const mealName = meal.restaurant || meal.name || meal.meal;
            addText(`• ${meal.meal ? meal.meal + ': ' : ''}${mealName}`, 12);
            if (meal.description) {
              addText(`  ${meal.description}`, 11);
            }
            if (meal.cuisine) {
              addText(`  Cuisine: ${meal.cuisine}`, 11);
            }
            if (meal.cost) {
              addText(`  Cost: ${meal.cost}`, 11);
            }
          });
        }

        if (day.transportation) {
          addText('Transportation:', 14, true);
          addText(`• ${day.transportation}`, 12);
        }

        if (day.estimatedCost) {
          addText(`Daily Budget: ${day.estimatedCost}`, 12, true);
        }

        yPosition += 10;
      });
    }

    if (data.packingList) {
      addText('Packing List:', 16, true);
      data.packingList.forEach((item: string) => {
        addText(`• ${item}`, 12);
      });
      yPosition += 10;
    }

    if (data.tips) {
      addText('Travel Tips:', 16, true);
      data.tips.forEach((tip: string) => {
        addText(`• ${tip}`, 12);
      });
    }

    doc.save(`${data.destination}-itinerary.pdf`);
    
    toast({
      title: "Downloaded",
      description: "Your itinerary has been downloaded as a PDF.",
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Itinerary not found'}
            </h1>
            <p className="text-gray-600 mb-6">
              The itinerary you're looking for could not be loaded.
            </p>
            <Button
              onClick={() => navigate('/saved-itineraries')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Saved Itineraries</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const data = itinerary.itinerary_data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => navigate('/saved-itineraries')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Saved Itineraries</span>
            </Button>
            
            <Button
              onClick={downloadPDF}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </Button>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {data.destination}
            </h1>
            <div className="flex justify-center space-x-6 text-gray-600">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>{data.duration} days</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>{data.totalBudget}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Itinerary */}
        {(data.dailyItinerary || data.days) && (data.dailyItinerary || data.days).length > 0 && (
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Your Itinerary</h2>
            {(data.dailyItinerary || data.days).map((day: any, index: number) => (
              <Card key={index} className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="font-bold text-lg">{day.day || index + 1}</span>
                    </div>
                    <div>
                      <div className="text-xl font-bold">Day {day.day || index + 1}</div>
                      {day.date && <div className="text-blue-100 text-sm">{day.date}</div>}
                    </div>
                  </CardTitle>
                  {day.theme && (
                    <CardDescription className="text-blue-100">
                      {day.theme}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  {/* Activities */}
                  {day.activities && day.activities.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-lg mb-3 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-blue-600" />
                        Daily Schedule
                      </h4>
                      <div className="space-y-4">
                        {day.activities.map((activity: any, actIndex: number) => (
                          <div key={actIndex} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                            {activity.time && (
                              <div className="text-sm text-gray-600 font-medium min-w-[80px]">
                                {activity.time}
                              </div>
                            )}
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 mb-1">
                                {activity.name || activity.title}
                              </h5>
                              {activity.description && (
                                <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                {activity.duration && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{activity.duration}</span>
                                  </div>
                                )}
                                {activity.cost && (
                                  <div className="text-green-600 font-medium">
                                    {activity.cost}
                                  </div>
                                )}
                                {activity.location && (
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-4 h-4" />
                                    <span className="truncate">{activity.location}</span>
                                  </div>
                                )}
                              </div>
                              {activity.tips && (
                                <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                  💡 {activity.tips}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meals */}
                  {day.meals && day.meals.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-lg mb-3">🍽️ Meal Recommendations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {day.meals.map((meal: any, mealIndex: number) => (
                          <div key={mealIndex} className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
                            <h5 className="font-medium text-gray-900 capitalize">
                              {meal.meal}: {meal.restaurant || meal.name}
                            </h5>
                            {meal.cuisine && (
                              <p className="text-orange-600 text-sm font-medium">{meal.cuisine}</p>
                            )}
                            {meal.description && (
                              <p className="text-gray-600 text-sm mt-1">{meal.description}</p>
                            )}
                            {meal.cost && (
                              <p className="text-green-600 text-sm font-medium mt-1">{meal.cost}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transportation & Budget */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {day.transportation && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-2 flex items-center">
                          <span className="mr-2">🚗</span>
                          Transportation
                        </h4>
                        <p className="text-gray-600">{day.transportation}</p>
                      </div>
                    )}
                    {day.estimatedCost && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-2 flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                          Daily Budget
                        </h4>
                        <p className="text-green-600 font-bold text-xl">{day.estimatedCost}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Packing List */}
          {data.packingList && data.packingList.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🎒</span>
                  <span>Packing List</span>
                </CardTitle>
                <CardDescription>
                  Essential items for your trip
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {data.packingList.map((item: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Travel Tips */}
          {data.tips && data.tips.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>💡</span>
                  <span>Travel Tips</span>
                </CardTitle>
                <CardDescription>
                  Helpful advice for your journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.tips.map((tip: string, index: number) => (
                    <div key={index} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                      <p className="text-gray-700 text-sm">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Budget Breakdown */}
        {data.budgetBreakdown && (
          <Card className="shadow-lg mt-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Budget Breakdown</span>
              </CardTitle>
              <CardDescription>
                Estimated costs for your trip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(data.budgetBreakdown).map(([category, amount]: [string, any]) => (
                  <div key={category} className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{amount}</div>
                    <div className="text-sm text-gray-600 capitalize">{category}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ViewSavedItinerary;