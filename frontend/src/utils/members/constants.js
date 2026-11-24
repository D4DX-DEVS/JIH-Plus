/** Display labels for the two application types. */
export const FORM_TYPE_LABEL = { rukn: 'Rukn', karkoon: 'Karkun' }

/** Where an application form is filled from — mirrors backend utils/members/origin.js. */
export const ORIGIN_REGIONS = [
  { value: 'india', label: 'India' },
  { value: 'gcc', label: 'GCC' },
  { value: 'international', label: 'International / Online' }
]
export const GCC_COUNTRIES = ['UAE', 'Bahrain', 'Qatar', 'Kuwait', 'KSA', 'Muscat', 'Salala']

/** "GCC · Qatar", "India", or '' when the origin was never recorded. */
export function originLabel(origin) {
  const region = ORIGIN_REGIONS.find(r => r.value === origin?.region)
  if (!region) return ''
  return origin.region === 'gcc' && origin.country ? `GCC · ${origin.country}` : region.label
}
