import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
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
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                DnD Panel ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium mb-2">2.1 Personal Information</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Email addresses and contact information</li>
                <li>Profile information (name, profile picture)</li>
                <li>Authentication credentials (securely stored)</li>
              </ul>

              <h3 className="text-xl font-medium mb-2">2.2 Email and Calendar Data</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li><strong>Gmail Integration:</strong> We access your Gmail messages, labels, and attachments to provide email management services</li>
                <li><strong>Google Drive Integration:</strong> We access files and documents in your Google Drive for file management and sharing</li>
                <li><strong>Outlook Integration:</strong> We access your Outlook emails, calendar events, and contacts for integrated productivity features</li>
              </ul>

              <h3 className="text-xl font-medium mb-2">2.3 Usage Data</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Application usage patterns and preferences</li>
                <li>Device information and browser type</li>
                <li>Log files and performance data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Provide and maintain our email and productivity services</li>
                <li>Synchronize and organize your emails, files, and calendar events</li>
                <li>Enable communication and collaboration features</li>
                <li>Improve our services and user experience</li>
                <li>Provide customer support</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Data is encrypted in transit and at rest</li>
                <li>Access tokens are securely stored and managed</li>
                <li>Regular security audits and updates</li>
                <li>Limited access on a need-to-know basis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Third-Party Integrations</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our application integrates with the following third-party services:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Google Services:</strong> Gmail, Google Drive, Google Calendar (subject to Google's Privacy Policy)</li>
                <li><strong>Microsoft Services:</strong> Outlook, Office 365 (subject to Microsoft's Privacy Policy)</li>
                <li><strong>Supabase:</strong> Database and authentication services</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                These integrations are governed by their respective privacy policies, and we only access the minimum data necessary to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With trusted service providers who assist in operating our services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                <li><strong>Withdraw Consent:</strong> Revoke permission for data processing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information only as long as necessary to provide our services and comply with legal obligations. You may delete your account and associated data at any time through the application settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-medium">DnD Panel Support</p>
                <p className="text-muted-foreground">Email: info@dnddesigncenter.com</p>
                <p className="text-muted-foreground">Website: https://dnddesigncenter.com</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
