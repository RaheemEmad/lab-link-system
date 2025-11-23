import React, { useState } from 'react';
import { HelpCircle, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const HelpButton: React.FC = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-[9999] rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-background border-2 border-primary/20 hover:border-primary"
        >
          <HelpCircle className="h-5 w-5 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              Contact our support team if you encounter any issues.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email Support</p>
                <a
                  href="mailto:raheem.amer.swe@gmail.com"
                  className="text-sm text-primary hover:underline"
                >
                  raheem.amer.swe@gmail.com
                </a>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Business Phone</p>
                <a
                  href="tel:+201018385093"
                  className="text-sm text-primary hover:underline"
                >
                  +201018385093
                </a>
              </div>
            </div>
          </div>
          
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Our support team is available to help you with any questions or technical issues.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};