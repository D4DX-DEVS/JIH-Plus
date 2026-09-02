import React from 'react'
import { Star } from 'lucide-react'

const LABELS = {
  complete: 'പൂർണം', partial: 'ഭാഗികം', notread: 'വായിച്ചില്ല',
  incomplete: 'അപൂർണം', yes: 'അതെ', no: 'ഇല്ല',
  satisfactory: 'തൃപ്തികരം', unsatisfactory: 'തൃപ്തികരമല്ല',
  notApplicable: 'ബാധകമല്ല', almost: 'ഏറെക്കുറെ', small: 'ചെറിയ തോതിൽ',
  none: '-'
}

const getLabel = (val) => LABELS[val] || val || '-'

const CountGrid = ({ counts }) => (
  <div className="grid grid-cols-3 gap-2">
    {counts.map(({ label, value }) => (
      <div key={label} className="bg-gray-50 rounded px-2 py-2 text-center">
        <p className="text-[10px] text-gray-600 mb-0.5">{label}</p>
        <p className="font-bold text-lg text-gray-900">{value || 0}</p>
      </div>
    ))}
  </div>
)

const Question = ({ title, children }) => (
  <div className="pb-3 border-b border-gray-100 last:border-0">
    <h4 className="text-xs font-semibold text-gray-900 mb-2 leading-relaxed break-words">{title}</h4>
    {children}
  </div>
)

const TextValue = ({ value }) => (
  <div className="bg-gray-50 rounded px-3 py-2">
    <span className="text-xs font-medium text-gray-900 break-words">{value}</span>
  </div>
)

// Renders the full report of a submission (static ihthisabi form or dynamic form).
// `formSchema` is the dynamic form definition (optional — fallback rendering without it).
const SubmissionReportView = ({ submission, formSchema }) => {
  if (!submission) return null

  const form = submission.form || {}
  const isDynamic = !!(submission.dynamicFormId && submission.dynamicFormData)

  if (isDynamic) {
    const data = submission.dynamicFormData || {}

    if (formSchema) {
      const questions = [...(formSchema.questions || [])].sort((a, b) => a.order - b.order)
      if (!questions.length) return <p className="text-gray-500 text-sm">No form data available</p>
      return (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">
            Dynamic Form Submission
          </div>
          {questions.map((question, index) => {
            const value = data[question.questionId]
            const label = question.questionTextMl || question.questionText
            let displayElement

            if (question.answerType === 'group') {
              displayElement = (
                <CountGrid
                  counts={(question.subFields || []).map((sf, sfIdx) => {
                    const fid = sf.fieldId || `field_${sfIdx}`
                    return { label: sf.labelMl || sf.label, value: (value || {})[fid] }
                  })}
                />
              )
            } else if (question.answerType === 'radio' || question.answerType === 'dropdown') {
              const opt = question.options?.find((o) => o.value === value)
              displayElement = <TextValue value={opt ? (opt.labelMl || opt.label) : (value || '-')} />
            } else if (question.answerType === 'checkbox') {
              const selected = Array.isArray(value) ? value : []
              const display = selected.length
                ? selected.map((v) => {
                    const opt = question.options?.find((o) => o.value === v)
                    return opt ? (opt.labelMl || opt.label) : v
                  }).join(', ')
                : '-'
              displayElement = <TextValue value={display} />
            } else if (question.answerType === 'star') {
              const starMax = question.max || 5
              displayElement = (
                <div className="flex items-center gap-1">
                  {Array.from({ length: starMax }, (_, i) => i + 1).map((star) => (
                    <Star key={star} className={`w-4 h-4 ${star <= (value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                  {value > 0 && <span className="ml-1 text-xs text-gray-500">{value}/{starMax}</span>}
                </div>
              )
            } else if (question.answerType === 'number') {
              displayElement = <p className="text-xl font-bold text-gray-900">{value ?? 0}</p>
            } else {
              displayElement = <TextValue value={String(value || '-')} />
            }

            return (
              <Question key={question.questionId} title={`${index + 1}. ${label}`}>
                {displayElement}
              </Question>
            )
          })}
        </div>
      )
    }

    // Fallback: no schema — show raw keys/values
    const entries = Object.entries(data)
    if (!entries.length) return <p className="text-gray-500 text-sm">No form data available</p>
    return (
      <div className="space-y-4">
        {entries.map(([key, value], index) => {
          let displayVal = value
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            displayVal = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ')
          } else if (Array.isArray(value)) {
            displayVal = value.join(', ')
          }
          return (
            <Question key={key} title={`${index + 1}. ${key}`}>
              <TextValue value={String(displayVal)} />
            </Question>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Question title="1. ഖുർആൻ പഠനം : സൂറ അന്നിസാഅ് (87 ആയഹ്)- തഫ്സീർ മുന്നിൽ വെച്ചുള്ള പഠനം :">
        <TextValue value={getLabel(form.quranStudy?.status)} />
        {form.quranStudy?.others && (
          <div className="mt-2 text-xs bg-blue-50 rounded px-3 py-2">
            <span className="text-gray-700">മറ്റു ഭാഗങ്ങൾ : (സൂറത്ത്, ആയത്തുകൾ)</span>
            <span className="ml-1 font-medium text-gray-900">{form.quranStudy.others}</span>
          </div>
        )}
      </Question>

      <Question title="2. ഹദീസ് പഠനം : (എണ്ണം)">
        <p className="text-2xl font-bold text-[#7B4FF2]">{form.hadithCount || 0}</p>
      </Question>

      <Question title="3. പുസ്തക വായന">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
            <span className="text-gray-700">A. മുസ്‌ലിം വനിതകളും ഇസ്‌ലാമിക പ്രബോധനവും</span>
            <span className="font-semibold text-gray-900">{getLabel(form.bookReading?.islami)}</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
            <span className="text-gray-700">B. മദീനയിലെ ഏടുകളിൽ നിന്ന്</span>
            <span className="font-semibold text-gray-900">{getLabel(form.bookReading?.atma)}</span>
          </div>
          {form.bookReading?.others && (
            <div className="bg-blue-50 rounded px-3 py-1.5 text-xs">
              <span className="text-gray-700">മറ്റു സാഹിത്യങ്ങൾ (പേരെഴുതുക)</span>
              <span className="ml-1 font-medium text-gray-900">{form.bookReading.others}</span>
            </div>
          )}
        </div>
      </Question>

      <Question title="4. പ്രതിവാര യോഗം :">
        <CountGrid counts={[
          { label: 'ഹാജർ', value: form.weeklyMeeting?.hadir },
          { label: 'ലീവ്', value: form.weeklyMeeting?.leave },
          { label: 'ആബ്സന്റ്', value: form.weeklyMeeting?.absent }
        ]} />
      </Question>

      <Question title="5. പ്രാദേശിക ജമാഅത്തെ യോഗം:">
        <CountGrid counts={[
          { label: 'ഹാജർ', value: form.jamaathMeeting?.hadir },
          { label: 'ലീവ്', value: form.jamaathMeeting?.leave },
          { label: 'ആബ്സന്റ്', value: form.jamaathMeeting?.absent }
        ]} />
      </Question>

      <Question title="6. ഗൃഹയോഗങ്ങൾ :">
        <p className="text-xl font-bold text-gray-900">{form.grihameetings || 0}</p>
      </Question>

      <Question title="7. തഹ്രീകീ യോഗം - പങ്കാളിത്തം">
        <p className="text-xl font-bold text-gray-900">{form.thahreekiMeetings || 0}</p>
      </Question>

      <Question title="8. ബൈതുല്മാല് (2%) നല്കിയത്:">
        <p className="text-sm font-semibold text-gray-900">{getLabel(form.baithulmaal)}</p>
      </Question>

      <Question title="9. സകാത്ത് ബൈതുല്മാലിൽ അടച്ചോ?">
        <p className="text-sm font-semibold text-gray-900">{getLabel(form.zakatPaid)}</p>
      </Question>

      <Question title="10. പുതുതായി സംഘടനയിലേക്ക് കൊണ്ടുവന്ന വ്യക്തികൾ: (എണ്ണം)">
        <p className="text-xl font-bold text-gray-900">{form.newMembers || 0}</p>
      </Question>

      <Question title="11. മുസ്‌ലിം വ്യക്തിബന്ധങ്ങൾ : (എണ്ണം)">
        <p className="text-xl font-bold text-gray-900">{form.muslimRelations || 0}</p>
      </Question>

      <Question title="12. സഹോദര സമുദായങ്ങളുമായുള്ള വ്യക്തിബന്ധം : (എണ്ണം)">
        <p className="text-xl font-bold text-gray-900">{form.communityRelations || 0}</p>
      </Question>

      <Question title="13. ഈ ത്രൈമാസത്തിൽ നടത്തിയ സ്കോഡുകൾ : (എണ്ണം)">
        <p className="text-xl font-bold text-gray-900">{form.scoreCount || 0}</p>
      </Question>

      <Question title="14. 100പേർക്ക് സേവനം ലഭ്യമാക്കുക എന്ന മീഖാത്തീ ടാർഗറ്റ് മുന്നിൽ വെച്ച് ഈ ത്രൈമാസത്തിലെ സേവന പ്രവർത്തനം തൃപ്തികരമാണോ?">
        <p className="text-sm font-semibold text-gray-900">{getLabel(form.meqathService)}</p>
      </Question>

      <Question title="15. എഴുത്ത്, പ്രഭാഷണം, സംഭാഷണം തുടങ്ങിയ വ്യക്തിഗത കഴിവുകൾ ദീനീമാർഗത്തിൽ സാധ്യമാകുന്ന അളവിൽ ഉപയോഗപ്പെടുത്തിയിട്ടുണ്ടോ?">
        <p className="text-sm font-semibold text-gray-900">{getLabel(form.skillUsage)}</p>
      </Question>

      <Question title="16. പ്രാദേശിക ജമാഅത്തെ യോഗം താങ്കളിൽ സ്വാധീനം ചെലുത്താറുണ്ടോ?">
        {form.jamaathInfluence ? (
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => {
              const backendValue = form.jamaathInfluence
              let isActive = false
              if (backendValue === 'no' && star <= 1) isActive = true
              if (backendValue === 'small' && star <= 3) isActive = true
              if (backendValue === 'yes' && star <= 5) isActive = true
              return (
                <Star key={star} className={`w-4 h-4 ${isActive ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`} />
              )
            })}
            <span className="ml-2 text-xs text-gray-700 font-medium">{getLabel(form.jamaathInfluence)}</span>
          </div>
        ) : (
          <p className="text-sm text-gray-400">-</p>
        )}
      </Question>

      {form.suggestions && (
        <Question title="നിർദ്ദേശങ്ങൾ">
          <div className="bg-gray-50 rounded px-3 py-2 whitespace-pre-wrap text-xs text-gray-700">{form.suggestions}</div>
        </Question>
      )}
    </div>
  )
}

export default SubmissionReportView
