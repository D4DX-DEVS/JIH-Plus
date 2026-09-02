/**
 * Field maps for the two static forms that lived in the JIH portal, used by
 * scripts/migrateMembersFromJih.js to build a "Legacy (imported)" FormTemplate
 * per application type and to read each old document into the new formData shape.
 *
 * `path` is a dot path into the old RuknForm / KarkunForm document. `type` is a
 * members form-builder field type. Booleans become yesno fields ('Yes' / 'No').
 */

const books = (prefix, count, labelPrefix) =>
  Array.from({ length: count }, (_, i) => ({
    path: `${prefix}.book${i + 1}`,
    label: `${labelPrefix} ${i + 1}`,
    type: 'yesno'
  }));

const numbered = (prefix, count, labelPrefix, type = 'textarea') =>
  Array.from({ length: count }, (_, i) => ({
    path: `${prefix}.question${i + 1}`,
    label: `${labelPrefix} ${i + 1}`,
    type
  }));

const RUKN_PAGES = [
  {
    title: 'Personal Information',
    fields: [
      { path: 'name', label: 'Name (Malayalam)', type: 'text' },
      { path: 'nameEnglish', label: 'Name (English)', type: 'text' },
      { path: 'fathersName', label: "Father's Name", type: 'text' },
      { path: 'spouse', label: 'Spouse', type: 'text' },
      { path: 'childrenBoys', label: 'Children — boys', type: 'number' },
      { path: 'childrenGirls', label: 'Children — girls', type: 'number' },
      { path: 'fullAddress', label: 'Full Address', type: 'textarea' },
      { path: 'place', label: 'Place', type: 'text' },
      { path: 'po', label: 'Post Office', type: 'text' },
      { path: 'pin', label: 'PIN', type: 'text' },
      { path: 'mobile', label: 'Mobile', type: 'phone' },
      { path: 'email', label: 'Email', type: 'email' },
      { path: 'photo', label: 'Photograph', type: 'file' }
    ]
  },
  {
    title: 'Additional Information',
    fields: [
      { path: 'age', label: 'Age', type: 'text' },
      { path: 'dateOfBirth', label: 'Date of Birth', type: 'text' },
      { path: 'educationalQualification', label: 'Educational Qualification', type: 'text' },
      { path: 'otherSkills', label: 'Other Skills', type: 'textarea' },
      { path: 'knownLanguages', label: 'Known Languages', type: 'text' },
      { path: 'occupation', label: 'Occupation', type: 'text' },
      { path: 'otherIncomeSources', label: 'Other Income Sources', type: 'textarea' },
      { path: 'previousOrganization', label: 'Previous Organization', type: 'text' }
    ]
  },
  {
    title: 'Questions',
    fields: [
      { path: 'question5', label: 'Question 5', type: 'textarea' },
      { path: 'question5a', label: 'When did you start reading Jamath literature?', type: 'textarea' },
      { path: 'question5b', label: 'What prompted you to apply for membership?', type: 'textarea' },
      { path: 'question6', label: 'Question 6', type: 'textarea' },
      { path: 'question7', label: 'Question 7', type: 'textarea' },
      { path: 'question7a', label: 'Question 7a', type: 'textarea' },
      { path: 'question7b', label: 'Question 7b', type: 'textarea' },
      { path: 'familyConnection.wifeHusband', label: 'Family connection — wife/husband', type: 'textarea' },
      { path: 'familyConnection.children', label: 'Family connection — children', type: 'textarea' },
      { path: 'debtsLiabilities', label: 'Debts / Liabilities', type: 'textarea' },
      { path: 'organizationalResponsibilities', label: 'Organizational Responsibilities', type: 'textarea' },
      { path: 'nearestLocalJamaat', label: 'Nearest Local Jamaat', type: 'text' },
      { path: 'contactUnitAbroad', label: 'Contact Unit Abroad', type: 'text' }
    ]
  },
  { title: 'Compulsory Books', fields: books('compulsoryBooks', 17, 'Compulsory book') },
  { title: 'Advisable Books', fields: books('advisableBooks', 15, 'Advisable book') },
  {
    title: 'Report Period & Attendance',
    fields: [
      { path: 'reportPeriod.from', label: 'Report period from', type: 'text' },
      { path: 'reportPeriod.to', label: 'Report period to', type: 'text' },
      { path: 'attendance.weeklyMeeting', label: 'Weekly meeting attendance', type: 'text' },
      { path: 'attendance.areaConvention', label: 'Area convention attendance', type: 'text' },
      { path: 'attendance.nightCamp', label: 'Night camp attendance', type: 'text' }
    ]
  },
  { title: 'Activity Questions', fields: numbered('activityQuestions', 15, 'Activity question') },
  {
    title: 'Signatures & Office Use',
    fields: [
      { path: 'applicantSignature', label: 'Applicant signature', type: 'text' },
      { path: 'applicantDate', label: 'Applicant date', type: 'text' },
      { path: 'localAmeer.name', label: 'Local Ameer / Area President — name', type: 'text' },
      { path: 'localAmeer.signature', label: 'Local Ameer — signature', type: 'text' },
      { path: 'localAmeer.date', label: 'Local Ameer — date', type: 'text' },
      { path: 'districtPresident.name', label: 'District President — name', type: 'text' },
      { path: 'districtPresident.signature', label: 'District President — signature', type: 'text' },
      { path: 'districtPresident.date', label: 'District President — date', type: 'text' },
      { path: 'districtPresident.opinion', label: 'District President — opinion', type: 'textarea' },
      { path: 'regionalNazim.name', label: 'Regional Nazim — name', type: 'text' },
      { path: 'regionalNazim.signature', label: 'Regional Nazim — signature', type: 'text' },
      { path: 'regionalNazim.date', label: 'Regional Nazim — date', type: 'text' },
      { path: 'officeUse.registrationNumber', label: 'Office use — registration number', type: 'text' },
      { path: 'officeUse.date', label: 'Office use — date', type: 'text' }
    ]
  }
];

const KARKOON_PAGES = [
  {
    title: 'Personal Information',
    fields: [
      { path: 'name', label: 'Name (Malayalam)', type: 'text' },
      { path: 'nameEnglish', label: 'Name (English)', type: 'text' },
      { path: 'fathersName', label: "Father's Name", type: 'text' },
      { path: 'gender', label: 'Gender', type: 'radio', options: ['male', 'female'] },
      { path: 'age', label: 'Age', type: 'text' },
      { path: 'dateOfBirth.day', label: 'Date of birth — day', type: 'text' },
      { path: 'dateOfBirth.month', label: 'Date of birth — month', type: 'text' },
      { path: 'dateOfBirth.year', label: 'Date of birth — year', type: 'text' },
      { path: 'spouseName', label: 'Spouse name', type: 'text' },
      { path: 'childrenBoys', label: 'Children — boys', type: 'number' },
      { path: 'childrenGirls', label: 'Children — girls', type: 'number' },
      { path: 'mobile', label: 'Mobile', type: 'phone' },
      { path: 'email', label: 'Email', type: 'email' },
      { path: 'address', label: 'Address', type: 'textarea' },
      { path: 'photo', label: 'Photograph', type: 'file' }
    ]
  },
  {
    title: 'Detailed Information',
    fields: [
      { path: 'educationalQualification', label: 'Educational Qualification', type: 'text' },
      { path: 'occupation', label: 'Occupation', type: 'text' },
      { path: 'otherSkills', label: 'Other Skills', type: 'textarea' },
      { path: 'halkhaName', label: 'Halkha Name', type: 'text' },
      { path: 'area', label: 'Area', type: 'text' },
      { path: 'district', label: 'District', type: 'text' },
      { path: 'ageAssociated', label: 'Age when associated', type: 'text' },
      { path: 'associationCircumstances.family', label: 'Association — family', type: 'yesno' },
      { path: 'associationCircumstances.personal', label: 'Association — personal', type: 'yesno' },
      { path: 'associationCircumstances.reading', label: 'Association — reading', type: 'yesno' },
      { path: 'associationCircumstances.others', label: 'Association — others', type: 'yesno' },
      { path: 'firstActiveUnit.balasangham', label: 'First active unit — Balasangham', type: 'yesno' },
      { path: 'firstActiveUnit.teenIndia', label: 'First active unit — Teen India', type: 'yesno' },
      { path: 'firstActiveUnit.sio', label: 'First active unit — SIO', type: 'yesno' },
      { path: 'firstActiveUnit.gio', label: 'First active unit — GIO', type: 'yesno' },
      { path: 'firstActiveUnit.solidarity', label: 'First active unit — Solidarity', type: 'yesno' },
      { path: 'firstActiveUnit.jamaatHalkha', label: 'First active unit — Jamaat Halkha', type: 'yesno' },
      { path: 'firstActiveUnit.others', label: 'First active unit — others', type: 'yesno' },
      { path: 'workedOtherOrganization', label: 'Worked in another organization', type: 'radio', options: ['yes', 'no'] },
      { path: 'otherOrganizationName', label: 'Other organization name', type: 'text' },
      { path: 'organizationalBooksRead', label: 'Organizational books read', type: 'textarea' }
    ]
  },
  { title: 'Compulsory Books', fields: books('compulsoryBooks', 3, 'Compulsory book') },
  {
    title: 'Declaration & Office Use',
    fields: [
      { path: 'declarationAccepted', label: 'Declaration accepted', type: 'yesno' },
      { path: 'localUnitOfficialName', label: 'Local unit official name', type: 'text' },
      { path: 'applicantName', label: 'Applicant name', type: 'text' },
      { path: 'applicantDate', label: 'Applicant date', type: 'text' },
      { path: 'officialDate', label: 'Official date', type: 'text' },
      { path: 'localUnitSignature', label: 'Local unit signature', type: 'text' },
      { path: 'localUnit', label: 'Local unit', type: 'text' },
      { path: 'localUnitDate', label: 'Local unit date', type: 'text' },
      { path: 'areaPresidentName', label: 'Area President name', type: 'text' },
      { path: 'areaPresidentSignature', label: 'Area President signature', type: 'text' },
      { path: 'areaPresidentDate', label: 'Area President date', type: 'text' },
      { path: 'officeDate', label: 'Office date', type: 'text' },
      { path: 'registrationNumber', label: 'Registration number', type: 'text' },
      { path: 'officeRegistrationDate', label: 'Office registration date', type: 'text' }
    ]
  }
];

// The old schema carried one comment per verification level. Each becomes a
// role-scoped page so migrated comments land in roleData and stay visible to
// the right role only.
const LEGACY_COMMENT_ROLES = [
  { verificationKey: 'unitAdmin', roleKey: 'unitAdmin', title: 'Unit Admin Comments' },
  { verificationKey: 'areaAdmin', roleKey: 'areaAdmin', title: 'Area Admin Comments' },
  { verificationKey: 'districtAdmin', roleKey: 'districtAdmin', title: 'District Admin Comments' },
  { verificationKey: 'stateAdmin', roleKey: 'superAdmin', title: 'State Comments' }
];

module.exports = { RUKN_PAGES, KARKOON_PAGES, LEGACY_COMMENT_ROLES };
