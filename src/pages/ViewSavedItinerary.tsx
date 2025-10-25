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
import { DayCard } from "@/components/DayCard";

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
  const accommodationsRef = useRef<HTMLDivElement>(null);
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
        accommodationsRef.current,
        ...daysRef.current,
        additionalRef.current,
      ].filter(Boolean);

      for (const section of sections) {
        if (!section) continue;

        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
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

          <div ref={headerRef} className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 break-words px-4">
              {data.destination}
            </h1>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-gray-600 px-4">
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span>{data.duration} days</span>
              </div>
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <DollarSign className="w-5 h-5 flex-shrink-0" />
                <span>{data.totalBudget}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Accommodation Recommendations */}
        {data.accommodations && data.accommodations.length > 0 && (
          <Card ref={accommodationsRef} className="shadow-lg border-0 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center space-x-2">
                <span>🏨</span>
                <span>Recommended Accommodations</span>
              </CardTitle>
              <CardDescription>
                Handpicked stays for your trip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {data.accommodations.map((accommodation: any, index: number) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg text-gray-900 break-words">{accommodation.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {accommodation.type}
                          </Badge>
                          <span className="text-sm text-gray-600">📍 {accommodation.location}</span>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-lg font-bold text-green-600 whitespace-nowrap">{accommodation.priceRange}</p>
                        <p className="text-xs text-gray-500">per night</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 break-words">{accommodation.description}</p>
                    {accommodation.amenities && accommodation.amenities.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-600 mb-1">Amenities:</p>
                        <div className="flex flex-wrap gap-1">
                          {accommodation.amenities.map((amenity: string, idx: number) => (
                            <span key={idx} className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {accommodation.bookingTip && (
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800 break-words">
                        💡 <strong>Tip:</strong> {accommodation.bookingTip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Itinerary */}
        {(data.days || data.dailyItinerary) && (
          <div className="space-y-8">
            {(data.days || data.dailyItinerary).map((day: any, index: number) => (
              <DayCard
                key={day.day || index}
                day={day}
                refCallback={(el) => (daysRef.current[index] = el)}
              />
            ))}
          </div>
        )}

        {/* Additional Information */}
        <div ref={additionalRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
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
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span className="text-gray-700 break-words flex-1">{item}</span>
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
                    <div key={index} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 min-w-0">
                      <p className="text-gray-700 text-sm break-words">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Breakdown */}
          {data.budgetBreakdown && (
            <Card className="shadow-lg">
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
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 bg-gray-100 text-gray-700 font-semibold text-sm">
                    <div className="p-3 border-b border-r border-gray-200">Category</div>
                    <div className="p-3 border-b border-gray-200 text-right">Amount</div>
                  </div>
                  {Object.entries(data.budgetBreakdown).map(([category, amount]: [string, any], index: number) => (
                    <div
                      key={category}
                      className={`grid grid-cols-2 text-sm ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } ${index < Object.entries(data.budgetBreakdown).length - 1 ? 'border-b border-gray-200' : ''}`}
                    >
                      <div className="p-3 capitalize truncate border-r border-gray-200">
                        {category}
                      </div>
                      <div className="p-3 text-right font-medium text-green-600 truncate">
                        {amount}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewSavedItinerary;
