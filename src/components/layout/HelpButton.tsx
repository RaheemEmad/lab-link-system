import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Mail, Phone, TicketPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';

export const HelpButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-20 right-6 z-40 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-background border-2 border-primary/20 hover:border-primary"
          aria-label="Open help"
        >
          <HelpCircle className="h-5 w-5 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 z-[9999]" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              All support is handled through tickets — submit one and we'll
              reply right inside it.
            </p>
          </div>

          {user && (
            <div className="space-y-2">
              <Button
                className="w-full justify-start gap-2"
                onClick={() => { setIsOpen(false); navigate('/support'); }}
              >
                <TicketPlus className="h-4 w-4" />
                Submit a Support Ticket
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => { setIsOpen(false); navigate('/support?tab=tickets'); }}
              >
                View My Tickets
              </Button>
            </div>
          )}

          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
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
                <p className="text-sm font-medium">Phone</p>
                <a
                  href="tel:+201018385093"
                  className="text-sm text-primary hover:underline"
                >
                  +201018385093
                </a>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
