import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface DocumentIssuedProps {
  recipientName: string;
  issuerName: string;
  documentId: string;
  verifyUrl: string;
}

export const DocumentIssuedEmail = ({
  recipientName,
  issuerName,
  documentId,
  verifyUrl,
}: DocumentIssuedProps) => (
  <Html>
    <Head />
    <Preview>Your document from {issuerName} is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your document is ready</Heading>
        <Text style={text}>Hello {recipientName},</Text>
        <Text style={text}>
          {issuerName} has issued a document to you. The PDF and proof bundle
          are attached to this email.
        </Text>
        <Section style={buttonContainer}>
          <Button href={verifyUrl} style={button}>
            Verify this document
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>Document ID: {documentId}</Text>
        <Text style={footer}>
          You can verify the authenticity of this document at any time using the
          link above or by scanning the QR code in the PDF.
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
  color: "#1d1d1f",
  fontSize: "24px",
  fontWeight: "600" as const,
  margin: "30px 0",
};
const text = { color: "#1d1d1f", fontSize: "16px", lineHeight: "26px" };
const buttonContainer = { margin: "32px 0", textAlign: "center" as const };
const button = {
  backgroundColor: "#1d1d1f",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};
const hr = { borderColor: "#e6e6e6", margin: "32px 0" };
const footer = { color: "#6b6b6b", fontSize: "12px", lineHeight: "20px" };

export default DocumentIssuedEmail;
