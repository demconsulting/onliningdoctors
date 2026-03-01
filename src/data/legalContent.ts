export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalDocument {
  heading: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const genericTerms: LegalDocument = {
  heading: "Terms of Service",
  lastUpdated: "February 2026",
  sections: [
    { title: "1. Acceptance of Terms", content: 'By accessing and using Onlining Doctors (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.' },
    { title: "2. Description of Service", content: "Onlining Doctors provides a healthcare platform connecting patients with medical professionals. Our services include appointment scheduling, telemedicine consultations, medical record management, and related healthcare coordination tools." },
    { title: "3. User Accounts", content: "You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account." },
    { title: "4. Medical Disclaimer", content: "The Platform facilitates connections between patients and doctors but does not provide medical advice. All medical decisions should be made in consultation with qualified healthcare professionals. In case of emergency, call your local emergency services." },
    { title: "5. Limitation of Liability", content: 'Onlining Doctors is not liable for any medical outcomes, diagnoses, or treatments resulting from the use of the Platform. The Platform is provided "as is" without warranties of any kind.' },
    { title: "6. Contact", content: "For questions about these terms, contact us at legal@onliningdoctors.com." },
  ],
};

const genericPrivacy: LegalDocument = {
  heading: "Privacy Policy",
  lastUpdated: "February 2026",
  sections: [
    { title: "1. Information We Collect", content: "We collect information you provide directly: name, email, phone, date of birth, medical history, and documents you upload. We also collect usage data such as pages visited and features used." },
    { title: "2. How We Use Your Information", content: "Your data is used to provide healthcare services, facilitate appointments, enable doctor-patient communication, improve our services, and send relevant notifications." },
    { title: "3. Data Security", content: "We use industry-standard encryption and security measures to protect your data. Medical records are stored with enterprise-grade security. Access to your medical data is restricted to you and your authorized healthcare providers." },
    { title: "4. Data Sharing", content: "We do not sell your personal data. Information is shared only with your selected healthcare providers and as required by law. Video consultations are peer-to-peer and are not recorded or stored by the Platform." },
    { title: "5. Your Rights", content: "You may access, update, or delete your personal data through your dashboard. You can request a complete export of your data or account deletion by contacting privacy@onliningdoctors.com." },
    { title: "6. Cookies", content: "We use essential cookies for authentication and session management. No third-party tracking cookies are used." },
    { title: "7. Contact", content: "For privacy inquiries, contact our Data Protection Officer at privacy@onliningdoctors.com." },
  ],
};

// South Africa — POPIA
const zaTerms: LegalDocument = {
  ...genericTerms,
  sections: [
    ...genericTerms.sections,
    { title: "7. POPIA Compliance (South Africa)", content: "This Platform complies with the Protection of Personal Information Act (POPIA), 2013. We act as a responsible party under POPIA and process personal information lawfully, in a reasonable manner, and only for the purpose for which it was collected. You have the right to request access to, correction of, or deletion of your personal information. Complaints may be lodged with the Information Regulator at inforeg.org.za." },
  ],
};

const zaPrivacy: LegalDocument = {
  ...genericPrivacy,
  sections: [
    ...genericPrivacy.sections,
    { title: "8. POPIA — Your Rights (South Africa)", content: "Under the Protection of Personal Information Act (POPIA), you have the right to: (a) be notified that your personal information is being collected; (b) request access to your personal information; (c) request correction or deletion of your personal information; (d) object to the processing of your personal information; (e) lodge a complaint with the Information Regulator. We appoint an Information Officer to handle all POPIA-related requests. Contact: privacy@onliningdoctors.com." },
  ],
};

// Nigeria — NDPR
const ngTerms: LegalDocument = {
  ...genericTerms,
  sections: [
    ...genericTerms.sections,
    { title: "7. NDPR Compliance (Nigeria)", content: "This Platform complies with the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act (NDPA) 2023. We obtain your consent before collecting personal data and process it only for legitimate purposes. You have the right to request access to your data, rectification, and deletion. We conduct Data Protection Impact Assessments as required and file annual audit reports with the Nigeria Data Protection Commission (NDPC)." },
  ],
};

const ngPrivacy: LegalDocument = {
  ...genericPrivacy,
  sections: [
    ...genericPrivacy.sections,
    { title: "8. NDPR — Your Rights (Nigeria)", content: "Under the Nigeria Data Protection Regulation (NDPR) and Nigeria Data Protection Act (NDPA), you have the right to: (a) be informed about how your data is processed; (b) access your personal data; (c) rectify inaccurate data; (d) withdraw consent at any time; (e) request erasure of your data; (f) data portability. Complaints may be filed with the Nigeria Data Protection Commission. Contact our Data Protection Officer at privacy@onliningdoctors.com." },
  ],
};

// Kenya — DPA
const keTerms: LegalDocument = {
  ...genericTerms,
  sections: [
    ...genericTerms.sections,
    { title: "7. DPA Compliance (Kenya)", content: "This Platform complies with the Kenya Data Protection Act, 2019. We process personal data in accordance with the principles of lawfulness, fairness, purpose limitation, and data minimization. We are registered with the Office of the Data Protection Commissioner (ODPC). You have the right to be informed, access your data, correct inaccuracies, and request deletion. Health data is treated as sensitive personal data with additional safeguards." },
  ],
};

const kePrivacy: LegalDocument = {
  ...genericPrivacy,
  sections: [
    ...genericPrivacy.sections,
    { title: "8. DPA — Your Rights (Kenya)", content: "Under the Kenya Data Protection Act, 2019, you have the right to: (a) be informed of the use of your personal data; (b) access your personal data held by us; (c) object to the processing of your personal data; (d) correction of false or misleading data; (e) deletion of false or misleading data. We process health data as sensitive personal data with explicit consent. Complaints may be lodged with the Office of the Data Protection Commissioner. Contact: privacy@onliningdoctors.com." },
  ],
};

const termsMap: Record<string, LegalDocument> = {
  ZA: zaTerms,
  NG: ngTerms,
  KE: keTerms,
};

const privacyMap: Record<string, LegalDocument> = {
  ZA: zaPrivacy,
  NG: ngPrivacy,
  KE: kePrivacy,
};

export function getTerms(countryCode: string | null): LegalDocument {
  return (countryCode && termsMap[countryCode]) || genericTerms;
}

export function getPrivacy(countryCode: string | null): LegalDocument {
  return (countryCode && privacyMap[countryCode]) || genericPrivacy;
}
