import { Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailFrame } from "@/emails/email-frame";

type CertificateIssuedEmailProps = {
  projectName: string;
  vendorName: string;
  certificateCode: string;
  verificationUrl: string;
};

export function CertificateIssuedEmail({
  projectName,
  vendorName,
  certificateCode,
  verificationUrl,
}: CertificateIssuedEmailProps) {
  return (
    <EmailFrame
      preview={`Completion certificate issued for ${projectName}`}
      heading="Completion Certificate Issued"
      intro={`The final completion certificate for ${vendorName} under ${projectName} has been issued and attached to this email.`}
      actionLabel="Verify Certificate"
      actionUrl={verificationUrl}
    >
      <Section style={{ padding: "4px 32px 24px" }}>
        <Text style={labelStyle}>Certificate Code</Text>
        <Text style={valueStyle}>{certificateCode}</Text>
        <Text style={labelStyle}>Project</Text>
        <Text style={valueStyle}>{projectName}</Text>
        <Text style={labelStyle}>Vendor</Text>
        <Text style={valueStyle}>{vendorName}</Text>
      </Section>
    </EmailFrame>
  );
}

const labelStyle = {
  color: "#6e5b67",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  margin: "12px 0 4px",
  textTransform: "uppercase" as const,
};

const valueStyle = {
  color: "#22161f",
  fontSize: "15px",
  lineHeight: "24px",
  margin: 0,
};
