import { Stethoscope, FlaskConical, Phone, Clock, Zap, CheckCircle2, Users, TrendingUp } from "lucide-react";

const DualView = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* For Dentists */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-10 rounded-2xl border border-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-primary" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold">For Dentists</h3>
            </div>
            
            <p className="text-lg text-muted-foreground mb-6">
              Less calls. Clear delivery times. Faster patient care.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Eliminate phone tag — submit cases in 2 minutes via form link</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">See real-time status updates — no more "where is my case?" calls</span>
              </li>
              <li className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Faster turnaround — clear delivery dates mean happier patients</span>
              </li>
            </ul>
          </div>
          
          {/* For Labs */}
          <div className="bg-gradient-to-br from-success/5 to-success/10 p-10 rounded-2xl border border-success/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-success" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold">For Labs</h3>
            </div>
            
            <p className="text-lg text-muted-foreground mb-6">
              Fewer remakes. Clear ownership. Faster throughput.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Capture all details upfront — tooth numbers, shades, photos, notes</span>
              </li>
              <li className="flex items-start gap-3">
                <Users className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Team visibility — everyone sees status, no handoff confusion</span>
              </li>
              <li className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Audit trail — track every order from intake to delivery automatically</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DualView;
