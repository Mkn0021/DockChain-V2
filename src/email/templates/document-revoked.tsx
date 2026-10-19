import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface DocumentRevokedProps {
  recipientName: string;
  issuerName: string;
  documentId: string;
  reason: string;
  verifyUrl: string;
}

export const DocumentRevokedEmail = ({
  recipientName,
  issuerName,
  documentId,
  reason,
  verifyUrl,
}: DocumentRevokedProps) => (
  <Html>
    <Head />
    <Preview>Your document from {issuerName} has been revoked</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Document revoked</Heading>
        <Text style={text}>Hello {recipientName},</Text>
        <Text style={text}>
          {issuerName} has revoked a document previously issued to you.
        </Text>
        <Text style={text}>
          <strong>Reason:</strong> {reason}
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Document ID: {documentId}</Text>
        <Text style={footer}>
          You can confirm the revocation status at {verifyUrl}.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: "#f6f9fc", fontFamily: "Arial, sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "20px 0 48px",
};
const h1 = {
  color: "#a00",
  fontSize: "24px",
  fontWeight: "600" as const,
  margin: "30px 0",
};
const text = { color: "#1d1d1f", fontSize: "16px", lineHeight: "26px" };
const hr = { borderColor: "#e6e6e6", margin: "32px 0" };
const footer = { color: "#6b6b6b", fontSize: "12px", lineHeight: "20px" };

export default DocumentRevokedEmail;
