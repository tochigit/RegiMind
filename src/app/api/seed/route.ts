import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST() {
  try {
    // Idempotent: check if organization exists, delete and reseed
    const existingOrg = await db.organization.findFirst({
      where: { name: 'MedDevice Corp' },
    });

    if (existingOrg) {
      // Delete in correct order due to foreign keys
      await db.task.deleteMany({ where: { organizationId: existingOrg.id } });
      await db.impactAssessment.deleteMany({ where: { organizationId: existingOrg.id } });
      await db.regulation.deleteMany({ where: { organizationId: existingOrg.id } });
      await db.internalDocument.deleteMany({ where: { organizationId: existingOrg.id } });
      await db.user.deleteMany({ where: { organizationId: existingOrg.id } });
      await db.organization.delete({ where: { id: existingOrg.id } });
    }

    // Create Organization
    const org = await db.organization.create({
      data: {
        name: 'MedDevice Corp',
        description: 'A leading medical device manufacturer specializing in surgical robotics and diagnostic imaging equipment.',
      },
    });

    // Create Team Members
    function subtractDays(days: number): Date {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    }

    const teamMembers = [
      { email: 'sarah.chen@meddevice.com', name: 'Sarah Chen', role: 'admin', createdAt: subtractDays(365) },
      { email: 'marcus.rivera@meddevice.com', name: 'Marcus Rivera', role: 'manager', createdAt: subtractDays(290) },
      { email: 'priya.patel@meddevice.com', name: 'Priya Patel', role: 'manager', createdAt: subtractDays(210) },
      { email: 'james.okonkwo@meddevice.com', name: 'James Okonkwo', role: 'manager', createdAt: subtractDays(150) },
      { email: 'emilia.kowalski@meddevice.com', name: 'Emilia Kowalski', role: 'viewer', createdAt: subtractDays(90) },
      { email: 'kenji.tanaka@meddevice.com', name: 'Kenji Tanaka', role: 'viewer', createdAt: subtractDays(45) },
    ];

    for (const member of teamMembers) {
      await db.user.create({
        data: {
          email: member.email,
          name: member.name,
          role: member.role,
          organizationId: org.id,
          createdAt: member.createdAt,
        },
      });
    }

    // Create Regulations
    const regulations = [
      {
        title: '21 CFR Part 820 - Quality System Regulation Amendment',
        source: 'FDA',
        region: 'US',
        status: 'new',
        effectiveDate: addDays(45),
        publishedDate: new Date(),
        rawText: `The Food and Drug Administration (FDA) is issuing a final rule amending the current good manufacturing practice (CGMP) requirements for medical devices. This amendment incorporates by reference the Quality Management System Regulation (QMSR) harmonized with ISO 13485:2016. The rule modernizes the quality system framework to align with international standards while maintaining existing patient safety protections.

Key changes include revised requirements for design controls, process validation, and corrective and preventive action (CAPA). Manufacturers must now document risk-based approaches to quality management activities and establish procedures for managing changes throughout the product lifecycle. The amended regulation also introduces enhanced requirements for supplier management and traceability.

The rule affects all establishments that manufacture medical devices intended for commercial distribution in the United States. Manufacturers must achieve compliance with the updated requirements by the effective date. The FDA expects this harmonization to reduce regulatory burden on manufacturers who also serve international markets while strengthening the overall quality management framework for domestic device manufacturing.`,
        aiSummary: 'FDA has amended 21 CFR Part 820 to harmonize with ISO 13485:2016 QMS standards. Major changes affect design controls, process validation, CAPA, supplier management, and risk-based quality management. All US medical device manufacturers must update their QMS documentation and processes to comply with the new requirements. This alignment with international standards is expected to reduce dual-compliance burden while strengthening quality management practices.',
        deltaJson: JSON.stringify([
          {
            section: '§820.20 Quality System',
            previous: 'Each manufacturer shall establish and maintain a quality system that is appropriate for the specific medical device(s) designed or manufactured.',
            updated: 'Each manufacturer shall establish, implement, and maintain a quality system appropriate for the specific medical device(s) designed or manufactured, incorporating a risk-based approach to quality management activities throughout the product lifecycle.',
            impact: 'Requires documented risk-based methodology for all QMS activities and lifecycle management procedures.'
          },
          {
            section: '§820.30 Design Controls',
            previous: 'Design control procedures shall include verification and validation of the design.',
            updated: 'Design control procedures shall include verification, validation, and design transfer activities, with documented risk assessments at each design phase and defined acceptance criteria.',
            impact: 'Design control procedures must be expanded to include formal risk assessments at each phase and design transfer documentation.'
          },
          {
            section: '§820.70 Production and Process Controls',
            previous: 'Each manufacturer shall develop, conduct, control, and monitor production processes.',
            updated: 'Each manufacturer shall develop, conduct, control, and monitor production processes using validated methods, with ongoing process performance monitoring and risk-based process controls.',
            impact: 'Production processes require continuous monitoring with risk-based controls and documented performance metrics.'
          }
        ]),
        needsReview: false,
        organizationId: org.id,
      },
      {
        title: 'EU MDR Article 10(8) - Post-Market Surveillance Updates',
        source: 'EU',
        region: 'EU',
        status: 'new',
        effectiveDate: addDays(60),
        publishedDate: new Date(),
        rawText: `The European Commission has published updated guidance on post-market surveillance (PMS) requirements under Article 10(8) of the EU Medical Device Regulation (MDR) 2017/745. This update strengthens the obligations of manufacturers to continuously monitor the safety and performance of their devices throughout their entire lifecycle.

The updated requirements mandate that manufacturers establish comprehensive PMS systems that include systematic collection of clinical data, analysis of field safety corrective actions, and periodic safety update reports. Manufacturers must demonstrate that their PMS plan includes specific triggers for re-evaluation of risk-benefit profiles, including post-market clinical follow-up (PMCF) data integration and analysis of equivalent device data from the literature.

The guidance introduces new requirements for PMS data sources, requiring manufacturers to actively collect data from multiple channels including registries, published literature, user feedback, complaint handling systems, and vigilance reporting. The PMS evaluation report frequency has been updated, with class IIb and III devices requiring more frequent updates. Manufacturers must also establish procedures for trending and pattern recognition in PMS data to identify potential safety signals earlier in the product lifecycle.`,
        aiSummary: 'The EU has updated Article 10(8) of the MDR with enhanced post-market surveillance requirements. Key changes include mandatory systematic clinical data collection, updated PMS evaluation report frequencies for class IIb/III devices, expanded data source requirements, and new procedures for safety signal detection through trending and pattern recognition. Manufacturers must update their PMS plans and procedures to address these enhanced obligations.',
        deltaJson: JSON.stringify([
          {
            section: 'Article 10(8) PMS Plan Requirements',
            previous: 'Manufacturers shall establish a PMS plan that is proportionate to the risk class and intended purpose of the device.',
            updated: 'Manufacturers shall establish a comprehensive PMS plan that includes systematic clinical data collection procedures, defined data sources covering registries, literature, and user feedback, specific triggers for risk-benefit re-evaluation, and documented procedures for trending and pattern recognition.',
            impact: 'PMS plans must be significantly expanded with detailed clinical data collection procedures and safety signal detection methodology.'
          },
          {
            section: 'PMS Evaluation Report Frequency',
            previous: 'PMS evaluation reports shall be updated at least annually for class IIb and III devices.',
            updated: 'PMS evaluation reports shall be updated at least annually for class IIb devices and semi-annually for class III devices, with additional updates required when significant new safety information becomes available.',
            impact: 'Class III devices now require semi-annual PMS evaluation reports instead of annual, increasing documentation workload.'
          },
          {
            section: 'Post-Market Clinical Follow-up (PMCF)',
            previous: 'PMCF shall be conducted as part of the PMS plan where appropriate.',
            updated: 'PMCF shall be conducted for all class IIa, IIb, and III devices, with documented methodology, data collection protocols, and integration of PMCF findings into the clinical evaluation process.',
            impact: 'PMCF is now mandatory for class IIa devices in addition to higher risk classes, requiring expanded clinical follow-up programs.'
          }
        ]),
        needsReview: false,
        organizationId: org.id,
      },
      {
        title: 'ISO 14971:2024 - Risk Management Revision',
        source: 'ISO',
        region: 'International',
        status: 'new',
        effectiveDate: addDays(90),
        publishedDate: new Date(),
        rawText: `The International Organization for Standardization has published the revised edition of ISO 14971, Medical devices — Application of risk management to medical devices. This fourth edition introduces significant updates to the risk management framework that all medical device manufacturers must adopt to demonstrate conformity with applicable regulatory requirements.

The revised standard emphasizes a lifecycle approach to risk management, integrating risk management activities from initial concept through post-market surveillance. Key changes include updated risk estimation methodologies, revised acceptability criteria frameworks, and enhanced requirements for residual risk evaluation. The standard now provides more detailed guidance on the use of benefit-risk analysis as part of the overall risk evaluation process.

Additional changes address the integration of risk management with quality management systems, cybersecurity risk considerations for connected medical devices, and the documentation of risk management process outputs. The revised standard also clarifies the relationship between risk management files and technical documentation required under regulatory frameworks such as the EU MDR and FDA QMSR. Manufacturers must ensure their risk management procedures and documentation templates are updated to reflect these changes, and existing risk management files should be reviewed for completeness against the new requirements.`,
        aiSummary: 'ISO 14971:2024 introduces a revised risk management framework emphasizing lifecycle integration, updated risk estimation methods, enhanced benefit-risk analysis requirements, and cybersecurity risk considerations for connected devices. The standard strengthens the link between risk management and QMS documentation. Manufacturers must update risk management procedures, templates, and review existing risk management files for compliance with the new edition.',
        deltaJson: JSON.stringify([
          {
            section: 'Clause 5 - Risk Analysis',
            previous: 'The manufacturer shall identify hazards and hazardous situations associated with the medical device.',
            updated: 'The manufacturer shall systematically identify hazards and hazardous situations throughout the entire product lifecycle, including cybersecurity threats for connected devices, and document the methodology used for identification including the expertise and data sources utilized.',
            impact: 'Risk analysis must now explicitly cover cybersecurity threats and require documented methodology with expertise qualifications.'
          },
          {
            section: 'Clause 6 - Risk Evaluation',
            previous: 'The manufacturer shall evaluate risks using defined acceptability criteria.',
            updated: 'The manufacturer shall evaluate individual risks and overall residual risk using defined acceptability criteria, with documented benefit-risk analysis that considers both individual patient benefit and public health impact. The evaluation shall include stakeholders in the acceptance decision process.',
            impact: 'Risk evaluation now requires structured benefit-risk analysis considering both individual and public health dimensions with stakeholder input.'
          },
          {
            section: 'Clause 7 - Risk Control',
            previous: 'Risk control measures shall be implemented in order of priority.',
            updated: 'Risk control measures shall be implemented using the three-option approach with documented justification, and effectiveness of each measure shall be verified through validation activities. Cumulative risk from multiple control measures shall be assessed.',
            impact: 'Risk control verification requirements are strengthened, with mandatory validation of control measure effectiveness and cumulative risk assessment.'
          }
        ]),
        needsReview: false,
        organizationId: org.id,
      },
      {
        title: 'FDA Guidance on Cybersecurity for Medical Devices',
        source: 'FDA',
        region: 'US',
        status: 'new',
        effectiveDate: addDays(30),
        publishedDate: new Date(),
        rawText: `The FDA has issued updated guidance on the cybersecurity of medical devices, establishing new premarket and post-market requirements for devices that contain software or are connected to networks. This guidance reflects the growing recognition of cybersecurity as a critical component of medical device safety and effectiveness.

The guidance establishes a comprehensive cybersecurity framework requiring manufacturers to implement a "Secure Product Development Framework" (SPDF) aligned with recognized standards such as IEC 62443 and NIST frameworks. Manufacturers must conduct threat modeling and risk assessments during the design phase, implement secure coding practices, and establish vulnerability management programs. The guidance specifies requirements for device labeling including cybersecurity information, known vulnerabilities, and software bill of materials (SBOM) provisions.

Post-market requirements include mandatory vulnerability disclosure policies, coordinated disclosure procedures, and defined timelines for addressing identified vulnerabilities based on severity. The guidance introduces the concept of "reasonable assurance" of cybersecurity, requiring manufacturers to demonstrate that they have processes in place to maintain device security throughout the product lifecycle. Connected devices must support security updates and patches, and manufacturers must communicate cyber risks and available mitigations to end users through defined channels.`,
        aiSummary: 'FDA has published updated cybersecurity guidance requiring a Secure Product Development Framework (SPDF) aligned with IEC 62443 and NIST standards. Requirements include threat modeling during design, secure coding practices, SBOM disclosure, vulnerability management programs, and defined timelines for vulnerability remediation. Post-market requirements mandate vulnerability disclosure policies and security update capabilities for connected devices.',
        deltaJson: JSON.stringify([
          {
            section: 'Secure Product Development Framework',
            previous: 'Manufacturers should consider cybersecurity in the design of medical devices.',
            updated: 'Manufacturers shall implement a Secure Product Development Framework (SPDF) aligned with IEC 62443-4-1, incorporating threat modeling, secure coding practices, static and dynamic analysis, and penetration testing as part of the design control process.',
            impact: 'Cybersecurity development practices must be formalized into a documented SPDF with specific security testing activities integrated into design controls.'
          },
          {
            section: 'Software Bill of Materials (SBOM)',
            previous: 'Device labeling should include relevant software information.',
            updated: 'Manufacturers shall provide a Software Bill of Materials (SBOM) in a machine-readable format, listing all software components including open-source libraries, with version information and known vulnerability status for each component.',
            impact: 'SBOM generation and maintenance is now required for all software-containing devices, necessitating component tracking systems.'
          },
          {
            section: 'Post-Market Vulnerability Management',
            previous: 'Manufacturers should address cybersecurity vulnerabilities when identified.',
            updated: 'Manufacturers shall establish a vulnerability management program with defined severity-based response timelines: critical vulnerabilities within 30 days, high within 60 days, medium within 90 days. A coordinated disclosure policy and user notification procedures are mandatory.',
            impact: 'Formal vulnerability response timelines require dedicated security operations processes and communication procedures.'
          }
        ]),
        needsReview: false,
        organizationId: org.id,
      },
      {
        title: 'EU MDR Annex I - General Safety Requirements Update',
        source: 'EU',
        region: 'EU',
        status: 'new',
        effectiveDate: addDays(120),
        publishedDate: new Date(),
        rawText: `The European Commission has adopted implementing acts updating Annex I of the EU Medical Device Regulation (MDR) 2017/745, which sets out the general safety and performance requirements (GSPR) for medical devices. This update addresses gaps identified during the transition period and incorporates lessons learned from market surveillance activities.

The updated GSPRs introduce enhanced requirements for clinical evidence, requiring manufacturers to demonstrate clinical performance through well-designed clinical investigations or systematic literature reviews with documented equivalence assessments. New provisions address the characterization of materials coming into contact with human tissues, including requirements for nanomaterials and substances of concern. The update also strengthens requirements for usability engineering, requiring documented human factors validation studies for devices with significant user interaction.

Additional updates address the interoperability of medical devices within health IT systems, requiring standardized data exchange formats and protocols. The updated requirements also place greater emphasis on environmental considerations, including the disposal of devices containing hazardous substances and the recyclability of device components. Manufacturers must conduct a comprehensive review of their technical documentation to ensure alignment with the updated GSPRs and update their declarations of conformity accordingly.`,
        aiSummary: 'EU MDR Annex I has been updated with enhanced general safety and performance requirements. Key changes include strengthened clinical evidence requirements, new provisions for material characterization including nanomaterials, enhanced usability engineering with mandatory human factors validation, interoperability standards for health IT systems, and environmental considerations for device disposal. Manufacturers must review and update technical documentation and declarations of conformity.',
        deltaJson: JSON.stringify([
          {
            section: 'GSPR 1 - Clinical Evidence',
            previous: 'Clinical evidence shall be based on clinical data adequate to demonstrate the safety and performance of the device.',
            updated: 'Clinical evidence shall demonstrate both safety and clinical performance through well-designed clinical investigations, systematic literature reviews with documented equivalence, or a combination thereof. Real-world evidence may supplement but not replace clinical investigation data for implantable and class III devices.',
            impact: 'Clinical evidence requirements are strengthened, limiting reliance on equivalence alone for high-risk devices and requiring documented investigation design.'
          },
          {
            section: 'GSPR 10 - Material Characterization',
            previous: 'Materials coming into contact with tissues shall be characterized for biocompatibility.',
            updated: 'Materials coming into contact with tissues shall be characterized for biocompatibility, including specific requirements for nanomaterials, substances of carcinogenic, mutagenic, or toxic to reproduction (CMR) categories, and endocrine-disrupting properties. Full chemical characterization shall be performed and documented.',
            impact: 'Material characterization must now explicitly address nanomaterials, CMR substances, and endocrine disruptors with full chemical characterization.'
          },
          {
            section: 'GSPR 12 - Usability Engineering',
            previous: 'Devices shall be designed to minimize user errors.',
            updated: 'Devices shall undergo documented usability engineering processes including formative evaluations and summative human factors validation studies. Results shall demonstrate that intended users can safely and effectively use the device for its intended purpose under expected use conditions.',
            impact: 'Human factors validation studies are now explicitly required with documented summative evaluations, expanding usability testing requirements.'
          }
        ]),
        needsReview: false,
        organizationId: org.id,
      },
    ];

    for (const reg of regulations) {
      await db.regulation.create({ data: reg });
    }

    // Create Internal Documents
    const documents = [
      {
        title: 'SOP-QMS-001: Quality Management System Procedure',
        docType: 'SOP',
        fileName: 'SOP-QMS-001-v3.1.pdf',
        scope: 'QMS',
        clause: 'ISO 13485',
        version: '3.1',
        status: 'active',
        fileContent: `This Standard Operating Procedure establishes the requirements for the MedDevice Corp Quality Management System (QMS) in accordance with ISO 13485:2016 and 21 CFR Part 820. The QMS encompasses all activities that influence the ability of the organization to provide medical devices and related services that meet customer and regulatory requirements.

Quality Manual: The Quality Manual serves as the top-level document of the QMS and describes the scope of the quality management system, the justification for any exclusions, and references to supporting procedures. The Quality Manual is reviewed annually by the Management Review Board and updated as necessary to reflect changes in the organizational structure, regulatory requirements, or business processes.

Document Control: All QMS documents are controlled through the document management system. Document creation, review, approval, distribution, and change control follow the procedures defined in SOP-QMS-002. Controlled documents are identified by document number, revision level, and effective date. Obsolete documents are removed from the point of use and archived with appropriate retention periods.

Management Responsibility: Senior management provides evidence of its commitment to the development and implementation of the QMS and continually improves its effectiveness through management reviews conducted at planned intervals. Quality objectives are established at relevant functions and levels within the organization, measured through key performance indicators, and reviewed during management reviews.

Resource Management: The organization determines and provides the resources needed to implement and maintain the QMS and continually improve its effectiveness. This includes human resources, infrastructure, work environment, and support services. Personnel performing work affecting product quality are qualified on the basis of education, training, skills, and experience, with training records maintained for all personnel involved in quality-related activities.`,
        organizationId: org.id,
      },
      {
        title: 'SOP-RM-023: Risk Management Procedure',
        docType: 'SOP',
        fileName: 'SOP-RM-023-v2.4.pdf',
        scope: 'Risk Management',
        clause: 'ISO 14971',
        version: '2.4',
        status: 'active',
        fileContent: `This Standard Operating Procedure defines the process for identifying, analyzing, evaluating, and controlling risks associated with medical devices throughout their entire lifecycle, in accordance with ISO 14971:2019 and applicable regulatory requirements.

Risk Analysis: Risk analysis begins during the initial concept phase and continues throughout the product lifecycle. Hazards are identified using systematic techniques including preliminary hazard analysis (PHA), failure mode and effects analysis (FMEA), fault tree analysis (FTA), and hazard and operability studies (HAZOP). For each identified hazard, the foreseeable sequences of events that could lead to hazardous situations are documented, along with the possible harm that could result.

Risk Estimation: For each hazardous situation, the severity of potential harm and the probability of occurrence are estimated using the risk estimation matrix defined in this procedure. Severity is categorized as Negligible, Minor, Serious, Critical, or Catastrophic. Probability of occurrence considers factors including the frequency of the hazardous situation, the probability of the harm occurring, and the possibility of preventing or limiting the harm.

Risk Evaluation: Each estimated risk is compared against the risk acceptability criteria defined by the organization. Risks are classified as acceptable, ALARP (as low as reasonably practicable), or unacceptable. Unacceptable risks require mandatory risk reduction before proceeding. ALARP risks require documented justification for acceptance. Risk evaluation is performed by the cross-functional risk management team with input from clinical and engineering subject matter experts.

Risk Control: Risk control measures are implemented using the three-option approach in order of priority: inherent safety by design, protective measures in the device or manufacturing process, and information for safety. The effectiveness of each risk control measure is verified through appropriate validation activities. Residual risk is evaluated after implementation of all risk control measures and documented in the risk management file.`,
        organizationId: org.id,
      },
      {
        title: 'QM-001: Quality Manual v4.2',
        docType: 'Quality Manual',
        fileName: 'QM-001-v4.2.pdf',
        scope: 'Quality Management',
        clause: 'ISO 13485',
        version: '4.2',
        status: 'active',
        fileContent: `This Quality Manual describes the MedDevice Corp Quality Management System and establishes the policies and objectives for achieving and maintaining regulatory compliance and product quality. The manual applies to all medical devices designed, manufactured, and distributed by MedDevice Corp.

Quality Policy: MedDevice Corp is committed to providing safe and effective medical devices that meet or exceed customer expectations and regulatory requirements. The organization continually improves the effectiveness of the quality management system through data-driven decision making, employee engagement, and investment in quality infrastructure. All employees are responsible for the quality of their work and are empowered to identify and report quality concerns.

Scope and Applicability: This Quality Manual covers the design, development, manufacturing, packaging, labeling, storage, distribution, and post-market support of surgical robotic systems, diagnostic imaging equipment, and associated accessories. The QMS complies with ISO 13485:2016, 21 CFR Part 820, and applicable EU MDR requirements. Exclusions from ISO 13485 are documented and justified in the exclusions register.

Process Approach: The QMS is organized around key business processes including Design and Development, Purchasing and Supplier Management, Production and Process Control, Inspection and Testing, Installation and Servicing, Customer Feedback and Complaint Handling, and Corrective and Preventive Action. Process owners are identified for each key process, and process performance is monitored through defined metrics and key performance indicators.

Management Review: Executive management conducts formal reviews of the QMS at least annually. Reviews cover audit results, customer feedback, process performance and product conformity, status of corrective and preventive actions, follow-up actions from previous management reviews, changes that could affect the QMS, and recommendations for improvement. Management review outputs include decisions and actions related to improvement of the QMS, product improvement, and resource needs.`,
        organizationId: org.id,
      },
      {
        title: 'RPT-PMS-005: Post-Market Surveillance Report',
        docType: 'Report',
        fileName: 'RPT-PMS-005-2024.pdf',
        scope: 'Post-Market Surveillance',
        clause: 'EU MDR Art. 10',
        version: '1.0',
        status: 'active',
        fileContent: `This Post-Market Surveillance (PMS) Report summarizes the activities and findings from the PMS program for MedDevice Corp surgical robotic systems during the reporting period. The report is prepared in accordance with EU MDR Article 10(8) and the organization's PMS plan.

PMS Data Collection: During the reporting period, data was collected from multiple sources including complaint handling systems (47 complaints received), vigilance reports (3 field safety notices issued), clinical literature review (128 publications screened), post-market clinical follow-up studies (2 ongoing PMCF studies), customer satisfaction surveys (survey response rate 42%), and service and maintenance records (1,247 service events documented). All data was entered into the electronic PMS database for trending and analysis.

Safety Signal Analysis: Trending analysis of PMS data identified two potential safety signals requiring further investigation. The first signal related to an increased rate of instrument calibration drift in robotic arm assemblies, with 12 events reported compared to the baseline rate of 4 events per reporting period. The second signal concerned reports of delayed system startup times in specific software configurations. Both signals were investigated by the cross-functional safety review team and corrective actions were initiated.

Benefit-Risk Evaluation: The overall benefit-risk profile for the surgical robotic systems remains favorable based on analysis of PMS data. Clinical outcomes data from PMCF studies demonstrates continued clinical benefit with a favorable safety profile. The risk-benefit ratio was re-evaluated in light of the identified safety signals and remains acceptable pending completion of corrective actions.

Conclusions and Recommendations: The PMS program continues to effectively monitor device safety and performance. Recommended actions include completion of the investigation into calibration drift trend, implementation of a software update to address startup time issues, and enhancement of the PMS data collection methodology to include automated device usage analytics.`,
        organizationId: org.id,
      },
      {
        title: 'SOP-CS-010: Cybersecurity Management Procedure',
        docType: 'SOP',
        fileName: 'SOP-CS-010-v1.3.pdf',
        scope: 'Cybersecurity',
        clause: 'IEC 62443',
        version: '1.3',
        status: 'active',
        fileContent: `This Standard Operating Procedure establishes the requirements for managing cybersecurity risks throughout the product lifecycle of connected medical devices. The procedure defines the cybersecurity management framework aligned with IEC 62443 and NIST Cybersecurity Framework requirements.

Cybersecurity Risk Assessment: Cybersecurity risk assessments are conducted during the design phase and updated throughout the product lifecycle. The assessment process includes asset identification, threat modeling using STRIDE methodology, vulnerability assessment, and risk scoring based on exploitability and impact. Risk assessment results are documented in the cybersecurity risk management file and reviewed during design reviews and periodic security reassessments.

Secure Development Practices: Software development follows secure coding guidelines including input validation, output encoding, authentication and authorization controls, and encryption of sensitive data at rest and in transit. Static code analysis tools are integrated into the CI/CD pipeline, and dynamic application security testing (DAST) is performed on pre-release builds. Third-party software components are evaluated for known vulnerabilities using the National Vulnerability Database (NVD) before inclusion in the product.

Vulnerability Management: A dedicated cybersecurity team monitors for newly disclosed vulnerabilities affecting product components using NVD alerts, vendor security advisories, and industry information sharing organizations. Identified vulnerabilities are triaged based on severity, exploitability, and product impact. Remediation timelines are defined based on severity classification: critical vulnerabilities within 30 days, high within 60 days, medium within 90 days, and low within the next scheduled release.

Incident Response: The organization maintains a cybersecurity incident response plan that defines roles, responsibilities, and procedures for detecting, responding to, and recovering from cybersecurity incidents affecting medical devices. The plan includes communication protocols for notifying affected customers, regulatory authorities, and coordination with law enforcement agencies when appropriate. Incident response procedures are tested through tabletop exercises conducted semi-annually.`,
        organizationId: org.id,
      },
      {
        title: 'RPT-RA-001: Risk Analysis Report - Surgical Robot',
        docType: 'Report',
        fileName: 'RPT-RA-001-v2.0.pdf',
        scope: 'Risk Management',
        clause: 'ISO 14971',
        version: '2.0',
        status: 'active',
        fileContent: `This Risk Analysis Report documents the systematic risk management activities performed for the MedRobot Surgical System, a Class IIb medical device under the EU MDR classification and Class II under FDA classification. The analysis was conducted in accordance with ISO 14971:2019 and the organization's risk management procedure (SOP-RM-023).

Intended Use and Hazards: The MedRobot Surgical System is intended for use in minimally invasive surgical procedures including laparoscopic, thoracoscopic, and gynecological procedures. The hazard identification process identified 47 unique hazards across categories including mechanical hazards (arm collision, instrument failure, component fatigue), electrical hazards (power supply failure, electromagnetic interference), software hazards (algorithm errors, communication failures, data corruption), biological hazards (infection transmission, material biocompatibility), and usability hazards (user interface errors, procedural errors).

Risk Estimation and Evaluation: Each identified hazard was analyzed through a systematic risk estimation process. The initial risk estimation identified 8 unacceptable risks and 15 ALARP risks. Unacceptable risks included robotic arm uncontrolled movement, failure of surgical instrument grip mechanism, loss of communication during active procedure, and thermal injury from energy delivery systems. Each unacceptable risk was addressed through inherent safety by design measures followed by protective measures and safety information.

Risk Control Implementation: Risk control measures were implemented in priority order. Design controls included redundant position sensors for robotic arm movement monitoring, fail-safe braking mechanisms, dual-channel communication architecture with automatic switchover, and impedance-based tissue sensing for energy delivery systems. Protective measures included real-time safety monitoring software with automatic system halt capability, emergency stop buttons accessible from all operating positions, and backup power systems. Information for safety was provided through comprehensive user training programs, on-screen safety alerts, and detailed instructions for use.

Residual Risk Evaluation: After implementation of all risk control measures, residual risks were re-evaluated. All previously unacceptable risks were reduced to acceptable or ALARP levels. The overall residual risk for the MedRobot Surgical System was determined to be acceptable based on the documented benefit-risk analysis considering the clinical benefits of the device and the severity and probability of remaining residual risks.`,
        organizationId: org.id,
      },
    ];

    for (const doc of documents) {
      await db.internalDocument.create({ data: doc });
    }

    // Fetch created regulations for checklist items
    const createdRegulations = await db.regulation.findMany({
      where: { organizationId: org.id },
      select: { id: true, title: true },
    });

    // Checklist items per regulation - keyed by regulation title pattern
    const checklistData: Record<string, Array<{ title: string; description: string; category: string; isCompleted: boolean }>> = {
      '21 CFR Part 820': [
        { title: 'Quality Management System Documentation', description: 'Ensure QMS documentation reflects harmonized ISO 13485:2016 requirements including risk-based approach methodology', category: 'Quality System', isCompleted: true },
        { title: 'Design Control Procedures Update', description: 'Update design control SOPs to include risk assessments at each design phase and defined acceptance criteria', category: 'Design Controls', isCompleted: false },
        { title: 'Design Transfer Documentation', description: 'Establish formal design transfer procedures with documented risk assessments and verification activities', category: 'Design Controls', isCompleted: false },
        { title: 'Production Process Validation', description: 'Implement validated production process methods with ongoing performance monitoring and risk-based controls', category: 'Quality System', isCompleted: true },
        { title: 'CAPA Procedure Enhancement', description: 'Update CAPA procedures to incorporate risk-based methodology and preventive action effectiveness tracking', category: 'Quality System', isCompleted: false },
        { title: 'Supplier Quality Management', description: 'Establish enhanced supplier management procedures including risk assessment and ongoing performance monitoring', category: 'Quality System', isCompleted: true },
        { title: 'Process Risk Assessment', description: 'Complete risk-based assessment of all production processes with documented control measures', category: 'Risk Management', isCompleted: false },
        { title: 'Lifecycle Management Procedures', description: 'Develop procedures for managing changes throughout the entire product lifecycle', category: 'Quality System', isCompleted: false },
        { title: 'Labeling Compliance Review', description: 'Review device labeling for compliance with updated requirements and ensure all changes are documented', category: 'Labeling', isCompleted: true },
        { title: 'Clinical Evidence Review', description: 'Assess clinical evidence requirements and update documentation to support regulatory submissions', category: 'Clinical Evidence', isCompleted: false },
      ],
      'EU MDR Article 10(8)': [
        { title: 'PMS Plan Update', description: 'Update Post-Market Surveillance plan to include systematic clinical data collection and expanded data sources', category: 'Quality System', isCompleted: false },
        { title: 'PMCF Study Expansion', description: 'Expand Post-Market Clinical Follow-up to cover class IIa devices in addition to IIb and III', category: 'Clinical Evidence', isCompleted: false },
        { title: 'Safety Signal Detection Procedures', description: 'Implement trending and pattern recognition procedures for early safety signal detection', category: 'Risk Management', isCompleted: true },
        { title: 'PMS Evaluation Report Schedule', description: 'Update PMS evaluation report frequency: semi-annual for class III, annual for class IIb', category: 'Quality System', isCompleted: true },
        { title: 'Data Source Documentation', description: 'Document all PMS data sources including registries, literature, user feedback, and complaint handling systems', category: 'Clinical Evidence', isCompleted: false },
        { title: 'Literature Review Protocol', description: 'Establish systematic literature review protocol for clinical data collection', category: 'Clinical Evidence', isCompleted: true },
        { title: 'Complaint Handling Integration', description: 'Integrate complaint handling data into PMS trending and analysis processes', category: 'Quality System', isCompleted: true },
        { title: 'Labeling Updates for PMS', description: 'Update labeling to reflect PMS findings and any new safety information', category: 'Labeling', isCompleted: false },
        { title: 'User Feedback Collection System', description: 'Implement systematic user feedback collection and analysis procedures', category: 'Quality System', isCompleted: false },
      ],
      'ISO 14971:2024': [
        { title: 'Risk Management Procedure Update', description: 'Update SOP-RM-023 to reflect ISO 14971:2024 requirements including lifecycle approach and cybersecurity', category: 'Risk Management', isCompleted: false },
        { title: 'Cybersecurity Risk Assessment', description: 'Incorporate cybersecurity threat identification into risk analysis for all connected devices', category: 'Risk Management', isCompleted: false },
        { title: 'Benefit-Risk Analysis Framework', description: 'Develop structured benefit-risk analysis methodology considering individual patient and public health impact', category: 'Clinical Evidence', isCompleted: true },
        { title: 'Risk Estimation Methodology', description: 'Update risk estimation matrix and methodology to align with revised standard requirements', category: 'Risk Management', isCompleted: true },
        { title: 'Stakeholder Engagement Process', description: 'Establish stakeholder involvement in risk acceptance decisions as required by updated standard', category: 'Risk Management', isCompleted: false },
        { title: 'Risk Control Verification', description: 'Implement verification activities for all risk control measures with documented validation evidence', category: 'Design Controls', isCompleted: false },
        { title: 'Cumulative Risk Assessment', description: 'Develop process for assessing cumulative risk from multiple control measures', category: 'Risk Management', isCompleted: false },
        { title: 'Risk Management File Template', description: 'Update risk management file templates to include new required documentation elements', category: 'Quality System', isCompleted: true },
        { title: 'QMS Integration Review', description: 'Review and update integration between risk management and QMS documentation', category: 'Quality System', isCompleted: true },
        { title: 'Existing RMF Review', description: 'Complete review of all existing risk management files for completeness against new requirements', category: 'Risk Management', isCompleted: false },
        { title: 'Labeling Risk Communication', description: 'Ensure device labeling communicates residual risks and risk control measures appropriately', category: 'Labeling', isCompleted: true },
      ],
      'FDA Guidance on Cybersecurity': [
        { title: 'SPDF Documentation', description: 'Document Secure Product Development Framework aligned with IEC 62443-4-1 requirements', category: 'Design Controls', isCompleted: false },
        { title: 'Threat Modeling Integration', description: 'Integrate STRIDE threat modeling into design control process for all connected devices', category: 'Risk Management', isCompleted: false },
        { title: 'SBOM Generation Process', description: 'Implement Software Bill of Materials generation and maintenance process for all software-containing devices', category: 'Design Controls', isCompleted: true },
        { title: 'Vulnerability Management Program', description: 'Establish formal vulnerability management program with severity-based response timelines', category: 'Risk Management', isCompleted: true },
        { title: 'Secure Coding Standards', description: 'Document and implement secure coding practices including input validation and encryption requirements', category: 'Quality System', isCompleted: true },
        { title: 'Penetration Testing Schedule', description: 'Establish regular penetration testing schedule for pre-release builds of connected devices', category: 'Risk Management', isCompleted: false },
        { title: 'Vulnerability Disclosure Policy', description: 'Create and publish vulnerability disclosure policy with coordinated disclosure procedures', category: 'Labeling', isCompleted: true },
        { title: 'Security Update Capability', description: 'Ensure all connected devices support security updates and patches with defined deployment procedures', category: 'Design Controls', isCompleted: false },
        { title: 'Cybersecurity Labeling', description: 'Update device labeling to include cybersecurity information, known vulnerabilities, and SBOM provisions', category: 'Labeling', isCompleted: false },
        { title: 'Third-Party Component Evaluation', description: 'Implement process for evaluating third-party software components for known vulnerabilities before inclusion', category: 'Quality System', isCompleted: true },
        { title: 'Incident Response Plan', description: 'Review and update cybersecurity incident response plan including communication protocols', category: 'Quality System', isCompleted: true },
        { title: 'Clinical Data Security Assessment', description: 'Assess clinical data security measures for devices handling patient health information', category: 'Clinical Evidence', isCompleted: false },
      ],
      'EU MDR Annex I': [
        { title: 'Clinical Evidence Documentation', description: 'Update clinical evidence documentation to demonstrate both safety and clinical performance', category: 'Clinical Evidence', isCompleted: false },
        { title: 'Material Characterization Review', description: 'Complete material characterization including nanomaterials, CMR substances, and endocrine disruptors', category: 'Risk Management', isCompleted: false },
        { title: 'Chemical Characterization', description: 'Perform full chemical characterization of all materials coming into contact with human tissues', category: 'Risk Management', isCompleted: true },
        { title: 'Human Factors Validation', description: 'Conduct summative human factors validation studies for devices with significant user interaction', category: 'Design Controls', isCompleted: false },
        { title: 'Formative Usability Evaluations', description: 'Complete formative usability evaluations and document findings in design history file', category: 'Design Controls', isCompleted: true },
        { title: 'Interoperability Standards', description: 'Implement standardized data exchange formats and protocols for health IT system interoperability', category: 'Quality System', isCompleted: false },
        { title: 'Environmental Considerations', description: 'Address environmental considerations including disposal of hazardous substances and recyclability', category: 'Labeling', isCompleted: true },
        { title: 'Technical Documentation Review', description: 'Conduct comprehensive review of technical documentation for alignment with updated GSPRs', category: 'Quality System', isCompleted: false },
        { title: 'Declaration of Conformity Update', description: 'Update declarations of conformity to reflect compliance with updated Annex I requirements', category: 'Quality System', isCompleted: false },
        { title: 'Equivalence Assessment Update', description: 'Update equivalence assessments for all devices where equivalence is relied upon for clinical evidence', category: 'Clinical Evidence', isCompleted: false },
      ],
    };

    // Create checklist items for each regulation
    let totalChecklistItems = 0;
    for (const regulation of createdRegulations) {
      const matchingKey = Object.keys(checklistData).find((key) =>
        regulation.title.includes(key)
      );
      if (matchingKey) {
        const items = checklistData[matchingKey];
        for (const item of items) {
          await db.checklistItem.create({
            data: {
              regulationId: regulation.id,
              title: item.title,
              description: item.description,
              category: item.category,
              isCompleted: item.isCompleted,
              completedAt: item.isCompleted ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
            },
          });
          totalChecklistItems++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        organization: org.name,
        regulations: regulations.length,
        documents: documents.length,
        checklistItems: totalChecklistItems,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}
