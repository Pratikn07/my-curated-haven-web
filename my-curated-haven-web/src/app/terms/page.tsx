"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Terms() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1 pt-20 pb-16">
                <div className="max-w-4xl mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-heading text-foreground">Terms of Service</h1>
                    <p className="text-foreground/60 mb-12">Last updated: December 3, 2025</p>

                    <div className="prose prose-lg max-w-none space-y-8 text-foreground/80">
                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">1. Agreement to Terms</h2>
                            <p className="leading-relaxed">
                                These Terms of Service ("Terms") constitute a legally binding agreement between you and My Curated Haven ("Company," "we," "us," or "our") concerning your access to and use of the My Curated Haven mobile application and website (collectively, the "Service").
                            </p>
                            <p className="leading-relaxed">
                                By accessing or using the Service, you agree that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you are not authorized to access or use the Service and should not use the Service.
                            </p>
                            <p className="leading-relaxed">
                                <strong>IMPORTANT:</strong> These Terms include a mandatory arbitration agreement and class action waiver (Section 15), which affect your legal rights. Please read them carefully.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">2. Changes to Terms</h2>
                            <p className="leading-relaxed">
                                We reserve the right to modify these Terms at any time. We will provide notice of material changes by updating the "Last updated" date at the top of these Terms and, in some cases, we may provide additional notice such as adding a statement to our homepage or sending you a notification.
                            </p>
                            <p className="leading-relaxed">
                                Your continued use of the Service following the posting of revised Terms means that you accept and agree to the changes. You are expected to check this page frequently to be aware of any changes.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">3. Eligibility</h2>
                            <p className="leading-relaxed">
                                You must be at least 18 years of age to use the Service. By using the Service, you represent and warrant that you:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Are at least 18 years of age</li>
                                <li>Have the legal capacity to enter into these Terms</li>
                                <li>Are not barred from using the Service under applicable law</li>
                                <li>Will comply with these Terms and all applicable local, state, national, and international laws</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">4. User Accounts</h2>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">4.1 Account Creation</h3>
                            <p className="leading-relaxed">
                                To access certain features of the Service, you may be required to create an account. You agree to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Provide accurate, current, and complete information during registration</li>
                                <li>Maintain and promptly update your account information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Accept responsibility for all activities that occur under your account</li>
                                <li>Notify us immediately of any unauthorized access or use of your account</li>
                            </ul>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">4.2 Account Termination</h3>
                            <p className="leading-relaxed">
                                We reserve the right to suspend or terminate your account at any time, with or without notice, for any violation of these Terms or for any other reason. You may delete your account at any time from within the app settings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">5. Subscription and Payments</h2>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">5.1 Subscription Plans</h3>
                            <p className="leading-relaxed">
                                The Service offers both free and premium subscription plans. Premium features require a paid subscription, which will be billed automatically on a recurring basis until cancelled.
                            </p>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">5.2 Billing</h3>
                            <p className="leading-relaxed">
                                By subscribing to a premium plan, you authorize us to charge your chosen payment method. All payments are processed through the Apple App Store or Google Play Store, subject to their respective terms and conditions. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
                            </p>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">5.3 Refunds</h3>
                            <p className="leading-relaxed">
                                Refunds are handled according to the Apple App Store or Google Play Store refund policies. We do not provide direct refunds for subscriptions purchased through these platforms. Contact Apple or Google for refund requests.
                            </p>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">5.4 Free Trials</h3>
                            <p className="leading-relaxed">
                                We may offer free trial periods. You must cancel before the trial period ends to avoid being charged. Trials are available only once per user.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">6. User Content</h2>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">6.1 Your Content</h3>
                            <p className="leading-relaxed">
                                You may be able to post, upload, or share content through the Service, including photos, milestone entries, forum posts, and messages ("User Content"). You retain all ownership rights to your User Content. However, by posting User Content, you grant us a non-exclusive, worldwide, royalty-free license to use, store, display, and distribute your User Content as necessary to provide the Service.
                            </p>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">6.2 Content Restrictions</h3>
                            <p className="leading-relaxed">
                                You agree not to post User Content that:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Is illegal, harmful, threatening, abusive, harassing, defamatory, or invasive of privacy</li>
                                <li>Infringes on intellectual property rights</li>
                                <li>Contains viruses or malicious code</li>
                                <li>Is spam or commercial advertising</li>
                                <li>Impersonates another person or entity</li>
                                <li>Contains explicit or inappropriate content</li>
                            </ul>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">6.3 Content Moderation</h3>
                            <p className="leading-relaxed">
                                We reserve the right to remove any User Content that violates these Terms or is otherwise objectionable, at our sole discretion, with or without notice.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">7. Intellectual Property Rights</h2>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">7.1 Our Content</h3>
                            <p className="leading-relaxed">
                                The Service and its original content (excluding User Content), features, and functionality are owned by My Curated Haven and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                            </p>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">7.2 Limited License</h3>
                            <p className="leading-relaxed">
                                We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal, non-commercial use, subject to these Terms.
                            </p>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">7.3 Restrictions</h3>
                            <p className="leading-relaxed">
                                You may not:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Copy, modify, or create derivative works of the Service</li>
                                <li>Reverse engineer, decompile, or disassemble the Service</li>
                                <li>Remove copyright or proprietary notices</li>
                                <li>Use the Service for commercial purposes without authorization</li>
                                <li>Use automated systems or bots to access the Service</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">8. Prohibited Uses</h2>
                            <p className="leading-relaxed">
                                You may not use the Service:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>For any unlawful purpose or to violate any laws</li>
                                <li>To harm, threaten, or harass others</li>
                                <li>To impersonate or attempt to impersonate the Company or other users</li>
                                <li>To interfere with or disrupt the Service or servers</li>
                                <li>To transmit viruses, malware, or other malicious code</li>
                                <li>To collect or track personal information of others</li>
                                <li>To engage in data mining, scraping, or similar data gathering</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">9. Medical Disclaimer</h2>
                            <p className="leading-relaxed">
                                <strong>IMPORTANT:</strong> The Service provides general parenting information and support. It is NOT a substitute for professional medical advice, diagnosis, or treatment.
                            </p>
                            <p className="leading-relaxed">
                                The content provided through the Service, including AI-generated responses, should not be relied upon for medical decisions. Always seek the advice of your pediatrician or other qualified health provider with questions regarding your child's health or medical condition.
                            </p>
                            <p className="leading-relaxed">
                                In case of a medical emergency, call 911 or your local emergency number immediately. Do not rely on the Service for emergency medical assistance.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">10. Third-Party Services</h2>
                            <p className="leading-relaxed">
                                The Service may contain links to third-party websites or services, or allow you to connect with third-party experts. We are not responsible for the content, privacy policies, or practices of any third-party sites or services. You acknowledge and agree that we shall not be liable for any damage or loss caused by use of any third-party content or services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">11. Disclaimer of Warranties</h2>
                            <p className="leading-relaxed">
                                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                            </p>
                            <p className="leading-relaxed">
                                We do not warrant that:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>The Service will be uninterrupted, secure, or error-free</li>
                                <li>The results obtained from the Service will be accurate or reliable</li>
                                <li>Any errors in the Service will be corrected</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">12. Limitation of Liability</h2>
                            <p className="leading-relaxed">
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL MY CURATED HAVEN, ITS AFFILIATES, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR OTHER INTANGIBLE LOSSES ARISING FROM:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Your use or inability to use the Service</li>
                                <li>Any unauthorized access to or use of our servers</li>
                                <li>Any bugs, viruses, or other harmful code transmitted through the Service</li>
                                <li>Any content or conduct of third parties</li>
                            </ul>
                            <p className="leading-relaxed">
                                IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">13. Indemnification</h2>
                            <p className="leading-relaxed">
                                You agree to defend, indemnify, and hold harmless My Curated Haven and its affiliates from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising from:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 my-4">
                                <li>Your use of the Service</li>
                                <li>Your violation of these Terms</li>
                                <li>Your violation of any rights of another party</li>
                                <li>Your User Content</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">14. Privacy</h2>
                            <p className="leading-relaxed">
                                Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our practices regarding your personal information.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">15. Dispute Resolution and Arbitration</h2>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">15.1 Informal Resolution</h3>
                            <p className="leading-relaxed">
                                Before initiating arbitration, you agree to first contact us at legal@mycuratedhaven.com to attempt to resolve any dispute informally.
                            </p>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">15.2 Binding Arbitration</h3>
                            <p className="leading-relaxed">
                                If informal resolution is unsuccessful, any dispute arising from these Terms or your use of the Service will be resolved through binding arbitration in accordance with the American Arbitration Association's rules. The arbitration will take place in [Your State/Country], and judgment on the award may be entered in any court having jurisdiction.
                            </p>

                            <h3 className="text-2xl font-bold text-foreground mt-6 mb-3">15.3 Class Action Waiver</h3>
                            <p className="leading-relaxed">
                                YOU AGREE THAT DISPUTES WILL BE RESOLVED ON AN INDIVIDUAL BASIS AND NOT AS PART OF A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">16. Governing Law</h2>
                            <p className="leading-relaxed">
                                These Terms shall be governed by and construed in accordance with the laws of [Your State/Country], without regard to conflict of law provisions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">17. Severability</h2>
                            <p className="leading-relaxed">
                                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">18. Entire Agreement</h2>
                            <p className="leading-relaxed">
                                These Terms, together with our Privacy Policy, constitute the entire agreement between you and My Curated Haven regarding the Service and supersede all prior agreements and understandings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold text-foreground mb-4 font-heading">19. Contact Information</h2>
                            <p className="leading-relaxed">
                                If you have any questions about these Terms, please contact us:
                            </p>
                            <div className="bg-background/50 p-6 rounded-lg mt-4">
                                <p className="font-semibold mb-2">My Curated Haven</p>
                                <p>Email: legal@mycuratedhaven.com</p>
                                <p>Support: support@mycuratedhaven.com</p>
                            </div>
                        </section>

                        <div className="bg-primary/10 border-l-4 border-primary p-6 rounded-lg mt-12">
                            <p className="font-semibold text-foreground mb-2">Acknowledgment</p>
                            <p className="leading-relaxed">
                                BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
