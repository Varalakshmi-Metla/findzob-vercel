import nodemailer from 'nodemailer';

export type Attachment = { filename: string; content: Buffer | string; contentType?: string };

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
};

export type EmailOptions = {
  to: string | string[];
  type: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  templateData?: Record<string, any> | undefined;
  attachments?: Attachment[];
  smtp?: SmtpConfig | undefined; // optional per-email SMTP override
};

function buildTemplates(type: string, data?: Record<string, any>) {
  const name = data?.name || '';
  switch (type) {
    case 'profile_completed':
      return {
        subject: 'Your profile is complete',
        html: `<p>Hi ${name},</p><p>Your profile is now complete. Welcome to FindZob!</p><p>— The FindZob Team</p>`,
        text: `Hi ${name},\n\nYour profile is now complete. Welcome to FindZob!\n\n— The FindZob Team`,
      };
    case 'application_updated':
      return {
        subject: `Application status updated: ${data?.status || ''}`,
        html: `<p>Hi ${name},</p><p>Your application for <strong>${data?.role || ''}</strong> at <strong>${data?.company || ''}</strong> was updated to <strong>${data?.status || ''}</strong>.</p><p>— The FindZob Team</p>`,
        text: `Hi ${name},\n\nYour application for ${data?.role || ''} at ${data?.company || ''} was updated to ${data?.status || ''}.\n\n— The FindZob Team`,
      };
    case 'resume_generated':
      return {
        subject: `New resume generated: ${data?.role || ''}`,
        html: `<p>Hi ${name},</p><p>A new resume for <strong>${data?.role || ''}</strong> was generated and attached.</p><p>— The FindZob Team</p>`,
        text: `Hi ${name},\n\nA new resume for ${data?.role || ''} was generated and attached.\n\n— The FindZob Team`,
      };
    default:
      return {
        subject: data?.subject || 'Notification from FindZob',
        html: data?.html || `<p>Hi ${name},</p><p>${data?.text || 'You have a new notification.'}</p>`,
        text: data?.text || 'You have a new notification.',
      };
  }
}

export async function sendEmail(options: EmailOptions) {
  const { to, type, from, subject, text, html, templateData, attachments, smtp } = options;

  if (!to || !type) throw new Error('Missing required email parameters: to, type');

  // Determine SMTP config: use override if provided, otherwise environment variables
  // Default to Gmail SMTP if no host provided (note: Gmail often requires app passwords or OAuth2)
  const smtpHost = smtp?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = smtp?.port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465);
  const smtpUser = smtp?.user || process.env.SMTP_USER;
  const smtpPass = smtp?.pass || process.env.SMTP_PASS;
  const smtpSecure = smtp?.secure ?? (smtpPort === 465);

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('SMTP configuration missing. Provide per-email SMTP or set SMTP_HOST/SMTP_USER/SMTP_PASS in env');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });

  // Build content if not explicitly provided
  const built = buildTemplates(type, templateData);
  const mailSubject = subject || built.subject;
  const mailHtml = html || built.html;
  const mailText = text || built.text;
  const mailFrom = from || process.env.SMTP_FROM || process.env.DEFAULT_FROM_EMAIL || smtpUser;

  const mailOptions: any = {
    from: mailFrom,
    to,
    subject: mailSubject,
    text: mailText,
    html: mailHtml,
    attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })) || undefined,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

export default sendEmail;
