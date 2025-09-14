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
  }, [user, loading, id, navigate]);

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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    const addSectionHeader = (text: string, y: number, isBold = true) => {
      doc.setFontSize(16);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(text, 20, y);
      return y + 10;
    };

    const addDayHeader = (dayNum: number, date: string, theme: string, y: number) => {
      // Day banner simulation
      doc.setFillColor(72, 94, 255); // Blue
      doc.setDrawColor(72, 94, 255);
      doc.rect(15, y - 5, pageWidth - 30, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`Day ${dayNum}`, 20, y);
      doc.text(date, 20, y + 6);
      if (theme) {
        doc.setFillColor(255, 165, 0); // Orange
        doc.rect(pageWidth - 100, y - 3, 85, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(theme, pageWidth - 95, y + 5);
      }
      doc.setTextColor(0, 0, 0);
      return y + 30;
    };

    const addActivity = (time: string, name: string, desc: string, duration: string, cost: string, location: string, tips: string, y: number) => {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(time, 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(name, 35, y);
      doc.setFontSize(9);
      if (desc) doc.text(desc, 35, y + 4);
      let detailY = y + 8;
      if (duration) {
        doc.text(`Duration: ${duration}`, 35, detailY);
        detailY += 3;
      }
      if (cost) {
        doc.setTextColor(0, 128, 0);
        doc.text(`Cost: ${cost}`, 35, detailY);
        doc.setTextColor(0, 0, 0);
        detailY += 3;
      }
      if (location) {
        doc.text(`Location: ${location}`, 35, detailY);
        detailY += 3;
      }
      if (tips) {
        doc.setTextColor(30, 144, 255);
        doc.text(`💡 ${tips}`, 35, detailY);
        doc.setTextColor(0, 0, 0);
      }
      return y + 20;
    };

    const addMealCard = (mealType: string, restaurant: string, desc: string, cuisine: string, cost: string, y: number, isLeft = true) => {
      const x = isLeft ? 20 : 120;
      doc.setFillColor(255, 165, 0, 0.2); // Light orange
      doc.rect(x, y, 90, 25, 'F');
      doc.setDrawColor(255, 165, 0);
      doc.rect(x, y, 90, 25);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`${mealType}: ${restaurant}`, x + 2, y + 5);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      if (cuisine) doc.text(cuisine, x + 2, y + 10);
      if (desc) doc.text(desc, x + 2, y + 13);
      doc.setTextColor(0, 128, 0);
      doc.text(cost, x + 88, y + 20, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      return y + 30;
    };

    const addBudgetCard = (label: string, amount: string, y: number, color: string) => {
      const rgb = color === 'green' ? [0, 128, 0] : [30, 144, 255];
      doc.setFillColor(rgb[0], rgb[1], rgb[2], 0.2);
      doc.rect(20, y, 90, 20, 'F');
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(20, y, 90, 20);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(label, 22, y + 8);
      doc.setFontSize(14);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(amount, 105, y + 15, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      return y + 25;
    };

    const data = itinerary.itinerary_data;

    // Header
    yPosition = addSectionHeader(`${data.destination} Travel Itinerary`, yPosition, true);
    doc.setFontSize(12);
    doc.text(`Duration: ${data.duration} days`, 20, yPosition);
    yPosition += 6;
    doc.text(`Budget: ${data.totalBudget}`, 20, yPosition);
    yPosition += 20;

    // Days
    if (data.days || data.dailyItinerary) {
      const days = data.days || data.dailyItinerary;
      days.forEach((day: any, index: number) => {
        const dayNum = day.day || index + 1;
        const date = day.date || '';
        const theme = day.theme || '';
        yPosition = addDayHeader(dayNum, date, theme, yPosition);

        // Daily Schedule
        yPosition = addSectionHeader('Daily Schedule', yPosition);
        if (day.activities) {
          day.activities.forEach((activity: any) => {
            yPosition = addActivity(
              activity.time || '',
              activity.name || activity.title || '',
              activity.description || '',
              activity.duration || '',
              activity.cost || '',
              activity.location || '',
              activity.tips || '',
              yPosition
            );
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = 20;
            }
          });
        }

        // Meals
        yPosition = addSectionHeader('Meal Recommendations', yPosition);
        if (day.meals && day.meals.length > 0) {
          day.meals.forEach((meal: any, mIndex: number) => {
            yPosition = addMealCard(
              meal.meal || '',
              meal.restaurant || meal.name || '',
              meal.description || '',
              meal.cuisine || '',
              meal.cost || '',
              yPosition,
              mIndex % 2 === 0
            );
          });
        }

        // Transportation & Budget
        if (day.transportation || day.estimatedCost) {
          let budgetY = yPosition;
          if (day.transportation) {
            budgetY = addBudgetCard('Transportation', day.transportation, yPosition, 'blue');
            yPosition += 25;
          }
          if (day.estimatedCost) {
            yPosition = addBudgetCard('Daily Budget', day.estimatedCost, budgetY, 'green');
          }
          yPosition += 10;
        }

        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      });
    }

    // Additional Sections
    if (data.packingList) {
      yPosition = addSectionHeader('Packing List', yPosition, true);
      data.packingList.forEach((item: string) => {
        doc.setFontSize(10);
        doc.text(`• ${item}`, 20, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    }

    if (data.tips) {
      yPosition = addSectionHeader('Travel Tips', yPosition, true);
      data.tips.forEach((tip: string) => {
        doc.setFontSize(10);
        doc.text(`• ${tip}`, 20, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    }

    if (data.budgetBreakdown) {
      yPosition = addSectionHeader('Budget Breakdown', yPosition, true);
      Object.entries(data.budgetBreakdown).forEach(([category, amount]) => {
        doc.setFontSize(10);
        doc.text(`${category}: ${amount as string}`, 20, yPosition);
        yPosition += 5;
      });
    }

    doc.save(`${data.destination.replace(/\s+/g, '_')}_Itinerary.pdf`);
    
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

        <div className="text-center mb-8">
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

        {(data.days || data.dailyItinerary) && (
          <div className="space-y-8">
            {(data.days || data.dailyItinerary).map((day: any, index: number) => (
              <Card key={day.day || index} className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-orange-600 text-white">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="font-bold text-lg">{day.day || index + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Day {day.day || index + 1}</h3>
                        {day.date && <p className="text-blue-100">{day.date}</p>}
                      </div>
                    </div>
                    {day.theme && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {day.theme}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
