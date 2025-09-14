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

    // Tailwind RGB colors
    const blue600 = [37, 99, 235];
    const orange600 = [234, 88, 12];
    const gray50 = [249, 250, 251];
    const blue50 = [239, 246, 255];
    const orange50 = [253, 248, 242];
    const green50 = [240, 253, 244];
    const green600 = [5, 150, 105];
    const blue500 = [59, 130, 246];
    const orange400 = [251, 146, 60];
    const yellow400 = [250, 204, 21];
    const yellow50 = [254, 252, 232];
    const gray600 = [75, 85, 99];
    const gray700 = [55, 65, 81];
    const white = [255, 255, 255];

    // Gradient banner function
    const addGradientBanner = (y: number, height: number) => {
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const ratio = i / (steps - 1);
        const r = Math.round(blue600[0] + ratio * (orange600[0] - blue600[0]));
        const g = Math.round(blue600[1] + ratio * (orange600[1] - blue600[1]));
        const b = Math.round(blue600[2] + ratio * (orange600[2] - blue600[2]));
        doc.setFillColor(r, g, b);
        doc.rect(0, y + (i * height / steps), pageWidth, height / steps, 'F');
      }
      return y + height;
    };

    // Add text with wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, bold = false, color = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, bold ? 'bold' : 'normal');
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        doc.text(line, x, y);
        y += fontSize * 0.7;
      });
      doc.setTextColor(0, 0, 0);
      return y;
    };

    // Add day number circle
    const addDayCircle = (dayNum: number, x: number, y: number, radius: number) => {
      doc.setFillColor(white[0], white[1], white[2]);
      doc.circle(x, y, radius, 'F');
      doc.setDrawColor(blue600[0], blue600[1], blue600[2]);
      doc.circle(x, y, radius, 'S');
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(blue600[0], blue600[1], blue600[2]);
      doc.text(dayNum.toString(), x, y + 5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    };

    // Add theme badge
    const addThemeBadge = (theme: string, x: number, y: number, width: number, height: number) => {
      doc.setFillColor(orange600[0], orange600[1], orange600[2]);
      doc.rect(x, y, width, height, 'F');
      doc.setDrawColor(orange600[0], orange600[1], orange600[2]);
      doc.rect(x, y, width, height, 'S');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(white[0], white[1], white[2]);
      const lines = doc.splitTextToSize(theme, width - 10);
      lines.forEach((line: string, idx: number) => {
        doc.text(line, x + 5, y + 8 + (idx * 4), { align: 'left' });
      });
      doc.setTextColor(0, 0, 0);
    };

    // Add activity box
    const addActivityBox = (time: string, name: string, desc: string, duration: string, cost: string, location: string, tips: string, y: number) => {
      const boxWidth = pageWidth - 40;
      const boxHeight = 50;
      const borderWidth = 4;

      // Light gray background
      doc.setFillColor(gray50[0], gray50[1], gray50[2]);
      doc.rect(20, y, boxWidth, boxHeight, 'F');
      // Blue left border
      doc.setDrawColor(blue500[0], blue500[1], blue500[2]);
      doc.setLineWidth(borderWidth);
      doc.rect(20, y, borderWidth, boxHeight);

      // Time
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(time, 25, y + 10);

      // Name
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(name, 50, y + 10);

      // Description
      let currentY = y + 18;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      currentY = addWrappedText(desc, 50, currentY, boxWidth - 60);

      // Details
      let detailY = currentY + 2;
      if (duration) {
        doc.text(`Duration: ${duration}`, 50, detailY);
        detailY += 4;
      }
      if (cost) {
        doc.setTextColor(green600[0], green600[1], green600[2]);
        doc.text(`Cost: ${cost}`, 50, detailY);
        doc.setTextColor(0, 0, 0);
        detailY += 4;
      }
      if (location) {
        doc.text(`Location: ${location}`, 50, detailY);
        detailY += 4;
      }
      if (tips) {
        doc.setTextColor(blue500[0], blue500[1], blue500[2]);
        doc.text(`Tip: ${tips}`, 50, detailY);
        doc.setTextColor(0, 0, 0);
      }

      return y + boxHeight + 5;
    };

    // Add meal card
    const addMealCard = (mealType: string, restaurant: string, cuisine: string, desc: string, cost: string, y: number, col: number) => {
      const cardWidth = 80;
      const cardHeight = 60;
      const x = 20 + col * 90;
      const borderWidth = 4;

      // Light orange background
      doc.setFillColor(orange50[0], orange50[1], orange50[2]);
      doc.rect(x, y, cardWidth, cardHeight, 'F');
      // Orange left border
      doc.setDrawColor(orange400[0], orange400[1], orange400[2]);
      doc.setLineWidth(borderWidth);
      doc.rect(x, y, borderWidth, cardHeight);

      // Meal type and restaurant
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${mealType}: ${restaurant}`, x + 5, y + 10);

      // Cuisine
      if (cuisine) {
        doc.setTextColor(orange600[0], orange600[1], orange600[2]);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(cuisine, x + 5, y + 18);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
      }

      // Description
      let descY = y + 25;
      doc.setFontSize(10);
      descY = addWrappedText(desc, x + 5, descY, cardWidth - 10);

      // Cost
      doc.setTextColor(green600[0], green600[1], green600[2]);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(cost, x + cardWidth - 5, y + cardHeight - 5, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');

      return y + cardHeight + 5;
    };

    // Add info card (transport/budget)
    const addInfoCard = (icon: string, title: string, content: string, color: number[], y: number, isRight = false) => {
      const cardWidth = (pageWidth - 60) / 2;
      const cardHeight = 40;
      const x = isRight ? 20 + cardWidth + 20 : 20;
      const borderWidth = 4;

      // Background
      doc.setFillColor(blue50[0], blue50[1], blue50[2]);
      doc.rect(x, y, cardWidth, cardHeight, 'F');
      // Border
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(borderWidth);
      doc.rect(x, y, borderWidth, cardHeight);

      // Icon and title
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${icon} ${title}`, x + 5, y + 10);

      // Content
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      let contentY = y + 20;
      contentY = addWrappedText(content, x + 5, contentY, cardWidth - 10);

      return y + cardHeight + 5;
    };

    const data = itinerary.itinerary_data;

    // Destination header
    doc.setFontSize(32);
    doc.setFont(undefined, 'bold');
    doc.text(data.destination, pageWidth / 2, 30, { align: 'center' });
    yPosition += 15;
    doc.setFontSize(12);
    doc.text(`Duration: ${data.duration} days • Budget: ${data.totalBudget}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 30;

    // Days
    if (data.days || data.dailyItinerary) {
      const days = data.days || data.dailyItinerary;
      days.forEach((day: any, index: number) => {
        const dayNum = day.day || index + 1;
        const date = day.date || '';
        const theme = day.theme || '';

        // Day banner - full width gradient
        yPosition = addGradientBanner(yPosition, 50, blue600, orange600);

        // Day circle
        addDayCircle(dayNum, 35, yPosition - 35, 15);

        // Date
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(date, 35, yPosition - 20);

        // Theme badge on right
        if (theme) {
          addThemeBadge(theme, pageWidth - 120, yPosition - 40, 100, 25);
        }

        yPosition += 5;

        // Daily Schedule header
        yPosition = addSectionHeader('Daily Schedule', yPosition, 14, true);

        // Activities
        if (day.activities) {
          day.activities.forEach((activity: any) => {
            yPosition = addActivityBox(
              activity.time || '',
              activity.name || activity.title || '',
              activity.description || '',
              activity.duration || '',
              activity.cost || '',
              activity.location || '',
              activity.tips || '',
              yPosition
            );
            if (yPosition > pageHeight - 60) {
              doc.addPage();
              yPosition = 20;
            }
          });
        }

        // Meals header
        yPosition = addSectionHeader('Meal Recommendations', yPosition, 14, true);

        // Meals in 3 columns
        if (day.meals && day.meals.length > 0) {
          let mealRowY = yPosition;
          day.meals.forEach((meal: any, mIndex: number) => {
            const col = mIndex % 3;
            if (col === 0 && mIndex > 0) {
              mealRowY += 65;
            }
            mealRowY = addMealCard(
              meal.meal || '',
              meal.restaurant || meal.name || '',
              meal.cuisine || '',
              meal.description || '',
              meal.cost || '',
              mealRowY,
              col
            );
          });
          yPosition = Math.max(yPosition, mealRowY + 5);
        }

        // Transportation & Budget header
        yPosition = addSectionHeader('Transportation & Budget', yPosition, 14, true);

        let infoY = yPosition;
        if (day.transportation) {
          infoY = addInfoCard('Transportation', day.transportation, blue500, yPosition, false);
        }
        if (day.estimatedCost) {
          yPosition = addInfoCard('Daily Budget', day.estimatedCost, green600, infoY, true);
        }
        yPosition = Math.max(yPosition, infoY + 45);
        yPosition += 15;

        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      });
    }

    // Packing List
    if (data.packingList) {
      yPosition = addSectionHeader('Packing List', yPosition, 16, true);
      data.packingList.forEach((item: string) => {
        doc.setFontSize(11);
        doc.text(`• ${item}`, 25, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }

    // Travel Tips
    if (data.tips) {
      yPosition = addSectionHeader('Travel Tips', yPosition, 16, true);
      data.tips.forEach((tip: string) => {
        // Yellow box
        doc.setFillColor(yellow50[0], yellow50[1], yellow50[2]);
        doc.rect(20, yPosition, pageWidth - 40, 25, 'F');
        doc.setDrawColor(yellow400[0], yellow400[1], yellow400[2]);
        doc.setLineWidth(4);
        doc.rect(20, yPosition, 4, 25);
        doc.setFontSize(10);
        doc.text(tip, 30, yPosition + 12);
        yPosition += 30;
      });
      yPosition += 5;
    }

    // Budget Breakdown
    if (data.budgetBreakdown) {
      yPosition = addSectionHeader('Budget Breakdown', yPosition, 16, true);
      let rowY = yPosition;
      Object.entries(data.budgetBreakdown).forEach(([category, amount]: [string, any], idx: number) => {
        const col = idx % 4;
        const x = 20 + col * 50;
        // Green card
        doc.setFillColor(green50[0], green50[1], green50[2]);
        doc.rect(x, rowY, 45, 30, 'F');
        doc.setDrawColor(green600[0], green600[1], green600[2]);
        doc.rect(x, rowY, 45, 30);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(amount.toString(), x + 22.5, rowY + 12, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(category, x + 22.5, rowY + 22, { align: 'center' });
        if (col === 3 || idx === Object.keys(data.budgetBreakdown).length - 1) {
          rowY += 35;
        }
      });
      yPosition = rowY + 10;
    }

    doc.save(`${data.destination.replace(/\s+/g, '_')}_Itinerary.pdf`);
    
    toast({
      title: "PDF Downloaded!",
      description: "Your itinerary has been saved as a PDF.",
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
                                  Tip: {activity.tips}
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
                      <h4 className="font-semibold text-lg mb-3">Meal Recommendations</h4>
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
                        <h4 className="font-semibold text-lg mb-2">Transportation</h4>
                        <p className="text-gray-600">{day.transportation}</p>
                      </div>
                    )}
                    {day.estimatedCost && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-lg mb-2">Daily Budget</h4>
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
                <CardTitle>Packing List</CardTitle>
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
                <CardTitle>Travel Tips</CardTitle>
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
              <CardTitle>Budget Breakdown</CardTitle>
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
