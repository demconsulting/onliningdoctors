export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalDocument {
  heading: string;
  lastUpdated: string;
  sections: LegalSection[];
}

// ─── Shared base sections (detailed) ────────────────────────────────────────

const baseTermsSections: LegalSection[] = [
  {
    title: "1. Acceptance of Terms",
    content:
      'By accessing, browsing, or using Onlining Doctors (the "Platform"), whether as a patient, healthcare provider, or visitor, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you must immediately discontinue use of the Platform. Your continued use after any modifications to these terms constitutes acceptance of those changes.',
  },
  {
    title: "2. Description of Service",
    content:
      "Onlining Doctors is a digital healthcare platform that connects patients with licensed medical professionals. Our services include, but are not limited to: (a) online appointment scheduling and calendar management; (b) real-time video and audio telemedicine consultations; (c) secure medical record storage and management; (d) prescription referral facilitation; (e) document sharing between patients and healthcare providers; (f) review and rating systems for quality assurance; and (g) notification and reminder services. The Platform acts as an intermediary facilitating the doctor-patient relationship and does not itself provide medical treatment, diagnosis, or prescriptions.",
  },
  {
    title: "3. Eligibility and Registration",
    content:
      "You must be at least 18 years of age to create an account. Users under 18 may only use the Platform through a parent or legal guardian's account with their supervision. When registering, you agree to: (a) provide accurate, current, and complete information; (b) maintain and promptly update your registration data; (c) maintain the security and confidentiality of your password and login credentials; (d) accept responsibility for all activities that occur under your account; (e) immediately notify us of any unauthorised use of your account. We reserve the right to suspend or terminate accounts that contain inaccurate or incomplete information.",
  },
  {
    title: "4. Healthcare Provider Verification",
    content:
      "All healthcare providers on the Platform undergo a verification process that includes validation of medical licenses, professional qualifications, and regulatory standing with relevant medical boards. However, Onlining Doctors does not guarantee the accuracy of provider credentials beyond the verification steps undertaken. Patients are encouraged to independently verify provider qualifications where possible. Healthcare providers are solely responsible for maintaining valid licenses and professional indemnity insurance throughout their use of the Platform.",
  },
  {
    title: "5. Telemedicine Consultations",
    content:
      "Telemedicine consultations conducted through the Platform are subject to the following conditions: (a) consultations are conducted via encrypted peer-to-peer video connections; (b) consultations are not recorded or stored by the Platform unless explicitly agreed upon by both parties; (c) the quality of the consultation depends on your internet connection and device capabilities; (d) telemedicine is not a substitute for in-person medical examination where physical assessment is required; (e) in emergency situations, you should contact local emergency services immediately rather than relying on the Platform; (f) healthcare providers retain clinical discretion to decline or terminate a consultation if they believe in-person care is necessary.",
  },
  {
    title: "6. Appointments and Cancellations",
    content:
      "Appointments booked through the Platform are subject to the following policies: (a) appointment confirmations are sent via email and in-app notifications; (b) cancellations must be made at least 24 hours before the scheduled appointment time to avoid cancellation fees; (c) late cancellations or no-shows may incur a fee of up to 50% of the consultation cost at the provider's discretion; (d) healthcare providers may reschedule appointments with reasonable notice; (e) repeated no-shows may result in account restrictions; (f) refunds for cancelled appointments are processed according to our refund policy and the provider's individual cancellation terms.",
  },
  {
    title: "7. Fees and Payment",
    content:
      "Consultation fees are set independently by each healthcare provider and displayed in the local currency applicable to the provider's registered practice location. By booking an appointment, you agree to pay the stated fee. Payment terms include: (a) fees are due at the time of booking unless otherwise specified; (b) all prices are inclusive of applicable taxes unless stated otherwise; (c) the Platform may charge a service fee for facilitating the consultation; (d) refunds are processed within 5–10 business days to the original payment method; (e) disputed charges must be raised within 30 days of the transaction; (f) the Platform reserves the right to modify service fees with 30 days' prior notice.",
  },
  {
    title: "8. Medical Disclaimer",
    content:
      'The Platform facilitates connections between patients and healthcare professionals but does not itself provide medical advice, diagnosis, treatment, or prescriptions. All medical information provided through the Platform, including consultation notes, is for informational purposes and does not replace professional medical advice. You should: (a) never disregard professional medical advice or delay seeking it because of information obtained through the Platform; (b) always consult a qualified healthcare professional for medical concerns; (c) call your local emergency services immediately in case of a medical emergency. The Platform does not endorse any specific tests, physicians, products, procedures, or opinions mentioned by healthcare providers.',
  },
  {
    title: "9. User Conduct",
    content:
      "You agree not to: (a) use the Platform for any unlawful purpose or in violation of these Terms; (b) impersonate any person or entity or misrepresent your affiliation; (c) upload or transmit viruses, malware, or any harmful code; (d) attempt to gain unauthorised access to any part of the Platform; (e) use the Platform to harass, abuse, or threaten other users; (f) share your account credentials with third parties; (g) use automated tools to scrape, crawl, or extract data from the Platform; (h) post false, misleading, or defamatory reviews; (i) interfere with or disrupt the Platform's infrastructure or services.",
  },
  {
    title: "10. Intellectual Property",
    content:
      "All content, trademarks, logos, software, and materials on the Platform are the property of Onlining Doctors or its licensors and are protected by intellectual property laws. You may not: (a) copy, modify, distribute, or create derivative works from any Platform content without prior written consent; (b) use our trademarks or branding without authorisation; (c) reverse-engineer or decompile any Platform software. You retain ownership of content you submit (such as reviews or documents), but grant us a non-exclusive, worldwide licence to use such content for the purposes of operating and improving the Platform.",
  },
  {
    title: "11. Limitation of Liability",
    content:
      'To the maximum extent permitted by applicable law, Onlining Doctors and its officers, directors, employees, agents, and affiliates shall not be liable for: (a) any indirect, incidental, special, consequential, or punitive damages; (b) any loss of profits, revenue, data, or business opportunities; (c) any medical outcomes, diagnoses, treatments, or prescriptions resulting from use of the Platform; (d) any interruption or cessation of Platform services; (e) any errors, inaccuracies, or omissions in content. The Platform is provided "as is" and "as available" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. Our total aggregate liability shall not exceed the amount you paid to the Platform in the 12 months preceding the claim.',
  },
  {
    title: "12. Indemnification",
    content:
      "You agree to indemnify, defend, and hold harmless Onlining Doctors, its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any third-party rights; (d) any content you submit to the Platform; (e) any medical decisions made based on consultations facilitated through the Platform.",
  },
  {
    title: "13. Termination",
    content:
      "We may suspend or terminate your account at our sole discretion, with or without notice, for conduct that we determine violates these Terms or is harmful to other users, the Platform, or third parties. Upon termination: (a) your right to access the Platform ceases immediately; (b) we may delete your account data after a retention period required by applicable law; (c) provisions that by their nature should survive termination shall remain in effect, including intellectual property, limitation of liability, and indemnification clauses. You may terminate your account at any time by contacting support@onliningdoctors.com.",
  },
  {
    title: "14. Modifications to Terms",
    content:
      "We reserve the right to modify these Terms at any time. Material changes will be communicated via email or prominent notice on the Platform at least 30 days before they take effect. Your continued use of the Platform after the effective date constitutes acceptance of the modified Terms. If you disagree with any changes, you must discontinue use of the Platform and may request account deletion.",
  },
  {
    title: "15. Dispute Resolution",
    content:
      "Any disputes arising from these Terms or your use of the Platform shall first be addressed through good-faith negotiation between the parties. If negotiation fails, disputes shall be submitted to mediation before a mutually agreed-upon mediator. If mediation is unsuccessful, the dispute shall be resolved through binding arbitration in accordance with the rules of the applicable arbitration body in the jurisdiction specified in the governing law section. Class action lawsuits and class-wide arbitrations are not permitted.",
  },
  {
    title: "16. Severability",
    content:
      "If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving its original intent.",
  },
  {
    title: "17. Contact Information",
    content:
      "For questions, concerns, or complaints about these Terms of Service, please contact us at: Email: legal@onliningdoctors.com | Support: support@onliningdoctors.com | Website: www.onliningdoctors.com. We aim to respond to all enquiries within 5 business days.",
  },
  {
    title: "18. Limitation of Services and Emergency Disclaimer",
    content:
      "Doctors Onlining provides healthcare services via telemedicine and is not intended for emergency medical conditions. The services offered are limited to non-emergency consultations only. Users agree that they will not use the platform in emergencies and will seek immediate in-person medical attention where necessary. No guarantee of diagnosis is provided without a physical examination, and users must seek in-person care when advised by a healthcare provider. The platform is not liable for any misuse in emergency situations. In an emergency, users must call 10177 (South Africa Ambulance Services) or visit their nearest emergency facility immediately. All healthcare consultations are conducted by independently licensed practitioners, and Doctors Onlining acts solely as an intermediary facilitating telemedicine connections.",
  },
];

const basePrivacySections: LegalSection[] = [
  {
    title: "1. Introduction",
    content:
      'This Privacy Policy explains how Onlining Doctors ("we", "us", "our") collects, uses, stores, shares, and protects your personal information when you use our Platform. We are committed to protecting your privacy and handling your data with transparency and in compliance with applicable data protection laws. By using the Platform, you consent to the practices described in this policy.',
  },
  {
    title: "2. Information We Collect",
    content:
      "We collect the following categories of information: (a) Identity Data — full name, date of birth, gender, government-issued ID (for provider verification); (b) Contact Data — email address, phone number, physical address, city, state/province, country; (c) Health Data — medical history, allergies, chronic conditions, current medications, blood type, height, weight, emergency contacts, and documents you upload (lab results, prescriptions, imaging reports); (d) Financial Data — payment method details, transaction history, consultation fees paid; (e) Technical Data — IP address, browser type and version, device information, operating system, time zone, session duration; (f) Usage Data — pages visited, features used, appointment history, search queries, click patterns; (g) Communication Data — messages exchanged through the Platform, consultation notes created by healthcare providers, review content.",
  },
  {
    title: "3. How We Collect Information",
    content:
      "We collect information through: (a) direct interactions — when you create an account, book an appointment, complete your medical profile, upload documents, submit reviews, or contact support; (b) automated technologies — through cookies, session tokens, server logs, and analytics tools that track your interaction with the Platform; (c) third-party sources — identity verification services for healthcare providers, payment processors for transaction data, and geolocation services for currency and legal jurisdiction determination.",
  },
  {
    title: "4. Legal Basis for Processing",
    content:
      "We process your personal data on the following legal bases: (a) Consent — you have given explicit consent for processing your health data and personal information; (b) Contract — processing is necessary to fulfil our service agreement with you (scheduling appointments, facilitating consultations); (c) Legal Obligation — processing is required to comply with healthcare regulations, tax laws, or court orders; (d) Legitimate Interest — processing is necessary for improving our services, preventing fraud, and ensuring Platform security, provided these interests do not override your fundamental rights.",
  },
  {
    title: "5. How We Use Your Information",
    content:
      "Your data is used to: (a) create and manage your account; (b) facilitate appointment booking and telemedicine consultations; (c) enable secure communication between patients and healthcare providers; (d) process payments and issue receipts; (e) send appointment reminders, confirmations, and cancellation notices; (f) display relevant healthcare providers based on your location and needs; (g) improve Platform features, performance, and user experience; (h) detect and prevent fraud, abuse, and security threats; (i) comply with legal and regulatory requirements; (j) generate anonymised, aggregated analytics for service improvement; (k) send optional marketing communications (only with your explicit consent).",
  },
  {
    title: "6. Data Sharing and Disclosure",
    content:
      "We do not sell, rent, or trade your personal data. We share information only in the following circumstances: (a) with your selected healthcare providers — to facilitate consultations, they receive your profile, medical information, and shared documents; (b) with payment processors — to process consultation fees securely; (c) with service providers — trusted third parties who assist in operating the Platform (hosting, analytics, email delivery) under strict contractual obligations; (d) with legal authorities — when required by law, court order, or to protect our legal rights; (e) in business transfers — in the event of a merger, acquisition, or asset sale, your data may be transferred with appropriate safeguards. Video consultations are conducted peer-to-peer and are not recorded, stored, or monitored by the Platform.",
  },
  {
    title: "7. Data Retention",
    content:
      "We retain your personal data for as long as necessary to fulfil the purposes for which it was collected: (a) active account data is retained for the duration of your account; (b) medical records and consultation notes are retained for a minimum period as required by applicable healthcare regulations (typically 5–10 years); (c) financial transaction records are retained for the period required by tax and accounting laws; (d) anonymised analytics data may be retained indefinitely; (e) upon account deletion, personal data is removed within 90 days, except where retention is required by law.",
  },
  {
    title: "8. Data Security",
    content:
      "We implement comprehensive security measures to protect your data: (a) encryption in transit using TLS 1.2+ for all data transmitted between your device and our servers; (b) encryption at rest for all stored personal and medical data; (c) access controls ensuring only authorised personnel can access personal data; (d) regular security audits and penetration testing; (e) secure, SOC 2-compliant cloud infrastructure; (f) role-based access control limiting data access to what is necessary for each function; (g) incident response procedures for detecting and responding to data breaches within 72 hours. While we employ industry-leading security practices, no method of electronic transmission or storage is 100% secure.",
  },
  {
    title: "9. Your Rights",
    content:
      "Subject to applicable law, you have the following rights regarding your personal data: (a) Right of Access — request a copy of the personal data we hold about you; (b) Right to Rectification — request correction of inaccurate or incomplete data; (c) Right to Erasure — request deletion of your personal data (subject to legal retention requirements); (d) Right to Restrict Processing — request that we limit how we use your data; (e) Right to Data Portability — receive your data in a structured, commonly used, machine-readable format; (f) Right to Object — object to processing based on legitimate interests or for direct marketing; (g) Right to Withdraw Consent — withdraw consent at any time without affecting the lawfulness of prior processing. To exercise any of these rights, contact privacy@onliningdoctors.com. We will respond within 30 days.",
  },
  {
    title: "10. Cookies and Tracking Technologies",
    content:
      "We use the following types of cookies: (a) Strictly Necessary Cookies — required for authentication, session management, and security (cannot be disabled); (b) Functional Cookies — remember your preferences such as language and currency settings; (c) Analytics Cookies — help us understand how the Platform is used to improve features and performance. We do not use third-party advertising or tracking cookies. You can manage cookie preferences through your browser settings, though disabling essential cookies may impair Platform functionality.",
  },
  {
    title: "11. International Data Transfers",
    content:
      "Your data may be processed in countries other than your country of residence. When we transfer data internationally, we ensure appropriate safeguards are in place, including: (a) adequacy decisions by relevant data protection authorities; (b) standard contractual clauses approved by applicable regulators; (c) binding corporate rules where applicable. We ensure that any international transfer provides a level of data protection consistent with the laws of your jurisdiction.",
  },
  {
    title: "12. Children's Privacy",
    content:
      "The Platform is not intended for use by individuals under 18 years of age without parental or guardian supervision. We do not knowingly collect personal data from children under 13. If we become aware that we have collected data from a child under 13 without parental consent, we will take steps to delete that information promptly. Parents or guardians who believe their child has provided personal data without consent should contact us at privacy@onliningdoctors.com.",
  },
  {
    title: "13. Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. Material changes will be communicated via email or a prominent notice on the Platform at least 30 days before taking effect. We encourage you to review this policy periodically. The 'Last updated' date at the top of this policy indicates when it was last revised.",
  },
  {
    title: "14. Data Protection Officer",
    content:
      "We have appointed a Data Protection Officer (DPO) to oversee compliance with this Privacy Policy and applicable data protection laws. For any privacy-related enquiries, requests, or complaints, contact our DPO at: Email: privacy@onliningdoctors.com | Subject line: 'DPO Enquiry'. We aim to respond to all enquiries within 5 business days and resolve complaints within 30 days.",
  },
];

// ─── Country-specific Terms ────────────────────────────────────────────────

const zaTerms: LegalDocument = {
  heading: "Terms of Service — South Africa",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. POPIA Compliance (South Africa)",
      content:
        "This Platform complies with the Protection of Personal Information Act, 2013 (POPIA). We act as a 'responsible party' as defined under POPIA and process personal information lawfully, in a reasonable manner, and only for the purpose for which it was collected. We have appointed an Information Officer as required by POPIA to handle all data protection matters. You have the right to: (a) be notified when your personal information is collected; (b) request access to your personal information; (c) request correction or deletion of your personal information; (d) object to the processing of your personal information; (e) lodge a complaint with the Information Regulator (inforeg.org.za). We will respond to data subject requests within 30 days as required by POPIA.",
    },
    {
      title: "19. Health Professions Act Compliance",
      content:
        "All healthcare providers on the Platform who are registered in South Africa must maintain valid registration with the Health Professions Council of South Africa (HPCSA) and comply with the Health Professions Act, 1974. Telemedicine consultations are conducted in accordance with HPCSA General Ethical Guidelines for Good Practice in Telemedicine (Booklet 10). Providers must maintain professional indemnity insurance and adhere to the ethical standards set by the HPCSA, including appropriate record-keeping and patient confidentiality obligations.",
    },
    {
      title: "20. Consumer Protection Act",
      content:
        "In accordance with the Consumer Protection Act, 2008 (CPA), you have the right to: (a) fair, honest, and reasonable terms and conditions; (b) clear and understandable language in all communications; (c) a cooling-off period of 5 business days for electronic transactions where applicable; (d) access to information in plain language; (e) protection against unfair, unreasonable, or unjust contract terms. If any provision of these Terms is found to be unfair under the CPA, it shall be severed and the remaining provisions shall continue to apply.",
    },
    {
      title: "21. Electronic Communications and Transactions Act",
      content:
        "This Platform complies with the Electronic Communications and Transactions Act, 2002 (ECTA). In accordance with ECTA: (a) electronic transactions conducted through the Platform are legally valid; (b) electronic signatures and records are admissible as evidence; (c) you have the right to cancel an electronic transaction within 7 days of receiving the service, subject to exclusions for services already rendered; (d) we provide full disclosure of our business details, including our physical address and registration information, as required by Section 43 of ECTA.",
    },
    {
      title: "22. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the South African courts. The provisions of the Consumer Protection Act, POPIA, and ECTA shall apply to the extent relevant.",
    },
  ],
};

const ngTerms: LegalDocument = {
  heading: "Terms of Service — Nigeria",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. NDPA/NDPR Compliance (Nigeria)",
      content:
        "This Platform complies with the Nigeria Data Protection Act (NDPA) 2023 and the Nigeria Data Protection Regulation (NDPR) 2019. As a data controller, we: (a) obtain lawful consent before collecting and processing personal data; (b) process personal data only for specific, legitimate purposes disclosed to you; (c) conduct Data Protection Impact Assessments (DPIAs) for high-risk processing activities including health data; (d) file annual data protection audit reports with the Nigeria Data Protection Commission (NDPC); (e) ensure adequate data protection safeguards for any cross-border transfer of personal data. You have the right to access, rectify, or delete your data and to file complaints with the NDPC.",
    },
    {
      title: "19. National Health Act Compliance",
      content:
        "Healthcare providers using the Platform in Nigeria must comply with the National Health Act, 2014 and maintain valid registration with the Medical and Dental Council of Nigeria (MDCN). The Platform facilitates telemedicine in accordance with the National Information Technology Development Agency (NITDA) guidelines and relevant health sector regulations. Providers are responsible for ensuring their telemedicine practice complies with the guidelines issued by the Federal Ministry of Health. Patient health records are treated as confidential in accordance with Section 26 of the National Health Act.",
    },
    {
      title: "20. Consumer Protection",
      content:
        "In accordance with the Federal Competition and Consumer Protection Act (FCCPA) 2018, you are entitled to: (a) fair and honest dealing in the provision of services; (b) accurate information about services and fees; (c) protection against unfair contract terms; (d) the right to lodge complaints with the Federal Competition and Consumer Protection Commission (FCCPC). We are committed to resolving consumer complaints promptly and transparently.",
    },
    {
      title: "21. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms shall be subject to the jurisdiction of Nigerian courts. The provisions of the NDPA, FCCPA, and National Health Act shall apply to the extent relevant.",
    },
  ],
};

const keTerms: LegalDocument = {
  heading: "Terms of Service — Kenya",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. Data Protection Act Compliance (Kenya)",
      content:
        "This Platform complies with the Kenya Data Protection Act, 2019 and the Data Protection (General) Regulations, 2021. We are registered as a data controller with the Office of the Data Protection Commissioner (ODPC). We process personal data in accordance with the principles of: (a) lawfulness, fairness, and transparency; (b) purpose limitation — data is collected for specified, explicit, and legitimate purposes; (c) data minimisation — we collect only what is necessary; (d) accuracy — we ensure data is kept up to date; (e) storage limitation — data is retained only as long as necessary; (f) integrity and confidentiality — appropriate security measures protect your data. Health data is classified as sensitive personal data under the Act and is processed only with your explicit consent.",
    },
    {
      title: "19. Health Act and Medical Practitioners Compliance",
      content:
        "Healthcare providers on the Platform registered in Kenya must maintain valid registration with the Kenya Medical Practitioners and Dentists Council (KMPDC) and comply with the Health Act, 2017. Telemedicine services are provided in accordance with the Kenya Health Policy and the KMPDC telemedicine guidelines. Providers must maintain professional indemnity cover and ensure that all consultations meet the standards of care required by Kenyan medical regulations. The Platform supports compliance with the Health Records and Information Managers' requirements for proper record-keeping.",
    },
    {
      title: "20. Consumer Protection Act",
      content:
        "In accordance with the Consumer Protection Act, 2012, you are entitled to: (a) protection against unfair trade practices; (b) clear disclosure of the total cost of services before purchase; (c) fair contract terms that are not unconscionable; (d) the right to redress for any losses incurred due to defective services. Complaints may be directed to the Kenya Consumer Protection Advisory Committee.",
    },
    {
      title: "21. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the Republic of Kenya. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of Kenyan courts. The provisions of the Data Protection Act, Health Act, and Consumer Protection Act shall apply to the extent relevant.",
    },
  ],
};

const ghTerms: LegalDocument = {
  heading: "Terms of Service — Ghana",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. Data Protection Act Compliance (Ghana)",
      content:
        "This Platform complies with the Data Protection Act, 2012 (Act 843) of Ghana. We are registered as a data controller with the Data Protection Commission (DPC). We process personal data in accordance with the principles of accountability, lawfulness, consent, and purpose specification as outlined in the Act. You have the right to: (a) access your personal data; (b) request correction of inaccurate data; (c) object to processing that causes unwarranted damage or distress; (d) prevent processing for direct marketing; (e) lodge a complaint with the Data Protection Commission. Health data is treated as sensitive personal data requiring explicit consent.",
    },
    {
      title: "19. Health Service Regulatory Authority",
      content:
        "Healthcare providers on the Platform registered in Ghana must maintain valid registration with the Medical and Dental Council of Ghana (MDC) and comply with the Health Professions Regulatory Bodies Act, 2013 (Act 857). Providers must adhere to the ethical standards and guidelines issued by the MDC, including those governing telemedicine practice. The Platform supports compliance with the Health Service Regulatory Authority standards for quality healthcare delivery.",
    },
    {
      title: "20. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes shall be subject to the exclusive jurisdiction of Ghanaian courts.",
    },
  ],
};

const tzTerms: LegalDocument = {
  heading: "Terms of Service — Tanzania",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. Personal Data Protection (Tanzania)",
      content:
        "This Platform operates in accordance with the Personal Data Protection Act of Tanzania and the Electronic and Postal Communications Act (EPOCA). We process personal data with your consent and ensure that data is collected for specified and lawful purposes. You have the right to access, correct, and request deletion of your personal data. We implement appropriate technical and organisational measures to protect personal data against unauthorised access, alteration, or destruction.",
    },
    {
      title: "19. Medical Council Compliance",
      content:
        "Healthcare providers registered in Tanzania must maintain valid registration with the Medical Council of Tanganyika (MCT) or the Zanzibar Medical Council and comply with the Medical Practitioners and Dentists Act. All providers must adhere to the ethical standards and professional conduct requirements set by the relevant council. The Platform facilitates telemedicine consultations in accordance with applicable Tanzanian health sector regulations.",
    },
    {
      title: "20. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the United Republic of Tanzania. Disputes shall be subject to the jurisdiction of Tanzanian courts.",
    },
  ],
};

const ugTerms: LegalDocument = {
  heading: "Terms of Service — Uganda",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. Data Protection and Privacy Act Compliance (Uganda)",
      content:
        "This Platform complies with the Data Protection and Privacy Act, 2019 of Uganda. We are registered with the Personal Data Protection Office (PDPO) as a data collector and processor. We process personal data in accordance with the principles of: (a) accountability; (b) lawful processing; (c) adequate, relevant, and not excessive collection; (d) accuracy and currency of data; (e) appropriate storage limitation; (f) adequate security safeguards. Health data is classified as special personal data requiring explicit consent. You have the right to access, correct, delete, and object to the processing of your personal data. Complaints may be filed with the PDPO.",
    },
    {
      title: "19. Uganda Medical and Dental Practitioners Council",
      content:
        "Healthcare providers registered in Uganda must maintain valid registration with the Uganda Medical and Dental Practitioners Council (UMDPC) and comply with the Medical and Dental Practitioners Act. Providers must maintain professional ethics as defined by the UMDPC and hold appropriate professional indemnity coverage. The Platform facilitates telemedicine in accordance with the guidelines issued by the Ministry of Health of Uganda.",
    },
    {
      title: "20. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the Republic of Uganda. Disputes shall be subject to the exclusive jurisdiction of Ugandan courts.",
    },
  ],
};

const egTerms: LegalDocument = {
  heading: "Terms of Service — Egypt",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. Personal Data Protection Law Compliance (Egypt)",
      content:
        "This Platform complies with the Egyptian Personal Data Protection Law No. 151 of 2020 and its Executive Regulations. We process personal data only with your explicit consent and for the purposes disclosed to you. As a data controller, we: (a) register with the Data Protection Center; (b) appoint a Data Protection Officer; (c) implement appropriate technical and organisational security measures; (d) conduct impact assessments for processing sensitive data including health information; (e) notify the Data Protection Center and affected individuals in the event of a data breach. You have the right to access, correct, restrict, and delete your personal data, and to lodge complaints with the Data Protection Center.",
    },
    {
      title: "19. Egyptian Medical Syndicate Compliance",
      content:
        "Healthcare providers registered in Egypt must maintain valid membership with the Egyptian Medical Syndicate and comply with the Medical Practice Law. Telemedicine services are provided in accordance with the regulations issued by the Ministry of Health and Population and the Supreme Council of Universities for medical faculties. Providers must maintain professional liability insurance and adhere to the ethical code of conduct established by the Egyptian Medical Syndicate.",
    },
    {
      title: "20. Consumer Protection Law",
      content:
        "In accordance with the Egyptian Consumer Protection Law No. 181 of 2018, you are entitled to: (a) accurate information about services and their prices; (b) protection from deceptive or misleading practices; (c) the right to return or cancel electronic services within 14 days where applicable; (d) the right to lodge complaints with the Consumer Protection Agency (CPA).",
    },
    {
      title: "21. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the Arab Republic of Egypt. Disputes shall be resolved under the jurisdiction of Egyptian courts.",
    },
  ],
};

const etTerms: LegalDocument = {
  heading: "Terms of Service — Ethiopia",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. Data Protection (Ethiopia)",
      content:
        "This Platform operates in accordance with the Ethiopian Personal Data Protection Proclamation and applicable privacy provisions under the FDRE Constitution (Article 26 — Right to Privacy). We collect and process personal data only with your consent and for specified, lawful purposes. Health data is treated as sensitive personal data requiring explicit consent and additional safeguards. You have the right to access, correct, and request deletion of your personal data.",
    },
    {
      title: "19. Food, Medicine and Healthcare Administration Authority",
      content:
        "Healthcare providers on the Platform registered in Ethiopia must comply with the regulations of the Ethiopian Food, Medicine and Healthcare Administration and Control Authority (EFMHACA) and maintain valid medical licenses. Providers must adhere to the medical ethics guidelines and professional standards established by the Ethiopian Medical Association and the Ministry of Health.",
    },
    {
      title: "20. Governing Law",
      content:
        "These Terms are governed by the laws of the Federal Democratic Republic of Ethiopia. Disputes shall be resolved under the jurisdiction of Ethiopian courts.",
    },
  ],
};

const rwTerms: LegalDocument = {
  heading: "Terms of Service — Rwanda",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. Data Protection (Rwanda)",
      content:
        "This Platform complies with the Law N° 058/2021 Relating to the Protection of Personal Data and Privacy in Rwanda. We are registered with the National Cyber Security Authority (NCSA) as required. We process personal data lawfully, fairly, and transparently. Health data is classified as sensitive personal data and is processed only with your explicit consent. You have the right to: (a) be informed about data processing; (b) access your personal data; (c) request rectification or erasure; (d) restrict or object to processing; (e) data portability; (f) lodge complaints with the NCSA. We report data breaches to the NCSA within 72 hours as required by law.",
    },
    {
      title: "19. Rwanda Medical and Dental Council",
      content:
        "Healthcare providers registered in Rwanda must maintain valid registration with the Rwanda Medical and Dental Council (RMDC) and comply with the Law Governing Medical, Dental, and Paramedical Professions. Providers must adhere to the professional ethics code and maintain professional indemnity insurance. The Platform facilitates telemedicine in accordance with Rwanda's Digital Health Strategy and guidelines issued by the Ministry of Health.",
    },
    {
      title: "20. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the Republic of Rwanda. Disputes shall be resolved under the jurisdiction of Rwandan courts.",
    },
  ],
};

const usTerms: LegalDocument = {
  heading: "Terms of Service — United States",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. HIPAA Compliance (United States)",
      content:
        "This Platform is designed to comply with the Health Insurance Portability and Accountability Act (HIPAA) of 1996 and the HITECH Act. We implement administrative, physical, and technical safeguards to protect Protected Health Information (PHI) as required by the HIPAA Security Rule. We enter into Business Associate Agreements (BAAs) with all third-party service providers who handle PHI. You have the right under HIPAA to: (a) access your health records; (b) request amendments to your health information; (c) receive an accounting of disclosures of your PHI; (d) request restrictions on certain uses and disclosures; (e) receive confidential communications; (f) file complaints with the U.S. Department of Health and Human Services Office for Civil Rights (OCR). We do not use or disclose PHI for marketing purposes without your written authorisation.",
    },
    {
      title: "19. State Telemedicine Laws",
      content:
        "Telemedicine consultations through the Platform are subject to applicable state laws and regulations. Healthcare providers must: (a) be licensed in the state where the patient is located at the time of the consultation; (b) comply with the telemedicine practice standards of the relevant state medical board; (c) establish an appropriate provider-patient relationship before prescribing medications; (d) comply with state-specific informed consent requirements for telemedicine. The Platform does not guarantee that all services are available in all states. Certain states may have restrictions on prescribing controlled substances via telemedicine.",
    },
    {
      title: "20. FTC Act and Consumer Protection",
      content:
        "In accordance with the Federal Trade Commission (FTC) Act and applicable state consumer protection laws: (a) all service descriptions and pricing are presented accurately and without deception; (b) endorsements and reviews reflect honest opinions of actual users; (c) we comply with the CAN-SPAM Act for any commercial email communications; (d) we provide clear and conspicuous disclosures of material terms. We also comply with the Children's Online Privacy Protection Act (COPPA) for users under 13.",
    },
    {
      title: "21. Governing Law",
      content:
        "These Terms are governed by the federal laws of the United States of America and, where applicable, the laws of the State of Delaware. Any disputes shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) in accordance with its Commercial Arbitration Rules. You waive any right to participate in a class-action lawsuit or class-wide arbitration.",
    },
  ],
};

const gbTerms: LegalDocument = {
  heading: "Terms of Service — United Kingdom",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. UK GDPR and Data Protection Act 2018 Compliance",
      content:
        "This Platform complies with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. We are registered with the Information Commissioner's Office (ICO) as a data controller. We process personal data in accordance with the data protection principles: lawfulness, fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity, confidentiality, and accountability. Health data is classified as 'special category data' under Article 9 of the UK GDPR and is processed only with your explicit consent. You have the right to: (a) access your personal data (Subject Access Request); (b) rectification; (c) erasure ('right to be forgotten'); (d) restrict processing; (e) data portability; (f) object to processing; (g) not be subject to automated decision-making. We respond to data subject requests within one calendar month. You may lodge complaints with the ICO at ico.org.uk.",
    },
    {
      title: "19. Care Quality Commission and GMC Compliance",
      content:
        "Healthcare providers registered in the United Kingdom must maintain valid registration with the General Medical Council (GMC) and, where applicable, be registered with the Care Quality Commission (CQC). Telemedicine consultations must comply with GMC guidance on 'Good Medical Practice' and the 'Remote Consultations and Prescribing' guidance. Providers must: (a) maintain valid medical indemnity or professional liability insurance; (b) adhere to the GMC's ethical standards; (c) ensure patient safety in remote consultations; (d) comply with CQC registration requirements if providing regulated activities. The Platform supports compliance with NHS Digital standards for interoperability and data security.",
    },
    {
      title: "20. Consumer Rights Act 2015",
      content:
        "In accordance with the Consumer Rights Act 2015 and the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013: (a) services will be provided with reasonable care and skill; (b) you have a 14-day cooling-off period for distance contracts, except where services have been fully performed with your prior consent; (c) pricing is transparent with no hidden charges; (d) you have the right to a remedy if services do not meet the statutory standards.",
    },
    {
      title: "21. Governing Law",
      content:
        "These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales, without prejudice to your right to bring proceedings in your country of residence as provided by the Consumer Rights Act 2015.",
    },
  ],
};

const inTerms: LegalDocument = {
  heading: "Terms of Service — India",
  lastUpdated: "March 2026",
  sections: [
    ...baseTermsSections,
    {
      title: "18. Digital Personal Data Protection Act Compliance (India)",
      content:
        "This Platform complies with the Digital Personal Data Protection Act, 2023 (DPDPA). As a 'Data Fiduciary' under the Act, we: (a) process personal data only for lawful purposes with your consent; (b) provide clear notice about data collection and processing in plain language; (c) implement reasonable security safeguards to prevent data breaches; (d) notify the Data Protection Board of India and affected individuals in the event of a data breach; (e) retain personal data only for as long as necessary for the stated purpose. You have the right to: (a) access information about your data processing; (b) correction and erasure of data; (c) grievance redressal; (d) nominate a person to exercise your rights. Health data is treated as sensitive personal data with additional protections. You may lodge complaints with the Data Protection Board of India.",
    },
    {
      title: "19. Telemedicine Practice Guidelines",
      content:
        "Healthcare providers on the Platform registered in India must comply with the Telemedicine Practice Guidelines 2020 issued by the Board of Governors of the Medical Council of India (in supersession of the Indian Medical Council). These guidelines mandate: (a) registered medical practitioners must hold valid registration with the National Medical Commission (NMC) or relevant State Medical Council; (b) informed consent must be obtained and documented; (c) prescriptions via telemedicine must follow the guidelines on first consultation vs follow-up; (d) Schedule X drugs and narcotics cannot be prescribed via telemedicine; (e) providers must maintain records of teleconsultations for a minimum of 3 years. The Platform supports compliance with the Information Technology Act, 2000 and its applicable rules for electronic health records.",
    },
    {
      title: "20. Consumer Protection Act 2019",
      content:
        "In accordance with the Consumer Protection Act, 2019, and the Consumer Protection (E-Commerce) Rules, 2020: (a) all services and pricing are described accurately; (b) you are entitled to seek redressal for deficiency in service through the consumer dispute redressal forums; (c) no unfair trade practices are employed; (d) grievance redressal mechanisms are in place and complaints are acknowledged within 48 hours. Complaints may be filed with the District, State, or National Consumer Disputes Redressal Commission as appropriate.",
    },
    {
      title: "21. Governing Law",
      content:
        "These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi, India, subject to your right to approach consumer forums as per the Consumer Protection Act, 2019.",
    },
  ],
};

// ─── Country-specific Privacy ─────────────────────────────────────────────

const zaPrivacy: LegalDocument = {
  heading: "Privacy Policy — South Africa",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. POPIA — Your Rights (South Africa)",
      content:
        "Under the Protection of Personal Information Act (POPIA), 2013, as a data subject in South Africa you have the right to: (a) be notified that your personal information is being collected and the purpose thereof; (b) request access to your personal information held by us; (c) request correction or deletion of inaccurate, irrelevant, excessive, out of date, or misleading personal information; (d) object to the processing of your personal information on reasonable grounds; (e) object to processing for purposes of direct marketing; (f) not be subject to a decision based solely on automated processing; (g) lodge a complaint with the Information Regulator (inforeg.org.za). We have appointed an Information Officer as required by POPIA. Contact our Information Officer at privacy@onliningdoctors.com. Requests will be processed within 30 days.",
    },
  ],
};

const ngPrivacy: LegalDocument = {
  heading: "Privacy Policy — Nigeria",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. NDPA/NDPR — Your Rights (Nigeria)",
      content:
        "Under the Nigeria Data Protection Act (NDPA) 2023 and the Nigeria Data Protection Regulation (NDPR) 2019, you have the right to: (a) be informed about how your personal data is collected and used; (b) access your personal data held by us; (c) rectify inaccurate personal data; (d) withdraw your consent at any time; (e) request erasure of your personal data; (f) data portability — receive your data in a structured, commonly used format; (g) object to processing; (h) not be subject to decisions based solely on automated processing. We conduct annual Data Protection Compliance Audits as required by the NDPC. Complaints may be filed with the Nigeria Data Protection Commission. Contact our Data Protection Officer at privacy@onliningdoctors.com.",
    },
  ],
};

const kePrivacy: LegalDocument = {
  heading: "Privacy Policy — Kenya",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. DPA — Your Rights (Kenya)",
      content:
        "Under the Kenya Data Protection Act, 2019, you have the right to: (a) be informed of the use of your personal data including what data is collected, the purpose, and third parties with whom it is shared; (b) access your personal data held by us free of charge; (c) object to the processing of your personal data; (d) correction of false or misleading data; (e) deletion of false, misleading, or unlawfully obtained data; (f) data portability; (g) not be subject to automated decision-making without safeguards. We process health data as sensitive personal data with your explicit consent and under the additional safeguards required by the Act. Complaints may be lodged with the Office of the Data Protection Commissioner (ODPC). Contact: privacy@onliningdoctors.com.",
    },
  ],
};

const ghPrivacy: LegalDocument = {
  heading: "Privacy Policy — Ghana",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. Data Protection Act — Your Rights (Ghana)",
      content:
        "Under the Data Protection Act, 2012 (Act 843), you have the right to: (a) access your personal data; (b) request correction of inaccurate data; (c) object to processing that causes unwarranted damage or distress; (d) prevent processing for direct marketing; (e) compensation for damage caused by contravention of the Act; (f) lodge a complaint with the Data Protection Commission. Health data is treated as sensitive data under the Act. Contact: privacy@onliningdoctors.com.",
    },
  ],
};

const tzPrivacy: LegalDocument = {
  heading: "Privacy Policy — Tanzania",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. Data Protection — Your Rights (Tanzania)",
      content:
        "Under the Personal Data Protection Act and the Electronic and Postal Communications Act (EPOCA), you have the right to access, correct, and request deletion of your personal data. We process data with your consent and implement appropriate technical safeguards. Complaints regarding data handling may be directed to the Tanzania Communications Regulatory Authority (TCRA). Contact: privacy@onliningdoctors.com.",
    },
  ],
};

const ugPrivacy: LegalDocument = {
  heading: "Privacy Policy — Uganda",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. Data Protection and Privacy Act — Your Rights (Uganda)",
      content:
        "Under the Data Protection and Privacy Act, 2019 of Uganda, you have the right to: (a) access your personal data; (b) request correction of inaccurate data; (c) request deletion of data no longer needed; (d) object to processing; (e) not be subject to automated decisions. Health data is classified as special personal data with enhanced protections. Complaints may be filed with the Personal Data Protection Office (PDPO). Contact: privacy@onliningdoctors.com.",
    },
  ],
};

const egPrivacy: LegalDocument = {
  heading: "Privacy Policy — Egypt",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. Personal Data Protection Law — Your Rights (Egypt)",
      content:
        "Under the Egyptian Personal Data Protection Law No. 151 of 2020, you have the right to: (a) be informed about data processing activities; (b) access your personal data; (c) request correction of inaccurate data; (d) request restriction of processing; (e) request deletion or anonymisation of data; (f) object to processing; (g) data portability; (h) withdraw consent at any time; (i) lodge complaints with the Data Protection Center. Health data is classified as sensitive and requires explicit consent. Contact: privacy@onliningdoctors.com.",
    },
  ],
};

const etPrivacy: LegalDocument = {
  heading: "Privacy Policy — Ethiopia",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. Data Protection — Your Rights (Ethiopia)",
      content:
        "Under the FDRE Constitution (Article 26 — Right to Privacy) and the Personal Data Protection Proclamation, you have the right to privacy and access to your personal data. Health data receives enhanced protections as sensitive personal data. You may request access, correction, or deletion of your personal data. Contact: privacy@onliningdoctors.com.",
    },
  ],
};

const rwPrivacy: LegalDocument = {
  heading: "Privacy Policy — Rwanda",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. Data Protection Law — Your Rights (Rwanda)",
      content:
        "Under Law N° 058/2021 Relating to the Protection of Personal Data and Privacy, you have the right to: (a) be informed about data processing; (b) access your personal data; (c) request rectification or erasure; (d) restrict processing; (e) object to processing; (f) data portability; (g) lodge a complaint with the National Cyber Security Authority (NCSA). Health data is classified as sensitive personal data requiring explicit consent. We report breaches to the NCSA within 72 hours. Contact: privacy@onliningdoctors.com.",
    },
  ],
};

const usPrivacy: LegalDocument = {
  heading: "Privacy Policy — United States",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. HIPAA — Your Rights (United States)",
      content:
        "Under the Health Insurance Portability and Accountability Act (HIPAA), you have the following rights regarding your Protected Health Information (PHI): (a) Right to Access — obtain a copy of your medical records and health information; (b) Right to Amend — request corrections to your health records; (c) Right to an Accounting of Disclosures — receive a list of instances where your PHI was shared; (d) Right to Request Restrictions — ask us to limit certain uses or disclosures; (e) Right to Confidential Communications — request that we communicate with you through specific channels; (f) Right to a Paper Copy — obtain a paper copy of this privacy notice. You may file complaints with the U.S. Department of Health and Human Services Office for Civil Rights (OCR) if you believe your privacy rights have been violated.",
    },
    {
      title: "16. State Privacy Laws (United States)",
      content:
        "Depending on your state of residence, you may have additional privacy rights: (a) California (CCPA/CPRA) — right to know, delete, opt out of sale/sharing, and non-discrimination; (b) Virginia (VCDPA) — right to access, correct, delete, portability, and opt out of targeted advertising; (c) Colorado (CPA) — similar rights to Virginia with a 60-day cure period; (d) Connecticut, Utah, and other states with privacy laws — we comply with all applicable state privacy regulations. To exercise state-specific rights, contact privacy@onliningdoctors.com with your state of residence.",
    },
  ],
};

const gbPrivacy: LegalDocument = {
  heading: "Privacy Policy — United Kingdom",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. UK GDPR — Your Rights (United Kingdom)",
      content:
        "Under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, you have the right to: (a) access your personal data via a Subject Access Request (SAR) — free of charge, responded to within one calendar month; (b) rectification of inaccurate personal data; (c) erasure ('right to be forgotten') where data is no longer necessary; (d) restriction of processing in certain circumstances; (e) data portability in a structured, commonly used, machine-readable format; (f) object to processing based on legitimate interests or for direct marketing; (g) not be subject to automated decision-making including profiling; (h) withdraw consent at any time. Health data is 'special category data' under Article 9 and is processed only with your explicit consent. You may lodge complaints with the Information Commissioner's Office (ICO) at ico.org.uk. Contact our DPO at privacy@onliningdoctors.com.",
    },
  ],
};

const inPrivacy: LegalDocument = {
  heading: "Privacy Policy — India",
  lastUpdated: "March 2026",
  sections: [
    ...basePrivacySections,
    {
      title: "15. DPDPA — Your Rights (India)",
      content:
        "Under the Digital Personal Data Protection Act, 2023 (DPDPA), as a 'Data Principal' you have the right to: (a) access information about your personal data processing; (b) correction and erasure of your personal data; (c) grievance redressal — we have appointed a Grievance Officer to address your complaints within 30 days; (d) nominate a person to exercise your rights in the event of your death or incapacity. You also have duties as a Data Principal including providing accurate information and not filing false complaints. Health data is treated as sensitive personal data with additional protections. We process data only with your verifiable consent. You may lodge complaints with the Data Protection Board of India. Contact our Grievance Officer at privacy@onliningdoctors.com.",
    },
  ],
};

// ─── Maps ─────────────────────────────────────────────────────────────────

const termsMap: Record<string, LegalDocument> = {
  ZA: zaTerms,
  NG: ngTerms,
  KE: keTerms,
  GH: ghTerms,
  TZ: tzTerms,
  UG: ugTerms,
  EG: egTerms,
  ET: etTerms,
  RW: rwTerms,
  US: usTerms,
  GB: gbTerms,
  IN: inTerms,
};

const privacyMap: Record<string, LegalDocument> = {
  ZA: zaPrivacy,
  NG: ngPrivacy,
  KE: kePrivacy,
  GH: ghPrivacy,
  TZ: tzPrivacy,
  UG: ugPrivacy,
  EG: egPrivacy,
  ET: etPrivacy,
  RW: rwPrivacy,
  US: usPrivacy,
  GB: gbPrivacy,
  IN: inPrivacy,
};

const genericTerms: LegalDocument = {
  heading: "Terms of Service",
  lastUpdated: "March 2026",
  sections: baseTermsSections,
};

const genericPrivacy: LegalDocument = {
  heading: "Privacy Policy",
  lastUpdated: "March 2026",
  sections: basePrivacySections,
};

export function getTerms(countryCode: string | null): LegalDocument {
  return (countryCode && termsMap[countryCode]) || genericTerms;
}

export function getPrivacy(countryCode: string | null): LegalDocument {
  return (countryCode && privacyMap[countryCode]) || genericPrivacy;
}
