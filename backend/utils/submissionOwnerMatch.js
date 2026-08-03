// Multi-role users (district admin / unit admin / rukn) share one RUKN ID but
// log in through separate account collections, so a submission created while
// logged in under one role gets a different `userId` than one created under
// another role for the same physical person. Match on ruknId first so a
// submission made under any role counts for all of them; keep the userId
// fallback so older rows that predate the ruknId field still match.
const buildOwnerMatch = (ruknId, ownId) => {
  if (ruknId) {
    return { $or: [{ ruknId }, { userId: ownId }] };
  }
  return { userId: ownId };
};

module.exports = { buildOwnerMatch };
