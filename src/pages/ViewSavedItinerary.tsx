import React, { useState, useEffect, useRef } from 'react';
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
import html2canvas from 'html2canvas';

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
  const headerRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<(HTMLDivElement | null)[]>([]);
  const additionalRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    daysRef.current = daysRef.current.slice(0, itinerary?.itinerary_data?.days?.length || 0);
  }, [itinerary]);

  const downloadPDF = async () => {
    if (!itinerary?.itinerary_data) return;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      const topMargin = 0.25;
      const bottomMargin = 0.25;
      const leftMargin = 0.25;
      const pageHeight = 11;
      const usableWidth = 8.5 - leftMargin * 2;
      let currentY = topMargin;

      const sections = [
        headerRef.current,
        ...daysRef.current,
        additionalRef.current,
      ].filter(Boolean);

      for (const section of sections) {
        if (!section) continue;

        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: section.scrollWidth,
          height: section.scrollHeight,
          allowTaint: true,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        if (currentY + imgHeight > pageHeight - bottomMargin) {
          pdf.addPage();
          currentY = topMargin;
        }

        pdf.addImage(imgData, 'JPEG', leftMargin, currentY, usableWidth, imgHeight);
        currentY += imgHeight;
      }

      const fileName = `${itinerary.itinerary_data.destination.replace(/\s+/g, '_')}_Itinerary.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Downloaded!",
        description: "Your itinerary has been saved as a PDF.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate the PDF. Please try again.",
        variant: "destructive",
      });
    }
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
        {/* Navigation Buttons */}
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

        {/* Header Section - Printable */}
        <div ref={headerRef} className="text-center mb-8 print:mb-4">
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

        {/* Daily Itinerary */}
        {(data.days || data.dailyItinerary) && (
          <div className="space-y-8">
            {(data.days || data.dailyItinerary).map((day: any, index: number) => (
              <div key={day.day || index} className="print:block">
                <Card ref={(el) => (daysRef.current[index] = el)} className="shadow-lg border-0 overflow-hidden print:border print:shadow-none">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-orange-600 text-white p-6 print:p-4">
                    <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 print:flex-row print:items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="font-bold text-lg">{day.day || index + 1}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">Day {day.day || index + 1}</h3>
                          {day.date && <p className="text-blue-100 text-sm">{day.date}</p>}
                        </div>
                      </div>
                      {day.theme && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-0 whitespace-nowrap print:inline-block">
                          {day.theme}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 print:p-4">
                    {/* Activities */}
                    {day.activities && day.activities.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-lg mb-3 flex items-center">
                          <Clock className="w-5 h-5 mr-2 text-blue-600" />
                          Daily Schedule
                        </h4>
                        <div className="space-y-4">
                          {day.activities.map((activity: any, actIndex: number) => (
                            <div key={actIndex} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500 print:border-l-2">
                              {activity.time && (
                                <div className="text-sm text-gray-600 font-medium min-w-[80px] print:min-w-[60px]">
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
                                <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-600 print:space-x-2 print:space-y-1">
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
                                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded print:text-sm">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-1">
                          {day.meals.map((meal: any, mealIndex: number) => (
                            <div key={mealIndex} className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400 print:border-l-2 print:p-3">
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
                    <div className="grid md:grid-cols-2 gap-4 print:grid-cols-1 print:gap-2">
                      {day.transportation && (
                        <div className="bg-blue-50 p-4 rounded-lg print:p-3">
                          <h4 className="font-semibold text-lg mb-2 flex items-center print:text-base">
                            <span className="mr-2">🚗</span>
                            Transportation
                          </h4>
                          <p className="text-gray-600 print:text-sm">{day.transportation}</p>
                        </div>
                      )}
                      {day.estimatedCost && (
                        <div className="bg-green-50 p-4 rounded-lg print:p-3">
                          <h4 className="font-semibold text-lg mb-2 flex items-center print:text-base">
                            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                            Daily Budget
                          </h4>
                          <p className="text-green-600 font-bold text-xl print:text-lg">{day.estimatedCost}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Additional Information */}
        {(data.packingList || data.tips || data.budgetBreakdown) && (
          <div ref={additionalRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 print:grid-cols-1 print:gap-4">
            {/* Packing List */}
            {data.packingList && data.packingList.length > 0 && (
              <Card className="shadow-lg print:shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 print:space-x-1">
                    <span>🎒</span>
                    <span>Packing List</span>
                  </CardTitle>
                  <CardDescription>
                    Essential items for your trip
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 print:gap-1">
                    {data.packingList.map((item: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2 print:space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full print:w-1 print:h-1"></div>
                        <span className="text-gray-700 print:text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Travel Tips */}
            {data.tips && data.tips.length > 0 && (
              <Card className="shadow-lg print:shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 print:space-x-1">
                    <span>💡</span>
                    <span>Travel Tips</span>
                  </CardTitle>
                  <CardDescription>
                    Helpful advice for your journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 print:space-y-2">
                    {data.tips.map((tip: string, index: number) => (
                      <div key={index} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 print:border-l-2 print:p-2">
                        <p className="text-gray-700 text-sm print:text-xs">{tip}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Breakdown */}
            {data.budgetBreakdown && (
              <Card className="shadow-lg print:shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 print:space-x-1">
                    <DollarSign className="w-5 h-5" />
                    <span>Budget Breakdown</span>
                  </CardTitle>
                  <CardDescription>
                    Estimated costs for your trip
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-2 print:gap-2">
                    {Object.entries(data.budgetBreakdown).map(([category, amount]: [string, any]) => (
                      <div key={category} className="text-center p-4 bg-green-50 rounded-lg print:p-2">
                        <div className="text-2xl font-bold text-green-600 print:text-xl">{amount}</div>
                        <div className="text-sm text-gray-600 capitalize print:text-xs">{category}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* CTA Section - Non-Printable */}
        <div className="print:hidden">
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
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => navigate('/')}>
                  Plan Another Trip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ViewSavedItinerary;
