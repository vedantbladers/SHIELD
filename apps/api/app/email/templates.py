"""Email HTML templates — exact ports from the old Nodemailer templates."""
from app.config import settings


def build_verification_email(alias: str, token: str) -> str:
    """Verification email — exact HTML structure from old system."""
    verify_url = f"{settings.app_url}/api/auth/verify?token={token}"
    return f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Welcome to SHIELD, {alias}</h2>
      <p style="color: #555; line-height: 1.6;">
        You are one step away from accessing the anonymous cybersecurity marketplace.
      </p>
      <p style="color: #555; line-height: 1.6;">
        Click the button below to verify your email address:
      </p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{verify_url}"
           style="background: #6366F1; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;
                  display: inline-block;">
          Verify my account
        </a>
      </p>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        This link expires in 24 hours. If you did not create this account, ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        SHIELD &mdash; Anonymous Cybersecurity Marketplace
      </p>
    </div>
    """


def build_password_reset_email(alias: str, token: str) -> str:
    """Password reset email — exact HTML structure from old system."""
    reset_url = f"{settings.app_url}/reset-password?token={token}"
    return f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Password Reset &mdash; SHIELD</h2>
      <p style="color: #555; line-height: 1.6;">
        Hello {alias}, a password reset was requested.
      </p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{reset_url}"
           style="background: #6366F1; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;
                  display: inline-block;">
          Reset my password
        </a>
      </p>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        This link expires in 1 hour. If you did not request this, ignore this email.
      </p>
    </div>
    """


def build_reveal_email(recipient_alias: str, other_alias: str, other_email: str) -> str:
    """Identity reveal email — sent when both parties consent after deal closure."""
    return f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Identity Revealed &mdash; SHIELD</h2>
      <p style="color: #555; line-height: 1.6;">
        Hello {recipient_alias}, both parties have consented to reveal their identities.
      </p>
      <p style="color: #555; line-height: 1.6;">
        The identity of <strong>{other_alias}</strong> is:
      </p>
      <p style="text-align: center; margin: 20px 0;">
        <strong style="font-size: 18px; color: #6366F1;">{other_email}</strong>
      </p>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        This is a one-time reveal. This information will not be shown again.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        SHIELD &mdash; Anonymous Cybersecurity Marketplace
      </p>
    </div>
    """


def build_new_proposal_email(recipient_alias: str, vendor_alias: str, requirement_title: str, proposed_price: str, app_url: str) -> str:
    """New proposal email HTML template."""
    return f"""
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#06b6d4,#3b82f6);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">🛡️ SHIELD — New Proposal</h1>
        </div>
        <div style="padding:32px;color:#e2e8f0">
          <p>Hello <strong style="color:#22d3ee">{recipient_alias}</strong>,</p>
          <p>Vendor <strong style="color:#22d3ee">{vendor_alias}</strong> submitted a proposal for your requirement: <em>"{requirement_title}"</em>.</p>
          <p>Proposed price: <strong style="color:#34d399">${proposed_price}</strong></p>
          <a href="{app_url}/dashboard/buyer/requirements" style="display:inline-block;margin-top:16px;padding:10px 24px;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Proposals</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e293b;color:#64748b;font-size:12px">
          You received this because you have an open requirement on SHIELD.
        </div>
      </div>
    """


def build_proposal_accepted_email(vendor_alias: str, deal_id: str, app_url: str) -> str:
    """Proposal accepted email HTML template."""
    return f"""
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#10b981,#06b6d4);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">🛡️ SHIELD — Proposal Accepted!</h1>
        </div>
        <div style="padding:32px;color:#e2e8f0">
          <p>Congratulations <strong style="color:#22d3ee">{vendor_alias}</strong>,</p>
          <p>Your proposal was accepted and a deal has been created. You can now start negotiating terms in the secure chat.</p>
          <a href="{app_url}/deal/{deal_id}/chat" style="display:inline-block;margin-top:16px;padding:10px 24px;background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Open Deal Chat</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e293b;color:#64748b;font-size:12px">
          All communications remain alias-only until both parties consent to identity reveal.
        </div>
      </div>
    """


def build_deal_status_change_email(recipient_alias: str, from_status: str, to_status: str, deal_id: str, app_url: str) -> str:
    """Deal status update email HTML template."""
    return f"""
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">🛡️ SHIELD — Deal Update</h1>
        </div>
        <div style="padding:32px;color:#e2e8f0">
          <p>Hello <strong style="color:#22d3ee">{recipient_alias}</strong>,</p>
          <p>Deal status changed: <span style="color:#f87171">{from_status}</span> &rarr; <span style="color:#34d399">{to_status}</span></p>
          <a href="{app_url}/deal/{deal_id}/chat" style="display:inline-block;margin-top:16px;padding:10px 24px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Deal</a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e293b;color:#64748b;font-size:12px">
          You are receiving this notification as a participant in this deal.
        </div>
      </div>
    """
