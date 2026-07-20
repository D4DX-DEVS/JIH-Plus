import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from '@react-pdf/renderer';
import NotoSerifMalayalam from '../assets/fonts/NotoSerifMalayalam-Regular.ttf';
import jihLogo from '../assets/LogoColor.png';

// Import centralized PDF styling
import {
  PDF_BRANDING,
  PDF_TYPOGRAPHY,
  PDF_SPACING,
  PDF_STYLES,
  PDF_TABLE_STYLES,
  safeToString,
} from './pdfStyleConfig';

Font.register({ family: 'Noto Serif Malayalam', src: NotoSerifMalayalam });

// Relationship options matching UnitPageA and UnitPageB
const authorityPersonsOptions = [
  { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
  { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
  { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
  { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ' },
  { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരൻ' },
  { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
  { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
  { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
  { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
  { key: 'tamheedulManhabStudent', label: 'തംഹീദുൽ മർഅ പഠിതാവ്' },
  { key: 'institutionAlumni', label: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി' },
  { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി' },
  { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
  { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
  { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
  { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരൻ' },
  { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്' },
  { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
  { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
  { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
  { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
  { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി' },
  { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
  { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
  { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
];

const memberCategoriesOptions = [
  { key: 'vyakthibandham', label: 'വ്യക്തിബന്ധം' },
  { key: 'sahitiyabandham', label: 'സാഹിത്യബന്ധം' },
  { key: 'qscStudent', label: 'QSC പഠിതാവ്' },
  { key: 'regularKhutbaListener', label: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ' },
  { key: 'prabodhanamReader', label: 'പ്രബോധനം വായനക്കാരൻ' },
  { key: 'pfBeneficiary', label: 'PF ഗുണഭോക്താവ്' },
  { key: 'bzBeneficiary', label: 'BZ ഗുണഭോക്താവ്' },
  { key: 'regionalReliefBeneficiary', label: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്' },
  { key: 'aaramamReader', label: 'ആരാമം വായനക്കാരി' },
  { key: 'tamheedulManhabStudent', label: 'തംഹീദുൽ മർഅ പഠിതാവ്' },
  { key: 'institutionAlumni', label: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി' },
  { key: 'islamicCollegeAlumni', label: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി' },
  { key: 'neighborhoodGroupMember', label: 'അയൽകൂട്ടം അംഗം' },
  { key: 'palliativeConnection', label: 'പാലിയേറ്റീവ് ബന്ധം' },
  { key: 'friendsClubMember', label: 'Friends Club അംഗം' },
  { key: 'mediaReader', label: 'മാധ്യമം വായനക്കാരൻ' },
  { key: 'ayathulDursalQuranStudent', label: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്' },
  { key: 'heavensGuardian', label: 'ഹെവൻസിലെ രക്ഷിതാവ്' },
  { key: 'schoolGuardian', label: 'സ്കൂളിലെ രക്ഷിതാവ്' },
  { key: 'arabicCollegeGuardian', label: 'അറബികോളജ് രക്ഷിതാവ്' },
  { key: 'arabicCollegeStudent', label: 'അറബിക് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeStudent', label: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി' },
  { key: 'artsCollegeGuardian', label: 'ആർട്സ് കോളജ് രക്ഷിതാവ്' },
  { key: 'publicCampusStudent', label: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി' },
  { key: 'otherNGOs', label: 'മറ്റു NGO കൾ' },
  { key: 'mahalluConnection', label: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം' },
  { key: 'fullTimeWorkerConnection', label: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം' }
];

// Using standardized styles from central config
const styles = StyleSheet.create({
  page: PDF_STYLES.page,
  header: {
    ...PDF_STYLES.header,
    borderBottom: 'none', // Form PDFs don't need border
  },
  logo: PDF_STYLES.logo,
  title: PDF_STYLES.documentTitle,
  sub: PDF_STYLES.subtitle,
  chipRow: PDF_STYLES.chipRow,
  chip: PDF_STYLES.chip,
  section: PDF_STYLES.section,
  sectionTitle: PDF_STYLES.sectionTitle,
  table: PDF_TABLE_STYLES.table,
  tr: PDF_TABLE_STYLES.tableRow,
  th: PDF_TABLE_STYLES.tableHeaderCell,
  td: PDF_TABLE_STYLES.tableCell,
});

const cell = (text, style = {}) => (<Text style={{ ...styles.td, ...style }}>{safeToString(text)}</Text>);
const head = (text, style = {}) => (<Text style={{ ...styles.th, ...style }}>{text}</Text>);

const AttendanceTable = ({ attendance }) => {
  const rows = [
    { k: 'jih', l: 'JIH' },
    { k: 'vanitha', l: 'വനിത' },
    { k: 'solidarity', l: 'Solidarity' },
    { k: 'sio', l: 'SIO' },
    { k: 'gio', l: 'GIO' },
  ];
  return (
    <View style={styles.table}>
      <View style={styles.tr}>
        {head('വിംഗ്')}{head('ഹാജർ')}{head('ലീവ്')}{head('അനുപസ്ഥിതി')}
      </View>
      {rows.map(r => (
        <View key={r.k} style={styles.tr}>
          {cell(r.l)}
          {cell(attendance?.[r.k]?.present ?? 0)}
          {cell(attendance?.[r.k]?.leave ?? 0)}
          {cell(attendance?.[r.k]?.absent ?? 0)}
        </View>
      ))}
    </View>
  );
};

const BooleanGrid = ({ obj }) => {
  if (!obj) return null;
  const entries = Object.entries(obj);
  return (
    <View>
      {entries.map(([k, v], i) => (
        <Text key={i} style={{ fontSize: 9 }}>{`${k.replace(/([A-Z])/g, ' $1')} : ${v ? 'അതെ' : 'അല്ല'}`}</Text>
      ))}
    </View>
  );
};

// New component for displaying gender checkboxes and counts
const GenderCountGrid = ({ genderData, countData, options }) => {
  if (!genderData && !countData) return null;
  
  const entries = options.map(option => ({
    key: option.key,
    label: option.label,
    gender: genderData?.[option.key] || { male: false, female: false },
    count: countData?.[option.key] || { male: 0, female: 0 }
  }));

  return (
    <View>
      {entries.map(({ key, label, gender, count }, i) => {
        const hasSelection = gender.male || gender.female;
        const hasCounts = (count.male && count.male > 0) || (count.female && count.female > 0);
        
        if (!hasSelection && !hasCounts) return null;
        
        return (
          <View key={i} style={{ marginBottom: 4, padding: 4, border: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2 }}>{label}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, color: '#3b82f6' }}>
                  ആൺ: {gender.male ? '✓' : '✗'} {count.male > 0 ? `(${count.male})` : ''}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, color: '#ec4899' }}>
                  പെൺ : {gender.female ? '✓' : '✗'} {count.female > 0 ? `(${count.female})` : ''}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Focus Areas component for district forms
const FocusAreasGrid = ({ focusAreas }) => {
  if (!focusAreas) return null;
  
  const focusAreaLabels = {
    newAreaExpansionWorkshop: 'പുതിയ ഏരിയ വിപുലീകരണ വർക്ക്ഷോപ്പ്',
    workerTraining: 'പ്രവർത്തക പരിശീലനം',
    newAreaAgendaPreparation: 'പുതിയ ഏരിയ എജണ്ട തയ്യാറാക്കൽ',
    fulltimeRecruitment: 'പൂർണ്ണസമയ നിയമനം',
    schoolGuardianClusterFormation: 'സ്കൂൾ രക്ഷിതാവ് ക്ലസ്റ്റർ രൂപീകരണം',
    reliefBeneficiaryDataCollection: 'ആശ്വാസ ഗുണഭോക്താവ് ഡാറ്റ ശേഖരണം',
    workerDeploymentToNewAreas: 'പുതിയ ഏരിയകളിലേക്ക് പ്രവർത്തക വിന്യാസം',
    weeklyMeetingEffectiveness: 'ആഴ്ചയിലെ കൂടിക്കാഴ്ച ഫലപ്രാപ്തി',
    khatibUtilization: 'ഖാതിബ് ഉപയോഗം',
    madrasaMovementGrowthCalculation: 'മദ്റസ പ്രസ്ഥാന വളർച്ച കണക്കുകൂട്ടൽ',
    schoolCenteredWork: 'സ്കൂൾ കേന്ദ്രീകൃത പ്രവർത്തനം',
    staffHalkaFormation: 'സ്റ്റാഫ് ഹൽക്ക രൂപീകരണം',
    islamicCollegeAlumniDiscovery: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി കണ്ടെത്തൽ',
    quranStudyCenterWork: 'ഖുർആൻ പഠന കേന്ദ്ര പ്രവർത്തനം',
    artsScienceCampusLeadership: 'ആർട്സ് & സയൻസ് കാമ്പസ് നേതൃത്വം',
    hajjUmrahGroupDiscovery: 'ഹജ്ജ്/ഉംറ ഗ്രൂപ്പ് കണ്ടെത്തൽ',
    majorMuslimCenterStructure: 'പ്രധാന മുസ്ലിം കേന്ദ്ര ഘടന',
    weakAreaFinancialSupport: 'ദുർബല ഏരിയ ധനസഹായം',
    qscTeacherOrientation: 'QSC അധ്യാപക ഓറിയന്റേഷൻ',
    khatibOrientation: 'ഖാതിബ് ഓറിയന്റേഷൻ',
    institutionBearingOrientation: 'സ്ഥാപന ഭാര ഓറിയന്റേഷൻ',
    selectedWorkerTraining: 'തിരഞ്ഞെടുത്ത പ്രവർത്തക പരിശീലനം'
  };

  const selectedAreas = Object.entries(focusAreas)
    .filter(([key, value]) => value === true && key !== 'otherFocusAreas')
    .map(([key]) => ({ key, label: focusAreaLabels[key] || key }));

  return (
    <View>
      {selectedAreas.map(({ key, label }, i) => (
        <Text key={i} style={{ fontSize: 9, marginBottom: 2 }}>• {label}</Text>
      ))}
      {focusAreas.otherFocusAreas && (
        <Text style={{ fontSize: 9, marginBottom: 2 }}>• മറ്റുള്ളവ: {focusAreas.otherFocusAreas}</Text>
      )}
    </View>
  );
};

// Categories component for district forms
const CategoriesGrid = ({ categories, categoriesCounts }) => {
  if (!categories) return null;
  
  const categoryLabels = {
    personalConnection: 'വ്യക്തിബന്ധം',
    literaryConnection: 'സാഹിത്യബന്ധം',
    qscStudent: 'QSC പഠിതാവ്',
    regularKhutbaListener: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാൾ',
    prabodhanamReader: 'പ്രബോധനം വായനക്കാരൻ',
    pfBeneficiary: 'PF ഗുണഭോക്താവ്',
    bzBeneficiary: 'BZ ഗുണഭോക്താവ്',
    localReliefBeneficiary: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്',
    aaramamReader: 'ആരാമം വായനക്കാരി',
    thawheedulMaraStudent: 'തംഹീദുൽ മർഅ പഠിതാവ്',
    madrasaAlumni: 'മദ്റസ പൂർവ്വ വിദ്യാർത്ഥി',
    islamicCollegeAlumni: 'ഇസ്‌ലാമിയ കോളജ് പൂർവ്വ വിദ്യാർത്ഥി',
    neighborhoodMember: 'അയൽകൂട്ടം അംഗം',
    palliativeConnection: 'പാലിയേറ്റീവ് ബന്ധം',
    friendsClubMember: 'Friends Club അംഗം',
    mediaReader: 'മാധ്യമം വായനക്കാരൻ',
    ayahDarsQuranStudent: 'ആയാത് ദർസെ ഖുർആൻ പഠിതാവ്',
    heavenGuardian: 'ഹെവൻസിലെ രക്ഷിതാവ്',
    schoolGuardian: 'സ്കൂളിലെ രക്ഷിതാവ്',
    arabicCollegeGuardian: 'അറബികോളജ് രക്ഷിതാവ്',
    arabicCollegeStudent: 'അറബിക് കോളജ് വിദ്യാർത്ഥി',
    artsCollegeStudent: 'ആർട്സ് കോളജ് വിദ്യാർത്ഥി',
    artsCollegeGuardian: 'ആർട്സ് കോളജ് രക്ഷിതാവ്',
    publicCampusStudent: 'പൊതു കാമ്പസിലെ വിദ്യാർത്ഥി',
    otherNGOs: 'മറ്റു NGO കൾ',
    mahallConnection: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം',
    fulltimeWorkerConnection: 'ഫുൾടൈം പ്രവർത്തകനുമായുള്ള ബന്ധം'
  };

  const selectedCategories = Object.entries(categories)
    .filter(([key, value]) => value && (value.male || value.female) && key !== 'otherCategories')
    .map(([key, value]) => ({ 
      key, 
      label: categoryLabels[key] || key,
      male: value.male,
      female: value.female,
      maleCount: categoriesCounts?.[key]?.male || 0,
      femaleCount: categoriesCounts?.[key]?.female || 0
    }));

  return (
    <View>
      {selectedCategories.map(({ key, label, male, female, maleCount, femaleCount }, i) => (
        <View key={i} style={{ marginBottom: 4, padding: 4, border: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2 }}>{label}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 8, color: '#3b82f6' }}>
              ആൺ: {male ? '✓' : '✗'} {maleCount > 0 ? `(${maleCount})` : ''}
            </Text>
            <Text style={{ fontSize: 8, color: '#ec4899' }}>
              പെൺ : {female ? '✓' : '✗'} {femaleCount > 0 ? `(${femaleCount})` : ''}
            </Text>
          </View>
        </View>
      ))}
      {categories.otherCategories && (
        <Text style={{ fontSize: 9, marginTop: 4 }}>മറ്റുള്ളവ: {categories.otherCategories}</Text>
      )}
    </View>
  );
};

// District Form PDF
const DistrictFormPage = ({ form }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Image src={jihLogo} style={styles.logo} />
      <View>
        <Text style={styles.title}>ജില്ലാ ഫോം</Text>
        <Text style={styles.sub}>{form.district} • {form.month}</Text>
      </View>
    </View>
    <View style={styles.chipRow}>
      <Text style={styles.chip}>സമർപ്പിച്ചത്: {form.submittedBy || '-'}</Text>
      <Text style={styles.chip}>തിയ്യതി: {form.submittedAt ? new Date(form.submittedAt).toLocaleDateString() : '-'}</Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-എ • ജില്ലാ സബ്കമ്മിറ്റി ഹാജർ</Text>
      <AttendanceTable attendance={form.partA?.attendance} />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ബി • താഴെപറയുന്നവയിൽ ഫോകസ് ചെയ്ത മേഖലകൾ</Text>
      <FocusAreasGrid focusAreas={form.partB?.focusAreas} />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-സി • ജില്ലാ സബ്കമ്മിറ്റി നടത്തിയ പ്രവർത്തനങ്ങൾ</Text>
      <View style={styles.table}>
        <View style={styles.tr}>{head('വിംഗ്')}{head('പ്രവർത്തനം')}{head('എണ്ണം')}</View>
        <View style={styles.tr}>{cell('JIH')}{cell('ഘടക സന്ദർശനങ്ങൾ')}{cell(form.partC?.activities?.jih?.componentVisits ?? 0)}</View>
        <View style={styles.tr}>{cell('വനിത')}{cell('ഏരിയ സന്ദർശനങ്ങൾ')}{cell(form.partC?.activities?.vanitha?.areaVisits ?? 0)}</View>
        <View style={styles.tr}>{cell('സോളിഡാരിറ്റി')}{cell('പുതിയ ഘടക രൂപീകരണ ശ്രമങ്ങൾ')}{cell(form.partC?.activities?.solidarity?.newComponentFormationAttempts ?? 0)}</View>
        <View style={styles.tr}>{cell('SIO')}{cell('പുതിയ വ്യക്തി കണക്ഷനുകൾ')}{cell(form.partC?.activities?.sio?.newPersonConnections ?? 0)}</View>
        <View style={styles.tr}>{cell('GIO')}{cell('പുതിയ വ്യക്തി കണക്ഷനുകൾ')}{cell(form.partC?.activities?.gio?.newPersonConnections ?? 0)}</View>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ഡി • പുതിയ വ്യക്തികളെ സംഘടനയിലേക്ക് ക്ഷണിച്ചത്</Text>
      <View style={styles.table}>
        <View style={styles.tr}>{head('ആൺ')}{head('പെൺ ')}</View>
        <View style={styles.tr}>{cell(form.partD?.invitations?.male ?? 0)}{cell(form.partD?.invitations?.female ?? 0)}</View>
      </View>
      <Text style={{ fontSize: 9, marginTop: 4, marginBottom: 2 }}>ഏത് കാറ്റഗറിയിൽപെട്ടവരാണ് ക്ഷണിച്ചത്:</Text>
      <CategoriesGrid categories={form.partD?.categories} categoriesCounts={form.partD?.categoriesCounts} />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ഇ • റിപ്പോർട്ട് കാലയളവിലെ വർദ്ധനവ്</Text>
      <View style={styles.table}>
        <View style={styles.tr}>{head('വിംഗ്')}{head('പുതിയ ഘടകങ്ങൾ')}{head('പുതിയ അംഗങ്ങൾ')}</View>
        {Object.entries(form.partE?.wingGrowth || {}).map(([w, v]) => (
          <View key={w} style={styles.tr}>{cell(w)}{cell(v?.newComponents ?? 0)}{cell(v?.newMembers ?? 0)}</View>
        ))}
      </View>
    </View>
  </Page>
);

// Area Form PDF
const AreaFormPage = ({ form }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Image src={jihLogo} style={styles.logo} />
      <View>
        <Text style={styles.title}>ഏരിയ ഫോം</Text>
        <Text style={styles.sub}>{form.district} • {form.area} • {form.month}</Text>
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-എ</Text>
      <View style={styles.table}>
        <View style={styles.tr}>{head('KH')}{head('VKH')}</View>
        <View style={styles.tr}>{cell(form.partA?.kh ?? 0)}{cell(form.partA?.vkh ?? 0)}</View>
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ബി</Text>
      <Text style={{ fontSize: 9 }}>മാസ മീറ്റിംഗ്: {form.partB?.monthlyMeeting || '-'}</Text>
      <Text style={{ fontSize: 9, marginTop: 4 }}>വിംഗ് ഹാജർ</Text>
      <AttendanceTable attendance={form.partB?.wingAttendance} />
      {Array.isArray(form.partB?.mainDecisions) && form.partB.mainDecisions.length > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 9, marginBottom: 2 }}>പ്രധാന തീരുമാനങ്ങൾ</Text>
          {form.partB.mainDecisions.map((d, i) => (<Text key={i} style={{ fontSize: 9 }}>• {d}</Text>))}
        </View>
      )}
    </View>
    <View style={styles.section}><Text style={styles.sectionTitle}>ഭാഗം-സി</Text><BooleanGrid obj={form.partC?.expansionActivities} /></View>
    <View style={styles.section}><Text style={styles.sectionTitle}>ഭാഗം-ഡി</Text>{Array.isArray(form.partD?.activities) ? form.partD.activities.map((a, i) => (<Text key={i} style={{ fontSize: 9 }}>• {a}</Text>)) : null}</View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ഇ</Text>
      <View style={styles.table}><View style={styles.tr}>{head('ആൺ ')}{head('പെൺ ')}</View><View style={styles.tr}>{cell(form.partE?.male ?? 0)}{cell(form.partE?.female ?? 0)}</View></View>
      <BooleanGrid obj={form.partE?.categories} />
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-എഫ്</Text>
      <View style={styles.table}><View style={styles.tr}>{head('വിംഗ്')}{head('പുതിയ ഘടകങ്ങൾ')}{head('പുതിയ അംഗങ്ങൾ')}</View>{Object.entries(form.partF?.wingGrowth || {}).map(([w, v]) => (<View key={w} style={styles.tr}>{cell(w)}{cell(v?.newComponents ?? 0)}{cell(v?.newMembers ?? 0)}</View>))}</View>
    </View>
  </Page>
);

// Unit Form PDF
const UnitFormPage = ({ form }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Image src={jihLogo} style={styles.logo} />
      <View>
        <Text style={styles.title}>യൂണിറ്റ് ഫോം</Text>
        <Text style={styles.sub}>{form.district} • {form.area} • {form.component}</Text>
      </View>
    </View>
    {form.workers && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>പ്രവർത്തകർ</Text>
        <View style={styles.table}><View style={styles.tr}>{head('റുക്കുൻ')}{head('കർക്കുൻ')}{head('ആക്റ്റീവ് അസോസിയേറ്റ്')}</View><View style={styles.tr}>{cell(form.workers.rukkun ?? 0)}{cell(form.workers.karkun ?? 0)}{cell(form.workers.activeAssociate ?? 0)}</View></View>
      </View>
    )}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-എ • Expansion മായി ബന്ധപെട്ട് നടന്ന പ്രവർത്തനങ്ങൾ</Text>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 9, marginBottom: 4 }}>A സ്കോഡുകൾ: {form.partA?.codes || '-'}</Text>
      </View>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 9, marginBottom: 4 }}>സംസാരിച്ചവർ വ്യക്തികൾ:</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 8 }}>ആൺ: {form.partA?.spokenPersons?.male || 0}</Text>
          <Text style={{ fontSize: 8 }}>പെൺ : {form.partA?.spokenPersons?.female || 0}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 9, marginBottom: 4 }}>ഏത് കാറ്റഗറിയിൽ പെട്ടവരോടാണ് സംസാരിച്ചവർ:</Text>
      <GenderCountGrid 
        genderData={form.partA?.authorityPersonsGender} 
        countData={form.partA?.authorityPersonsCounts} 
        options={authorityPersonsOptions} 
      />
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ബി • ഏത് കാറ്റഗരിയിൽപെട്ടവരാണ് വന്നത്</Text>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 9, marginBottom: 4 }}>പുതിയ JIH അംഗങ്ങൾ:</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 8 }}>ആൺ: {form.partB?.newJIHMembers?.male || 0}</Text>
          <Text style={{ fontSize: 8 }}>പെൺ : {form.partB?.newJIHMembers?.female || 0}</Text>
        </View>
      </View>
      <GenderCountGrid 
        genderData={form.partB?.memberCategoriesGender} 
        countData={form.partB?.memberCategoriesCounts} 
        options={memberCategoriesOptions} 
      />
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-സി • പൊതു മീറ്റിംഗ് ഹാജർ</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 8 }}>ആൺ: {form.partC?.publicMeetingAttendees?.male || 0}</Text>
        <Text style={{ fontSize: 8 }}>പെൺ : {form.partC?.publicMeetingAttendees?.female || 0}</Text>
      </View>
    </View>
    {form.partD?.growthAcceleration && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ഭാഗം-ഡി • Growth Acceleration</Text>
        <View style={styles.table}>
          <View style={styles.tr}>{head('വിംഗ്')}{head('എണ്ണം')}</View>
          {Object.entries(form.partD.growthAcceleration).map(([w, v], i) => (<View key={i} style={styles.tr}>{cell(w)}{cell(v ?? 0)}</View>))}
        </View>
      </View>
    )}
  </Page>
);

export const downloadFormPDF = async (form) => {
  if (!form) return;
  
  const Doc = () => (
    <Document>
      {form.formType === 'district' && <DistrictFormPage form={form} />} 
      {form.formType === 'area' && <AreaFormPage form={form} />} 
      {form.formType === 'unit' && <UnitFormPage form={form} />}
    </Document>
  );
  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `form-${form.formType || 'unknown'}-${form._id?.slice(-6) || 'doc'}.pdf`; a.click();
  URL.revokeObjectURL(url);
};

export const downloadAllFormsPDF = async (forms) => {
  if (!Array.isArray(forms) || forms.length === 0) return;
  const Doc = () => (
    <Document>
      {forms.map((form, i) => (
        form.formType === 'district' ? <DistrictFormPage key={i} form={form} /> : 
        form.formType === 'area' ? <AreaFormPage key={i} form={form} /> : 
        <UnitFormPage key={i} form={form} />
      ))}
    </Document>
  );
  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  // Determine the level for filename (if all forms are same type, use that type)
  const types = [...new Set(forms.map(f => f.formType))];
  const typeSuffix = types.length === 1 ? types[0] : 'mixed';
  
  a.href = url; a.download = `forms-${typeSuffix}-${new Date().toISOString().slice(0,10)}.pdf`; a.click();
  URL.revokeObjectURL(url);
};
