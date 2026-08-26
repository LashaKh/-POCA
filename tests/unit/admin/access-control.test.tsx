import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/[locale]/admin/settings/staff/actions", () => ({
  inviteStaffAction: vi.fn(async () => undefined),
  manageStaffAction: vi.fn(async () => undefined),
  revokeStaffSessionsAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/audit/actions", () => ({
  requestAuditExportAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/privacy/admin-actions", () => ({
  requestPrivacyAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/auth/actions", () => ({
  signOutAllSessionsAction: vi.fn(async () => undefined),
  signOutAction: vi.fn(async () => undefined),
  signOutOtherSessionsAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/auth/mfa-actions", () => ({
  enrollMfaAction: vi.fn(async () => undefined),
  verifyMfaAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/auth/recovery-actions", () => ({
  requestRecoveryAction: vi.fn(async () => undefined),
  updateRecoveredPasswordAction: vi.fn(async () => undefined),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { DangerConfirmation } from "@/components/admin/security/danger-confirmation";
import { AuditExplorer } from "@/components/admin/audit/audit-explorer";
import { IntegrationStatus } from "@/components/admin/settings/integration-status";
import { PrivacyWorkspace } from "@/components/admin/settings/privacy-workspace";
import { StaffManagement } from "@/components/admin/settings/staff-management";
import { MfaWorkspace } from "@/components/auth/mfa-workspace";
import { RecoveryForm } from "@/components/auth/recovery-form";
import { SessionMenu } from "@/components/auth/session-menu";

describe("administration access-control UI", () => {
  it("requires the exact protected phrase and a recorded reason", () => {
    render(
      <DangerConfirmation
        phrase="STAFF DEACTIVATE fixture"
        impact="Access ends now."
        alternative="Revoke sessions first."
      />,
    );
    expect(screen.getByLabelText(/STAFF DEACTIVATE fixture/)).toHaveAttribute(
      "pattern",
      "STAFF DEACTIVATE fixture",
    );
    expect(screen.getByLabelText(/Reason/)).toBeRequired();
    expect(screen.getByText(/Reversible alternative/)).toBeInTheDocument();
  });

  it("shows integration state without rendering a credential value", () => {
    render(
      <IntegrationStatus
        integrations={[
          {
            key: "payment",
            mode: "live",
            capabilities: ["create-payment", "status"],
            safe_reason: null,
            secret_configured: true,
            last_checked_at: null,
            updated_at: null,
          },
        ]}
      />,
    );
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Credential stored: yes")).toBeInTheDocument();
    expect(screen.queryByText(/sb_secret/i)).not.toBeInTheDocument();
  });

  it("shows role, assurance, devices, and scoped sign-out controls", () => {
    render(
      <SessionMenu
        locale="en"
        context={{
          kind: "staff",
          profileId: "owner",
          assuranceLevel: "aal2",
          sessionState: "active",
          role: "owner",
          active: true,
        }}
        sessions={[
          {
            auth_session_id: "one",
            device_label: "Safari on Mac",
            assurance_level: "aal2",
            last_seen_at: "2026-08-25T10:00:00Z",
            revoked_at: null,
          },
          {
            auth_session_id: "two",
            device_label: "Firefox on Linux",
            assurance_level: "aal1",
            last_seen_at: "2026-08-24T10:00:00Z",
            revoked_at: null,
          },
        ]}
      />,
    );
    expect(screen.getByText("owner · AAL2")).toBeInTheDocument();
    expect(screen.getByText(/Safari on Mac/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out other sessions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out this session" }),
    ).toBeInTheDocument();
  });

  it("renders first-factor verification and generic recovery without account disclosure", () => {
    const { rerender } = render(
      <MfaWorkspace
        locale="en"
        returnTo="/admin"
        verifiedFactorIds={["91000000-0000-4000-8000-000000000001"]}
        labels={{
          title: "Verify Owner",
          body: "Use authenticator",
          enroll: "Enroll",
          scan: "Scan",
          manual: "Manual",
          code: "Six-digit code",
          verify: "Verify",
          failed: "Failed",
        }}
      />,
    );
    expect(screen.getByLabelText("Six-digit code")).toHaveAttribute(
      "autocomplete",
      "one-time-code",
    );
    rerender(
      <RecoveryForm
        locale="en"
        update={false}
        labels={{
          email: "Account email",
          password: "New password",
          confirmation: "Confirm password",
          submit: "Send secure link",
          generic: "If eligible, a link was sent.",
          failed: "Invalid recovery",
        }}
      />,
    );
    expect(screen.getByLabelText("Account email")).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Send secure link" }),
    ).toBeInTheDocument();
  });

  it("renders Owner staff lifecycle, audit export, and privacy request controls", () => {
    const profileId = "91000000-0000-4000-8000-000000000003";
    const { rerender } = render(
      <StaffManagement
        locale="en"
        staff={[
          {
            profile_id: profileId,
            role: "manager",
            active: true,
            mfa_required: false,
            version: 1,
            deactivated_at: null,
            profiles: { display_name: "Fixture Manager" },
          },
        ]}
        invitations={[]}
      />,
    );
    expect(screen.getByText("Fixture Manager")).toBeInTheDocument();
    expect(screen.getByText("Deactivate access")).toBeInTheDocument();

    rerender(
      <AuditExplorer
        locale="en"
        data={{
          rows: [],
          page: 1,
          pageCount: 1,
          filters: {
            query: "",
            action: "",
            result: "",
            correlationId: "",
          },
          exports: [],
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Request safe CSV" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/10,000 safe audit rows/)).toBeInTheDocument();

    rerender(
      <PrivacyWorkspace
        locale="en"
        profiles={[
          {
            id: profileId,
            display_name: "Fixture Customer",
            profile_kind: "customer",
          },
        ]}
        requests={[]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Record request" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Retention schedule")).toBeInTheDocument();
  });
});
