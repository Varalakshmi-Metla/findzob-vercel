import sendEmail from '../src/lib/sendEmail';

async function main() {
  const to = process.env.TEST_TO_EMAIL || process.env.GMAIL_USER;
  if (!to) {
    console.error('Set TEST_TO_EMAIL env var to actually send a test email. Aborting to avoid accidental sends.');
    process.exit(1);
  }
  try {
    console.log('Sending test email to', to);
  const res = await sendEmail({ to, type: 'profile_completed', from: process.env.SMTP_FROM || process.env.GMAIL_USER || 'test@example.com', templateData: { name: 'Test User', company: 'TestCo', role: 'Tester', status: 'pending' } });
    console.log('Send result', res);
  } catch (err: any) {
    console.error('Send failed:', err);
    if (err && err.response) {
      console.error('SMTP response:', err.response);
    }
    process.exit(2);
  }
}

main();
