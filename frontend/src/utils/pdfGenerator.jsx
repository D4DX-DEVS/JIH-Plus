import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import NotoSerifMalayalam from '../assets/fonts/NotoSerifMalayalam-Regular.ttf';
import jihLogo from '../assets/LogoColor.png';

// Import centralized PDF styling
import {
  PDF_BRANDING,
  PDF_TYPOGRAPHY,
  PDF_SPACING,
  PDF_STYLES,
  PDF_TABLE_STYLES,
  safeToString as safePDFString,
  formatDate,
} from './pdfStyleConfig';

// Register the Malayalam font
Font.register({
  family: 'Noto Serif Malayalam',
  src: NotoSerifMalayalam,
});

// Create styles with Malayalam font and compact design
// Using centralized PDF styling constants
const styles = StyleSheet.create({
  page: PDF_STYLES.page,
  header: PDF_STYLES.header,
  logo: PDF_STYLES.logo,
  titleContainer: PDF_STYLES.titleContainer,
  mainTitle: {
    ...PDF_STYLES.pageTitle,
    fontSize: 16, // Standardized from 18px
  },
  subtitle: PDF_STYLES.subtitle,

  districtField: PDF_STYLES.field,
  districtLabel: PDF_STYLES.fieldLabel,
  districtValue: PDF_STYLES.fieldValue,
  section: PDF_STYLES.section,
  sectionTitle: PDF_STYLES.sectionTitle,

  table: PDF_TABLE_STYLES.table,
  tableRow: PDF_TABLE_STYLES.tableRow,
  tableHeader: PDF_TABLE_STYLES.tableHeader,
  tableCell: PDF_TABLE_STYLES.tableCell,
  tableHeaderCell: PDF_TABLE_STYLES.tableHeaderCell,
  tableCellWide: PDF_TABLE_STYLES.tableCellWideValue,
  tableHeaderCellWide: PDF_TABLE_STYLES.tableHeaderCellWide,
  tableCellNarrow: PDF_TABLE_STYLES.tableCellNarrowValue,
  tableHeaderCellNarrow: PDF_TABLE_STYLES.tableHeaderCellNarrow,
  grayCell: PDF_TABLE_STYLES.grayCell,
  row: {
    ...PDF_STYLES.bodyTextSmall,
    flexDirection: 'row',
    marginBottom: 3,
    borderBottom: `1px solid ${PDF_BRANDING.colors.tableHeaderBg}`,
    paddingBottom: 3,
  },
  label: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    fontWeight: PDF_TYPOGRAPHY.weights.bold,
    width: '40%',
    color: PDF_BRANDING.colors.textMuted,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },
  value: {
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    width: '50%',
    color: PDF_BRANDING.colors.secondary,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },
});



// Malayalam field mappings

const malayalamLabels = {

  // Basic Information

  district: 'ജില്ല',

  submittedBy: 'സമർപ്പിച്ചത്',

  submittedAt: 'സമർപ്പിച്ച തിയ്യതി',

  

  // Part A - Population Statistics

  totalPopulation: 'ആകെ ജനസംഖ്യ',

  muslimPercentage: 'മുസ്‌ലിം ശതമാനം',

  hinduPercentage: 'ഹിന്ദു ശതമാനം',

  christianPercentage: 'ക്രിസ്ത്യൻ ശതമാനം',

  othersPercentage: 'മറ്റുള്ളവർ ശതമാനം',

  movementPercentage: 'പ്രസ്ഥാന ശതമാനം',

  majorityInReligiousOrganizations: 'മത സംഘടനകളിൽ ഭൂരിപക്ഷം',

  secondPosition: 'രണ്ടാം സ്ഥാനം',

  thirdPosition: 'മൂന്നാം സ്ഥാനം',

  ourPosition: 'നമ്മുടെ സ്ഥാനം',

  morePoliticalInfluence: 'കൂടുതൽ രാഷ്ട്രീയ സ്വാധീനം',

  

  // Part B - Organizations

  totalAreas: 'ആകെ മേഖലകൾ',

  components: 'ഘടകങ്ങൾ',

  workers2023: 'പ്രവർത്തകർ 2023',

  workers2025: 'പ്രവർത്തകർ 2025',

  

  // Organization names

  jih: 'JIH',

  vanitha: 'വനിത',

  solidarity: 'Solidarity',

  sio: 'SIO',

  gio: 'GIO',

  malarvadi: 'Malarvadi',

  teenIndia: 'Teen India',

  

  // Part C - Platforms

  count: 'എണ്ണം',

  cooperatingOthers: 'സഹകരിക്കുന്ന മറ്റുള്ളവർ',

  remarks: 'അഭിപ്രായങ്ങൾ',

  

  // Platform names

  friendshipPlatforms: 'സൗഹൃദ വേദികൾ',

  fridayClub: 'Friday Club/ Friends Forum',

  wings: 'Wings',

  neighborhoodGroups: 'അയൽക്കൂട്ടങ്ങൾ',

  otherNGOs: 'മറ്റു NGO കൾ',

  palliative: 'പാലിയേറ്റീവ്',

  otherActivities: ' പ്രവർത്തനങ്ങൾ',

  

  // Part D - Systems

  interestFreeSystems: 'പലിശരഹിത സംവിധാനം',

  zakatCommittee: 'സകാത് കമ്മിറ്റി',

  areas: 'മേഖലകൾ',

  ourAreas: 'നമ്മുടെ മേഖലകൾ',

  registeredNonOurFamilies: 'രജിസ്റ്റർ ചെയ്ത  കുടുംബങ്ങൾ',

  peoplesFoundationBeneficiaries: 'പീപ്പിൾസ് ഫൗണ്ടേഷൻ ലഭിക്കുന്നവർ',

  housingProjectBeneficiaries: 'വീട് പദ്ധതി ലഭിക്കുന്നവർ',

  baytulZakatBeneficiaries: 'ബൈത്തുൽ സകാത് ലഭിക്കുന്നവർ',

  nonWorkersinMadhyamamReaders: 'മധ്യമം വായനക്കാർ (പ്രവർത്തകരല്ലാത്തവർ)',

  nonWorkersinPrabodhanamReaders: 'പ്രബോധനം വായനക്കാർ (പ്രവർത്തകരല്ലാത്തവർ)',

  beneficiariesLast3Years: 'കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം',

  

  // Part E - Additional Information

  areasWithoutOurPresence: 'നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത മുസ്‌ലിം ഭൂരിപക്ഷ പ്രദേശങ്ങൾ',

  areasWithOurPresence: 'നമ്മുടെ സാന്നിദ്ധ്യമുള്ള മുസ്‌ലിം ഭൂരിപക്ഷ പ്രദേശങ്ങൾ',

  areasWithMinorityMuslims: 'മുസ്‌ലിം ന്യൂനപക്ഷ പ്രദേശങ്ങൾ',

  componentsToFormIn6Months: 'ആറ് മാസത്തിനുള്ളിൽ രൂപീകരിക്കേണ്ട ഘടകങ്ങൾ',

  futurePlans: 'ഭാവി പദ്ധതികൾ',

  challenges: 'ആവശ്യങ്ങൾ/പ്രശ്നങ്ങൾ',

  suggestions: 'നിർദ്ദേശങ്ങൾ'

};



// English field mappings for fallback

const englishLabels = {

  // Basic Information

  district: 'District',

  submittedBy: 'Submitted By',

  submittedAt: 'Submitted At',

  

  // Part A - Population Statistics

  totalPopulation: 'Total Population',

  muslimPercentage: 'Muslim Percentage',

  hinduPercentage: 'Hindu Percentage',

  christianPercentage: 'Christian Percentage',

  othersPercentage: 'Others Percentage',

  movementPercentage: 'Movement Percentage',

  majorityInReligiousOrganizations: 'Majority in Religious Organizations',

  secondPosition: 'Second Position',

  thirdPosition: 'Third Position',

  ourPosition: 'Our Position',

  morePoliticalInfluence: 'More Political Influence',

  

  // Part B - Organizations

  totalAreas: 'Total Areas',

  components: 'Components',

  workers2023: 'Workers 2023',

  workers2025: 'Workers 2025',

  

  // Organization names

  jih: 'JIH',

  vanitha: 'Vanitha',

  solidarity: 'Solidarity',

  sio: 'SIO',

  gio: 'GIO',

  malarvadi: 'Malarvadi',

  teenIndia: 'Teen India',

  

  // Part C - Platforms

  count: 'Count',

  cooperatingOthers: 'Cooperating Others',

  remarks: 'Remarks',

  

  // Platform names

  friendshipPlatforms: 'Friendship Platforms',

  fridayClub: 'Friday Club/ Friends Forum',

  wings: 'Wings',

  neighborhoodGroups: 'Neighborhood Groups',

  otherNGOs: 'Other NGOs',

  palliative: 'Palliative',

  otherActivities: 'Other Activities',

  

  // Part D - Systems

  interestFreeSystems: 'Interest Free Systems',

  zakatCommittee: 'Zakat Committee',

  areas: 'Areas',

  ourAreas: 'Our Areas',

  registeredNonOurFamilies: 'Registered Non-Our Families',

  peoplesFoundationBeneficiaries: 'Peoples Foundation Beneficiaries',

  housingProjectBeneficiaries: 'Housing Project Beneficiaries',

  baytulZakatBeneficiaries: 'Baytul Zakat Beneficiaries',

  nonWorkersinMadhyamamReaders: 'Non-Workers in Madhyamam Readers',

  nonWorkersinPrabodhanamReaders: 'Non-Workers in Prabodhanam Readers',

  beneficiariesLast3Years: 'Beneficiaries Last 3 Years',

  

  // Part E - Additional Information

  areasWithoutOurPresence: 'Areas Without Our Presence',

  areasWithOurPresence: 'Areas With Our Presence',

  areasWithMinorityMuslims: 'Areas With Minority Muslims',

  componentsToFormIn6Months: 'Components To Form In 6 Months',

  futurePlans: 'Future Plans',

  challenges: 'Challenges',

  suggestions: 'Suggestions'

};



// Helper function to format form data for PDF

const formatFormData = (form) => {

  const formattedData = {

    district: form.district || '-',

    submittedBy: form.submittedBy || '-',

    submittedAt: form.submittedAt ? new Date(form.submittedAt).toLocaleDateString() : '-',

    partA: form.partA || {},

    partB: form.partB || {},

    partC: form.partC || {},

    partD: form.partD || {},

    partE: form.partE || {}

  };

  return formattedData;

};



// Using centralized helper function from pdfStyleConfig
// (safePDFString is imported as safePDFString from pdfStyleConfig)
const safeToString = safePDFString;



// Function to generate and download PDF for single form

export const downloadSingleFormPDF = async (form) => {

  try {

    console.log('Starting PDF generation...');

    

    if (!form) {

      throw new Error('Form data is required');

    }

    

    // Validate form structure

    if (typeof form !== 'object') {

      throw new Error('Invalid form data structure');

    }

    

    const data = formatFormData(form);

    

    // Ensure all required data exists with fallbacks

    const safeData = {

      district: data.district || 'Unknown District',

      submittedBy: data.submittedBy || 'Unknown User',

      submittedAt: data.submittedAt || 'Unknown Date',

      partA: data.partA || {},

      partB: data.partB || {},

      partC: data.partC || {},

      partD: data.partD || {},

      partE: data.partE || {}

    };

    

    const MyDocument = () => {

      // Ensure all text content is properly sanitized

      const sanitizedDistrict = safeToString(safeData.district);

      

      return (

        <Document>

          <Page size="A4" style={styles.page}>

            <View style={styles.header}>

              <Image src={jihLogo} style={styles.logo} />

              <View style={styles.titleContainer}>

                <Text style={styles.mainTitle}>ORGANISATION EXPANSION</Text>

                <Text style={styles.subtitle}>Data Analysing (Dist Level) Aug. 2025</Text>

              </View>

            </View>



            <View style={styles.districtField}>

              <Text style={styles.districtLabel}>ജില്ല:</Text>

              <Text style={styles.districtValue}>{sanitizedDistrict}</Text>

            </View>



          {/* Part A - General Information */}

          <View style={styles.section}>

            <Text style={styles.sectionTitle}>PART-A (പൊതു വിവരങ്ങൾ)</Text>

            

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>ഡാറ്റ</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>1. ജനസംഖ്യ (ആകെ)</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.totalPopulation || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>2. മുസ്‌ലിം %</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.muslimPercentage || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>3. ഹിന്ദു %</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.hinduPercentage || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>4. ക്രിസ്ത്യൻ %</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.christianPercentage || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>5. മറ്റുള്ളവർ %</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.othersPercentage || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>6. പ്രസ്ഥാനം %</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partA?.movementPercentage || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>7. മതസംഘടനകളിൽ ഭൂരിപക്ഷം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.majorityInReligiousOrganizations || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>8. രണ്ടാം സ്ഥാനം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.secondPosition || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>9. മൂന്നാം സ്ഥാനം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.thirdPosition || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>10. നമ്മുടെ സ്ഥാനം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.ourPosition || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>11. കൂടുതൽ രാഷ്ട്രീയ സ്വാധീനം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.morePoliticalInfluence || '')}</Text>

              </View>

            </View>

          </View>



          {/* Part B - Organizational Structures */}

          <View style={styles.section}>

            <Text style={styles.sectionTitle}>PART-B (സംഘടനാ സംവിധാനങ്ങൾ)</Text>

            

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>JIH</Text>

                <Text style={styles.tableHeaderCellNarrow}>വനിത</Text>

                <Text style={styles.tableHeaderCellNarrow}>Solidarity</Text>

                <Text style={styles.tableHeaderCellNarrow}>SIO</Text>

                <Text style={styles.tableHeaderCellNarrow}>GIO</Text>

                <Text style={styles.tableHeaderCellNarrow}>Malarvadi</Text>

                <Text style={styles.tableHeaderCellNarrow}>Teen India</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>ആകെ ഏരിയകൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.totalAreas || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.totalAreas || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.totalAreas || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.totalAreas || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.totalAreas || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.totalAreas || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.totalAreas || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>ഘടകങ്ങൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.components || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.components || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.components || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.components || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.components || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.components || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.components || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>മീഖാത്തിന്റെ തുടക്കത്തിൽ പ്രവര്‍ത്തകരുടെ എണ്ണം (2023) ഉണ്ടായിരുന്നത്.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.workers2023 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.workers2023 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.workers2023 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.workers2023 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.workers2023 || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.workers2023 || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.workers2023 || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>ഇപ്പോൾ (2025) ഉള്ളത്.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.workers2025 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.workers2025 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.workers2025 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.workers2025 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.workers2025 || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.workers2025 || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.workers2025 || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>ഘടകങ്ങളുടെ എണ്ണം (2023 ൽ).</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.components2023 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.components2023 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.components2023 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.components2023 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.components2023 || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.components2023 || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.components2023 || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>ഘടകങ്ങളുടെ എണ്ണം (2025 ൽ).</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.components2025 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.components2025 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.components2025 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.components2025 || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.components2025 || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.components2025 || '')}</Text>

                <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.components2025 || '')}</Text>

              </View>

            </View>

          </View>



          {/* Part B - Additional Sections */}

          <View style={styles.section}>

            <Text style={styles.sectionTitle}>തംഹീദുല്‍ മർഅഃ</Text>

            

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>എണ്ണം</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>നിലവിലുള്ളത്.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.thawheedMaraa?.existing || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>പഠിതാക്കൾ.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.thawheedMaraa?.students || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>പ്രവർത്തകരല്ലാത്തവർ.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.thawheedMaraa?.nonWorkers || '')}</Text>

              </View>

            </View>

          </View>



          <View style={styles.section}>

            <Text style={styles.sectionTitle}>ജുമുഅത്ത് പള്ളികൾ.</Text>

            

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>എണ്ണം</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>എണ്ണം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.jumaMosques?.count || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>പങ്കെടുക്കുന്നവർ.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.jumaMosques?.averageAttendees || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>പ്രവർത്തകരല്ലാത്തവർ.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.jumaMosques?.nonWorkersApprox || '')}</Text>

              </View>

            </View>

          </View>



          <View style={styles.section}>

            <Text style={styles.sectionTitle}>വിദ്യാഭ്യാസ സ്ഥാപനങ്ങൾ</Text>

            

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>മദ്റസകൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>സ്കൂളുകൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>ഹെവൻസ്</Text>

                <Text style={styles.tableHeaderCellNarrow}>അറബി കോളേജുകൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>ആർട്സ് കോളേജുകൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>മെയിൻ കാമ്പസുകൾ</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>എണ്ണം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.count || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>കുട്ടികളുടെ എണ്ണം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.studentsCount || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.studentsCount || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.studentsCount || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.studentsCount || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.studentsCount || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.studentsCount || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>Staff - പ്രവർത്തകർ.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.staffWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.staffWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.staffWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.staffWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.staffWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.staffWorkers || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>Staff - മറ്റുള്ളവർ.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.staffOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.staffOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.staffOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.staffOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.staffOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.staffOthers || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>Non Teaching Staff - പ്രവർത്തകർ.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.nonTeachingWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.nonTeachingWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.nonTeachingWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.nonTeachingWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.nonTeachingWorkers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.nonTeachingWorkers || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>Non Teaching Staff - മറ്റുള്ളവർ.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.nonTeachingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.nonTeachingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.nonTeachingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.nonTeachingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.nonTeachingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.nonTeachingOthers || '')}</Text>

              </View>

            </View>

          </View>



          {/* Part C - Public Forums */}

          <View style={styles.section}>

            <Text style={styles.sectionTitle}>PART-C പൊതുവേദികൾ</Text>

            

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>എണ്ണം</Text>

                <Text style={styles.tableHeaderCellNarrow}>സഹകരിക്കുന്ന മറ്റുള്ളവർ</Text>

                <Text style={styles.tableHeaderCellNarrow}>Remarks</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>1. സൗഹൃദ വേദികൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.friendshipPlatforms?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.friendshipPlatforms?.cooperatingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.friendshipPlatforms?.remarks || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>2. Friday Club/ Friends Forum</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.fridayClub?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.fridayClub?.cooperatingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.fridayClub?.remarks || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>3. Wings</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.wings?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.wings?.cooperatingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.wings?.remarks || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>4. അയൽക്കൂട്ടങ്ങൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.neighborhoodGroups?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.neighborhoodGroups?.cooperatingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.neighborhoodGroups?.remarks || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>5. മറ്റു NGO കൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.otherNGOs?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.otherNGOs?.cooperatingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.otherNGOs?.remarks || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>6. പാലിയേറ്റീവ്</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.palliative?.count || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.palliative?.cooperatingOthers || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.palliative?.remarks || '')}</Text>

              </View>

            </View>

          </View>



          {/* Part D - Public Systems */}

          <View style={styles.section}>

            <Text style={styles.sectionTitle}>PART-D (പൊതുസംവിധാനങ്ങൾ)</Text>

            

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>എണ്ണം</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>1. പലിശരഹിത സംവിധാനം (എണ്ണം)</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.interestFreeSystems?.count || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.interestFreeSystems?.beneficiariesLast3Years || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>2. സകാത്ത് കമ്മറ്റി (എണ്ണം)</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.zakatCommittee?.count || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.zakatCommittee?.beneficiariesLast3Years || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>3. പീപ്പിൾസ് ഫൗണ്ടേഷനിൽ നിന്നും കഴിഞ്ഞ 3 വർഷത്തിനിടെ വ്യക്തിപരമായി സഹായം സ്വീകരിച്ച മറ്റുള്ളവർ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.peoplesFoundationBeneficiaries || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>4. ഹൗസിംഗ് പ്രൊജക്‌ടുകൾ, കുടിവെള്ളപദ്ധതികൾ തുടങ്ങിയ നമ്മുടെ സേവന പ്രൊജക്ടുകളുടെ കഴിഞ്ഞ 3 വർഷത്തിനിടെ ഗുണഭോക്താക്കളായ മറ്റുള്ളവർ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.housingProjectBeneficiaries || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>5. ബൈത്തുസ്സകാത്തിൽ നിന്നും കഴിഞ്ഞ 3 വർഷത്തിനിടെ വ്യക്തിപരമായി സഹായം സ്വീകരിച്ച മറ്റുള്ളവർ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.baytulZakatBeneficiaries || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>6. മാധ്യമം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ *.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.nonWorkersinMadhyamamReaders || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>7. പ്രബോധനം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ *.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.nonWorkersinPrabodhanamReaders || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>8. ആരാമം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ *.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.nonWorkersinAaramamReaders || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>9. ആയാത്ത് ദർസെ ഖുർആൻ സ്ഥിരമായി ഉപയോഗപ്പെടുത്തുന്ന പ്രവർത്തകരല്ലാത്തവർ *.</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.nonWorkersinAyahUsers || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>10. നമ്മുടെ മഹല്ലുകൾ (പൂർണം/ഭാഗികം)</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.areas?.ourAreas || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>ഇതിൽ രജിസ്റ്റർ ചെയ്‌ത നമ്മുടെതല്ലാത്ത കുടുംബങ്ങൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.areas?.registeredNonOurFamilies || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>11. നമുക്ക് സ്വാധീനമുള്ള (കമ്മറ്റി പ്രാതിനിധ്യം) മറ്റു പൊതു മഹല്ലുകൾ (എണ്ണം).</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.influentialMahalls || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>12. നമ്മുടെ ഖുതുബ ശ്രവിക്കാൻ വരുന്ന മറ്റുള്ളവരിൽ പ്രസ്ഥാനഘടനയിൽ ഉള്ള സ്ഥലത്തുനിന്നും വരുന്നവർ (എണ്ണം)</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.khutbaListenersfromOrganizedAreas || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>13. നമ്മുടെ ഖുതുബ ശ്രവിക്കാൻ വരുന്ന മറ്റുള്ളവരിൽ പ്രസ്ഥാന ഘടന ഇല്ലാത്ത സ്ഥലത്തുനിന്നും വരുന്നവർ (എണ്ണം)</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.khutbaListenersfromNonOrganizedAreas || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>14. ഫുൾടൈം പ്രവർത്തകരുണ്ടെങ്കിൽ (എണ്ണം)</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.FullTimeWorkers || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>15. പാർട് ടൈം പ്രവർത്തകരുണ്ടെങ്കിൽ (എണ്ണം)</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.PartTimeWorkers || '')}</Text>

              </View>

            </View>

          </View>



          {/* Part E - Additional Information */}

          <View style={styles.section}>

            <Text style={styles.sectionTitle}>PART-E (അധിക വിവരങ്ങൾ)</Text>

            

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                <Text style={styles.tableHeaderCellNarrow}>വിവരങ്ങൾ</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>1. നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത മുസ്‌ലിം ഭൂരിപക്ഷ പ്രദേശങ്ങൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.areasWithoutPresence?.description || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>തരം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.areasWithoutPresence?.type || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>2. നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത പഞ്ചായത്തുകൾ/ മുനിസിപ്പാലിറ്റികൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.panchayatsWithoutPresence || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>3. കഴിഞ്ഞ 5 വർഷത്തിനിടയിൽ പുതുതായി ഉണ്ടായ ഘടകങ്ങളുടെ എണ്ണം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.newComponentsLast5Years?.count || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>തരം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.newComponentsLast5Years?.type || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>വിശദ വിവരങ്ങൾ</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.newComponentsLast5Years?.details || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>4. കഴിഞ്ഞ 5 വർഷത്തിനിടയിൽ പ്രവർത്തകരുടെ വർധനവ്</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.workersGrowthInLast5Years?.count || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>വർധനവിന്റെ തരം</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.workersGrowthInLast5Years?.type || '')}</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellWide}>5. 6 മാസത്തിനുള്ളിൽ രൂപീകരിക്കാൻ സാധിക്കുന്ന ഘടകങ്ങൾ</Text>

                <Text style={styles.tableCellNarrow}></Text>

              </View>

            </View>

            

            {/* Components to Form in 6 Months Table */}

            <View style={styles.table}>

              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text style={styles.tableHeaderCellNarrow}>JIH</Text>

                <Text style={styles.tableHeaderCellNarrow}>വനിത</Text>

                <Text style={styles.tableHeaderCellNarrow}>Solidarity</Text>

                <Text style={styles.tableHeaderCellNarrow}>SIO</Text>

                <Text style={styles.tableHeaderCellNarrow}>GIO</Text>

                <Text style={styles.tableHeaderCellNarrow}>ടീൻ ഇന്ത്യ</Text>

                <Text style={styles.tableHeaderCellNarrow}>മലർവാടി</Text>

              </View>

              

              <View style={styles.tableRow}>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.jih || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.vanitha || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.solidarity || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.sio || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.gio || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.teenIndia || '')}</Text>

                <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.malarvadi || '')}</Text>

                {/* <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?)}</Text> */}

              </View>

            </View>

          </View>

        </Page>

      </Document>

    );

    };



    // Generate PDF with Malayalam font support

    console.log('Generating PDF with font: Noto Serif Malayalam');

    

    const blob = await pdf(<MyDocument />).toBlob();

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = `form-${safeToString(safeData.district)}-${form._id ? form._id.slice(-8) : 'unknown'}.pdf`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  } catch (error) {

    console.error('Error generating PDF:', error);

    throw error;

  }

};



// Function to generate and download PDF for all forms

export const downloadAllFormsPDF = async (forms) => {

  try {

    console.log('Starting PDF generation for all forms...');

    

    if (!forms || !Array.isArray(forms) || forms.length === 0) {

      throw new Error('Forms data is required and must be an array');

    }



    const MyDocument = () => (

      <Document>

        {forms.map((form, formIndex) => {

          const data = formatFormData(form);

          const safeData = {

            district: data.district || 'Unknown District',

            submittedBy: data.submittedBy || 'Unknown User',

            submittedAt: data.submittedAt || 'Unknown Date',

            partA: data.partA || {},

            partB: data.partB || {},

            partC: data.partC || {},

            partD: data.partD || {},

            partE: data.partE || {}

          };



          return (

            <Page key={formIndex} size="A4" style={styles.page}>

              <View style={styles.header}>

                <Image src={jihLogo} style={styles.logo} />

                <View style={styles.titleContainer}>

                  <Text style={styles.mainTitle}>ORGANISATION EXPANSION</Text>

                  <Text style={styles.subtitle}>Data Analysing (Dist Level) Aug. 2025</Text>

                </View>

              </View>



              <View style={styles.districtField}>

                <Text style={styles.districtLabel}>ജില്ല:</Text>

                <Text style={styles.districtValue}>{safeToString(safeData.district)}</Text>

              </View>



              {/* Part A - General Information */}

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>PART-A (പൊതു വിവരങ്ങൾ)</Text>

                

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>ഡാറ്റ</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>1. ജനസംഖ്യ (ആകെ)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.totalPopulation || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>2. മുസ്‌ലിം %</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.muslimPercentage || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>3. ഹിന്ദു %</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.hinduPercentage || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>4. ക്രിസ്ത്യൻ %</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.christianPercentage || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>5. മറ്റുള്ളവർ %</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.othersPercentage || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>6. പ്രസ്ഥാനം %</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partA?.movementPercentage || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>7. മതസംഘടനകളിൽ ഭൂരിപക്ഷം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.majorityInReligiousOrganizations || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>8. രണ്ടാം സ്ഥാനം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.secondPosition || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>9. മൂന്നാം സ്ഥാനം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.thirdPosition || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>10. നമ്മുടെ സ്ഥാനം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.ourPosition || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>11. കൂടുതൽ രാഷ്ട്രീയ സ്വാധീനം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partA?.morePoliticalInfluence || '')}</Text>

                  </View>

                </View>

              </View>



              {/* Part B - Organizational Structures */}

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>PART-B (സംഘടനാ സംവിധാനങ്ങൾ)</Text>

                

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>JIH</Text>

                    <Text style={styles.tableHeaderCellNarrow}>വനിത</Text>

                    <Text style={styles.tableHeaderCellNarrow}>Solidarity</Text>

                    <Text style={styles.tableHeaderCellNarrow}>SIO</Text>

                    <Text style={styles.tableHeaderCellNarrow}>GIO</Text>

                    <Text style={styles.tableHeaderCellNarrow}>Malarvadi</Text>

                    <Text style={styles.tableHeaderCellNarrow}>Teen India</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>ആകെ ഏരിയകൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.totalAreas || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.totalAreas || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.totalAreas || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.totalAreas || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.totalAreas || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.totalAreas || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.totalAreas || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>ഘടകങ്ങൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.components || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.components || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.components || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.components || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.components || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.components || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.components || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>മീഖാത്തിന്റെ തുടക്കത്തിൽ (2023) ഉണ്ടായിരുന്നവർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.workers2023 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.workers2023 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.workers2023 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.workers2023 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.workers2023 || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.workers2023 || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.workers2023 || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>ഇപ്പോൾ (2025) ഉള്ളവരുടെ എണ്ണം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.workers2025 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.workers2025 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.workers2025 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.workers2025 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.workers2025 || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.workers2025 || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.workers2025 || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>ഘടകങ്ങളുടെ എണ്ണം 2023</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.components2023 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.components2023 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.components2023 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.components2023 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.components2023 || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.components2023 || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.components2023 || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>ഘടകങ്ങളുടെ എണ്ണം 2025</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.jih?.components2025 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.vanitha?.components2025 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.solidarity?.components2025 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.sio?.components2025 || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.organizations?.gio?.components2025 || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.malarvadi?.components2025 || '')}</Text>

                    <Text style={[styles.tableCellNarrow, styles.grayCell]}>{safeToString(safeData.partB?.organizations?.teenIndia?.components2025 || '')}</Text>

                  </View>

                </View>

              </View>



              {/* Part B - Additional Sections */}

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>തൗഹീദ് & മറാഅ്</Text>

                

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>എണ്ണം</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>നിലവിലുള്ളത്</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.thawheedMaraa?.existing || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>വിദ്യാർത്ഥികൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.thawheedMaraa?.students || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>പ്രവർത്തകരല്ലാത്തവർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.thawheedMaraa?.nonWorkers || '')}</Text>

                  </View>

                </View>

              </View>



              <View style={styles.section}>

                <Text style={styles.sectionTitle}>ജുമാ പള്ളികൾ</Text>

                

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>എണ്ണം</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>എണ്ണം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.jumaMosques?.count || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>ശരാശരി പങ്കെടുക്കുന്നവർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.jumaMosques?.averageAttendees || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>പ്രവർത്തകരല്ലാത്തവർ (ഏകദേശം)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.jumaMosques?.nonWorkersApprox || '')}</Text>

                  </View>

                </View>

              </View>



              <View style={styles.section}>

                <Text style={styles.sectionTitle}>വിദ്യാഭ്യാസ സ്ഥാപനങ്ങൾ</Text>

                

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>മദ്റസകൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>സ്കൂളുകൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>ഹെവൻസ്</Text>

                    <Text style={styles.tableHeaderCellNarrow}>അറബി കോളേജുകൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>ആർട്സ് കോളേജുകൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>മെയിൻ കാമ്പസുകൾ</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>എണ്ണം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.count || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>കുട്ടികളുടെ എണ്ണം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.studentsCount || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.studentsCount || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.studentsCount || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.studentsCount || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.studentsCount || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.studentsCount || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>Staff - പ്രവർത്തകർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.staffWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.staffWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.staffWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.staffWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.staffWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.staffWorkers || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>Staff - മറ്റുള്ളവർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.staffOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.staffOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.staffOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.staffOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.staffOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.staffOthers || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>Non Teaching Staff - പ്രവർത്തകർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.nonTeachingWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.nonTeachingWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.nonTeachingWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.nonTeachingWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.nonTeachingWorkers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.nonTeachingWorkers || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>Non Teaching Staff - മറ്റുള്ളവർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.madrasas?.nonTeachingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.schools?.nonTeachingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.heavens?.nonTeachingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.arabicColleges?.nonTeachingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.artsColleges?.nonTeachingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partB?.institutions?.mainCampuses?.nonTeachingOthers || '')}</Text>

                  </View>

                </View>

              </View>



              {/* Part C - Public Forums */}

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>PART-C (പൊതുവേദികൾ)</Text>

                

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>എണ്ണം</Text>

                    <Text style={styles.tableHeaderCellNarrow}>സഹകരിക്കുന്ന മറ്റുള്ളവർ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>Remarks</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>1. സൗഹൃദ വേദികൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.friendshipPlatforms?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.friendshipPlatforms?.cooperatingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.friendshipPlatforms?.remarks || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>2. Friday Club/ Friends Forum</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.fridayClub?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.fridayClub?.cooperatingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.fridayClub?.remarks || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>3. Wings</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.wings?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.wings?.cooperatingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.wings?.remarks || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>4. അയൽക്കൂട്ടങ്ങൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.neighborhoodGroups?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.neighborhoodGroups?.cooperatingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.neighborhoodGroups?.remarks || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>5. മറ്റു NGO കൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.otherNGOs?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.otherNGOs?.cooperatingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.otherNGOs?.remarks || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>6. പാലിയേറ്റീവ്</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.palliative?.count || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.palliative?.cooperatingOthers || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partC?.palliative?.remarks || '')}</Text>

                  </View>

                </View>

              </View>



              {/* Part D - Public Systems */}

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>PART-D (പൊതുസംവിധാനങ്ങൾ)</Text>

                

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>എണ്ണം</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>1. പലിശരഹിത സംവിധാനം (എണ്ണം)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.interestFreeSystems?.count || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.interestFreeSystems?.beneficiariesLast3Years || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>2. സകാത്ത് കമ്മറ്റി (എണ്ണം)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.zakatCommittee?.count || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>കഴിഞ്ഞ മൂന്ന് വർഷത്തിനിടയിൽ സഹായം സ്വീകരിച്ച മറ്റുള്ളവരുടെ എണ്ണം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.zakatCommittee?.beneficiariesLast3Years || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>3. പീപ്പിൾസ് ഫൗണ്ടേഷനിൽ നിന്നും കഴിഞ്ഞ 3 വർഷത്തിനിടെ വ്യക്തിപരമായി സഹായം സ്വീകരിച്ച മറ്റുള്ളവർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.peoplesFoundationBeneficiaries || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>4. ഹൗസിംഗ് പ്രൊജക്‌ടുകൾ, കുടിവെള്ളപദ്ധതികൾ തുടങ്ങിയ നമ്മുടെ സേവന പ്രൊജക്ടുകളുടെ കഴിഞ്ഞ 3 വർഷത്തിനിടെ ഗുണഭോക്താക്കളായ മറ്റുള്ളവർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.housingProjectBeneficiaries || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>5. ബൈത്തുസ്സകാത്തിൽ നിന്നും കഴിഞ്ഞ 3 വർഷത്തിനിടെ വ്യക്തിപരമായി സഹായം സ്വീകരിച്ച മറ്റുള്ളവർ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.baytulZakatBeneficiaries || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>6. മാധ്യമം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ (ഏകദേശം)*</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.nonWorkersinMadhyamamReaders || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>7. പ്രബോധനം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ *</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.nonWorkersinPrabodhanamReaders || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>8. ആരാമം വായനക്കാരിൽ പ്രവർത്തകരല്ലാത്തവർ *</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.nonWorkersinAaramamReaders || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>9. ആയാത്ത് ദർസെ ഖുർആൻ സ്ഥിരമായി ഉപയോഗപ്പെടുത്തുന്ന പ്രവർത്തകരല്ലാത്തവർ*</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.nonWorkersinAyahUsers || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>10. നമ്മുടെ മഹല്ലുകൾ (പൂർണം/ഭാഗികം)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.areas?.ourAreas || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>ഇതിൽ രജിസ്റ്റർ ചെയ്‌ത നമ്മുടെതല്ലാത്ത കുടുംബങ്ങൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.areas?.registeredNonOurFamilies || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>11. നമുക്ക് സ്വാധീനമുള്ള (കമ്മറ്റി പ്രാതിനിധ്യം) മറ്റു പൊതു മഹല്ലുകൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.influentialMahalls || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>12. നമ്മുടെ ഖുതുബ ശ്രവിക്കാൻ വരുന്ന മറ്റുള്ളവരിൽ പ്രസ്ഥാനഘടനയിൽ ഉള്ള സ്ഥലത്തുനിന്നും വരുന്നവർ (എണ്ണം)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.khutbaListenersfromOrganizedAreas || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>13. നമ്മുടെ ഖുതുബ ശ്രവിക്കാൻ വരുന്ന മറ്റുള്ളവരിൽ പ്രസ്ഥാന ഘടന ഇല്ലാത്ത സ്ഥലത്തുനിന്നും വരുന്നവർ (എണ്ണം)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.khutbaListenersfromNonOrganizedAreas || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>14. ഫുൾടൈം പ്രവർത്തകരുണ്ടെങ്കിൽ (എണ്ണം)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.FullTimeWorkers || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>15. പാർട് ടൈം പ്രവർത്തകരുണ്ടെങ്കിൽ (എണ്ണം)</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partD?.PartTimeWorkers || '')}</Text>

                  </View>

                </View>

              </View>



              {/* Part E - Additional Information */}

              <View style={styles.section}>

                <Text style={styles.sectionTitle}>PART-E (അധിക വിവരങ്ങൾ)</Text>

                

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellWide}>വിവരങ്ങൾ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>വിവരങ്ങൾ</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>1. നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത മുസ്‌ലിം ഭൂരിപക്ഷ പ്രദേശങ്ങൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.areasWithoutPresence?.description || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>തരം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.areasWithoutPresence?.type || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>2. നമ്മുടെ സാന്നിദ്ധ്യമില്ലാത്ത പഞ്ചായത്തുകൾ/ മുനിസിപ്പാലിറ്റികൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.panchayatsWithoutPresence || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>3. കഴിഞ്ഞ 5 വർഷത്തിനിടയിൽ പുതുതായി ഉണ്ടായ ഘടകങ്ങളുടെ എണ്ണം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.newComponentsLast5Years?.count || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>തരം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.newComponentsLast5Years?.type || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>വിശദ വിവരങ്ങൾ</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.newComponentsLast5Years?.details || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>4. കഴിഞ്ഞ 5 വർഷത്തിനിടയിൽ പ്രവർത്തകരുടെ വർധനവ്</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.workersGrowthInLast5Years?.count || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>വർധനവിന്റെ തരം</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.workersGrowthInLast5Years?.type || '')}</Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellWide}>5. 6 മാസത്തിനുള്ളിൽ രൂപീകരിക്കാൻ സാധിക്കുന്ന ഘടകങ്ങൾ</Text>

                    <Text style={styles.tableCellNarrow}></Text>

                  </View>

                </View>

                

                {/* Components to Form in 6 Months Table */}

                <View style={styles.table}>

                  <View style={[styles.tableRow, styles.tableHeader]}>

                    <Text style={styles.tableHeaderCellNarrow}>JIH</Text>

                    <Text style={styles.tableHeaderCellNarrow}>വനിത</Text>

                    <Text style={styles.tableHeaderCellNarrow}>Solidarity</Text>

                    <Text style={styles.tableHeaderCellNarrow}>SIO</Text>

                    <Text style={styles.tableHeaderCellNarrow}>GIO</Text>

                    <Text style={styles.tableHeaderCellNarrow}>ടീൻ ഇന്ത്യ</Text>

                    <Text style={styles.tableHeaderCellNarrow}>മലർവാടി</Text>

                    <Text style={styles.tableHeaderCellNarrow}></Text>

                  </View>

                  

                  <View style={styles.tableRow}>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.jih || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.vanitha || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.solidarity || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.sio || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.gio || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.teenIndia || '')}</Text>

                    <Text style={styles.tableCellNarrow}>{safeToString(safeData.partE?.componentsToFormIn6Months?.malarvadi || '')}</Text>

                  </View>

                </View>

              </View>

            </Page>

          );

        })}

      </Document>

    );



    console.log(`Generating PDF for ${forms.length} forms`);

    

    const blob = await pdf(<MyDocument />).toBlob();

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = `all-forms-${new Date().toISOString().split('T')[0]}.pdf`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  } catch (error) {

    console.error('Error generating PDF:', error);

    throw error;

  }

};

