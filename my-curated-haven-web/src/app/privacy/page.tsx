import { SUPPORT_EMAIL } from "@/config/site-navigation";

const h2 = "text-3xl font-bold text-foreground mb-4 font-heading";
const list = "list-disc pl-6 space-y-2 my-4";

export default function Privacy() {
    return (
        <div className="bg-canvas py-8">
                <div className="max-w-4xl mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-heading text-foreground">Privacy Policy</h1>
                    <p className="text-foreground/60 mb-12">Last updated: September 25, 2026</p>

                    <div className="prose prose-lg max-w-none space-y-8 text-foreground/80">
                        <section>
                            <h2 className={h2}>1. About this policy</h2>
                            <p className="leading-relaxed">
                                This policy explains what information My Curated Haven (&quot;we&quot;, &quot;us&quot;) collects through mycuratedhaven.com, why, and what choices you have. You can read and print our free recipes without giving us any personal information.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>2. Information we collect</h2>
                            <ul className={list}>
                                <li><strong>Your email address, if you sign in.</strong> An account is optional. We send a one-time code to your email to sign you in. There is no password.</li>
                                <li><strong>Recipes you save.</strong> If you save a recipe, we store which recipe you saved and when.</li>
                                <li><strong>Emails you send us.</strong> If you email support, we keep the message and your address so we can reply.</li>
                                <li><strong>Optional analytics, only if you accept.</strong> See section 4.</li>
                                <li><strong>Purchase records, only if you buy something.</strong> Nothing is for sale on this website yet. See section 5.</li>
                                <li><strong>Basic request data.</strong> Like any website, each request sends your IP address and browser type to our hosting provider, which uses them to deliver the site and protect it from abuse.</li>
                            </ul>
                            <p className="leading-relaxed">
                                The website does not ask for your child&apos;s name, birth date or health information, and it does not show advertising.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>3. How we use it</h2>
                            <ul className={list}>
                                <li>To sign you in and keep your saved recipes private to you.</li>
                                <li>To answer support requests.</li>
                                <li>If you accept analytics, to understand in aggregate which recipes are read and printed, so we can improve them.</li>
                                <li>To keep the website secure and working.</li>
                            </ul>
                            <p className="leading-relaxed">
                                We do not sell your personal information, and we do not send marketing email.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>4. Cookies, browser storage and analytics</h2>
                            <ul className={list}>
                                <li><strong>Sign-in cookies.</strong> If you sign in, our authentication provider sets cookies that keep you signed in. The website needs them for accounts and saved recipes.</li>
                                <li><strong>Your consent choice.</strong> We store your analytics choice in your browser (<code>mch_analytics_consent</code>).</li>
                                <li>
                                    <strong>Optional analytics.</strong> Analytics is off until you select &quot;Accept&quot; on the consent banner. If you accept, we store a random browser identifier (<code>mch_browser_id</code>) and a session identifier (<code>mch_session_id</code>), and we send page and recipe events to our analytics provider, PostHog. We may also keep the campaign name from a Tiny Soho link you followed (<code>mch_campaign_attribution</code>). Events do not include your email address, your account ID or the text you search for.
                                </li>
                                <li><strong>Changing your mind.</strong> Select &quot;Cookie &amp; Analytics Preferences&quot; in the footer at any time. Withdrawing consent stops analytics and deletes the browser and session identifiers from your browser.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={h2}>5. Purchases</h2>
                            <p className="leading-relaxed">
                                Nothing is for sale on this website yet. If we offer a recipe collection and you buy it, Stripe handles the payment on its own checkout page. We receive your email address, the order details and whether the payment succeeded, and we keep those records to give you access and meet accounting obligations. We never receive your full card number.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>6. Who processes your information</h2>
                            <p className="leading-relaxed">
                                We use these service providers to run the website. They process information on our behalf:
                            </p>
                            <ul className={list}>
                                <li><strong>Vercel</strong>: hosting.</li>
                                <li><strong>Supabase</strong>: sign-in, sign-in emails, database and recipe images.</li>
                                <li><strong>PostHog</strong>: analytics, only if you accept it.</li>
                                <li><strong>Stripe</strong>: payments, only if you buy something.</li>
                            </ul>
                            <p className="leading-relaxed">
                                These providers store data mainly in the United States. We may also disclose information when the law requires it.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>7. The My Curated Haven parenting app</h2>
                            <p className="leading-relaxed">
                                Your website sign-in may also work in the My Curated Haven parenting app, which uses the same account system. The website does not display or use information you entered in the app.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>8. How long we keep information</h2>
                            <p className="leading-relaxed">
                                We keep your account and saved recipes until you ask us to close your account. Browser identifiers stay in your browser until you withdraw consent or clear your browser data. Support emails and purchase records are kept as long as we need them to help you and to meet legal and accounting obligations.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>9. Your choices and rights</h2>
                            <ul className={list}>
                                <li>Use the free recipes without signing in or accepting analytics.</li>
                                <li>Change your analytics choice at any time from the footer.</li>
                                <li>Ask us for a copy of your information, to correct it, or to delete it and close your account.</li>
                            </ul>
                            <p className="leading-relaxed">
                                To make a request, email <a className="font-semibold text-action underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address you sign in with. We verify requests before acting on them. Depending on where you live, for example California or the European Union, you may have further rights under local law, and we will honour them.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>10. Children</h2>
                            <p className="leading-relaxed">
                                The website is for parents and caregivers. It is not directed at children, and we do not knowingly collect personal information from children under 13. If you think a child has given us personal information, email us and we will delete it.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>11. Security</h2>
                            <p className="leading-relaxed">
                                The website uses HTTPS. Access to saved recipes is limited to the signed-in account that saved them. No method of storing or sending information is completely secure, but we work to protect yours.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>12. Changes to this policy</h2>
                            <p className="leading-relaxed">
                                When we change this policy, we update the date at the top of this page. If a change affects how we use information you have already given us, we will tell you before it applies.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>13. Contact</h2>
                            <p className="leading-relaxed">
                                Questions about privacy: <a className="font-semibold text-action underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                            </p>
                        </section>
                    </div>
                </div>
        </div>
    );
}
