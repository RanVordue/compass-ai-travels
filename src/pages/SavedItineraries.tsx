import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, DollarSign, Trash2, Eye, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SavedItinerary {
  id: string;
  title: string;
  destination: string;
  duration: number;
  total_budget: string;
  itinerary_data: any;
  travel_data: any;
  created_at: string;
}

const SavedItineraries: React.FC = () => {
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }

    if (user) {
      fetchSavedItineraries();
    }
  }, [user, authLoading, navigate]);

  const fetchSavedItineraries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_itineraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedItineraries(data || []);
    } catch (err) {
      console.error('Error fetching saved itineraries:', err);
      toast({
        title: "Error",
        description: "Failed to load your saved itineraries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteItinerary = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('saved_itineraries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedItineraries(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Deleted",
        description: "Itinerary has been deleted successfully.",
      });
    } catch (err) {
      console.error('Error deleting itinerary:', err);
      toast({
        title: "Error",
        description: "Failed to delete itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const viewItinerary = (itinerary: SavedItinerary) => {
    // For now, we'll just show a toast. In a full implementation, 
    // you might want to create a detailed view page
    toast({
      title: "Coming Soon",
      description: "Detailed itinerary view is being developed.",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-8">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Saved Itineraries</h1>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-lg border-0">
                <CardHeader>
                  <div className="animate-pulse space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Saved Itineraries</h1>
        </div>

        {savedItineraries.length === 0 ? (
          <Card className="shadow-lg border-0 text-center py-12">
            <CardContent>
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No saved itineraries yet
                  </h3>
                  <p className="text-gray-600">
                    Create your first travel itinerary and save it to access it anytime!
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  Plan Your First Trip
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedItineraries.map((itinerary) => (
              <Card key={itinerary.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 truncate">
                    {itinerary.title}
                  </CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{itinerary.destination}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{itinerary.duration} days</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span>{itinerary.total_budget}</span>
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Saved {new Date(itinerary.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => viewItinerary(itinerary)}
                        className="flex-1 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={deletingId === itinerary.id}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Itinerary</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{itinerary.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteItinerary(itinerary.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {savedItineraries.length > 0 && (
          <div className="mt-8 text-center">
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>Plan Another Trip</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedItineraries;