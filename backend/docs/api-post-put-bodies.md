# API POST/PUT Reference

Example bodies for every POST and PUT endpoint (paths are as defined in each router; prepend your global API prefix such as `/api` or `/api/admin` as applicable).

---

## adminRoutes.js
### POST /login
```json
{ "email": "admin@jih.org", "password": "secret123" }
```
```json
{ "message": "Login successful", "token": "<jwt>", "admin": { "email": "admin@jih.org" } }
```

### PUT /district-surveys/:id
```json
{ "month": "January", "district": "Pathanamthitta", "partA": { "totalPopulation": 12000 }, "submittedBy": "district-001" }
```
```json
{ "success": true, "message": "District survey updated successfully", "data": { "_id": "...", "district": "Pathanamthitta", "updatedBy": "admin@jih.org" } }
```

### PUT /area-surveys/:id
```json
{ "month": "January", "district": "Pathanamthitta", "area": "Area", "workers": { "rukkun": 12 } }
```
```json
{ "success": true, "message": "Area survey updated successfully", "data": { "_id": "...", "area": "Area" } }
```

### PUT /unit-surveys/:id
```json
{ "month": "January", "district": "Pathanamthitta", "area": "Area", "component": "Test Unit", "workers": { "karkun": 18 } }
```
```json
{ "success": true, "message": "Unit survey updated successfully", "survey": { "_id": "...", "component": "Test Unit" } }
```

---

## areaRoutes.js
### POST /surveys
```json
{
  "district": "Pathanamthitta",
  "area": "Area",
  "month": "January",
  "reportPeriod": "2025-01",
  "partA": {
    "kh": 2,
    "vkh": 1
  },
  "partB": {
    "monthlyMeeting": "Yes",
    "wingAttendance": {
      "jih": { "present": 10, "leave": 1, "absent": 0 },
      "vanitha": { "present": 8, "leave": 0, "absent": 1 }
    },
    "mainDecisions": ["Expand outreach to new wards"]
  },
  "partC": {
    "expansionActivities": {
      "newAreaWorkshop": true,
      "workerTraining": true
    },
    "otherFocus": "Focus on campus outreach"
  },
  "partD": {
    "activities": {
      "jih": { "componentVisits": 2, "newComponents": 1, "newPersonDiscoveryAttempts": 1 },
      "vanitha": { "componentVisits": 1 }
    }
  },
  "partE": {
    "male": 4,
    "female": 3,
    "categories": {
      "personalConnection": { "male": true, "female": false },
      "mediaReader": { "male": false, "female": true }
    },
    "categoriesCounts": {
      "personalConnection": { "male": 2, "female": 1 },
      "mediaReader": { "male": 0, "female": 1 }
    }
  },
  "partF": {
    "wingGrowth": {
      "jih": { "newComponents": 1, "newMembers": 2 },
      "vanitha": { "newComponents": 0, "newMembers": 1 }
    }
  }
}
```
```json
{ "success": true, "message": "Area survey created successfully", "data": { "_id": "...", "area": "Area", "submittedBy": "area-123" } }
```

### PUT /surveys/:id
```json
{ "month": "January", "area": "Area", "partB": { "newJIHMembers": { "male": 1, "female": 0 } } }
```
```json
{ "success": true, "message": "Area survey updated successfully", "data": { "_id": "...", "updatedAt": "2025-01-12T10:00:00Z" } }
```

---

## districtRoutes.js
### POST /surveys
```json
{ "district": "Pathanamthitta", "month": "January", "partD": { "categories": ["training"], "categoriesCounts": [5] } }
```
```json
{ "success": true, "message": "District survey created successfully", "data": { "_id": "...", "submittedBy": "district-001" } }
```

### PUT /surveys/:id
```json
{ "month": "January", "district": "Pathanamthitta", "partB": { "newMembers": 4 } }
```
```json
{ "success": true, "message": "District survey updated successfully", "data": { "_id": "...", "updatedAt": "2025-01-12T10:00:00Z" } }
```

---

## unitRoutes.js
### POST /unit-survey
```json
{
  "month": "January",
  "year": 2025,
  "district": "Pathanamthitta",
  "area": "Area",
  "component": "Test Unit",
  "partA": {
    "authorityPersonsCounts": {
      "vyakthibandham": { "male": 2, "female": 2 }
    }
  },
  "partB": {
    "memberCategoriesCounts": {
      "vyakthibandham": { "male": 30, "female": 22 }
    }
  }
}
```
```json
{ "message": "Unit survey submitted successfully", "survey": { "_id": "...", "component": "Test Unit", "submissionLevel": "unit" } }
```

### PUT /unit-survey/:id
```json
{
  "month": "January",
  "district": "Pathanamthitta",
  "area": "Area",
  "component": "Test Unit",
  "partA": {
    "authorityPersonsCounts": {
      "vyakthibandham": { "male": 1, "female": 1 }
    }
  },
  "partB": {
    "memberCategoriesCounts": {
      "vyakthibandham": { "male": 28, "female": 18 }
    }
  },
  "partC": { "publicMeetingAttendees": { "male": 40, "female": 25 } }
}
```
```json
{ "message": "Unit survey updated successfully", "survey": { "_id": "...", "component": "Test Unit", "updatedAt": "2025-01-12T10:00:00Z" } }
```

---

## userRoutes.js (forms & unified login)
### POST /login/unified
```json
{ "accessCode": "path@area@testunit" }
```
```json
{ "message": "Unit login successful", "token": "<jwt>", "user": { "role": "unit", "district": "Pathanamthitta", "area": "Area", "unitId": "unit-001" }, "userType": "unit" }
```

### POST /forms
```json
{ "district": "Pathanamthitta", "partA": { "totalPopulation": 150000 }, "partB": { "education": { "schools": 25 } } }
```
```json
{ "message": "Form submitted successfully", "form": { "_id": "...", "district": "Pathanamthitta", "submittedBy": "Pathanamthitta" } }
```

### PUT /forms/:id
```json
{ "partA": { "totalPopulation": 152000 }, "partC": { "programs": 12 } }
```
```json
{ "message": "Form updated successfully", "form": { "_id": "...", "updatedAt": "2025-01-12T10:00:00Z" } }
```

---

## reportRoutes.js (templates & submissions)
### POST /admin/reports
```json
{ "type": "monthly", "reportFor": "unit", "title": "January Unit Report", "description": "Monthly unit tracker", "parts": [ { "partName": "Attendance", "questions": [ { "questionText": "Weekly meetings held?", "answerType": "radio", "options": ["Yes","No"] }, { "questionText": "Total participants", "answerType": "number" } ] } ] }
```
```json
{ "success": true, "message": "Report created successfully", "data": { "_id": "...", "type": "monthly", "reportFor": "unit", "title": "January Unit Report", "recurringMonthly": true, "month": 1, "year": 2025 } }
```

### PUT /admin/reports/:id
```json
{ "title": "February Unit Report", "isActive": true, "parts": [ { "partName": "Attendance", "questions": [ { "questionText": "Weekly meetings held?", "answerType": "radio", "options": ["Yes","No"] } ] } ] }
```
```json
{ "success": true, "message": "Report updated successfully", "data": { "_id": "...", "title": "February Unit Report", "reportFor": "unit" } }
```

### POST /user/reports/:id/submit
```json
{ "answers": [ { "questionId": "q1", "value": "Yes" }, { "questionId": "q2", "value": 42 } ], "extra": { "notes": "Completed with team" }, "status": "submitted" }
```
```json
{ "success": true, "message": "Report submitted successfully", "data": { "_id": "...", "reportId": "...", "status": "submitted" } }
```

### PUT /user/reports/:id/submission
```json
{ "answers": [ { "questionId": "q1", "value": "No" } ], "extra": { "notes": "Corrected" }, "status": "submitted" }
```
```json
{ "success": true, "message": "Submission updated successfully", "data": { "_id": "...", "status": "submitted" } }
``>

---

## notificationRoutes.js
### POST /create
```json
{ "title": "Monthly Reminder", "description": "Submit unit reports by 25th", "recipients": { "district": { "districtId": "65f...", "districtName": "Pathanamthitta" }, "areas": [], "units": [] } }
```
```json
{ "success": true, "message": "Notification created successfully", "notification": { "_id": "...", "title": "Monthly Reminder" } }
```

### POST /:id/read
```json
{}
```
```json
{ "success": true, "message": "Notification marked as read" }
```

---

## ihthisabi/auth.js
### POST /unified-login
```json
{ "ruknId": "RUKN-1022" }
```
```json
{ "success": true, "message": "Member login successful", "data": { "user": { "id": "...", "role": "rukn", "ruknId": "RUKN-1022", "unit": "Test Unit" }, "token": "<jwt>" } }
```

### POST /admin/login
```json
{ "email": "admin@ihthisabi.com", "password": "secret" }
```
```json
{ "success": true, "message": "Admin login successful", "data": { "token": "<jwt>", "user": { "email": "admin@ihthisabi.com", "role": "admin" } } }
```

### PUT /profile
```json
{ "district": "Pathanamthitta", "area": "Area", "unit": "Test Unit", "name": "Abdul Rahman" }
```
```json
{ "success": true, "message": "Profile updated successfully", "data": { "user": { "id": "...", "district": "Pathanamthitta", "unit": "Test Unit" } } }
```

### PUT /change-password
```json
{ "currentPassword": "oldPass!", "newPassword": "NewPass123" }
```
```json
{ "success": true, "message": "Password changed successfully" }
```

---

## ihthisabi/submissions.js (rukn quarterly submissions)
### POST /
```json
{ "district": "Pathanamthitta", "area": "Area", "unit": "Test Unit", "ruknName": "Ali KP", "form": { "hadithCount": 12, "newMembers": 1, "scoreCount": 88, "quranStudy": { "status": "complete" }, "bookReading": { "islami": "complete", "atma": "partial" } }, "year": 2025, "quarter": 1 }
```
```json
{ "success": true, "message": "Form submitted successfully", "data": { "submission": { "id": "...", "periodDisplay": "Q1 2025", "status": "submitted" } } }
```

### PUT /:id/status
```json
{ "status": "reviewed", "notes": "Good progress" }
```
```json
{ "success": true, "message": "Submission status updated successfully", "data": { "submission": { "id": "...", "status": "reviewed" } } }
```

### PUT /:id
```json
{ "district": "Pathanamthitta", "area": "Area", "unit": "Test Unit", "ruknName": "Ali KP", "form": { "hadithCount": 15, "newMembers": 2, "scoreCount": 90 } }
```
```json
{ "success": true, "message": "Submission updated successfully", "data": { "submission": { "id": "...", "status": "submitted" } } }
```

---

## ihthisabi/unitAdmin.js
### POST /login
```json
{ "unit": "Test Unit", "ruknId": "UA-1001" }
```
```json
{ "success": true, "message": "Unit Admin login successful", "data": { "user": { "id": "...", "role": "unitAdmin", "unit": "Test Unit" }, "token": "<jwt>" } }
```

### PUT /profile
```json
{ "name": "Unit Admin A", "contactNo": "+91-9000000000", "emailId": "ua@unit1.com" }
```
```json
{ "success": true, "message": "Profile updated successfully", "data": { "user": { "id": "...", "name": "Unit Admin A" } } }
```

### PUT /change-password
```json
{ "currentPassword": "oldPass", "newPassword": "NewPass123" }
```
```json
{ "success": true, "message": "Password changed successfully" }
```

### POST /submit-form
```json
{ "district": "Pathanamthitta", "area": "Area", "unit": "Test Unit", "ruknName": "Unit Admin A", "form": { "hadithCount": 10, "scoreCount": 85 }, "year": 2025, "quarter": 1 }
```
```json
{ "success": true, "message": "Form submitted successfully", "data": { "submission": { "id": "...", "status": "submitted" } } }
```

### PUT /my-submissions/:id
```json
{ "ruknName": "Unit Admin A", "form": { "hadithCount": 12, "newMembers": 1 } }
```
```json
{ "success": true, "message": "Submission updated successfully", "data": { "submission": { "id": "...", "status": "submitted" } } }
```

### DELETE /my-submissions/:id
```json
{}
```

---

## ihthisabi/admin.js
### POST /submissions/:id/reply
```json
{ "message": "Please improve weekly meeting attendance." }
```
```json
{ "success": true, "message": "Reply added successfully", "data": { "submission": { "id": "...", "adminReply": { "message": "...", "repliedBy": "..." } }, "whatsappSent": false } }
```

### POST /migrate-quarters
```json
{}
```
```json
{ "success": true, "data": { "totalSubmissions": 120, "updatedCount": 118, "errors": null } }
```

### POST /upload-excel
*(multipart/form-data with `excelFile`)*
```json
{ "success": true, "message": "Excel file processed successfully", "data": { "totalProcessed": 200, "created": 150, "updated": 45, "errors": [] } }
```

### POST /upload-unitadmin-excel
*(multipart/form-data with `excelFile`)*
```json
{ "success": true, "message": "Unit Admin Excel file processed successfully", "data": { "totalProcessed": 50, "created": 30, "updated": 18, "errors": [] } }
```

### POST /unit-reply
```json
{ "unit": "Test Unit", "year": 2025, "quarter": 1, "formattedMessage": "Key gaps: ...", "replyData": { "quranCompleted": ["Ali"], "absentees": ["Basu"] } }
```
```json
{ "success": true, "message": "Reply sent successfully", "data": { "reply": { "id": "...", "unit": "Test Unit", "periodDisplay": "Q1 2025", "whatsappSent": true }, "whatsappSent": true } }
```

### POST /migrate-q4-to-q3
```json
{}
```
```json
{ "success": true, "message": "Successfully migrated 32 submissions from Q4 to Q3", "data": { "totalFound": 32, "totalUpdated": 32, "monthDistribution": { "month7": 11, "month8": 11, "month9": 10 } } }
```

---

## ihthisabi/location.js
*(All endpoints are GET; no POST/PUT bodies.)*


