export const PUBLIC_HELP_DESK_CONTACTS = [
  {
    id: 'member-applications',
    topic: 'Member Applications',
    description: 'Support for Rukn and Karkun application access and processing.',
    // Two people, one per application type, so each number carries its own name.
    phones: [
      {
        label: 'Karkun',
        person: 'Ibrahim Mulla',
        value: '+91 9447322439'
      },
      {
        label: 'Rukn',
        person: 'Najathullah K',
        value: '+91 9946815337'
      }
    ]
  },
  {
    id: 'ihthisabi-report',
    topic: 'JIH Portal and Ihthisabi',
    person: 'Musthafa Hussain',
    designation: 'Assistant Secretary JIH Kerala',
    description: 'Support for JIH Portal and Ihthisabi report access and reporting questions.',
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
  },
  {
    id: 'womens-portal',
    topic: "Women's Portal",
    person: 'Rajeena Beegam',
    description: "Support for Women's portal access.",
    phones: [
      {
        label: 'Primary Number',
        value: '+91 8281437581'
      }
    ]
  }
]

export const IHTHISABI_HELP_DESK_CONTACTS = PUBLIC_HELP_DESK_CONTACTS.filter(
  (contact) => contact.id === 'ihthisabi-report'
)

export const normalizePhoneNumber = (phone) => String(phone || '').replace(/[^\d+]/g, '')

export const getTelHref = (phone) => `tel:${normalizePhoneNumber(phone)}`

export const getWhatsAppHref = (phone, topic) => {
  const cleaned = normalizePhoneNumber(phone).replace(/^\+/, '')
  const message = encodeURIComponent(`Assalamu alaikum. I need help regarding ${topic}.`)
  return `https://wa.me/${cleaned}?text=${message}`
}