
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, DollarSign, Heart, Clock, Users } from 'lucide-react';
import TravelQuestionnaire from '@/components/TravelQuestionnaire';
import ItineraryDisplay from '@/components/ItineraryDisplay';
import Header from '@/components/Header';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import { useAuth } from '@/contexts/AuthContext';
import { AdUnit } from '@/components/AdUnit';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'questionnaire' | 'itinerary'>('welcome');
  const [travelData, setTravelData] = useState(null);
  const { user } = useAuth();

  const handleQuestionnaireComplete = (data: any) => {
    setTravelData(data);
    setCurrentStep('itinerary');
  };

  const startPlanning = () => {
    setCurrentStep('questionnaire');
  };

  const goBack = () => {
    if (currentStep === 'itinerary') {
      setCurrentStep('questionnaire');
    } else if (currentStep === 'questionnaire') {
      setCurrentStep('welcome');
    }
  };

  if (currentStep === 'questionnaire') {
    return (
      <TravelQuestionnaire 
        onComplete={handleQuestionnaireComplete}
        onBack={goBack}
      />
    );
  }

  if (currentStep === 'itinerary') {
    return (
      <ItineraryDisplay 
        travelData={travelData}
        onBack={goBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Header />
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-orange-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI Travel
              <span className="bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent"> Itinerary</span>
              <br />Designer
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Create personalized travel itineraries in minutes. Let AI plan your perfect trip based on your preferences, budget, and interests.
            </p>
            <Button 
              onClick={startPlanning}
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Start Planning Your Trip
            </Button>
          </div>
        </div>
      </div>

      {/* Subscription Status Section - Only for logged in users */}
      {user && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SubscriptionStatus />
        </div>
      )}

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Three simple steps to your perfect travel itinerary
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Tell us about your trip</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Share your destination, dates, budget, and interests through our simple questionnaire
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">AI creates your itinerary</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Our AI analyzes your preferences and generates a personalized day-by-day travel plan
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Explore and customize</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Review your itinerary, make edits, and get ready for your amazing adventure
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
            <MapPin className="w-6 h-6 text-blue-600" />
            <span className="text-gray-700">Destination recommendations</span>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
            <Calendar className="w-6 h-6 text-orange-600" />
            <span className="text-gray-700">Day-by-day planning</span>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
            <DollarSign className="w-6 h-6 text-green-600" />
            <span className="text-gray-700">Budget optimization</span>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
            <Heart className="w-6 h-6 text-red-600" />
            <span className="text-gray-700">Personal interests</span>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
            <Clock className="w-6 h-6 text-purple-600" />
            <span className="text-gray-700">Time optimization</span>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
            <Users className="w-6 h-6 text-indigo-600" />
            <span className="text-gray-700">Group preferences</span>
          </div>
        </div>
      </div>

      {/* Ad Unit 1 - Between Features and CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdUnit slot="8197477842" />
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to plan your next adventure?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of travelers who've discovered their perfect trips with AI
          </p>
          <Button 
            onClick={startPlanning}
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Create Your Itinerary Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
