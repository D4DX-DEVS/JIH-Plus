import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image, pdf } from '@react-pdf/renderer'
import NotoSerifMalayalam from '../assets/fonts/NotoSerifMalayalam-Regular.ttf'
import NotoSansMalayalam from '../assets/fonts/NotoSansMalayalam-Regular.ttf'
import letterheadImage from '../assets/LH.png'

// Import centralized PDF styling
import {
  PDF_BRANDING,
  PDF_TYPOGRAPHY,
  PDF_SPACING,
  PDF_STYLES,
  safeToString,
} from './pdfStyleConfig';

// Register Malayalam fonts
Font.register({
  family: 'Noto Serif Malayalam',
  src: NotoSerifMalayalam
})

Font.register({
  family: 'Noto Sans Malayalam',
  src: NotoSansMalayalam
})

// Create styles - optimized for 2 pages maximum
// Using centralized styling with letterhead-specific overrides
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: PDF_BRANDING.colors.background,
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    padding: 0, // Letterhead uses custom padding
  },
  letterheadContainer: {
    borderBottom: `1.5px solid ${PDF_BRANDING.colors.text}`,
    textAlign: 'center',
    paddingTop: '8mm',
    paddingLeft: '15mm',
    paddingRight: '15mm',
    paddingBottom: '10px',
  },
  letterheadImage: {
    maxWidth: PDF_BRANDING.letterhead.maxWidth,
    maxHeight: PDF_BRANDING.letterhead.maxHeight,
    marginBottom: PDF_BRANDING.letterhead.marginBottom,
    objectFit: 'contain',
  },
  contentContainer: {
    paddingTop: '15px',
    paddingLeft: '15mm',
    paddingRight: '15mm',
    paddingBottom: '10mm',
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
  },
  contentText: {
    fontFamily: PDF_TYPOGRAPHY.fonts.primary,
    fontSize: PDF_TYPOGRAPHY.sizes.bodySmall,
    lineHeight: PDF_TYPOGRAPHY.lineHeight.normal,
    color: PDF_BRANDING.colors.text,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    marginBottom: '4px',
  },
})

// Unit Reply PDF Document Component
const UnitReplyDocument = ({ formattedReply, unit, year, quarter }) => {
  const quarterNames = {
    1: 'Q1 (ജനുവരി-മാർച്ച്)',
    2: 'Q2 (ഏപ്രിൽ-ജൂൺ)',
    3: 'Q3 (ജൂലൈ-സെപ്റ്റംബർ)',
    4: 'Q4 (ഒക്ടോബർ-ഡിസംബർ)'
  }
  
  const quarterName = quarterNames[quarter] || `Q${quarter}`
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Letterhead */}
        <View style={styles.letterheadContainer}>
          <Image src={letterheadImage} style={styles.letterheadImage} />
        </View>
        
        {/* Letter Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.contentText}>{formattedReply}</Text>
        </View>
      </Page>
    </Document>
  )
}

// Function to generate and download PDF
export const downloadUnitReplyPDF = async (formattedReply, unit, year, quarter) => {
  try {
    if (!formattedReply) {
      throw new Error('Formatted reply is required')
    }

    const MyDocument = () => (
      <UnitReplyDocument 
        formattedReply={formattedReply}
        unit={unit || ''}
        year={year || new Date().getFullYear()}
        quarter={quarter || Math.ceil((new Date().getMonth() + 1) / 3)}
      />
    )

    console.log('Generating PDF with Malayalam font support...')
    
    const blob = await pdf(<MyDocument />).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Generate filename
    const quarterNames = {
      1: 'Q1',
      2: 'Q2',
      3: 'Q3',
      4: 'Q4'
    }
    const quarterName = quarterNames[quarter] || `Q${quarter}`
    const filename = `Unit-Reply-${unit || 'Unknown'}-${year}-${quarterName}.pdf`
    
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    console.log('PDF downloaded successfully')
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

