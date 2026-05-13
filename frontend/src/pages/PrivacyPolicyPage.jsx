import React from 'react';
import Layout from '@/components/layout/Layout';

const PrivacyPolicyPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '2.5rem', fontWeight: 600, marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: '"EB Garamond", Georgia, serif', color: 'hsl(var(--muted-foreground))', marginBottom: '40px' }}>
          Last updated: May 2026
        </p>

        {[
          { title: 'Who we are', body: 'Zenzeii is a Japanese literary reading application. Our website is zenzeii.com.' },
          { title: 'What data we collect', body: 'We collect your email address and password when you register. We also collect basic usage data to improve the service.' },
          { title: 'How we use your data', body: 'Your data is used solely to provide the Zenzeii service — authentication, saving vocabulary, and tracking reading progress. We do not sell your data to third parties.' },
          { title: 'Data storage', body: 'Your data is stored securely on MongoDB Atlas servers. Passwords are encrypted and never stored in plain text.' },
          { title: 'Your rights', body: 'You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us at privacy@zenzeii.com.' },
          { title: 'Cookies', body: 'Zenzeii uses only essential cookies required for authentication. We do not use tracking or advertising cookies.' },
          { title: 'Contact', body: 'For any privacy-related questions, contact us at privacy@zenzeii.com.' },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px' }}>
              {title}
            </h2>
            <p style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: '1rem', lineHeight: 1.8, color: 'hsl(var(--foreground))' }}>
              {body}
            </p>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default PrivacyPolicyPage;
