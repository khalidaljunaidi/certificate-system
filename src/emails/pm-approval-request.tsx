import { Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailFrame } from "@/emails/email-frame";

type PMApprovalRequestEmailProps = {
  projectName: string;
  vendorName: string;
  poNumber: string;
  contractNumber?: string | null;
  approvalUrl: string;
};

export function PMApprovalRequestEmail({
  projectName,
  vendorName,
  poNumber,
  contractNumber,
  approvalUrl,
}: PMApprovalRequestEmailProps) {
  return (
    <EmailFrame
      preview={`Approval required for ${projectName}`}
      heading="Completion Certificate Approval Required"
      intro={`A completion certificate is ready for your review and approval for ${vendorName} under ${projectName}.`}
      actionLabel="Review and Approve"
      actionUrl={approvalUrl}
    >
      <Section style={{ padding: "4px 32px 16px" }}>
        <Text style={metaLabel}>Project</Text>
        <Text style={metaValue}>{projectName}</Text>
        <Text style={metaLabel}>Vendor</Text>
        <Text style={metaValue}>{vendorName}</Text>
        <Text style={metaLabel}>PO Reference</Text>
        <Text style={metaValue}>{poNumber}</Text>
        {contractNumber ? (
          <>
            <Text style={metaLabel}>Contract Reference</Text>
            <Text style={metaValue}>{contractNumber}</Text>
          </>
        ) : null}
      </Section>
    </EmailFrame>
  );
}

const metaLabel = {
  color: "#6e5b67",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  margin: "12px 0 4px",
};

const metaValue = {
  color: "#22161f",
  fontSize: "15px",
  lineHeight: "24px",
  margin: 0,
};
