import { Resend } from 'resend';
import { RESEND_API_KEY } from '../config';

const resend = new Resend(RESEND_API_KEY);

export class EmailService {
  static async sendExportEmail(to: string, files: { filename: string; content: string; contentType: string }[]) {
    try {
      const attachments = files.map(file => {
        // Remove data URL prefix if present (e.g., "data:image/png;base64,")
        const base64Data = file.content.replace(/^data:.+;base64,/, "");
        return {
          filename: file.filename,
          content: Buffer.from(base64Data, 'base64'),
        };
      });

      const data = await resend.emails.send({
        from: 'SketchSync <sketchsync@email.vikasworks.tech>',
        to: [to],
        subject: 'Your SketchSync Export',
        html: '<p>Here are your exported files attached below.</p>',
        attachments: attachments,
      });

      return data;
    } catch (error) {
      console.error('Email sending failed:', JSON.stringify(error, null, 2));
      throw error;
    }
  }
}
