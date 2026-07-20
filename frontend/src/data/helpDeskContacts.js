export const PUBLIC_HELP_DESK_CONTACTS = [
  {
    id: 'common-queries',
    topic: 'Common Queries',
    person: 'Musthafa Hussain',
    designation: 'Assistant Secretary JIH Kerala',
    description: 'General support for JIH Plus Portal usage and coordination.',
    phones: [
      {
        label: 'Primary Number',
        value: '+91 7012545656'
      }
    ]
  },
  {
    id: 'membership-queries',
    topic: 'Membership Applications',
    person: 'Ibrahim Mulla',
    designation: 'Assistant Secretary JIH Kerala',
    description: 'Support for Rukn and Karkun membership application queries.',
    phones: [
      {
        label: 'Primary Number',
        value: '+91 9447322439'
      }
    ]
  },
  {
    id: 'ihthisabi-report',
    topic: 'Ihthisabi Report',
    person: 'Musthafa Hussain',
    designation: 'Assistant Secretary JIH Kerala',
    description: 'Support for Ihthisabi report access and reporting questions.',
    phones: [
      {
        label: 'Primary Number',
        value: '+91 7012545656'
      },
      {
        label: 'Alternate Number',
        value: '+91 9496361949'
      }
    ]
  }
]

export const IHTHISABI_HELP_DESK_CONTACTS = [
  PUBLIC_HELP_DESK_CONTACTS[0],
  PUBLIC_HELP_DESK_CONTACTS[2]
]

export const normalizePhoneNumber = (phone) => String(phone || '').replace(/[^\d+]/g, '')

export const getTelHref = (phone) => `tel:${normalizePhoneNumber(phone)}`

export const getWhatsAppHref = (phone, topic) => {
  const cleaned = normalizePhoneNumber(phone).replace(/^\+/, '')
  const message = encodeURIComponent(`Assalamu alaikum. I need help regarding ${topic}.`)
  return `https://wa.me/${cleaned}?text=${message}`
}