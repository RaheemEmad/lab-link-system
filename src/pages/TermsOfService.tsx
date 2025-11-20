import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-background">
        <div className="container px-4 py-8 sm:py-12 max-w-4xl mx-auto">

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using LabLink ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users, 
              including dental professionals, lab technicians, and administrative staff.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              LabLink provides a digital platform for dental professionals and dental laboratories to manage, track, and 
              communicate about dental lab orders. The Service includes order submission, status tracking, workflow management, 
              and secure communication features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.1 Account Creation</h3>
                <p>
                  To use the Service, you must create an account by providing accurate, current, and complete information. 
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                  that occur under your account.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.2 Account Eligibility</h3>
                <p>You must be:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>At least 18 years of age</li>
                  <li>A licensed dental professional or authorized lab technician</li>
                  <li>Authorized to access and submit patient health information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.3 Account Security</h3>
                <p>
                  You agree to immediately notify us of any unauthorized use of your account. We are not liable for any 
                  loss or damage arising from your failure to protect your account credentials.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
              <li>Submit false, inaccurate, or misleading information</li>
              <li>Access patient data you are not authorized to view</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload viruses, malware, or malicious code</li>
              <li>Share your account with unauthorized individuals</li>
              <li>Scrape, copy, or download data without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Professional Responsibility</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                As a healthcare-related service, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>You are solely responsible for the accuracy of patient information and clinical specifications</li>
                <li>You maintain appropriate licenses and credentials for your professional role</li>
                <li>You comply with all applicable healthcare regulations, including HIPAA</li>
                <li>You obtain necessary patient consent for information sharing</li>
                <li>Final treatment decisions remain your professional responsibility</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Privacy and Data Protection</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our Privacy Policy. We handle Protected Health Information (PHI) 
              in accordance with HIPAA regulations. By using the Service, you agree to our data collection, use, and 
              disclosure practices as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">7.1 Our Rights</h3>
                <p>
                  The Service, including its design, features, graphics, and underlying software, is owned by LabLink and 
                  protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works 
                  without our written permission.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">7.2 Your Content</h3>
                <p>
                  You retain ownership of any content you submit to the Service. By submitting content, you grant us a 
                  limited license to use, store, and process it solely for providing the Service. We will not use patient 
                  health information for any purpose other than service delivery.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Payment Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you subscribe to paid features:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>You agree to pay all fees associated with your subscription</li>
              <li>Fees are billed in advance on a recurring basis</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>We may change pricing with 30 days notice to active subscribers</li>
              <li>You are responsible for any taxes applicable to your subscription</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we strive for 99.9% uptime, we do not guarantee uninterrupted access to the Service. We may suspend 
              or terminate the Service temporarily for maintenance, updates, or security reasons. We are not liable for 
              any losses resulting from service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LABLINK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, 
              OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              The Service is provided as a communication and workflow tool. LabLink is not responsible for the quality, 
              accuracy, or appropriateness of clinical decisions or dental lab work ordered through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless LabLink, its affiliates, and their respective officers, directors, 
              and employees from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from 
              your use of the Service, violation of these Terms, or infringement of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                We may suspend or terminate your account if you:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Violate these Terms or our policies</li>
                <li>Engage in fraudulent or illegal activities</li>
                <li>Fail to pay applicable fees</li>
                <li>Pose a security risk to the Service or other users</li>
              </ul>
              <p className="mt-4">
                You may terminate your account at any time by contacting us. Upon termination, your right to access the 
                Service will immediately cease. We will retain your data as required by law and our retention policies.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance 
              with applicable arbitration rules, except where prohibited by law. You waive any right to participate in class 
              action lawsuits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting 
              the updated Terms on our website and updating the "Last updated" date. Your continued use of the Service after 
              changes become effective constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict 
              of law principles. Any legal action must be brought in the appropriate courts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-4 space-y-2 text-muted-foreground">
              <p><strong>Technical Issues:</strong> raheem.amer.swe@gmail.com</p>
              <p><strong>Business Inquiries:</strong> +201018385093</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or 
              eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Entire Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and LabLink regarding 
              the Service and supersede all prior agreements and understandings.
            </p>
          </section>
        </div>
        </div>
      </div>
      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

export default TermsOfService;
