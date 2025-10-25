import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Clock, DollarSign, Calendar, Download, Edit, AlertCircle, Save } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "./LoginModal";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AdUnit } from "@/components/AdUnit";

interface ItineraryDisplayProps {
  travelData: any;
  onBack: () => void;
}

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ travelData, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [itinerary, setItinerary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<(HTMLDivElement | null)[]>([]);
  const additionalRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const saveItinerary = async () => {
    if (!user) {
      setShowLoginModal(true);
      setPendingSave(true);
      return;
    }

    if (!itinerary) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('saved_itineraries')
        .insert({
          user_id: user.id,
          title: `${itinerary.destination} Adventure`,
          destination: itinerary.destination,
          duration: itinerary.duration,
          total_budget: itinerary.totalBudget,
          itinerary_data: itinerary,
          travel_data: travelData,
        });

      if (error) throw error;

      toast({
        title: "Itinerary Saved!",
        description: "Your travel plan has been saved to your account.",
      });
    } catch (err) {
      console.error('Error saving itinerary:', err);
      toast({
        title: "Save Failed",
        description: "Unable to save your itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (user && pendingSave && itinerary) {
      setPendingSave(false);
      saveItinerary();
    }
  }, [user, pendingSave, itinerary]);

  const downloadPDF = async () => {
    if (!itinerary) return;

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

      // Collect sections, excluding the top button header
      const sections = [
        headerRef.current,
        ...daysRef.current,
        additionalRef.current,
        ctaRef.current
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

        // If it doesn't fit on the current page, start a new page
        if (currentY + imgHeight > pageHeight - bottomMargin) {
          pdf.addPage();
          currentY = topMargin;
        }

        pdf.addImage(imgData, 'JPEG', leftMargin, currentY, usableWidth, imgHeight);
        currentY += imgHeight;
      }

      const fileName = `${itinerary.destination.replace(/\s+/g, '_')}_Itinerary.pdf`;
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

  useEffect(() => {
    daysRef.current = daysRef.current.slice(0, itinerary?.days?.length || 0);
  }, [itinerary]);

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
            <Button 
              onClick={saveItinerary}
              disabled={isSaving}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Itinerary'}</span>
            </Button>
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
        <Card ref={headerRef} className="shadow-lg border-0 mb-8">
          <CardHeader className="text-center px-4">
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent break-words">
              Your {itinerary.destination} Adventure
            </CardTitle>
            <CardDescription className="text-base sm:text-lg mt-4">
              {itinerary.duration} days of unforgettable experiences
            </CardDescription>
            {itinerary.summary && (
              <p className="text-gray-600 mt-2 max-w-2xl mx-auto break-words">
                {itinerary.summary}
              </p>
            )}
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="font-medium">{itinerary.duration} Days</span>
              </div>
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="font-medium">{itinerary.totalBudget}</span>
              </div>
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <span className="font-medium">{travelData.groupSize.replace('-', ' ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Itinerary */}
        <div className="space-y-8">
          {itinerary.days?.map((day: any, index: number) => (
            <React.Fragment key={day.day}>
              <Card ref={(el) => daysRef.current[index] = el} className="shadow-lg border-0 overflow-hidden">
...
              </Card>
              
              {/* Ad Unit after every 2 days */}
              {(index + 1) % 2 === 0 && index !== itinerary.days.length - 1 && (
                <AdUnit slot="9876543210" className="my-4" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Additional Information */}
        {(itinerary.packingList || itinerary.localTips || itinerary.budgetBreakdown) && (
          <div ref={additionalRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
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

        {/* Ad Unit after additional information */}
        <AdUnit slot="7718680286" />

        {/* CTA Section */}
        <Card ref={ctaRef} className="shadow-lg border-0 mt-12 bg-gradient-to-r from-blue-600 to-orange-600">
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

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </div>
  );
};

export default ItineraryDisplay;
