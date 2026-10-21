import { Resend } from "resend";
import { env } from "@/lib/env";

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

export const DEFAULT_FROM_EMAIL =
  process.env.EMAIL_FROM || "SyncBoard <onboarding@resend.dev>";

/**
 * Generates an accessible, responsive HTML email template for email verification.
 */
function getVerificationEmailHtml(name: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email - SyncBoard</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); text-align: center;">
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">SyncBoard</h1>
        <p style="color: rgba(255, 255, 255, 0.85); font-size: 13px; margin: 6px 0 0 0;">Real-time Collaborative Project Management</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Verify your email address</h2>
        <p style="font-size: 14px; line-height: 22px; color: #475569; margin-bottom: 20px;">
          Hi ${name || "there"},<br><br>
          Welcome to SyncBoard! Please verify your email address to activate your account and start collaborating with your team in real time.
        </p>
        
        <!-- Button -->
        <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
          <tr>
            <td align="center" style="border-radius: 10px; background-color: #4f46e5;">
              <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
                Verify Email Address →
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 12px; line-height: 18px; color: #64748b; margin-top: 24px;">
          If the button above does not work, copy and paste this verification URL into your browser:
        </p>
        <p style="font-size: 11px; word-break: break-all; color: #4f46e5; background-color: #f1f5f9; padding: 10px 12px; border-radius: 8px; margin: 8px 0 20px 0;">
          <a href="${verifyUrl}" style="color: #4f46e5; text-decoration: none;">${verifyUrl}</a>
        </p>

        <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This verification link is valid for 24 hours. If you did not create a SyncBoard account, you can safely disregard this email.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 16px 32px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          &copy; ${new Date().getFullYear()} SyncBoard Platforms. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generates an accessible, responsive HTML email template for workspace invitations.
 */
function getWorkspaceInviteEmailHtml(
  inviterName: string,
  workspaceName: string,
  role: string,
  inviteUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Invitation - SyncBoard</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); text-align: center;">
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">SyncBoard</h1>
        <p style="color: rgba(255, 255, 255, 0.85); font-size: 13px; margin: 6px 0 0 0;">Team Workspace Invitation</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">You've been invited!</h2>
        <p style="font-size: 14px; line-height: 22px; color: #475569; margin-bottom: 20px;">
          <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace as a <strong>${role}</strong>.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #334155;">
            <strong>Workspace:</strong> ${workspaceName}<br>
            <strong>Role:</strong> <span style="display: inline-block; padding: 2px 8px; background-color: #e0e7ff; color: #3730a3; border-radius: 4px; font-size: 11px; font-weight: 600;">${role}</span>
          </p>
        </div>
        
        <!-- Button -->
        <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
          <tr>
            <td align="center" style="border-radius: 10px; background-color: #4f46e5;">
              <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
                Accept Invitation & Join →
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 12px; line-height: 18px; color: #64748b; margin-top: 24px;">
          If the button above does not work, copy and paste this URL into your browser:
        </p>
        <p style="font-size: 11px; word-break: break-all; color: #4f46e5; background-color: #f1f5f9; padding: 10px 12px; border-radius: 8px; margin: 8px 0 20px 0;">
          <a href="${inviteUrl}" style="color: #4f46e5; text-decoration: none;">${inviteUrl}</a>
        </p>

        <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          This invitation link is valid for 7 days. If you do not wish to join this workspace, you can safely ignore this invitation.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 16px 32px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          &copy; ${new Date().getFullYear()} SyncBoard Platforms. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends an email verification link to a user after registration.
 */
export async function sendVerificationEmail({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}): Promise<{ success: boolean; id?: string; error?: string; url: string }> {
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
  const html = getVerificationEmailHtml(name, verifyUrl);

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: [email],
        subject: "Verify your email for SyncBoard",
        html,
      });

      if (response.error) {
        console.error("[Email] Resend API error:", response.error);
        console.log(`[Email] Fallback direct verification URL: ${verifyUrl}`);
        return {
          success: false,
          error: response.error.message,
          url: verifyUrl,
        };
      }

      console.log(`[Email] Verification email dispatched via Resend to ${email} (ID: ${response.data?.id})`);
      return {
        success: true,
        id: response.data?.id,
        url: verifyUrl,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send email";
      console.error("[Email] Resend send exception:", message);
      console.log(`[Email] Fallback direct verification URL: ${verifyUrl}`);
      return {
        success: false,
        error: message,
        url: verifyUrl,
      };
    }
  }

  // Fallback simulator for development when RESEND_API_KEY is not configured
  console.log("\n==================== [RESEND EMAIL SIMULATOR] ====================");
  console.log(`To: ${email}`);
  console.log(`Subject: Verify your email for SyncBoard`);
  console.log(`Verification URL: ${verifyUrl}`);
  console.log("===================================================================\n");

  return {
    success: true,
    url: verifyUrl,
  };
}

/**
 * Sends a workspace invitation email containing the acceptance link.
 */
export async function sendWorkspaceInvitationEmail({
  email,
  inviterName,
  workspaceName,
  workspaceSlug,
  role,
  token,
}: {
  email: string;
  inviterName: string;
  workspaceName: string;
  workspaceSlug?: string;
  role: string;
  token: string;
}): Promise<{ success: boolean; id?: string; error?: string; url: string }> {
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const inviteUrl = `${appUrl}/api/workspace/invite?token=${token}${workspaceSlug ? `&ws=${encodeURIComponent(workspaceSlug)}` : ""}`;
  const html = getWorkspaceInviteEmailHtml(inviterName, workspaceName, role, inviteUrl);

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: [email],
        subject: `You've been invited to join ${workspaceName} on SyncBoard`,
        html,
      });

      if (response.error) {
        console.error("[Email] Resend invitation error:", response.error);
        console.log(`[Email] Fallback direct invite URL: ${inviteUrl}`);
        return {
          success: false,
          error: response.error.message,
          url: inviteUrl,
        };
      }

      console.log(`[Email] Invitation email dispatched via Resend to ${email} (ID: ${response.data?.id})`);
      return {
        success: true,
        id: response.data?.id,
        url: inviteUrl,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send email";
      console.error("[Email] Resend invitation exception:", message);
      console.log(`[Email] Fallback direct invite URL: ${inviteUrl}`);
      return {
        success: false,
        error: message,
        url: inviteUrl,
      };
    }
  }

  // Fallback simulator for development when RESEND_API_KEY is not configured
  console.log("\n==================== [RESEND EMAIL SIMULATOR] ====================");
  console.log(`To: ${email}`);
  console.log(`Subject: You've been invited to join ${workspaceName} on SyncBoard`);
  console.log(`Invitation URL: ${inviteUrl}`);
  console.log("===================================================================\n");

  return {
    success: true,
    url: inviteUrl,
  };
}
