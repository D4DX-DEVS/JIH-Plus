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

// Using standardized styles from central config with enhanced spacing
const styles = StyleSheet.create({
  page: PDF_STYLES.page,
  header: {
    ...PDF_STYLES.header,
    borderBottom: 'none', // Monthly reports don't need border
    marginBottom: 16, // Extra space after header
  },
  logo: PDF_STYLES.logo,
  title: PDF_STYLES.documentTitle,
  sub: PDF_STYLES.subtitle,
  chipRow: {
    ...PDF_STYLES.chipRow,
    marginBottom: 12, // Increased from 8 to 12
  },
  chip: PDF_STYLES.chip,
  section: {
    ...PDF_STYLES.section,
    marginTop: 12,    // Added top margin for better separation
    marginBottom: 14, // Increased bottom margin
  },
  sectionTitle: {
    ...PDF_STYLES.sectionTitle,
    marginBottom: 8,  // More space after section title
    paddingTop: 2,    // Small padding on top
  },
  table: PDF_TABLE_STYLES.table,
  tr: PDF_TABLE_STYLES.tableRow,
  th: PDF_TABLE_STYLES.tableHeaderCell,
  td: PDF_TABLE_STYLES.tableCell,
  // Additional spacing for text elements
  text: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodyRegular,
    marginBottom: 4,
    lineHeight: 1.5,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },
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
  
  // Define column widths for proper alignment
  const colWidths = {
    wing: '25%',
    present: '25%',
    leave: '25%',
    absent: '25%',
  };
  
  return (
    <View style={styles.table}>
      <View style={styles.tr}>
        {head('വിംഗ്', { width: colWidths.wing })}
        {head('ഹാജർ', { width: colWidths.present })}
        {head('ലീവ്', { width: colWidths.leave })}
        {head('അനുപസ്ഥിതി', { width: colWidths.absent })}
      </View>
      {rows.map(r => (
        <View key={r.k} style={styles.tr}>
          {cell(r.l, { width: colWidths.wing })}
          {cell(attendance?.[r.k]?.present ?? 0, { width: colWidths.present })}
          {cell(attendance?.[r.k]?.leave ?? 0, { width: colWidths.leave })}
          {cell(attendance?.[r.k]?.absent ?? 0, { width: colWidths.absent })}
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
        <Text key={i} style={{ 
          fontSize: 9, 
          marginBottom: 3,  // Added spacing between items
          lineHeight: 1.4,
          fontFamily: PDF_TYPOGRAPHY.fonts.primary,
        }}>{`${k.replace(/([A-Z])/g, ' $1')} : ${v ? 'അതെ' : 'അല്ല'}`}</Text>
      ))}
    </View>
  );
};

const GenderBooleanGrid = ({ obj }) => {
  if (!obj) return null;
  
  const categoryLabels = {
    qscStudent: 'QSC പഠിതാവ്',
    regularKhutbaListener: 'സ്ഥിരമായി ഖുതുബ കേൾക്കുന്നയാള്‍',
    prabodhanamReader: 'പ്രബോധനം വായനക്കാരന്‍',
    jaBeneficiary: 'PF ഗുണഭോക്താവ്',
    adaBeneficiary: 'BZ ഗുണഭോക്താവ്',
    localReliefBeneficiary: 'പ്രാദേശിക റിലീഫ് ഗുണഭോക്താവ്',
    aaramamReader: 'ആരാമം വായനക്കാരി',
    thawheedulMaraStudent: 'തംഹീദുല്‍ മർഅ പഠിതാവ്',
    madrasaAlumni: 'മദ്‌റസ പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി',
    islamicCollegeAlumni: 'ഇസ്്‌ലാമിയ കോളജ് പൂര്‍വ്വ വിദ്യാര്‍ത്ഥി',
    neighborhoodMember: 'അയൽകൂട്ടം അംഗം',
    palliativeConnection: 'പാലിയേറ്റീവ് ബന്ധം',
    friendsClubMember: 'Friends Club അംഗം',
    mediaReader: 'മാധ്യമം വായനക്കാരന്‍',
    ayahDarsQuranStudent: 'ആയാത് ദർസെ ഖുര്‍ആന്‍ പഠിതാവ്',
    heavenGuardian: 'ഹെവൻസിലെ രക്ഷിതാവ്',
    schoolGuardian: 'സ്‌കൂളിലെ രക്ഷിതാവ്',
    arabicCollegeGuardian: 'അറബികോളജ് രക്ഷിതാവ്',
    arabicCollegeStudent: 'അറബിക് കോളജ് വിദ്യാര്‍ത്ഥി',
    artsCollegeStudent: 'ആർട്‌സ് കോളജ് വിദ്യാര്‍ത്ഥി',
    artsCollegeGuardian: 'ആർട്‌സ് കോളജ് രക്ഷിതാവ്',
    publicCampusStudent: 'പൊതു കാമ്പസിലെ വിദ്യാര്‍ത്ഥി',
    otherNGOs: 'മറ്റു NGO കള്‍',
    mahallConnection: 'മഹല്ല് മുഖേനയുള്ള ബന്ധം',
    fulltimeWorkerConnection: 'ഫുള്‍െൈടം പ്രവർത്തകനുമായുള്ള ബന്ധം'
  };
  
  const entries = Object.entries(obj).filter(([k, v]) => v && (v.male || v.female));
  
  if (entries.length === 0) {
    return <Text style={{ fontSize: 9, color: '#6B7280' }}>ഒരു വിഭാഗവും തിരഞ്ഞെടുത്തിട്ടില്ല</Text>;
  }
  
  return (
    <View>
      {entries.map(([k, v], i) => {
        const label = categoryLabels[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).replace(/_/g, ' ');
        const genders = [];
        if (v.male) genders.push('ആണ്‍');
        if (v.female) genders.push('പെണ്‍');
        
        return (
          <Text key={i} style={{ 
            fontSize: 9, 
            marginBottom: 3,  // Increased from 2 to 3 for better spacing
            lineHeight: 1.4,
            fontFamily: PDF_TYPOGRAPHY.fonts.primary,
          }}>
            {`${label} : ${genders.join(', ')}`}
          </Text>
        );
      })}
    </View>
  );
};

const DistrictMonthlyPage = ({ s }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Image src={jihLogo} style={styles.logo} />
      <View>
        <Text style={styles.title}>ജില്ലാ പ്രതിമാസ  റിപ്പോർട്ട്</Text>
        <Text style={styles.sub}>{s.district} • {s.month}</Text>
      </View>
    </View>
    <View style={styles.chipRow}>
      <Text style={styles.chip}>സമർപ്പിച്ചത്: {s.submittedBy || '-'}</Text>
      <Text style={styles.chip}>തിയ്യതി: {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '-'}</Text>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-എ • ഹാജർ</Text>
      <AttendanceTable attendance={s.partA?.attendance} />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ബി • ഫോക്കസ് മേഖലകൾ</Text>
      <BooleanGrid obj={s.partB?.focusAreas} />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-സി • കമ്മിറ്റി പ്രവർത്തനങ്ങൾ</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          {head('വിംഗ്', { width: '20%' })}
          {head('മാപകം', { width: '60%' })}
          {head('എണ്ണം', { width: '20%' })}
        </View>
        <View style={styles.tr}>
          {cell('JIH', { width: '20%' })}
          {cell('Component Visits', { width: '60%' })}
          {cell(s.partC?.activities?.jih?.componentVisits ?? 0, { width: '20%' })}
        </View>
        <View style={styles.tr}>
          {cell('വനിത', { width: '20%' })}
          {cell('Area Visits', { width: '60%' })}
          {cell(s.partC?.activities?.vanitha?.areaVisits ?? 0, { width: '20%' })}
        </View>
        <View style={styles.tr}>
          {cell('Solidarity', { width: '20%' })}
          {cell('New Component Attempts', { width: '60%' })}
          {cell(s.partC?.activities?.solidarity?.newComponentFormationAttempts ?? 0, { width: '20%' })}
        </View>
        <View style={styles.tr}>
          {cell('SIO', { width: '20%' })}
          {cell('New Person Connections', { width: '60%' })}
          {cell(s.partC?.activities?.sio?.newPersonConnections ?? 0, { width: '20%' })}
        </View>
        <View style={styles.tr}>
          {cell('GIO', { width: '20%' })}
          {cell('New Person Connections', { width: '60%' })}
          {cell(s.partC?.activities?.gio?.newPersonConnections ?? 0, { width: '20%' })}
        </View>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ഡി • ക്ഷണങ്ങൾ</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          {head('ആൺ ', { width: '50%' })}
          {head('പെൺ ', { width: '50%' })}
        </View>
        <View style={styles.tr}>
          {cell(s.partD?.invitations?.male ?? 0, { width: '50%' })}
          {cell(s.partD?.invitations?.female ?? 0, { width: '50%' })}
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <GenderBooleanGrid obj={s.partD?.categories} />
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ഇ • വളർച്ച</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          {head('വിംഗ്', { width: '34%' })}
          {head('പുതിയ ഘടകങ്ങൾ', { width: '33%' })}
          {head('പുതിയ അംഗങ്ങൾ', { width: '33%' })}
        </View>
        {Object.entries(s.partE?.wingGrowth || {}).map(([w, v]) => (
          <View key={w} style={styles.tr}>
            {cell(w, { width: '34%' })}
            {cell(v?.newComponents ?? 0, { width: '33%' })}
            {cell(v?.newMembers ?? 0, { width: '33%' })}
          </View>
        ))}
      </View>
    </View>
  </Page>
);

const AreaMonthlyPage = ({ s }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Image src={jihLogo} style={styles.logo} />
      <View>
        <Text style={styles.title}>ഏരിയ പ്രതിമാസ  റിപ്പോർട്ട്</Text>
        <Text style={styles.sub}>{s.district} • {s.area} • {s.month}</Text>
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-എ</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          {head('KH', { width: '50%' })}
          {head('VKH', { width: '50%' })}
        </View>
        <View style={styles.tr}>
          {cell(s.partA?.kh ?? 0, { width: '50%' })}
          {cell(s.partA?.vkh ?? 0, { width: '50%' })}
        </View>
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ബി</Text>
      <Text style={{ fontSize: 9, marginBottom: 6, lineHeight: 1.4 }}>മാസ മീറ്റിംഗ്: {s.partB?.monthlyMeeting || '-'}</Text>
      <Text style={{ fontSize: 9, marginTop: 6, marginBottom: 4, fontWeight: 'bold' }}>വിംഗ് ഹാജർ</Text>
      <AttendanceTable attendance={s.partB?.wingAttendance} />
      {Array.isArray(s.partB?.mainDecisions) && s.partB.mainDecisions.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 9, marginBottom: 4, fontWeight: 'bold' }}>പ്രധാന തീരുമാനങ്ങൾ</Text>
          {s.partB.mainDecisions.map((d, i) => (<Text key={i} style={{ fontSize: 9, marginBottom: 3, lineHeight: 1.4 }}>• {d}</Text>))}
        </View>
      )}
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-സി</Text>
      <View style={{ marginTop: 4 }}>
        <BooleanGrid obj={s.partC?.expansionActivities} />
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ഡി</Text>
      {s.partD?.activities ? (
        <View style={styles.table}>
          <View style={styles.tr}>
            {head('വിംഗ്', { width: '15%' })}
            {head('ഘടക സന്ദർശനങ്ങൾ', { width: '25%' })}
            {head('പുതിയ ഘടക ശ്രമങ്ങൾ', { width: '30%' })}
            {head('പുതിയ വ്യക്തി കണ്ടെത്തൽ ശ്രമങ്ങൾ', { width: '30%' })}
          </View>
          {Object.entries(s.partD.activities).map(([wing, data]) => (
            <View key={wing} style={styles.tr}>
              {cell(wing, { width: '15%' })}
              {cell(data.componentVisits ?? 0, { width: '25%' })}
              {cell(data.newComponentAttempts === 1 ? 'അതെ' : data.newComponentAttempts === 0 ? 'അല്ല' : '-', { width: '30%' })}
              {cell(data.newPersonDiscoveryAttempts === 1 ? 'അതെ' : data.newPersonDiscoveryAttempts === 0 ? 'അല്ല' : '-', { width: '30%' })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ഇ</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          {head('ആൺ ', { width: '50%' })}
          {head('പെൺ ', { width: '50%' })}
        </View>
        <View style={styles.tr}>
          {cell(s.partE?.male ?? 0, { width: '50%' })}
          {cell(s.partE?.female ?? 0, { width: '50%' })}
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <GenderBooleanGrid obj={s.partE?.categories} />
      </View>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-എഫ്</Text>
      <View style={styles.table}>
        <View style={styles.tr}>
          {head('വിംഗ്', { width: '34%' })}
          {head('പുതിയ ഘടകങ്ങൾ', { width: '33%' })}
          {head('പുതിയ അംഗങ്ങൾ', { width: '33%' })}
        </View>
        {Object.entries(s.partF?.wingGrowth || {}).map(([w, v]) => (
          <View key={w} style={styles.tr}>
            {cell(w, { width: '34%' })}
            {cell(v?.newComponents ?? 0, { width: '33%' })}
            {cell(v?.newMembers ?? 0, { width: '33%' })}
          </View>
        ))}
      </View>
    </View>
  </Page>
);

const UnitMonthlyPage = ({ s }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <Image src={jihLogo} style={styles.logo} />
      <View>
        <Text style={styles.title}>യൂണിറ്റ് പ്രതിമാസ  റിപ്പോർട്ട്</Text>
        <Text style={styles.sub}>{s.district} • {s.area} • {s.component || s.unit} • {s.month}</Text>
      </View>
    </View>
    <View style={styles.chipRow}>
      <Text style={styles.chip}>സമർപ്പിച്ചത്: {s.submittedByName || s.submittedBy || '-'}</Text>
      <Text style={styles.chip}>തിയ്യതി: {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '-'}</Text>
    </View>

    {/* Workers Information */}
    {s.workers && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>പ്രവർത്തകർ</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            {head('റുക്കുൻ', { width: '33.33%' })}
            {head('കർക്കുൻ', { width: '33.33%' })}
            {head('ആക്റ്റീവ് അസോസിയേറ്റ്', { width: '33.34%' })}
          </View>
          <View style={styles.tr}>
            {cell(s.workers.rukkun ?? 0, { width: '33.33%' })}
            {cell(s.workers.karkun ?? 0, { width: '33.33%' })}
            {cell(s.workers.activeAssociate ?? 0, { width: '33.34%' })}
          </View>
        </View>
      </View>
    )}

    {/* Part A - Authority Persons */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-എ • അധികാര വ്യക്തികൾ</Text>
      
      {/* Codes */}
      {s.partA?.codes && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 3 }}>കോഡുകൾ:</Text>
          <Text style={{ fontSize: 8, lineHeight: 1.4 }}>{s.partA.codes}</Text>
        </View>
      )}

      {/* Spoken Persons */}
      <View style={styles.table}>
        <View style={styles.tr}>
          {head('സംസാരിച്ച ആൺ ', { width: '50%' })}
          {head('സംസാരിച്ച പെൺ ', { width: '50%' })}
        </View>
        <View style={styles.tr}>
          {cell(s.partA?.spokenPersons?.male ?? 0, { width: '50%' })}
          {cell(s.partA?.spokenPersons?.female ?? 0, { width: '50%' })}
        </View>
      </View>

      {/* Authority Persons Gender */}
      <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>ഏത് വിഭാഗത്തിൽ പെട്ടവരോടാണ് സംസാരിച്ചത്:</Text>
      <View style={{ marginTop: 4 }}>
        <GenderBooleanGrid obj={s.partA?.authorityPersonsGender} />
      </View>

      {/* Authority Other Text */}
      {s.partA?.authorityOtherText && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 3 }}>മറ്റുള്ളവ (വ്യക്തമാക്കുക):</Text>
          <Text style={{ fontSize: 8, lineHeight: 1.4 }}>{s.partA.authorityOtherText}</Text>
        </View>
      )}
    </View>

    {/* Part B - New JIH Members */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ഭാഗം-ബി • പുതിയ JIH അംഗങ്ങൾ</Text>
      
      {/* New JIH Members */}
      <View style={styles.table}>
        <View style={styles.tr}>
          {head('പുതിയ JIH അംഗങ്ങൾ (ആണ്‍)', { width: '50%' })}
          {head('പുതിയ JIH അംഗങ്ങൾ (പെണ്‍)', { width: '50%' })}
        </View>
        <View style={styles.tr}>
          {cell(s.partB?.newJIHMembers?.male ?? 0, { width: '50%' })}
          {cell(s.partB?.newJIHMembers?.female ?? 0, { width: '50%' })}
        </View>
      </View>

      {/* Member Categories Gender */}
      <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>അംഗ വിഭാഗങ്ങൾ:</Text>
      <View style={{ marginTop: 4 }}>
        <GenderBooleanGrid obj={s.partB?.memberCategoriesGender} />
      </View>
    </View>

    {/* Part C - Growth Acceleration */}
    {s.partC?.growthAcceleration && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ഭാഗം-സി • വളർച്ചാ ത്വരണം</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            {head('വിംഗ്', { width: '50%' })}
            {head('എണ്ണം', { width: '50%' })}
          </View>
          {Object.entries(s.partC.growthAcceleration).map(([w, v], i) => (
            <View key={i} style={styles.tr}>
              {cell(w === 'rukkun' ? 'റുക്കുൻ' : w === 'karkun' ? 'കർക്കുൻ' : w === 'solidarity' ? 'സോളിഡാരിറ്റി' : w === 'sio' ? 'SIO' : w === 'gio' ? 'GIO' : w, { width: '50%' })}
              {cell(v ?? 0, { width: '50%' })}
            </View>
          ))}
        </View>
      </View>
    )}
  </Page>
);

export const downloadMonthlyDetailPDF = async (survey) => {
  if (!survey) return;
  const s = survey;
  
  // Helper function to determine survey level (same logic as AdminDashboardPage)
  const normalizeLevel = (s) => s?.submissionLevel || (s?.area ? 'area' : s?.component ? 'unit' : 'district');
  const level = normalizeLevel(s);
  
  const Doc = () => (
    <Document>
      {level === 'district' && <DistrictMonthlyPage s={s} />} 
      {level === 'area' && <AreaMonthlyPage s={s} />} 
      {level === 'unit' && <UnitMonthlyPage s={s} />}
    </Document>
  );
  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `monthly-${level}-${s._id?.slice(-6) || 'doc'}.pdf`; a.click();
  URL.revokeObjectURL(url);
};

export const downloadAllMonthlyAsPDF = async (surveys) => {
  if (!Array.isArray(surveys) || surveys.length === 0) return;
  
  // Helper function to determine survey level (same logic as AdminDashboardPage)
  const normalizeLevel = (s) => s?.submissionLevel || (s?.area ? 'area' : s?.component ? 'unit' : 'district');
  
  const Doc = () => (
    <Document>
      {surveys.map((s, i) => {
        const level = normalizeLevel(s);
        return level === 'district' ? 
          <DistrictMonthlyPage key={i} s={s} /> : 
          level === 'area' ? 
          <AreaMonthlyPage key={i} s={s} /> : 
          <UnitMonthlyPage key={i} s={s} />;
      })}
    </Document>
  );
  const blob = await pdf(<Doc />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  // Determine the level for filename (if all surveys are same level, use that level)
  const levels = [...new Set(surveys.map(s => normalizeLevel(s)))];
  const levelSuffix = levels.length === 1 ? levels[0] : 'mixed';
  
  a.href = url; a.download = `monthly-${levelSuffix}-${new Date().toISOString().slice(0,10)}.pdf`; a.click();
  URL.revokeObjectURL(url);
};


