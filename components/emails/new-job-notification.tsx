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

interface NewJobNotificationEmailProps {
  studentName: string;
  jobTitle: string;
  companyName: string;
  jobType: string;
  location: string;
  salary: string;
  jobUrl: string;
}

const NewJobNotificationEmail = ({
  studentName,
  jobTitle,
  companyName,
  jobType,
  location,
  salary,
  jobUrl,
}: NewJobNotificationEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body className="bg-gray-100 font-sans py-[40px]">
          <Container className="bg-white rounded-[8px] shadow-sm max-w-[600px] mx-auto p-[40px]">
            {/* Header */}
            <Section className="text-center mb-[32px]">
              <Text className="text-[24px] font-bold text-gray-900 m-0">
                New Job Opportunity!
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="mb-[32px]">
              <Text className="text-[16px] text-gray-700 leading-[24px] mb-[16px]">
                Hi {studentName},
              </Text>
              <Text className="text-[16px] text-gray-700 leading-[24px] mb-[16px]">
                Great news! A new job opportunity matching your profile has been posted on GitHired.
              </Text>
            </Section>

            {/* Job Details Box */}
            <Section className="bg-blue-50 border border-blue-200 rounded-[8px] p-[24px] mb-[24px]">
              <Text className="text-[20px] font-bold text-gray-900 m-0 mb-[12px]">
                {jobTitle}
              </Text>
              <Text className="text-[16px] text-gray-700 mb-[8px] m-0">
                <strong>Company:</strong> {companyName}
              </Text>
              <Text className="text-[16px] text-gray-700 mb-[8px] m-0">
                <strong>Type:</strong> {jobType}
              </Text>
              <Text className="text-[16px] text-gray-700 mb-[8px] m-0">
                <strong>Location:</strong> {location}
              </Text>
              <Text className="text-[16px] text-gray-700 mb-[0] m-0">
                <strong>Salary:</strong> {salary}
              </Text>
            </Section>

            {/* CTA Button */}
            <Section className="text-center mb-[32px]">
              <Button
                href={jobUrl}
                className="bg-blue-600 text-white px-[32px] py-[12px] rounded-[6px] text-[16px] font-semibold no-underline box-border hover:bg-blue-700"
              >
                View Job & Apply
              </Button>
            </Section>

            {/* Additional Info */}
            <Section className="mb-[32px]">
              <Text className="text-[14px] text-gray-600 leading-[20px] mb-[8px]">
                You're receiving this email because you match the eligibility criteria for this position. 
                Don't miss out on this opportunity!
              </Text>
              <Text className="text-[14px] text-gray-600 leading-[20px]">
                Apply early to increase your chances of being noticed by the recruiter.
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

export default NewJobNotificationEmail;

