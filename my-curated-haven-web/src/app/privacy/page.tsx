"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Privacy() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1 pt-20 pb-16">
                <div className="max-w-4xl mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-heading text-foreground">Privacy Policy</h1>
                    <p className="text-foreground/60 mb-12">Last updated: December 3, 2025</p>

                    <div className="prose prose-lg max-w-none space-y-8 text-foreground/80">
                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">1. Introduction</h2>
                            <p className="leading-relaxed">
                                My Curated Haven ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
                            </p>
                            <p className="leading-relaxed">
                                We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last updated" date of this Privacy Policy. You are encouraged to periodically review this Privacy Policy to stay informed of updates.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">2. Information We Collect</h2>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">2.1 Personal Information</h3>
                            <p className="leading-relaxed">
                                We may collect personal information that you voluntarily provide to us when you register on the Service, express an interest in obtaining information about us or our products and services, or otherwise contact us. The personal information that we collect depends on the context of your interactions with us and the Service, the choices you make, and the features you use. The personal information we collect may include:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Name and contact data (email address, phone number)</li>
                                <li>Profile information (parent/guardian information)</li>
                                <li>Account credentials (username and password)</li>
                                <li>Child information (name, date of birth, gender - optional)</li>
                                <li>Payment information (processed securely through third-party payment processors)</li>
                            </ul>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">2.2 Automatically Collected Information</h3>
                            <p className="leading-relaxed">
                                When you access the Service, we may automatically collect certain information about your device, including:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Device information (IP address, browser type, operating system)</li>
                                <li>Usage data (pages visited, time spent, features used)</li>
                                <li>Location data (with your permission, for location-based features)</li>
                                <li>Crash reports and performance data</li>
                            </ul>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">2.3 Information from Third Parties</h3>
                            <p className="leading-relaxed">
                                We may receive information about you from third parties, such as:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Social media platforms (if you choose to link your account)</li>
                                <li>Analytics providers</li>
                                <li>Payment processors</li>
                            </ul>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">2.4 Children's Privacy</h3>
                            <p className="leading-relaxed">
                                We do not knowingly collect personal information from children under 13 years of age. The information collected about children (name, date of birth) is entered by parents/guardians and is used solely to provide personalized parenting content. This data is encrypted and never shared with third parties. If you believe we have collected information from a child under 13, please contact us immediately at privacy@mycuratedhaven.com.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">3. How We Use Your Information</h2>
                            <p className="leading-relaxed">
                                We use the information we collect or receive:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li><strong>To provide and maintain our Service</strong> - Deliver personalized content, tips, and milestone tracking based on your child's age and development</li>
                                <li><strong>To improve our Service</strong> - Analyze usage patterns to enhance user experience and develop new features</li>
                                <li><strong>To communicate with you</strong> - Send administrative information, updates, and respond to inquiries</li>
                                <li><strong>To send marketing communications</strong> - With your consent, send you promotional materials (you can opt out at any time)</li>
                                <li><strong>To process transactions</strong> - Fulfill orders for premium features or marketplace services</li>
                                <li><strong>To provide customer support</strong> - Respond to your requests and solve problems</li>
                                <li><strong>To ensure security</strong> - Monitor and prevent fraud, unauthorized access, and other illegal activities</li>
                                <li><strong>For AI-powered features</strong> -Provide personalized parenting advice through our AI assistant (conversations are encrypted and not used for training third-party AI models)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">4. How We Share Your Information</h2>
                            <p className="leading-relaxed">
                                We may share your information in the following situations:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li><strong>Service Providers</strong> - We share data with third-party vendors who perform services on our behalf (hosting, analytics, payment processing, customer support)</li>
                                <li><strong>Business Transfers</strong> - In connection with a merger, acquisition, or asset sale, your information may be transferred</li>
                                <li><strong>Legal Requirements</strong> - We may disclose your information if required by law or in response to valid requests by public authorities</li>
                                <li><strong>With Your Consent</strong> - We may share your information for any other purpose with your explicit consent</li>
                            </ul>
                            <p className="leading-relaxed mt-4">
                                <strong>We do NOT:</strong>
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Sell or rent your personal information to third parties</li>
                                <li>Share your child's information with advertisers</li>
                                <li>Use your AI chat conversations for advertising purposes</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">5. Data Security</h2>
                            <p className="leading-relaxed">
                                We implement appropriate technical and organizational security measures to protect your personal information, including:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Encryption of data in transit and at rest (AES-256 encryption)</li>
                                <li>Secure authentication and access controls</li>
                                <li>Regular security audits and vulnerability assessments</li>
                                <li>GDPR and COPPA compliance measures</li>
                                <li>Secure cloud infrastructure with redundancy and backup</li>
                            </ul>
                            <p className="leading-relaxed mt-4">
                                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">6. Your Privacy Rights</h2>
                            <p className="leading-relaxed">
                                Depending on your location, you may have the following rights:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li><strong>Access</strong> - Request a copy of the personal information we hold about you</li>
                                <li><strong>Correction</strong> - Request correction of inaccurate or incomplete information</li>
                                <li><strong>Deletion</strong> - Request deletion of your personal information (subject to legal obligations)</li>
                                <li><strong>Portability</strong> - Request transfer of your data to another service</li>
                                <li><strong>Objection</strong> - Object to processing of your information for certain purposes</li>
                                <li><strong>Restriction</strong> - Request restriction of processing your information</li>
                                <li><strong>Withdraw Consent</strong> - Withdraw consent for processing where we rely on consent</li>
                            </ul>
                            <p className="leading-relaxed mt-4">
                                To exercise these rights, please contact us at privacy@mycuratedhaven.com. We will respond to your request within 30 days.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">7. Data Retention</h2>
                            <p className="leading-relaxed">
                                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When you delete your account, we will delete or anonymize your personal information within 90 days, except where we are required to retain it for legal reasons.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">8. International Data Transfers</h2>
                            <p className="leading-relaxed">
                                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">9. Cookies and Tracking Technologies</h2>
                            <p className="leading-relaxed">
                                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">10. Third-Party Links</h2>
                            <p className="leading-relaxed">
                                Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these third-party sites. We encourage you to read their privacy policies.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">11. California Privacy Rights</h2>
                            <p className="leading-relaxed">
                                If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA), including:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Right to know what personal information is collected, used, shared, or sold</li>
                                <li>Right to delete personal information</li>
                                <li>Right to opt-out of the sale of personal information (we do not sell personal information)</li>
                                <li>Right to non-discrimination for exercising your privacy rights</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">12. Contact Us</h2>
                            <p className="leading-relaxed">
                                If you have questions or concerns about this Privacy Policy or our privacy practices, please contact us at:
                            </p>
                            <div className="bg-background/50 p-6 rounded-lg mt-4">
                                <p className="font-semibold mb-2">My Curated Haven</p>
                                <p>Email: privacy@mycuratedhaven.com</p>
                                <p>Support: support@mycuratedhaven.com</p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
