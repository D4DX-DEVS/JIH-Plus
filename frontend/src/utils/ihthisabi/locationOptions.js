/**
 * Location dropdown options arrive in a few different shapes depending on the
 * endpoint (id/name from /location/*, _id/title from the abroad masters).
 * These readers normalise both into a value and a label.
 */
export const getId = (o) => o?.id || o?._id || o?.code || o?.name || o?.title || ''
export const getLabel = (o) => o?.name || o?.title || o?.label || o?.id || o?.code || ''
