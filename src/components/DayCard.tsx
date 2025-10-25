import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, MapPin, ExternalLink } from 'lucide-react';

interface Activity {
  name: string;
  time: string;
  duration: string;
  description: string;
  cost: string;
  location: string;
  tips?: string;
  link?: string;
  linkType?: 'booking' | 'info';
}

interface Meal {
  meal: string;
  restaurant: string;
  cuisine: string;
  cost: string;
  description: string;
  link?: string;
  linkType?: 'booking' | 'info';
}

interface DayCardProps {
  day: {
    day: number;
    date: string;
    theme: string;
    activities: Activity[];
    meals: Meal[];
    transportation: string;
    estimatedCost: string;
  };
  refCallback?: (el: HTMLDivElement | null) => void;
}

export const DayCard: React.FC<DayCardProps> = ({ day, refCallback }) => {
  return (
    <Card ref={refCallback} className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-orange-600 text-white">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">Day {day.day}</CardTitle>
            <CardDescription className="text-blue-100">{day.date}</CardDescription>
          </div>
          <Badge className="bg-white/20 text-white border-0">{day.theme}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Activities */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activities</h3>
          <div className="space-y-4">
            {day.activities.map((activity, idx) => (
              <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{activity.name}</h4>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {activity.time} ({activity.duration})
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {activity.location}
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {activity.cost}
                      </span>
                    </div>
                  </div>
                  {activity.link && (
                    <Button
                      variant={activity.linkType === 'booking' ? 'default' : 'outline'}
                      size="sm"
                      className="ml-4 flex-shrink-0"
                      onClick={() => window.open(activity.link, '_blank')}
                    >
                      {activity.linkType === 'booking' ? 'Book Now' : 'Learn More'}
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
                {activity.tips && (
                  <p className="text-sm text-blue-600 mt-2 italic">💡 {activity.tips}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Meals */}
        {day.meals && day.meals.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meals</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {day.meals.map((meal, idx) => (
                <div key={idx} className="bg-orange-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2 capitalize">{meal.meal}</Badge>
                      <h4 className="font-semibold text-gray-900">{meal.restaurant}</h4>
                      <p className="text-sm text-gray-600">{meal.cuisine}</p>
                      <p className="text-sm text-green-600 font-medium mt-1">{meal.cost}</p>
                    </div>
                    {meal.link && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 flex-shrink-0"
                        onClick={() => window.open(meal.link, '_blank')}
                      >
                        View
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{meal.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transportation & Cost */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Transportation</h4>
            <p className="text-sm text-gray-600">{day.transportation}</p>
          </div>
          <div className="bg-green-50 px-4 py-2 rounded-lg">
            <p className="text-sm text-gray-600">Estimated Daily Cost</p>
            <p className="text-lg font-bold text-green-600">{day.estimatedCost}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
