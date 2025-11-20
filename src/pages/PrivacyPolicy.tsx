import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-12 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              LabLink ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal 
              information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
              use our dental lab management platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.1 Personal Information</h3>
                <p>We collect information that you provide directly to us, including:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Name, email address, and phone number</li>
                  <li>Professional credentials and practice information</li>
                  <li>Account login credentials</li>
                  <li>Payment and billing information</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.2 Patient Health Information (PHI)</h3>
                <p>
                  As a healthcare-related service, we process Protected Health Information (PHI) including patient names, 
                  dental records, treatment information, and medical images. We handle all PHI in compliance with HIPAA 
                  regulations and maintain strict confidentiality standards.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">2.3 Usage Data</h3>
                <p>We automatically collect information about your interaction with our platform, including:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>IP address, browser type, and device information</li>
                  <li>Pages visited and features used</li>
                  <li>Date and time of access</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and track dental lab orders</li>
              <li>Communicate with you about your account and orders</li>
              <li>Ensure compliance with healthcare regulations</li>
              <li>Detect, prevent, and address security issues or fraud</li>
              <li>Analyze usage patterns to enhance user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>End-to-end encryption for data transmission</li>
              <li>Secure data storage with regular backups</li>
              <li>Role-based access control (RBAC)</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>HIPAA-compliant infrastructure and processes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, trade, or rent your personal information. We may share information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li><strong>With your consent:</strong> When you explicitly authorize us to share information</li>
              <li><strong>Service providers:</strong> With trusted third parties who assist in operating our platform (e.g., cloud hosting, payment processing)</li>
              <li><strong>Legal requirements:</strong> When required by law, court order, or government regulation</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as necessary to provide our services and comply with legal obligations. 
              Patient health information is retained in accordance with healthcare record retention requirements and HIPAA regulations, 
              typically for a minimum of 7 years from the date of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>Access and review your personal information</li>
              <li>Request corrections to inaccurate data</li>
              <li>Request deletion of your information (subject to legal retention requirements)</li>
              <li>Opt-out of marketing communications</li>
              <li>Receive a copy of your PHI in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. HIPAA Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              LabLink is committed to full compliance with the Health Insurance Portability and Accountability Act (HIPAA). 
              We have implemented administrative, physical, and technical safeguards to protect the confidentiality, integrity, 
              and availability of electronic protected health information (ePHI). We execute Business Associate Agreements (BAAs) 
              with all covered entities using our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not directed to individuals under the age of 18. We do not knowingly collect personal information 
              from children. While we process patient information that may include minors, this is done only in the context of 
              legitimate healthcare operations by authorized healthcare providers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
              We will notify you of significant changes by posting the new policy on our website and updating the "Last updated" 
              date. Your continued use of our service after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 space-y-2 text-muted-foreground">
              <p><strong>Technical Issues:</strong> raheem.amer.swe@gmail.com</p>
              <p><strong>Business Inquiries:</strong> +201018385093</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
