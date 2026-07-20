const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
// District Information
district: { type: String, required: true },

// Part A - General Information (പൊതു വിവരങ്ങള്‍)
partA: {
totalPopulation: { type: Number, default: 0 },
muslimPercentage: { type: Number, default: 0 },
hinduPercentage: { type: Number, default: 0 },
christianPercentage: { type: Number, default: 0 },
othersPercentage: { type: Number, default: 0 },
movementPercentage: { type: Number, default: 0 },
majorityInReligiousOrganizations: { type: String },
secondPosition: { type: String },
thirdPosition: { type: String },
ourPosition: { type: String },
morePoliticalInfluence: { type: String }
},

// Part B - Organizational Systems (സംഘടനാ സംവിധാനങ്ങള്‍)
partB: {
organizations: {
jih: {
totalAreas: { type: Number, default: 0 },
components: { type: Number, default: 0 },
workers2023: { type: Number, default: 0 },
workers2025: { type: Number, default: 0 },
components2023: { type: Number, default: 0 },
components2025: { type: Number, default: 0 }
},
vanitha: {
totalAreas: { type: Number, default: 0 },
components: { type: Number, default: 0 },
workers2023: { type: Number, default: 0 },
workers2025: { type: Number, default: 0 },
components2023: { type: Number, default: 0 },
components2025: { type: Number, default: 0 }
},
solidarity: {
totalAreas: { type: Number, default: 0 },
components: { type: Number, default: 0 },
workers2023: { type: Number, default: 0 },
workers2025: { type: Number, default: 0 },
components2023: { type: Number, default: 0 },
components2025: { type: Number, default: 0 }
},
sio: {
totalAreas: { type: Number, default: 0 },
components: { type: Number, default: 0 },
workers2023: { type: Number, default: 0 },
workers2025: { type: Number, default: 0 },
components2023: { type: Number, default: 0 },
components2025: { type: Number, default: 0 }
},
gio: {
totalAreas: { type: Number, default: 0 },
components: { type: Number, default: 0 },
workers2023: { type: Number, default: 0 },
workers2025: { type: Number, default: 0 },
components2023: { type: Number, default: 0 },
components2025: { type: Number, default: 0 }
},
malarvadi: {
totalAreas: { type: Number, default: 0 },
components: { type: Number, default: 0 },
workers2023: { type: Number, default: 0 },
workers2025: { type: Number, default: 0 },
components2023: { type: Number, default: 0 },
components2025: { type: Number, default: 0 }
},
teenIndia: {
totalAreas: { type: Number, default: 0 },
components: { type: Number, default: 0 },
workers2023: { type: Number, default: 0 },
workers2025: { type: Number, default: 0 },
components2023: { type: Number, default: 0 },
components2025: { type: Number, default: 0 }
}
},

// Thawheed & Maraa
thawheedMaraa: {
existing: { type: Number, default: 0 },
students: { type: Number, default: 0 },
nonWorkers: { type: Number, default: 0 }
},

// QSC Men
qscMen: {
existing: { type: Number, default: 0 },
students: { type: Number, default: 0 },
nonWorkers: { type: Number, default: 0 }
},

// QSC Women
qscWomen: {
existing: { type: Number, default: 0 },
students: { type: Number, default: 0 },
nonWorkers: { type: Number, default: 0 }
},

// Juma Mosques
jumaMosques: {
count: { type: Number, default: 0 },
averageAttendees: { type: Number, default: 0 },
nonWorkersApprox: { type: Number, default: 0 }
},

// Educational Institutions
institutions: {
madrasas: {
count: { type: Number, default: 0 },
studentsCount: { type: Number, default: 0 },
staffWorkers: { type: Number, default: 0 },
staffOthers: { type: Number, default: 0 },
nonTeachingWorkers: { type: Number, default: 0 },
nonTeachingOthers: { type: Number, default: 0 }
},
schools: {
count: { type: Number, default: 0 },
studentsCount: { type: Number, default: 0 },
staffWorkers: { type: Number, default: 0 },
staffOthers: { type: Number, default: 0 },
nonTeachingWorkers: { type: Number, default: 0 },
nonTeachingOthers: { type: Number, default: 0 }
},
heavens: {
count: { type: Number, default: 0 },
studentsCount: { type: Number, default: 0 },
staffWorkers: { type: Number, default: 0 },
staffOthers: { type: Number, default: 0 },
nonTeachingWorkers: { type: Number, default: 0 },
nonTeachingOthers: { type: Number, default: 0 }
},
arabicColleges: {
count: { type: Number, default: 0 },
studentsCount: { type: Number, default: 0 },
staffWorkers: { type: Number, default: 0 },
staffOthers: { type: Number, default: 0 },
nonTeachingWorkers: { type: Number, default: 0 },
nonTeachingOthers: { type: Number, default: 0 }
},
artsColleges: {
count: { type: Number, default: 0 },
studentsCount: { type: Number, default: 0 },
staffWorkers: { type: Number, default: 0 },
staffOthers: { type: Number, default: 0 },
nonTeachingWorkers: { type: Number, default: 0 },
nonTeachingOthers: { type: Number, default: 0 }
},
mainCampuses: {
count: { type: Number, default: 0 },
studentsCount: { type: Number, default: 0 },
}
}
},

partC: {
friendshipPlatforms: {
count: { type: Number, default: 0 },
cooperatingOthers: { type: Number, default: 0 },
remarks: { type: String }
},
fridayClub: {
count: { type: Number, default: 0 },
cooperatingOthers: { type: Number, default: 0 },
remarks: { type: String }
},
wings: {
count: { type: Number, default: 0 },
cooperatingOthers: { type: Number, default: 0 },
remarks: { type: String }
},
neighborhoodGroups: {
count: { type: Number, default: 0 },
cooperatingOthers: { type: Number, default: 0 },
remarks: { type: String }
},
otherNGOs: {
count: { type: Number, default: 0 },
cooperatingOthers: { type: Number, default: 0 },
remarks: { type: String }
},
palliative: {
count: { type: Number, default: 0 },
cooperatingOthers: { type: Number, default: 0 },
remarks: { type: String }
},
otherActivities: {
count: { type: Number, default: 0 },
cooperatingOthers: { type: Number, default: 0 },
remarks: { type: String }
}
},

partD: {
interestFreeSystems: {
count: { type: Number, default: 0 },
beneficiariesLast3Years: { type: Number, default: 0 }
},
zakatCommittee: {
count: { type: Number, default: 0 },
beneficiariesLast3Years: { type: Number, default: 0 }
},
peoplesFoundationBeneficiaries: { type: Number, default: 0 },
housingProjectBeneficiaries: { type: Number, default: 0 },
baytulZakatBeneficiaries: { type: Number, default: 0 },
nonWorkersinMadhyamamReaders : { type: Number, default: 0 },
nonWorkersinPrabodhanamReaders : { type: Number, default: 0 },
nonWorkersinAaramamReaders : { type: Number, default: 0 },
nonWorkersinAyahUsers : { type: Number, default: 0 },
areas: {
ourAreas: { type: Number, default: 0 },
registeredNonOurFamilies: { type: Number, default: 0 }
},

influentialMahalls : { type: Number, default: 0 },
khutbaListenersfromOrganizedAreas : { type: Number, default: 0 },
khutbaListenersfromNonOrganizedAreas : { type: Number, default: 0 },
FullTimeWorkers : { type: Number, default: 0 },
PartTimeWorkers : { type: Number, default: 0 },

},

// Part E - Additional Information and Future Plans
partE: {
areasWithoutPresence: {
description: { type: String },
type: { 
type: String, 
enum: ['urban', 'rural', 'hilly', 'coastal'], 
default: 'urban' 
}
},

panchayatsWithoutPresence: { type: String },

newComponentsLast5Years: {
count: { type: Number, default: 0 },
type: { 
type: String, 
enum: ['urban', 'rural', 'hilly', 'coastal'], 
default: 'urban' 
},
details: { type: String }
},

workersGrowthInLast5Years: {
count: { type: Number, default: 0 },
type: { 
type: String, 
enum: ['personalConnections', 'traditional', 'institutionalStudents', 'lectureAttendees','classes','khutbas','gulfConnections','selfReading','other'], 
default: 'personalConnections' 
},
},

componentsToFormIn6Months: {
jih: { type: Number, default: 0 },
vanitha: { type: Number, default: 0 },
solidarity: { type: Number, default: 0 },
sio: { type: Number, default: 0 },
gio: { type: Number, default: 0 },
teenIndia: { type: Number, default: 0 },
malarvadi: { type: Number, default: 0 }
}
},

submittedBy: { type: String, required: true }, // Track which user submitted
submittedAt: { type: Date, default: Date.now },
updatedAt: { type: Date, default: Date.now },
updatedBy: { type: String } // Track which admin updated (optional)

});

module.exports = mongoose.model('Form', formSchema);
