import { SUPPORT_EMAIL } from "@/config/site-navigation";

const h2 = "text-3xl font-bold text-foreground mb-4 font-heading";
const list = "list-disc pl-6 space-y-2 my-4";

export default function Privacy() {
    return (
        <div className="bg-canvas py-8">
                <div className="max-w-4xl mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-heading text-foreground">Privacy Policy</h1>
                    <p className="text-text-muted mb-12">Last updated: September 26, 2026</p>

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
                                <li><strong>How you use the website.</strong> Pages you visit, what you click, and recordings of your visits. See section 4.</li>
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
                                <li>To understand how people find and use the website, for example which recipes are read, saved and printed and where visitors get stuck, so we can improve it.</li>
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
                                <li>
                                    <strong>Analytics.</strong> We use PostHog to measure how the website is used. It stores a random identifier in a cookie and in your browser storage, and records the pages you visit, the links and buttons you click, the website that sent you, and your device and browser type. Our own code also stores a browser and session identifier (<code>mch_browser_id</code>, <code>mch_session_id</code>) and the campaign name from a Tiny Soho link you followed (<code>mch_campaign_attribution</code>).
                                </li>
                                <li>
                                    <strong>Session recordings.</strong> PostHog records how pages look and respond while you use them, so we can see where the website is confusing. Anything you type is hidden in the recording. We do not record the sign-in, account or checkout pages.
                                </li>
                                <li><strong>If you sign in.</strong> Your analytics are linked to your account and email address, so we can understand how signed-in parents use saved recipes. Signing out unlinks the browser.</li>
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
                                <li><strong>PostHog</strong>: analytics and session recordings.</li>
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
                                We keep your account and saved recipes until you ask us to close your account. Browser identifiers stay in your browser until you clear your browser data. PostHog keeps analytics and recordings for a limited period set by its retention rules, then deletes them. Support emails and purchase records are kept as long as we need them to help you and to meet legal and accounting obligations.
                            </p>
                        </section>

                        <section>
                            <h2 className={h2}>9. Your choices and rights</h2>
                            <ul className={list}>
                                <li>Use the free recipes without signing in.</li>
                                <li>Ask us to delete the analytics linked to your account or email address.</li>
                                <li>Block analytics with your browser&apos;s privacy or content-blocking settings.</li>
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
