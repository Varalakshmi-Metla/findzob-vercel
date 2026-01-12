import sendEmail from '../src/lib/sendEmail';

async function main() {
  const to = process.env.TEST_TO_EMAIL;
  if (!to) {
    console.error('Set TEST_TO_EMAIL env var to actually send a test email. Aborting to avoid accidental sends.');
    process.exit(1);
  }
  try {
    console.log('Sending test email to', to);
    const from = process.env.TEST_FROM_EMAIL || 'no-reply@example.com';
    const res = await sendEmail({ from, to, type: 'profile_completed', templateData: { name: 'Test User', company: 'TestCo', role: 'Tester', status: 'pending' } });
    console.log('Send result', res);
  } catch (err) {
    console.error('Send failed', err);
    process.exit(2);
  }
}

main();
