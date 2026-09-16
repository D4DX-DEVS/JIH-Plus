// Every JIH Portal model. Required by config/tenantModel.js so the full schema
// registry exists before a tenant connection is bound. IHTHISABI and Members
// models live on their own connections and are intentionally not listed.
require('./area');
require('./areaSurvey');
require('./district');
require('./districtSurvey');
require('./form');
require('./notification');
require('./report');
require('./reportSubmission');
require('./state');
require('./target');
require('./targetAllocation');
require('./unit');
require('./unitSurvey');
require('./user');
