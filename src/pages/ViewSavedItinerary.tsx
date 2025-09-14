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
    const pageHeight = doc.internal.pageSize.getHeight();const downloadPDF = () => {
    if (!itinerary?.itinerary_data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Tailwind RGB colors (derived from tailwind.config.ts)
    const blue600 = [37, 99, 235];
    const orange600 = [234, 88, 12];
    const gray50 = [249, 250, 251];
    const yellow50 = [254, 252, 232];
    const yellow400 = [250, 204, 21];
    const green50 = [240, 253, 244];
    const green600 = [5, 150, 105];
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
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, bold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        doc.text(line, x, y);
        y += fontSize * 0.7;
      });
      return y;
    };

    // Add card-like section
    const addCardSection = (title: string, description: string, content: string[], y: number, bgColor: number[], borderColor: number[]) => {
      const cardWidth = pageWidth - 40;
      const cardHeight = content.length * 20 + 50;
      const x = 20;

      // Background
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(x, y, cardWidth, cardHeight, 'F');
      // Border
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(4);
      doc.rect(x, y, cardWidth, cardHeight, 'S');

      // Title
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text(title, x + 10, y + 20);

      // Description
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      let descY = y + 35;
      descY = addWrappedText(description, x + 10, descY, cardWidth - 20);

      // Content
      doc.setFontSize(12);
      content.forEach((item, idx) => {
        doc.text(`• ${item}`, x + 20, descY + (idx * 15));
      });

      return y + cardHeight + 10;
    };

    // Add day section
    const addDaySection = (day: any, y: number) => {
      const dayNum = day.day || 1;
      const date = day.date || '';
      const theme = day.theme || 'Arrival & Relaxation';

      // Gradient banner
      yPosition = addGradientBanner(yPosition, 50);

      // Destination and details below banner
      doc.setFontSize(32);
      doc.setFont(undefined, 'bold');
      doc.text(itinerary.itinerary_data.destination, pageWidth / 2, yPosition - 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Duration: ${itinerary.itinerary_data.duration} days • Budget: ${itinerary.itinerary_data.totalBudget}`, pageWidth / 2, yPosition - 5, { align: 'center' });

      // Theme outside box
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(theme, 20, yPosition + 10);

      // Daily Schedule card
      if (day.activities) {
        yPosition = addCardSection(
          'Daily Schedule',
          'Planned activities for the day',
          day.activities.map((act: any) => `${act.time} - ${act.name}: ${act.description} (Duration: ${act.duration}, Cost: ${act.cost}, Location: ${act.location}, Tip: ${act.tips})`),
          yPosition + 20,
          gray50,
          blue600
        );
      }

      // Meal Recommendations card
      if (day.meals) {
        yPosition = addCardSection(
          'Meal Recommendations',
          'Suggested dining options',
          day.meals.map((meal: any) => `${meal.meal}: ${meal.restaurant} (${meal.cuisine}) - ${meal.description} (Cost: ${meal.cost})`),
          yPosition,
          yellow50,
          yellow400
        );
      }

      // Transportation & Budget card
      yPosition = addCardSection(
        'Transportation & Budget',
        'Travel and cost details',
        [`Transportation: ${day.transportation || 'N/A'}`, `Daily Budget: ${day.estimatedCost || 'N/A'}`],
        yPosition,
        green50,
        green600
      );

      return yPosition;
    };

    const data = itinerary.itinerary_data;

    // Iterate over days
    if (data.days) {
      data.days.forEach((day: any) => {
        yPosition = addDaySection(day, yPosition);
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
      });
    }

    // Packing List card
    if (data.packingList) {
      yPosition = addCardSection(
        'Packing List',
        'Items to bring on your trip',
        data.packingList,
        yPosition,
        gray50,
        blue600
      );
    }

    // Travel Tips card
    if (data.tips) {
      yPosition = addCardSection(
        'Travel Tips',
        'Helpful advice for your journey',
        data.tips,
        yPosition,
        yellow50,
        yellow400
      );
    }

    // Budget Breakdown card
    if (data.budgetBreakdown) {
      yPosition = addCardSection(
        'Budget Breakdown',
        'Estimated costs for your trip',
        Object.entries(data.budgetBreakdown).map(([category, amount]) => `${category}: ${amount}`),
        yPosition,
        green50,
        green600
      );
    }

    doc.save(`${data.destination.replace(/\s+/g, '_')}_Itinerary.pdf`);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
          <Button onClick={() => navigate('/saved-itineraries')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Itineraries
          </Button>
        </div>
      </div>
    );
  }

  const data = itinerary!.itinerary_data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button onClick={() => navigate('/saved-itineraries')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Itineraries
        </Button>
        <div className="space-y-6">
          {data.days && data.days.map((day: any, index: number) => (
            <Card key={index} className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-orange-600 p-4">
                <CardTitle className="text-white text-2xl">Day {day.day || index + 1}</CardTitle>
                <div className="text-white text-sm">{day.date}</div>
                <div className="text-white text-lg font-semibold mt-2">{day.theme || 'Arrival & Relaxation'}</div>
              </CardHeader>
              <CardContent className="p-6">
                {day.activities && day.activities.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Daily Schedule</h3>
                    <p className="text-muted-foreground">Planned activities for the day</p>
                    {day.activities.map((activity: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-lg font-medium">{activity.time} - {activity.name}</p>
                        <p className="text-gray-600">{activity.description}</p>
                        <div className="text-sm text-gray-500">
                          <span>Duration: {activity.duration}</span>
                          <span className="ml-4">Cost: {activity.cost}</span>
                          <span className="ml-4">Location: {activity.location}</span>
                          <span className="ml-4">Tip: {activity.tips}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {day.meals && day.meals.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h3 className="text-xl font-semibold">Meal Recommendations</h3>
                    <p className="text-muted-foreground">Suggested dining options</p>
                    {day.meals.map((meal: any, idx: number) => (
                      <div key={idx} className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                        <p className="text-lg font-medium">{meal.meal}: {meal.restaurant} ({meal.cuisine})</p>
                        <p className="text-gray-600">{meal.description}</p>
                        <p className="text-green-600 font-semibold">Cost: {meal.cost}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-4 mt-6">
                  <h3 className="text-xl font-semibold">Transportation & Budget</h3>
                  <p className="text-muted-foreground">Travel and cost details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-lg font-medium">Transportation</p>
                      <p className="text-gray-600">{day.transportation || 'N/A'}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-lg font-medium">Daily Budget</p>
                      <p className="text-gray-600">{day.estimatedCost || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {data.packingList && data.packingList.length > 0 && (
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle>Packing List</CardTitle>
                <CardDescription>Items to bring on your trip</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.packingList.map((item: string, index: number) => (
                    <div key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-gray-700 rounded-full mr-2"></span>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {data.tips && data.tips.length > 0 && (
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle>Travel Tips</CardTitle>
                <CardDescription>Helpful advice for your journey</CardDescription>
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
          {data.budgetBreakdown && (
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle>Budget Breakdown</CardTitle>
                <CardDescription>Estimated costs for your trip</CardDescription>
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
          <Button onClick={downloadPDF} className="mt-6">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewSavedItinerary;
