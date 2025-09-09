import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Star, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SubscriptionStatus = () => {
  const { user, subscriptionInfo, subscriptionLoading, createCheckoutSession, openCustomerPortal } = useAuth();

  if (!user) return null;

  const handleUpgrade = async () => {
    try {
      const result = await createCheckoutSession();
      if (result.error) {
        toast.error('Failed to start checkout: ' + result.error);
        return;
      }
      
      if (result.url) {
        // Open Stripe checkout in a new tab
        window.open(result.url, '_blank');
      }
    } catch (error) {
      toast.error('An error occurred while starting checkout');
      console.error('Checkout error:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await openCustomerPortal();
      if (result.error) {
        toast.error('Failed to open billing portal: ' + result.error);
        return;
      }
      
      if (result.url) {
        // Open customer portal in a new tab
        window.open(result.url, '_blank');
      }
    } catch (error) {
      toast.error('An error occurred while opening billing portal');
      console.error('Customer portal error:', error);
    }
  };

  if (subscriptionLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Checking subscription status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPremium = subscriptionInfo?.subscribed;
  const tier = subscriptionInfo?.subscription_tier || 'Free';

  return (
    <Card className={`w-full ${isPremium ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50' : 'border-gray-200'}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isPremium ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              {isPremium ? (
                <Crown className="w-5 h-5 text-yellow-600" />
              ) : (
                <Star className="w-5 h-5 text-gray-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {isPremium ? 'Compass AI Premium' : 'Compass AI Free'}
              </CardTitle>
              <CardDescription>
                {isPremium ? 'You have access to all premium features' : 'Upgrade to unlock premium features'}
              </CardDescription>
            </div>
          </div>
          <Badge variant={isPremium ? "default" : "secondary"} className={`${isPremium ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}`}>
            {tier}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isPremium ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>Premium features active</span>
            </div>
            {subscriptionInfo?.subscription_end && (
              <div className="text-sm text-gray-600">
                Renews on {new Date(subscriptionInfo.subscription_end).toLocaleDateString()}
              </div>
            )}
            <Button 
              onClick={handleManageSubscription}
              variant="outline" 
              className="w-full border-yellow-200 hover:bg-yellow-50"
            >
              Manage Subscription
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Premium Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Priority AI processing
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Enhanced PDF exports
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Advanced customization
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Premium destinations
                </li>
              </ul>
            </div>
            <Button 
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Upgrade to Premium - £5/month
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;