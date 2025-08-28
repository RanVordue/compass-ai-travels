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

      // Add custom banner across the top of every page
      const bannerHeight = 0.75;
      const pageWidth = 8.5;
      const topMargin = bannerHeight + 0.25;
      const bottomMargin = 0.25;
      const leftMargin = 0.25;
      const usableWidth = pageWidth - leftMargin * 2;
      let currentY = topMargin;

      // Create gradient banner
      const gradient = pdf.setFillColor;
      gradient(59, 130, 246); // Start color: blue-600
      pdf.rect(0, 0, pageWidth, bannerHeight, 'F');
      gradient(249, 115, 22); // End color: orange-600
      pdf.rect(0, 0, pageWidth, bannerHeight, 'F');

      // Add destination title to banner
      pdf.setTextColor(255, 255, 255); // White text
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const titleWidth = pdf.getStringUnitWidth(`Your ${itinerary.destination} Adventure`) * 24 / pdf.internal.scaleFactor;
      const titleX = (pageWidth - titleWidth) / 2;
      pdf.text(`Your ${itinerary.destination} Adventure`, titleX, bannerHeight / 2 + 0.1, { align: 'center' });

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

        // If it doesn't fit on the current page, start a new page with the banner
        if (currentY + imgHeight > 11 - bottomMargin) {
          pdf.addPage();
          currentY = topMargin;

          // Re-add banner on new page
          gradient(59, 130, 246);
          pdf.rect(0, 0, pageWidth, bannerHeight, 'F');
          gradient(249, 115, 22);
          pdf.rect(0, 0, pageWidth, bannerHeight, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(24);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Your ${itinerary.destination} Adventure`, titleX, bannerHeight / 2 + 0.1, { align: 'center' });
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
        <div
