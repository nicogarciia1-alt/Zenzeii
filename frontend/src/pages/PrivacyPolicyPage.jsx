import React from 'react';
import Layout from '@/components/layout/Layout';

const textStyle = { fontFamily: '"EB Garamond", Georgia, serif' };
const h2Style = { ...textStyle, fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px' };
const pStyle = { ...textStyle, fontSize: '1rem', lineHeight: 1.8, color: 'hsl(var(--foreground))', marginBottom: '12px' };
const ulStyle = { ...textStyle, fontSize: '1rem', lineHeight: 1.8, color: 'hsl(var(--foreground))', marginBottom: '12px', paddingLeft: '24px' };
const linkStyle = { color: 'hsl(var(--foreground))', textDecoration: 'underline' };
const sectionStyle = { marginBottom: '32px' };

const PROCESSORS = [
  { name: 'MongoDB Atlas', purpose: 'database hosting', url: 'https://www.mongodb.com/legal/privacy/privacy-policy' },
  { name: 'Railway', purpose: 'backend hosting', url: 'https://railway.com/legal/privacy' },
  { name: 'Vercel', purpose: 'frontend hosting', url: 'https://vercel.com/legal/privacy-policy' },
  { name: 'Stripe', purpose: 'payment processing (independent data controller)', url: 'https://stripe.com/privacy' },
  { name: 'Resend', purpose: 'transactional email delivery', url: 'https://resend.com/legal/privacy-policy' },
  { name: 'OpenAI', purpose: 'AI features via API (no model training on your data)', url: 'https://openai.com/policies/privacy-policy' },
  { name: 'ElevenLabs', purpose: 'audio narration via API', url: 'https://elevenlabs.io/privacy-policy' },
];

const PrivacyPolicyPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 style={{ ...textStyle, fontSize: '2.5rem', fontWeight: 600, marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ ...textStyle, color: 'hsl(var(--muted-foreground))', marginBottom: '40px' }}>
          Effective date: 11 September 2026 · Version 1.0
        </p>

        <div style={sectionStyle}>
          <h2 style={h2Style}>1. Who we are</h2>
          <p style={pStyle}>
            Zenzeii is operated by Tetti Sims LLC (in formation), [Mailing address — to be inserted].
            Tetti Sims LLC is the Data Controller responsible for your personal data under this policy.
            You can reach us at <a href="mailto:hello@zenzeii.com" style={linkStyle}>hello@zenzeii.com</a>.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>2. Data we collect</h2>
          <ul style={ulStyle}>
            <li>Account data — email address, username, and password (stored as a bcrypt hash).</li>
            <li>Reading activity — books in your library, reading progress, vocabulary saved, and chapter/sentence positions.</li>
            <li>Payment data — subscription tier and status; card and billing details are handled directly by Stripe and never touch our servers.</li>
            <li>Technical logs — IP address, request timestamps, and error logs, kept for security and debugging.</li>
            <li>Communications — messages you send us, such as support or feedback requests.</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>3. How we use your data</h2>
          <ul style={ulStyle}>
            <li>To deliver the Zenzeii service — authentication, saving vocabulary, tracking reading progress, and account management.</li>
            <li>To power AI features (word explanations, chat, audio narration) via third-party APIs. Your data is sent only for generating your response and is not used to train third-party models.</li>
            <li>To send transactional email only — verification, password reset, and receipts. We do not send marketing email without separate consent.</li>
            <li>We do not run analytics or tracking on your usage.</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>4. Legal basis for processing (GDPR)</h2>
          <p style={pStyle}>
            Where the GDPR applies, we process your data under the following legal bases (Art. 6 GDPR):
          </p>
          <ul style={ulStyle}>
            <li><strong>Contract</strong> — processing necessary to provide the service you signed up for.</li>
            <li><strong>Legitimate interests</strong> — securing our service, preventing abuse, and improving reliability.</li>
            <li><strong>Legal obligation</strong> — where processing is required to comply with the law.</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Data sharing</h2>
          <p style={pStyle}>
            We share data with the following processors, each acting under contract to provide part of our
            service. All are based in the USA; where required, transfers rely on Standard Contractual Clauses (SCCs).
          </p>
          <ul style={ulStyle}>
            {PROCESSORS.map((p) => (
              <li key={p.name}>
                <strong>{p.name}</strong> — {p.purpose}.{' '}
                <a href={p.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>Privacy policy</a>
              </li>
            ))}
          </ul>
          <p style={pStyle}>
            We do not sell your personal data to third parties.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Data retention</h2>
          <ul style={ulStyle}>
            <li>Account data is retained for as long as your account is active.</li>
            <li>After you request deletion, your data is removed within 30 days.</li>
            <li>Technical logs are retained for 30 days.</li>
            <li>Authentication tokens expire as implemented in the service (short-lived session tokens; single-use, time-limited tokens for password reset and email verification).</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Your rights</h2>
          <p style={pStyle}>
            Depending on your location, you have the right to:
          </p>
          <ul style={ulStyle}>
            <li>Access the personal data we hold about you.</li>
            <li>Rectify inaccurate or incomplete data.</li>
            <li>Erase your data ("right to be forgotten").</li>
            <li>Receive your data in a portable format.</li>
            <li>Restrict or object to certain processing.</li>
            <li>Withdraw consent at any time, where processing relies on consent.</li>
          </ul>
          <p style={pStyle}>
            To exercise these rights, contact <a href="mailto:hello@zenzeii.com" style={linkStyle}>hello@zenzeii.com</a>.
            We may need to verify your identity before acting on a request, and we will respond within 30 days.
            If you are in the EEA, you also have the right to lodge a complaint with your local supervisory
            authority, including the Garante per la protezione dei dati personali.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Cookies</h2>
          <p style={pStyle}>
            Zenzeii does not use tracking or advertising cookies. We use your browser's localStorage to keep
            you signed in (JWT) and to remember your reading preferences.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Security</h2>
          <p style={pStyle}>
            Passwords are hashed with bcrypt and never stored in plain text. All traffic is encrypted in
            transit via HTTPS/TLS, and access to the service is authenticated via JWT. If you believe you've
            found a security vulnerability, please disclose it responsibly to{' '}
            <a href="mailto:hello@zenzeii.com" style={linkStyle}>hello@zenzeii.com</a> rather than exploiting it publicly.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>10. Children's privacy</h2>
          <p style={pStyle}>
            Zenzeii is not directed at children under 16, and we do not knowingly collect data from them.
            If we become aware that we have collected personal data from a child under 16, we will delete it.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>11. Changes to this policy</h2>
          <p style={pStyle}>
            If we make material changes to this policy, we will notify you by email and update the effective
            date above. Continued use of Zenzeii after a change takes effect constitutes acceptance of the
            revised policy.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>12. Contact</h2>
          <p style={pStyle}>
            Tetti Sims LLC<br />
            [Mailing address — to be inserted]<br />
            <a href="mailto:hello@zenzeii.com" style={linkStyle}>hello@zenzeii.com</a>
          </p>
          <p style={pStyle}>
            We aim to respond to all privacy-related inquiries within 30 days.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicyPage;
