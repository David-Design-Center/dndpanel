import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using DnD Panel ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                DnD Panel is a productivity and email management application that provides:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Email management and organization tools</li>
                <li>Integration with Gmail, Google Drive, and Outlook services</li>
                <li>Document and file management capabilities</li>
                <li>Calendar and scheduling features</li>
                <li>Collaboration and communication tools</li>
                <li>Order and shipment tracking</li>
                <li>Invoice generation and management</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
              <h3 className="text-xl font-medium mb-2">3.1 Account Creation</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To use our Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials.
              </p>
              
              <h3 className="text-xl font-medium mb-2">3.2 Third-Party Authentication</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our Service integrates with Google and Microsoft authentication systems. By using these integrations, you agree to comply with their respective terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use Policy</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any laws in your jurisdiction</li>
                <li>Transmit malicious code, viruses, or harmful content</li>
                <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service to send spam or unsolicited communications</li>
                <li>Violate the privacy or rights of other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data and Privacy</h2>
              <h3 className="text-xl font-medium mb-2">5.1 Data Access</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                By using our Service, you grant us permission to access and process your email, calendar, and file data from connected accounts (Gmail, Google Drive, Outlook) solely for the purpose of providing our services.
              </p>
              
              <h3 className="text-xl font-medium mb-2">5.2 Data Security</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement industry-standard security measures to protect your data. However, no system is completely secure, and you acknowledge the inherent risks of data transmission over the internet.
              </p>
              
              <h3 className="text-xl font-medium mb-2">5.3 Privacy Policy</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our collection and use of your information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
              <h3 className="text-xl font-medium mb-2">6.1 Service Content</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Service and its original content, features, and functionality are owned by DnD Panel and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              
              <h3 className="text-xl font-medium mb-2">6.2 User Content</h3>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of your content (emails, files, documents). By using our Service, you grant us a limited license to access, process, and display your content solely to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We strive to maintain high service availability but cannot guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, DnD Panel shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied, regarding the Service's operation or availability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to defend, indemnify, and hold harmless DnD Panel from any claims, damages, obligations, losses, liabilities, costs, or expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You may terminate your account at any time by discontinuing use of the Service and deleting your account through the application settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed and construed in accordance with the laws of the jurisdiction where DnD Panel operates, without regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-medium">DnD Panel Support</p>
                <p className="text-muted-foreground">Email: info@dnddesigncenter.com</p>
                <p className="text-muted-foreground">Website: https://dnddesigncenter.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. Severability</h2>
              <p className="text-muted-foreground leading-relaxed">
                If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
