import { Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailFrame } from "@/emails/email-frame";

type PMApprovalConfirmationEmailProps = {
  projectName: string;
  vendorName: string;
  statusText: "approved" | "rejected";
  notes?: string | null;
};

export function PMApprovalConfirmationEmail({
  projectName,
  vendorName,
  statusText,
  notes,
}: PMApprovalConfirmationEmailProps) {
  return (
    <EmailFrame
      preview={`Project Manager ${statusText} certificate for ${projectName}`}
      heading={`Project Manager ${statusText === "approved" ? "Approved" : "Rejected"} Certificate`}
      intro={`The Project Manager has ${statusText} the completion certificate for ${vendorName} under ${projectName}.`}
    >
      {notes ? (
        <Section style={{ padding: "4px 32px 24px" }}>
          <Text
            style={{
              color: "#6e5b67",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              margin: "0 0 6px",
            }}
          >
            Notes
          </Text>
          <Text
            style={{
              backgroundColor: "#f9f4ef",
              border: "1px solid #eadfd2",
              borderRadius: "14px",
              color: "#22161f",
              fontSize: "14px",
              lineHeight: "24px",
              margin: 0,
              padding: "14px 16px",
            }}
          >
            {notes}
          </Text>
        </Section>
      ) : null}
    </EmailFrame>
  );
}
