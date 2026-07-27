import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Lock,
  FileText
} from 'lucide-react'
import { Q3_DISABLED, isQ3Disabled } from '../../utils/ihthisabi/quarterHelper'

const QuarterlySelection = ({ submissions = [], alternativeSubmissions = [], onQuarterSelect, title, subtitle }) => {
  const navigate = useNavigate()
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1 // 1-12
  const currentYear = new Date().getFullYear()

  /**
   * Get the current quarter (the quarter we are currently in)
   * This is for informational purposes only
   */
  const getCurrentQuarter = () => {
    if (currentMonth >= 1 && currentMonth <= 3) return 1
    if (currentMonth >= 4 && currentMonth <= 6) return 2
    if (currentMonth >= 7 && currentMonth <= 9) return 3
    if (currentMonth >= 10 && currentMonth <= 12) return 4
    return 1
  }

  /**
   * BUSINESS RULE: Users submit for the PREVIOUS COMPLETED quarter, not the current one
   * 
   * Get the available quarter for submission
   * Returns: { quarter: number, year: number }
   * 
   * Examples:
   * - Jan-Mar (Q1) → Q4 of previous year
   * - Apr-Jun (Q2) → Q1 of current year
   * - Jul-Sep (Q3) → Q2 of current year
   * - Oct-Dec (Q4) → Q3 of current year
   */
  const getAvailableSubmissionQuarter = () => {
    const currentQuarter = getCurrentQuarter()
    
    if (currentQuarter === 1) {
      // Current: Q1 → Available: Q4 of previous year
      return { quarter: 4, year: currentYear - 1 }
    } else {
      // Current: Q2, Q3, or Q4 → Available: Previous quarter of same year
      return { quarter: currentQuarter - 1, year: currentYear }
    }
  }

  // Get quarter info
  const getQuarterInfo = (quarter) => {
    const quarterInfo = {
      1: { name: 'Q1', period: 'January – March', startMonth: 1, endMonth: 3, color: 'blue' },
      2: { name: 'Q2', period: 'April – June', startMonth: 4, endMonth: 6, color: 'green' },
      3: { name: 'Q3', period: 'July – September', startMonth: 7, endMonth: 9, color: 'orange' },
      4: { name: 'Q4', period: 'October – December', startMonth: 10, endMonth: 12, color: 'purple' }
    }
    return quarterInfo[quarter]
  }

  // Check if quarter has regular submission - match by submissionPeriod.quarter and submissionPeriod.year
  const isQuarterSubmitted = (quarter, year) => {
    return submissions.some(submission => {
      // Check if submission has submissionPeriod with quarter and year
      if (submission.submissionPeriod) {
        return submission.submissionPeriod.quarter === quarter && 
               submission.submissionPeriod.year === year
      }
      // Fallback: if submissionPeriod doesn't exist, try to match by createdAt date
      const submissionDate = new Date(submission.createdAt)
      const submissionYear = submissionDate.getFullYear()
      const submissionMonth = submissionDate.getMonth() + 1
      
      if (submissionYear !== year) return false
      
      const quarterInfo = getQuarterInfo(quarter)
      return submissionMonth >= quarterInfo.startMonth && submissionMonth <= quarterInfo.endMonth
    })
  }

  // Check if quarter has alternative submission
  const isQuarterAlternativeSubmitted = (quarter, year) => {
    return alternativeSubmissions.some(altSubmission => {
      // Check if alternative submission has submissionPeriod with quarter and year
      if (altSubmission.submissionPeriod) {
        return altSubmission.submissionPeriod.quarter === quarter && 
               altSubmission.submissionPeriod.year === year
      }
      // Fallback: if submissionPeriod doesn't exist, try to match by createdAt date
      const submissionDate = new Date(altSubmission.createdAt)
      const submissionYear = submissionDate.getFullYear()
      const submissionMonth = submissionDate.getMonth() + 1
      
      if (submissionYear !== year) return false
      
      const quarterInfo = getQuarterInfo(quarter)
      return submissionMonth >= quarterInfo.startMonth && submissionMonth <= quarterInfo.endMonth
    })
  }

  // Get regular submission for a specific quarter/year
  const getSubmissionForQuarter = (quarter, year) => {
    return submissions.find(submission => {
      // Check if submission has submissionPeriod with quarter and year
      if (submission.submissionPeriod) {
        return submission.submissionPeriod.quarter === quarter && 
               submission.submissionPeriod.year === year
      }
      // Fallback: if submissionPeriod doesn't exist, try to match by createdAt date
      const submissionDate = new Date(submission.createdAt)
      const submissionYear = submissionDate.getFullYear()
      const submissionMonth = submissionDate.getMonth() + 1
      
      if (submissionYear !== year) return false
      
      const quarterInfo = getQuarterInfo(quarter)
      return submissionMonth >= quarterInfo.startMonth && submissionMonth <= quarterInfo.endMonth
    })
  }

  // Get alternative submission for a specific quarter/year
  const getAlternativeSubmissionForQuarter = (quarter, year) => {
    return alternativeSubmissions.find(altSubmission => {
      // Check if alternative submission has submissionPeriod with quarter and year
      if (altSubmission.submissionPeriod) {
        return altSubmission.submissionPeriod.quarter === quarter && 
               altSubmission.submissionPeriod.year === year
      }
      // Fallback: if submissionPeriod doesn't exist, try to match by createdAt date
      const submissionDate = new Date(altSubmission.createdAt)
      const submissionYear = submissionDate.getFullYear()
      const submissionMonth = submissionDate.getMonth() + 1
      
      if (submissionYear !== year) return false
      
      const quarterInfo = getQuarterInfo(quarter)
      return submissionMonth >= quarterInfo.startMonth && submissionMonth <= quarterInfo.endMonth
    })
  }

  // Check if quarter is available for submission
  const isQuarterAvailable = (quarter, year) => {
    const available = getAvailableSubmissionQuarter()
    
    // Only allow the available quarter (previous completed quarter)
    return quarter === available.quarter && year === available.year
  }

  // Check if quarter is locked
  const isQuarterLocked = (quarter, year) => {
    const available = getAvailableSubmissionQuarter()
    const currentQuarter = getCurrentQuarter()
    
    // Lock the current quarter (it's not completed yet)
    if (year === currentYear && quarter === currentQuarter) {
      return true
    }
    
    // Lock future quarters
    if (year > currentYear) {
      return true
    }
    
    if (year === currentYear && quarter > currentQuarter) {
      return true
    }
    
    // Lock past quarters (only most recent completed quarter is available)
    if (quarter !== available.quarter || year !== available.year) {
      // Check if it's already submitted (regular or alternative) - then allow viewing
      if (isQuarterSubmitted(quarter, year) || isQuarterAlternativeSubmitted(quarter, year)) {
        return false // Not locked if already submitted (for viewing)
      }
      return true // Locked for new submissions
    }
    
    return false
  }

  // Get submission status for a quarter
  const getQuarterStatus = (quarter, year) => {
    const currentQuarter = getCurrentQuarter()
    
    // Check if Q3 is disabled - show as "Not Available"
    if (Q3_DISABLED && quarter === 3) {
      return { status: 'locked', icon: Lock, color: 'gray', text: 'Not Available' }
    }
    
    // Check if it's the current quarter (in progress) - label as "Upcoming"
    if (year === currentYear && quarter === currentQuarter) {
      return { status: 'current', icon: Clock, color: 'yellow', text: 'Upcoming' }
    }
    
    // Check if it's locked (future or old past quarter)
    if (isQuarterLocked(quarter, year)) {
      // Check if alternative submission exists - allow viewing
      if (isQuarterAlternativeSubmitted(quarter, year)) {
        return { status: 'alternative-submitted', icon: FileText, color: 'purple', text: 'Alternative Submitted' }
      }
      // Check if regular submission exists - allow viewing
      if (isQuarterSubmitted(quarter, year)) {
        return { status: 'submitted', icon: CheckCircle, color: 'green', text: 'Submitted' }
      }
      return { status: 'locked', icon: Lock, color: 'gray', text: 'Not Available' }
    }
    
    // Check if alternative submission exists (takes priority over regular)
    if (isQuarterAlternativeSubmitted(quarter, year)) {
      return { status: 'alternative-submitted', icon: FileText, color: 'purple', text: 'Alternative Submitted' }
    }
    
    // Check if regular submission exists
    if (isQuarterSubmitted(quarter, year)) {
      return { status: 'submitted', icon: CheckCircle, color: 'green', text: 'Submitted' }
    }
    
    // Check if available for submission
    if (isQuarterAvailable(quarter, year)) {
      return { status: 'available', icon: AlertCircle, color: 'blue', text: 'Submit Now' }
    }
    
    return { status: 'unavailable', icon: Lock, color: 'gray', text: 'Unavailable' }
  }

  // Handle quarter selection
  const handleQuarterClick = (quarter, year) => {
    const status = getQuarterStatus(quarter, year)
    
    // Don't allow interaction with current quarter or locked quarters
    if (status.status === 'locked' || status.status === 'current') {
      return // Do nothing
    }
    
    // Handle alternative submission viewing
    if (status.status === 'alternative-submitted') {
      // Navigate to view existing alternative submission
      const altSubmission = getAlternativeSubmissionForQuarter(quarter, year)
      
      if (altSubmission && altSubmission._id) {
        navigate(`/ihthisabi/alternative-submissions/${altSubmission._id}`)
      } else {
        // Fallback: try to find by ID if available
        const altSubmissionId = alternativeSubmissions.find(s => 
          s.submissionPeriod?.quarter === quarter && 
          s.submissionPeriod?.year === year
        )?._id
        
        if (altSubmissionId) {
          navigate(`/ihthisabi/alternative-submissions/${altSubmissionId}`)
        }
      }
      return
    }
    
    // Handle regular submission viewing
    if (status.status === 'submitted') {
      // Navigate to view existing submission
      const submission = getSubmissionForQuarter(quarter, year)
      
      if (submission && submission._id) {
        navigate(`/ihthisabi/submissions/${submission._id}`)
      } else {
        // Fallback: try to find by ID if available
        const submissionId = submissions.find(s => 
          s.submissionPeriod?.quarter === quarter && 
          s.submissionPeriod?.year === year
        )?._id
        
        if (submissionId) {
          navigate(`/ihthisabi/submissions/${submissionId}`)
        }
      }
      return
    }
    
    if (status.status === 'available') {
      // Navigate to submission form with quarter info
      if (onQuarterSelect) {
        onQuarterSelect(quarter, year)
      } else {
        navigate(`/submit?quarter=${quarter}&year=${year}`)
      }
    }
  }

  // Generate quarters for current year and previous year
  const generateQuarters = () => {
    const quarters = []
    const available = getAvailableSubmissionQuarter()
    
    // Include all quarters (Q3 will show as "Not Available" if disabled)
    const quartersToGenerate = [1, 2, 3, 4]
    
    // Add current year quarters
    for (const quarter of quartersToGenerate) {
      quarters.push({ quarter, year: currentYear })
    }
    
    // If available quarter is from previous year (Q4 when current is Q1), include previous year
    if (available.year < currentYear) {
      for (const quarter of quartersToGenerate) {
        quarters.push({ quarter, year: currentYear - 1 })
      }
    }
    
    // Also include previous year quarters if we have submissions from previous year
    const hasPreviousYearSubmissions = submissions.some(submission => {
      const submissionYear = new Date(submission.createdAt).getFullYear()
      return submissionYear === currentYear - 1
    })
    
    if (hasPreviousYearSubmissions && available.year >= currentYear) {
      for (const quarter of quartersToGenerate) {
        // Check if we haven't already added this year
        const exists = quarters.some(q => q.year === currentYear - 1 && q.quarter === quarter)
        if (!exists) {
          quarters.push({ quarter, year: currentYear - 1 })
        }
      }
    }
    
    return quarters
  }

  const quarters = generateQuarters()

  return (
    <div className="max-w-4xl mx-auto px-3 py-3 sm:px-4 sm:py-8">
      <div className="mb-3 text-center sm:mb-6">
        <h1 className="text-base font-bold text-gray-900 sm:text-2xl">
          {title || 'Quarterly Report Submission'}
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
          {subtitle || 'Select a quarter to submit or view your report'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {quarters.map(({ quarter, year }) => {
          const quarterInfo = getQuarterInfo(quarter)
          const status = getQuarterStatus(quarter, year)
          const StatusIcon = status.icon
          const isAvailableQuarter = isQuarterAvailable(quarter, year)
          const currentQuarter = getCurrentQuarter()
          const isCurrentQuarter = year === currentYear && quarter === currentQuarter
          
          return (
            <div
              key={`${year}-${quarter}`}
              onClick={() => handleQuarterClick(quarter, year)}
              className={`
                ih-surface relative p-2.5 transition-all duration-300 sm:p-5
                ${status.status === 'locked' || status.status === 'current'
                  ? 'cursor-not-allowed opacity-55'
                  : status.status === 'submitted'
                    ? 'cursor-pointer bg-green-50/70 hover:-translate-y-0.5'
                    : status.status === 'alternative-submitted'
                      ? 'cursor-pointer bg-purple-50/70 hover:-translate-y-0.5'
                      : status.status === 'available'
                        ? 'cursor-pointer bg-blue-50/60 hover:-translate-y-0.5'
                        : 'cursor-not-allowed bg-red-50/60 opacity-55'
                }
                ${isAvailableQuarter ? 'ring-2 ring-blue-500/40' : ''}
                ${isCurrentQuarter ? 'ring-2 ring-amber-400/40' : ''}
              `}
            >
              {/* Available Quarter Badge */}
              {isAvailableQuarter && (
                <div className="absolute -top-1.5 right-1.5 rounded-full bg-blue-500 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                  Available
                </div>
              )}
              
              {/* Upcoming Quarter Badge */}
              {isCurrentQuarter && (
                <div className="absolute -top-1.5 left-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                  Upcoming
                </div>
              )}
              
              {/* Quarter Header */}
              <div className="mb-1.5 text-center">
                <div className={`
                  mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-full sm:h-10 sm:w-10
                  ${status.status === 'submitted' ? 'bg-green-500' :
                    status.status === 'alternative-submitted' ? 'bg-purple-500' :
                    status.status === 'available' ? 'bg-blue-500' :
                    status.status === 'current' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }
                `}>
                  <StatusIcon className="h-3.5 w-3.5 text-white sm:h-5 sm:w-5" />
                </div>

                <h3 className="text-[13px] font-bold leading-tight text-gray-900 sm:text-lg">
                  {quarterInfo.name} - {year}
                </h3>
                <p className="text-[10px] leading-tight text-gray-500 sm:text-sm">
                  {quarterInfo.period}
                </p>
              </div>

              {/* Status */}
              <div className="text-center">
                <span className={`
                  ih-chip border-transparent
                  ${status.status === 'submitted' ? 'bg-green-100 text-green-800' :
                    status.status === 'alternative-submitted' ? 'bg-purple-100 text-purple-800' :
                    status.status === 'available' ? 'bg-blue-100 text-blue-800' :
                    status.status === 'current' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }
                `}>
                  {status.text}
                </span>
              </div>
              
              {/* Action Hint */}
              {status.status !== 'locked' && status.status !== 'current' && (
                <div className="mt-1.5 space-y-1">
                  {status.status === 'submitted' ? (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 sm:text-sm">
                      <span>View Report</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  ) : status.status === 'alternative-submitted' ? (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 sm:text-sm">
                      <span className="truncate">View Alternative</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 sm:text-sm">
                        <span>Submit Report</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                      {status.status === 'available' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/ihthisabi/alternative-submission?quarter=${quarter}&year=${year}`)
                          }}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[10px] font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:text-xs"
                          style={{ backgroundColor: '#1A3A5C' }}
                          title="Submit alternative submission if unable to complete regular report"
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">Alternative</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 rounded-lg bg-gray-50 p-2.5 sm:mt-6 sm:p-5">
        <h3 className="mb-1.5 text-xs font-semibold text-gray-900 sm:text-base">Status Legend</h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 lg:grid-cols-4">
          {[
            ['bg-green-500', 'Submitted', 'View your regular report'],
            ['bg-purple-500', 'Alternative Submitted', 'View your alternative submission'],
            ['bg-blue-500', 'Available', 'Submit for previous completed quarter'],
            ['bg-yellow-500', 'Upcoming', 'Current quarter (cannot submit yet)'],
            ['bg-gray-400', 'Not Available', 'Past or future quarters'],
          ].map(([dot, name, detail]) => (
            <div key={name} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <span className="truncate text-[10px] text-gray-600 sm:text-sm">
                <span className="font-medium text-gray-800">{name}</span>
                <span className="hidden sm:inline"> — {detail}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Important:</strong> You can only submit reports for the previous completed quarter. 
            The upcoming quarter is still in progress and cannot be submitted until it ends.
            {(() => {
              const available = getAvailableSubmissionQuarter()
              const qInfo = getQuarterInfo(available.quarter)
              return ` Right now, you can submit for ${qInfo.name} ${available.year} (${qInfo.period}).`
            })()}
          </p>
        </div>
      </div>

     
    </div>
  )
}

export default QuarterlySelection
