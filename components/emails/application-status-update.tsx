import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

interface ApplicationStatusUpdateEmailProps {
  studentName: string;
  jobTitle: string;
  companyName: string;
  status: string;
  jobUrl: string;
}

const getStatusMessage = (status: string) => {
  const messages: Record<string, { subject: string; heading: string; message: string; color: string }> = {
    oa: {
      subject: "Online Assessment Sent",
      heading: "📝 Online Assessment Ready",
      message: "Great news! The company has sent you an online assessment. Please check your email for the assessment link and complete it as soon as possible.",
      color: "#2563eb", // blue
    },
    interview: {
      subject: "Interview Scheduled",
      heading: "🎤 Interview Invitation",
      message: "Congratulations! The company would like to schedule an interview with you. They will contact you shortly with the interview details.",
      color: "#9333ea", // purple
    },
    selected: {
      subject: "You've Been Selected!",
      heading: "🎉 Congratulations!",
      message: "Fantastic news! You have been selected for this position. The company will reach out to you with the next steps and offer details.",
      color: "#16a34a", // green
    },
    rejected: {
      subject: "Application Update",
      heading: "Application Status Update",
      message: "Thank you for your interest in this position. Unfortunately, we've decided to move forward with other candidates at this time. Don't be discouraged - keep applying to other opportunities!",
      color: "#dc2626", // red
    },
  };

  return messages[status] || messages.rejected;
};

const ApplicationStatusUpdateEmail = ({
  studentName,
  jobTitle,
  companyName,
  status,
  jobUrl,
}: ApplicationStatusUpdateEmailProps) => {
  const statusInfo = getStatusMessage(status);

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body className="bg-gray-100 font-sans py-[40px]">
          <Container className="bg-white rounded-[8px] shadow-sm max-w-[600px] mx-auto p-[40px]">
            {/* Header */}
            <Section className="text-center mb-[32px]">
              <Text className="text-[24px] font-bold text-gray-900 m-0">
                {statusInfo.heading}
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="mb-[32px]">
              <Text className="text-[16px] text-gray-700 leading-[24px] mb-[16px]">
                Hi {studentName},
              </Text>
              <Text className="text-[16px] text-gray-700 leading-[24px] mb-[16px]">
                {statusInfo.message}
              </Text>
            </Section>

            {/* Job Details Box */}
            <Section 
              className="border rounded-[8px] p-[24px] mb-[24px]"
              style={{ borderColor: statusInfo.color, backgroundColor: `${statusInfo.color}10` }}
            >
              <Text className="text-[20px] font-bold text-gray-900 m-0 mb-[12px]">
                {jobTitle}
              </Text>
              <Text className="text-[16px] text-gray-700 mb-0 m-0">
                <strong>Company:</strong> {companyName}
              </Text>
            </Section>

            {/* CTA Button */}
            {status !== "rejected" && (
              <Section className="text-center mb-[32px]">
                <Button
                  href={jobUrl}
                  className="text-white px-[32px] py-[12px] rounded-[6px] text-[16px] font-semibold no-underline box-border"
                  style={{ backgroundColor: statusInfo.color }}
                >
                  View Application Details
                </Button>
              </Section>
            )}

            {/* Additional Info */}
            <Section className="mb-[32px]">
              <Text className="text-[14px] text-gray-600 leading-[20px]">
                {status === "selected" && "We're excited to have you on board! Keep an eye on your email for next steps."}
                {status === "interview" && "Make sure to prepare well for your interview. Good luck!"}
                {status === "oa" && "Complete the assessment at your earliest convenience. This is an important step in the selection process."}
                {status === "rejected" && "Remember, every application is a learning experience. Keep applying and stay positive!"}
              </Text>
            </Section>

            <Hr className="border-gray-200 my-[24px]" />

            {/* Footer */}
            <Section className="border-t border-gray-200 pt-[24px]">
              <Text className="text-[12px] text-gray-500 leading-[16px] m-0 mb-[8px]">
                This email was sent by GitHired
              </Text>
              <Text className="text-[12px] text-gray-500 leading-[16px] m-0">
                © {new Date().getFullYear()} GitHired. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ApplicationStatusUpdateEmail;
export { getStatusMessage };

