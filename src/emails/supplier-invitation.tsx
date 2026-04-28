import { Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailFrame } from "@/emails/email-frame";

export type SupplierInvitationEmailProps = {
  preview: string;
  heading: string;
  intro: string;
  registrationUrl: string;
  companyName?: string | null;
  contactName?: string | null;
  suggestedCategory?: string | null;
  customMessage?: string | null;
};

export function SupplierInvitationEmail({
  preview,
  heading,
  intro,
  registrationUrl,
  companyName,
  contactName,
  suggestedCategory,
  customMessage,
}: SupplierInvitationEmailProps) {
  return (
    <EmailFrame
      preview={preview}
      heading={heading}
      intro={intro}
      actionLabel="Open Registration Form"
      actionUrl={registrationUrl}
    >
      <Section style={{ padding: "4px 32px 12px" }}>
        {companyName ? (
          <Field label="Company" value={companyName} />
        ) : null}
        {contactName ? (
          <Field label="Contact" value={contactName} />
        ) : null}
        {suggestedCategory ? (
          <Field label="Suggested Category" value={suggestedCategory} />
        ) : null}

        {customMessage ? (
          <Section
            style={{
              marginTop: "14px",
              padding: "16px 18px",
              borderRadius: "16px",
              backgroundColor: "#f8f2ea",
              border: "1px solid #eadfd6",
            }}
          >
            <Text style={labelStyle}>Message</Text>
            <Text style={messageStyle}>{customMessage}</Text>
          </Section>
        ) : null}

        <Text style={noteStyle}>
          Registration does not guarantee approval, purchase orders, contracts,
          or awards.
        </Text>
      </Section>
    </EmailFrame>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </>
  );
}

const labelStyle = {
  color: "#6e5b67",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  margin: "12px 0 4px",
};

const valueStyle = {
  color: "#22161f",
  fontSize: "15px",
  lineHeight: "24px",
  margin: 0,
};

const messageStyle = {
  color: "#22161f",
  fontSize: "14px",
  lineHeight: "22px",
  margin: 0,
};

const noteStyle = {
  color: "#6e5b67",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "16px 0 0",
};
