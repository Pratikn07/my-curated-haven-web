import Link from "next/link";
import { SUPPORT_EMAIL } from "@/config/site-navigation";

const h2 = "text-3xl font-bold text-foreground mb-4 font-heading";
const list = "list-disc pl-6 space-y-2 my-4";

export default function Terms() {
    return (
        <div className="bg-canvas py-8">
                <div className="max-w-4xl mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-heading text-foreground">Terms of Service</h1>
                    <p className="text-text-muted mb-12">Last updated: September 25, 2026</p>

                    <div className="prose prose-lg max-w-none space-y-8 text-foreground/80">
                        <section>
                            <h2 className={h2}>1. Agreement</h2>
                            <p className="leading-relaxed">
                                These terms apply to your use of mycuratedhaven.com (the &quot;website&quot;), run by My Curated Haven (&quot;we&quot;, &quot;us&quot;). By using the website you agree to them. If you do not agree, please do not use the website.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>2. Who can use the website</h2>
                            <p className="leading-relaxed">
                                The website is for adults. You must be at least 18 years old to create an account or buy anything.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>3. What the website offers</h2>
                            <p className="leading-relaxed">
                                The website offers toddler recipes by Tiny Soho, including free recipes that anyone can read and print without an account. An optional account lets you save recipes. Other parenting features shown on the homepage are previews and are not available on the website.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>4. Accounts</h2>
                            <ul className={list}>
                                <li>You sign in with a one-time code sent to your email address. Keep access to that email account secure, because anyone who can read it can sign in as you.</li>
                                <li>Your account may also work in the My Curated Haven parenting app, which uses the same account system.</li>
                                <li>To close your account, email <a className="font-semibold text-action underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address you sign in with.</li>
                                <li>We may suspend or close an account that breaks these terms.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={h2}>5. Recipes and food safety</h2>
                            <p className="leading-relaxed">
                                Recipes are general information for families. They are not medical, nutritional or allergy advice, and they do not replace advice from your child&apos;s doctor.
                            </p>
                            <ul className={list}>
                                <li>Check every ingredient against your child&apos;s allergies and dietary needs. Allergen information on a recipe describes its listed ingredients. It cannot account for brands you buy or cross-contact in your kitchen.</li>
                                <li>Prepare food in a size and texture suitable for your child&apos;s age and eating skills to reduce choking risk, and stay with your child while they eat.</li>
                                <li>Follow the cooking, cooling and storage guidance, and use your own judgment about whether food is safe to serve.</li>
                            </ul>
                            <p className="leading-relaxed">
                                In an emergency, call your local emergency number immediately.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>6. Purchases</h2>
                            <p className="leading-relaxed">
                                Nothing is for sale on this website yet. If we offer a recipe collection, its page will state the price, what is included, how long you have access and the refund terms before you pay. Those terms will apply to that purchase along with these terms. Stripe processes payments.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>7. Using our content</h2>
                            <p className="leading-relaxed">
                                Recipes, photos, text and design on the website belong to My Curated Haven or its licensors. You may read, print and cook from recipes for your own household. You may not copy, republish, sell or distribute our content, remove copyright notices, or use automated tools to scrape the website without our written permission.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>8. Acceptable use</h2>
                            <p className="leading-relaxed">You agree not to:</p>
                            <ul className={list}>
                                <li>Use the website for anything unlawful.</li>
                                <li>Try to access another person&apos;s account or data.</li>
                                <li>Interfere with or disrupt the website, or attempt to bypass its security or access controls.</li>
                                <li>Upload or send viruses or other harmful code.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={h2}>9. Other websites and services</h2>
                            <p className="leading-relaxed">
                                The website may link to or rely on other websites and services, such as Stripe for payments. We are not responsible for their content or practices.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>10. Disclaimer of warranties</h2>
                            <p className="leading-relaxed">
                                THE WEBSITE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not promise that the website will always be available or free of errors.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>11. Limitation of liability</h2>
                            <p className="leading-relaxed">
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, MY CURATED HAVEN AND ITS AFFILIATES, DIRECTORS, EMPLOYEES AND AGENTS ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR LOST DATA, ARISING FROM YOUR USE OF OR INABILITY TO USE THE WEBSITE. OUR TOTAL LIABILITY WILL NOT EXCEED THE GREATER OF THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR ONE HUNDRED US DOLLARS ($100).
                            </p>
                            <p className="leading-relaxed">
                                Some places do not allow these limits, so they may not apply to you. Nothing in these terms limits liability that cannot be limited by law.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>12. Indemnification</h2>
                            <p className="leading-relaxed">
                                You agree to defend, indemnify and hold harmless My Curated Haven and its affiliates from claims, damages, losses and expenses (including attorneys&apos; fees) arising from your violation of these terms or of another person&apos;s rights.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>13. Disputes</h2>
                            <p className="leading-relaxed">
                                If you have a problem with the website, please email <a className="font-semibold text-action underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> first so we can try to resolve it informally.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>14. Changes to these terms</h2>
                            <p className="leading-relaxed">
                                We may update these terms. When we do, we change the date at the top of this page. If you keep using the website after a change, the updated terms apply.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>15. General</h2>
                            <p className="leading-relaxed">
                                If any part of these terms is found unenforceable, the rest stays in effect. These terms and our <Link href="/privacy" className="font-semibold text-action underline">Privacy Policy</Link> are the entire agreement between you and us about the website.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>16. Contact</h2>
                            <p className="leading-relaxed">
                                Questions about these terms: <a className="font-semibold text-action underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                            </p>
                        </section>
                    </div>
                </div>
        </div>
    );
}
