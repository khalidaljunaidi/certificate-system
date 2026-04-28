import { Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailFrame } from "@/emails/email-frame";

type WorkflowUpdateEmailProps = {
  preview: string;
  heading: string;
  intro: string;
  rows?: Array<{
    label: string;
    value: string | null | undefined;
  }>;
  actionLabel?: string;
  actionUrl?: string;
};

export function WorkflowUpdateEmail({
  preview,
  heading,
  intro,
  rows = [],
  actionLabel,
  actionUrl,
}: WorkflowUpdateEmailProps) {
  const visibleRows = rows.filter((row) => row.value);

  return (
    <EmailFrame
      preview={preview}
      heading={heading}
      intro={intro}
      actionLabel={actionLabel}
      actionUrl={actionUrl}
    >
      {visibleRows.length > 0 ? (
        <Section style={{ padding: "4px 32px 24px" }}>
          {visibleRows.map((row) => (
            <React.Fragment key={`${row.label}-${row.value}`}>
              <Text style={labelStyle}>{row.label}</Text>
              <Text style={valueStyle}>{row.value}</Text>
            </React.Fragment>
          ))}
        </Section>
      ) : null}
    </EmailFrame>
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
