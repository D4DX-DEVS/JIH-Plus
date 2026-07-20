# Form Configuration — Complete Reference Guide

This document covers the complete form configuration system used in the People ERP admin panel. It is intended as a reference for implementing the same system in another project.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Model — MongoDB Schema](#2-data-model--mongodb-schema)
3. [Field Types](#3-field-types)
4. [Field Properties Reference](#4-field-properties-reference)
5. [Options Fields Configuration](#5-options-fields-configuration)
6. [Row / Column (Table) Field](#6-row--column-table-field)
7. [Validation Rules](#7-validation-rules)
8. [Conditional Logic](#8-conditional-logic)
9. [Eligibility Scoring](#9-eligibility-scoring)
10. [Pages — Multi-Step Form](#10-pages--multi-step-form)
11. [Form-Level Settings](#11-form-level-settings)
12. [Pre-Form Instructions](#12-pre-form-instructions)
13. [Duplicate Detection](#13-duplicate-detection)
14. [Theme & Appearance](#14-theme--appearance)
15. [Submission Settings](#15-submission-settings)
16. [Publish / Version Control](#16-publish--version-control)
17. [API Endpoints](#17-api-endpoints)
18. [Complete JSON Example](#18-complete-json-example)
19. [TypeScript Type Definitions](#19-typescript-type-definitions)
20. [Scoring Conditions Reference](#20-scoring-conditions-reference)
21. [Frontend Form Builder Flow](#21-frontend-form-builder-flow)

---

## 1. System Overview

The form configuration system allows admins to **visually build multi-page application forms** tied to a scheme. The configuration is stored as a single JSON document in MongoDB and is fetched by the beneficiary-facing form renderer.

### Architecture

```
Admin (Form Builder UI)
        │ PUT /api/schemes/:schemeId/form-config
        ▼
MongoDB (FormConfiguration document)
        │ GET /api/schemes/:schemeId/form-config
        ▼
Beneficiary (Application Form renderer)
        │ POST /api/applications
        ▼
Application document (stores formData as field_<id>: value pairs)
```

### Key Points

- One form configuration per scheme (unique index on `scheme + isRenewalForm + franchise`)
- Multi-tenant: scoped by `franchise` via plugin
- Field IDs are plain integers (not MongoDB ObjectIds) — easier to reference in client state
- Multi-page forms supported; pages are ordered arrays
- Form version increments on every save
- Supports **main forms** and **renewal forms** separately

---

## 2. Data Model — MongoDB Schema

### Top-level `FormConfiguration` document

```javascript
{
  scheme:                   ObjectId,           // Reference to Scheme
  isRenewalForm:            Boolean,            // default: false
  parentFormConfiguration:  ObjectId | null,    // For renewal forms — points to original
  franchise:                ObjectId,           // Multi-tenancy (auto-set by plugin)

  // Basic info
  title:       String,   // max 300 chars, required
  description: String,   // max 2000 chars

  // Settings
  enabled:            Boolean,  // default: true
  emailNotifications: Boolean,  // default: true
  allowDrafts:        Boolean,  // default: true
  requiresReview:     Boolean,  // default: true
  autoSubmit:         Boolean,  // default: false

  // Content
  pages:        [ PageSchema ],
  instructions: [ InstructionSchema ],

  // Scoring
  scoringConfig: { ... },

  // Appearance
  theme: { ... },

  // Post-submit
  submissionSettings: { ... },

  // Duplicate detection fields
  duplicateDetection: [ ... ],

  // Analytics (auto-maintained)
  analytics: { totalViews, totalSubmissions, completionRate, averageTimeToComplete },

  // Version / publish
  version:     Number,   // increments on save
  isPublished: Boolean,
  publishedAt: Date,

  // Audit
  createdBy:    ObjectId,
  updatedBy:    ObjectId,
  lastModified: Date,
  createdAt:    Date,
  updatedAt:    Date
}
```

### Page Schema (`pages[]`)

```javascript
{
  id:          Number,   // Unique integer across all pages in this form
  title:       String,   // required, max 200 chars
  description: String,   // optional, max 1000 chars
  order:       Number,   // default: 0
  fields:      [ FieldSchema ],
  conditionalLogic: {    // Optional — show/hide entire page
    field:    Number,    // Field ID to evaluate
    operator: String,    // see operators list below
    value:    String
  }
}
```

### Field Schema (`pages[].fields[]`)

```javascript
{
  id:          Number,   // Unique integer across ALL pages in this form
  label:       String,   // required, max 200 chars — shown to user
  type:        String,   // required — see Field Types section
  required:    Boolean,  // default: false
  enabled:     Boolean,  // default: true — hides field when false
  placeholder: String,   // max 500 chars
  helpText:    String,   // max 1000 chars — shown below the field

  // For option-based types (select, radio, checkbox, multiselect, dropdown, yesno)
  options: [ String ],   // each max 200 chars

  // Validation
  validation: {
    pattern:       String,  // regex
    minLength:     Number,
    maxLength:     Number,
    min:           Number,  // for number fields
    max:           Number,  // for number fields
    customMessage: String
  },

  // For Row/Column (table) type
  columns:         Number,    // number of data columns
  columnTitles:    [ String ], // header label for each column
  rows:            Number,    // number of data rows
  rowTitles:       [ String ], // label for each row
  firstColumnHeader: String,  // label for the row-labels column (top-left cell)

  // Conditional logic — show/hide/require this field based on another field's value
  conditionalLogic: {
    field:    Number,   // Field ID to watch
    operator: String,   // see operators list
    value:    String,   // value to compare against
    action:   String    // 'show' | 'hide' | 'require' | 'optional'  (default: 'show')
  },

  // Eligibility scoring
  scoring: {
    enabled:   Boolean,
    maxPoints: Number,
    scoringRules: [
      {
        condition: String,  // see scoring conditions per type
        value:     String,
        value2:    String,  // only for 'between' condition
        points:    Number
      }
    ]
  }
}
```

---

## 3. Field Types

All valid `type` values for a field:

### Basic Input Types

| type | Description | Key settings |
|------|-------------|-------------|
| `text` | Single-line text input | `placeholder`, `validation.minLength/maxLength/pattern` |
| `email` | Email input (browser validation) | `placeholder` |
| `phone` | Phone number input | `placeholder`, `validation.pattern` |
| `number` | Numeric input | `validation.min/max` |
| `date` | Date picker | `validation.min/max` (as date strings) |
| `datetime` | Date + time picker | — |
| `time` | Time picker | — |
| `textarea` | Multi-line text | `placeholder`, `validation.minLength/maxLength` |
| `password` | Password input (masked) | `placeholder` |
| `url` | URL input | `placeholder` |
| `file` | File upload | `placeholder`, `helpText` |

### Choice Types

| type | Description | Requires `options` |
|------|-------------|-------------------|
| `select` | Single-select dropdown (native) | Yes |
| `dropdown` | Single-select dropdown (styled) | Yes |
| `radio` | Radio button group | Yes |
| `checkbox` | Checkbox group (multiple) | Yes |
| `multiselect` | Multi-select dropdown | Yes |
| `yesno` | Yes / No radio pair | No — rendered automatically |

### Layout / Structural Types

| type | Description |
|------|-------------|
| `title` | Section heading with horizontal rule |
| `html` | Rich HTML content block |
| `group` | Visual field grouping with left border |
| `page` | Page break separator (rarely used — prefer `pages[]`) |
| `row` | **Table field** — configurable rows × columns grid |
| `column` | Alias of `row` — same behavior |

> **Note:** `title`, `html`, `page`, `group`, `row`, `column` are **non-scorable** — they cannot have eligibility scoring rules.

---

## 4. Field Properties Reference

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | Number | Yes | — | Unique integer across all pages |
| `label` | String | Yes | — | Display label shown to user |
| `type` | String | Yes | — | One of the types listed above |
| `required` | Boolean | No | `false` | Makes field mandatory |
| `enabled` | Boolean | No | `true` | Shows/hides the field |
| `placeholder` | String | No | — | Input placeholder text |
| `helpText` | String | No | — | Hint text shown below the field |
| `options` | String[] | Conditional | — | Required for select/radio/checkbox/multiselect/dropdown |
| `validation` | Object | No | — | Validation constraints |
| `columns` | Number | No | `12` (layout) / `2` (row type) | For `row` type: number of data columns |
| `columnTitles` | String[] | No | — | For `row` type: header for each column |
| `rows` | Number | No | `3` | For `row` type: number of data rows |
| `rowTitles` | String[] | No | — | For `row` type: label for each row |
| `firstColumnHeader` | String | No | `""` | For `row` type: top-left cell header text |
| `conditionalLogic` | Object | No | — | Show/hide/require rules |
| `scoring` | Object | No | — | Eligibility scoring configuration |

---

## 5. Options Fields Configuration

For fields with type `select`, `dropdown`, `radio`, `checkbox`, `multiselect`:

```javascript
{
  "id": 5,
  "label": "Education Level",
  "type": "select",
  "required": true,
  "enabled": true,
  "options": [
    "Below 10th",
    "10th Pass",
    "12th Pass",
    "Graduate",
    "Post Graduate"
  ],
  "placeholder": "Select your education level"
}
```

- Options are stored as plain strings, one per array element
- In the admin form builder UI, options are entered one per line in a textarea
- `yesno` type does NOT need `options` — Yes/No are rendered automatically

---

## 6. Row / Column (Table) Field

The `row` type creates an interactive data-entry table with configurable rows and columns.

### Configuration

```javascript
{
  "id": 10,
  "label": "Skills Assessment",
  "type": "row",
  "required": true,
  "enabled": true,
  "columns": 4,
  "columnTitles": ["Beginner", "Intermediate", "Advanced", "Expert"],
  "rows": 3,
  "rowTitles": ["Python", "JavaScript", "SQL"],
  "firstColumnHeader": "Skill",
  "placeholder": "Enter value"
}
```

### Rendered Table Structure

```
| Skill      | Beginner | Intermediate | Advanced | Expert |
|------------|----------|--------------|----------|--------|
| Python     | [input]  | [input]      | [input]  | [input]|
| JavaScript | [input]  | [input]      | [input]  | [input]|
| SQL        | [input]  | [input]      | [input]  | [input]|
```

### How Data Is Stored (Application Submission)

The user's input is saved as a **2D string array**:

```javascript
{
  "field_10": [
    ["", "Intermediate", "", ""],         // Python row
    ["Beginner", "", "Advanced", ""],     // JavaScript row
    ["", "", "", "Expert"]               // SQL row
  ]
}
```

### Rules
- `columnTitles` length must match `columns`
- `rowTitles` length must match `rows`
- If `firstColumnHeader` is blank and no `rowTitles` are set, the first column is hidden
- `row` and `column` types are **non-scorable**
- Row/Column fields **cannot** have conditional logic applied (they are structural)
- On the beneficiary form, each row can be duplicated using the copy icon

---

## 7. Validation Rules

Applicable to text, email, phone, number, textarea, url, password:

```javascript
{
  "validation": {
    "pattern":       "^[+]?[0-9]{10,15}$",  // Regex pattern (for text/phone/email)
    "minLength":     2,                       // Minimum string length
    "maxLength":     100,                     // Maximum string length
    "min":           0,                       // Minimum value (for number)
    "max":           999,                     // Maximum value (for number)
    "customMessage": "Please enter a valid value"
  }
}
```

- `customMessage` overrides the default browser/form validation message
- For `number` fields: use `min`/`max` for value range, `minLength`/`maxLength` are ignored
- For `text`/`textarea`: use `minLength`/`maxLength` for character count
- `pattern` is a JS-compatible regex string (without delimiters)

---

## 8. Conditional Logic

A field or page can be shown/hidden/required based on another field's value.

### Field-Level Conditional Logic

```javascript
{
  "id": 8,
  "label": "Specify Other Reason",
  "type": "text",
  "conditionalLogic": {
    "field":    5,          // Watch field with ID 5
    "operator": "equals",   // Condition operator
    "value":    "Other",    // Value to compare
    "action":   "show"      // What to do: show | hide | require | optional
  }
}
```

### Page-Level Conditional Logic

```javascript
{
  "id": 2,
  "title": "Medical Details",
  "conditionalLogic": {
    "field":    3,
    "operator": "equals",
    "value":    "yes"
  }
  // No 'action' at page level — it always means "show this page when condition is true"
}
```

### Operators

| Operator | Description |
|---|---|
| `equals` | Exact match |
| `not_equals` | Does not match |
| `contains` | String contains value |
| `not_contains` | String does not contain value |
| `greater_than` | Numeric greater than |
| `less_than` | Numeric less than |
| `is_empty` | Field has no value |
| `is_not_empty` | Field has a value |

---

## 9. Eligibility Scoring

Each field can optionally carry a scoring configuration for eligibility calculation.

### Field Scoring

```javascript
{
  "scoring": {
    "enabled":   true,
    "maxPoints": 20,
    "scoringRules": [
      {
        "condition": "greater_than",
        "value":     "60",
        "points":    20
      },
      {
        "condition": "between",
        "value":     "40",
        "value2":    "60",
        "points":    10
      }
    ]
  }
}
```

### Form-Level Scoring Config

```javascript
{
  "scoringConfig": {
    "enabled":                  true,
    "minimumThreshold":         50,      // % of total max points needed
    "autoRejectBelowThreshold": false,   // auto-reject if score below threshold
    "showScoreToAdmin":         true
  }
}
```

### Scoring Conditions per Field Type

| Field Type | Allowed Conditions |
|---|---|
| `number` | `greater_than`, `less_than`, `between`, `equals` |
| `text` | `is_not_empty`, `equals`, `contains` |
| `textarea` | `is_not_empty`, `contains` |
| `email`, `phone`, `url`, `time` | `is_not_empty` |
| `select`, `dropdown`, `radio` | `equals` |
| `yesno` | `equals` (value: `"yes"` or `"no"`) |
| `multiselect` | `includes` |
| `checkbox` | `equals` (value: `"true"` or `"false"`) |
| `date`, `datetime` | `before`, `after`, `between` |
| `file` | `is_uploaded` |
| `title`, `html`, `page`, `group`, `row`, `column` | **Not scorable** |

### Score Matching Strategy

- **Option-based types** (`select`, `radio`, `dropdown`, `multiselect`, `yesno`, `checkbox`): all matching rules' points **add up**
- **Number type**: all matching rules' points **add up**
- **Text/date/file types**: **first matching rule wins**

### Eligibility Score Result (stored on application)

```javascript
{
  "eligibilityScore": {
    "totalPoints":     35,
    "maxPoints":       50,
    "percentage":      70,
    "meetsThreshold":  true,
    "threshold":       60,
    "autoRejected":    false,
    "calculatedAt":    "2025-01-01T10:00:00Z",
    "fieldScores": [
      {
        "fieldId":      3,
        "fieldLabel":   "Age",
        "earnedPoints": 20,
        "maxPoints":    20,
        "appliedRule":  "greater_than 18",
        "answerValue":  25
      }
    ]
  }
}
```

---

## 10. Pages — Multi-Step Form

Pages are ordered arrays inside the form configuration.

### Adding a Page

```javascript
{
  "id":    2,             // Unique integer, auto-incremented
  "title": "Documents",   // Required — shown as step heading
  "description": "Upload your supporting documents",
  "order": 2,             // Controls display order
  "fields": [ ... ],
  "conditionalLogic": { ... }  // Optional — skip this page based on a condition
}
```

### Rules

- At least **one page** is required
- Page IDs must be unique within the form
- Field IDs must be unique **across all pages**
- Pages can be **drag-reordered** in the builder UI
- Single-page forms do not show page headings in the preview
- Multi-page navigation uses simple "Next / Previous" with per-page validation

---

## 11. Form-Level Settings

```javascript
{
  "title":              "Scholarship Application Form",
  "description":        "Fill in all required fields.",
  "enabled":            true,    // Form is active for new submissions
  "emailNotifications": true,    // Send confirmation emails
  "allowDrafts":        true,    // Beneficiary can save draft and continue later
  "requiresReview":     true,    // Applications go to admin review
  "autoSubmit":         false    // Auto-submit without explicit submit button
}
```

---

## 12. Pre-Form Instructions

Instructions are shown to the beneficiary **before** they start filling the form, as a numbered list.

```javascript
{
  "instructions": [
    {
      "id":    1,
      "text":  "Keep your Aadhaar card ready before starting.",
      "order": 1
    },
    {
      "id":    2,
      "text":  "Documents must be in PDF or JPG format, max 5 MB each.",
      "order": 2
    }
  ]
}
```

- `id`: unique integer
- `order`: controls display order (ascending)
- Max 500 characters per instruction

---

## 13. Duplicate Detection

Mark specific fields for cross-beneficiary duplicate checking. Applications sharing the same value for any of these fields will be **flagged** (not auto-rejected) during admin review.

```javascript
{
  "duplicateDetection": [
    {
      "fieldId":    3,
      "fieldType":  "phone",       // 'phone' | 'aadhaar' | 'ration_card' | 'custom'
      "fieldLabel": "Phone Number",
      "enabled":    true
    }
  ]
}
```

---

## 14. Theme & Appearance

```javascript
{
  "theme": {
    "primaryColor":     "#3b82f6",   // Hex color — buttons, headings
    "backgroundColor":  "#ffffff",   // Form background
    "fontFamily":       "Inter",     // Font name
    "customCSS":        ""           // Optional raw CSS string
  }
}
```

---

## 15. Submission Settings

```javascript
{
  "submissionSettings": {
    "confirmationMessage": "Thank you! We will review your application and get back to you soon.",
    "redirectUrl":         "https://example.com/thank-you",   // Optional redirect after submit
    "emailTemplate":       "",                                 // Optional custom email template
    "notificationEmails":  ["admin@example.com"]              // Notify these on submission
  }
}
```

---

## 16. Publish / Version Control

```javascript
{
  "version":     3,                         // Increments on every PUT save
  "isPublished": true,                      // true = live and accepting submissions
  "publishedAt": "2025-01-15T09:00:00Z"
}
```

### Publish Workflow

1. Admin builds/updates the form → **saves** → `version` increments, `isPublished` unchanged
2. Admin clicks **Publish** → `isPublished: true` is set via `PATCH /form-config/publish`
3. Beneficiary form is only accessible when `isPublished: true` AND `enabled: true`
4. Admin can **unpublish** at any time (same endpoint with `isPublished: false`)

---

## 17. API Endpoints

### Main Form Configuration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schemes/:schemeId/form-config` | Fetch form config |
| `PUT` | `/api/schemes/:schemeId/form-config` | Create or update form config |
| `DELETE` | `/api/schemes/:schemeId/form-config` | Delete form config |
| `PATCH` | `/api/schemes/:schemeId/form-config/publish` | Publish / Unpublish |
| `GET` | `/api/schemes/:schemeId/form-config/analytics` | View analytics |
| `POST` | `/api/schemes/:schemeId/form-config/duplicate` | Copy to another scheme |

### Renewal Form Configuration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schemes/:schemeId/renewal-form-config` | Fetch renewal form |
| `PUT` | `/api/schemes/:schemeId/renewal-form-config` | Create or update renewal form |
| `DELETE` | `/api/schemes/:schemeId/renewal-form-config` | Delete renewal form |

### GET Response Shape

```json
{
  "hasConfiguration": true,
  "formConfiguration": {
    "title": "...",
    "pages": [ ... ],
    "scoringConfig": { ... },
    "isPublished": true,
    "version": 3,
    "lastModified": "2025-06-01T10:00:00Z"
  }
}
```

### PUT Request Body

```json
{
  "title": "My Application Form",
  "description": "...",
  "enabled": true,
  "emailNotifications": true,
  "pages": [ ... ],
  "scoringConfig": { ... },
  "instructions": [ ... ]
}
```

### PATCH Publish Body

```json
{ "isPublished": true }
```

---

## 18. Complete JSON Example

```json
{
  "title": "Student Scholarship Application Form",
  "description": "Apply for the annual scholarship program.",
  "enabled": true,
  "emailNotifications": true,
  "allowDrafts": true,
  "requiresReview": true,

  "instructions": [
    { "id": 1, "text": "Keep your school ID ready.", "order": 1 },
    { "id": 2, "text": "Documents should be in PDF format.", "order": 2 }
  ],

  "pages": [
    {
      "id": 1,
      "title": "Personal Information",
      "description": "Your basic details",
      "order": 1,
      "fields": [
        {
          "id": 1,
          "label": "Full Name",
          "type": "text",
          "required": true,
          "enabled": true,
          "placeholder": "Enter your full name",
          "validation": {
            "minLength": 2,
            "maxLength": 100,
            "customMessage": "Name must be 2–100 characters"
          }
        },
        {
          "id": 2,
          "label": "Date of Birth",
          "type": "date",
          "required": true,
          "enabled": true
        },
        {
          "id": 3,
          "label": "Gender",
          "type": "radio",
          "required": true,
          "enabled": true,
          "options": ["Male", "Female", "Other"]
        },
        {
          "id": 4,
          "label": "Do you have a disability?",
          "type": "yesno",
          "required": false,
          "enabled": true
        },
        {
          "id": 5,
          "label": "Disability Type",
          "type": "text",
          "required": false,
          "enabled": true,
          "placeholder": "Describe the disability",
          "conditionalLogic": {
            "field": 4,
            "operator": "equals",
            "value": "yes",
            "action": "show"
          }
        }
      ]
    },
    {
      "id": 2,
      "title": "Academic Details",
      "description": "Your current academic status",
      "order": 2,
      "fields": [
        {
          "id": 6,
          "label": "Education Level",
          "type": "select",
          "required": true,
          "enabled": true,
          "options": ["10th", "12th", "Graduate", "Post Graduate"],
          "scoring": {
            "enabled": true,
            "maxPoints": 20,
            "scoringRules": [
              { "condition": "equals", "value": "Post Graduate", "points": 20 },
              { "condition": "equals", "value": "Graduate",      "points": 15 },
              { "condition": "equals", "value": "12th",          "points": 10 },
              { "condition": "equals", "value": "10th",          "points": 5  }
            ]
          }
        },
        {
          "id": 7,
          "label": "Annual Family Income (₹)",
          "type": "number",
          "required": true,
          "enabled": true,
          "validation": { "min": 0, "max": 10000000 },
          "scoring": {
            "enabled": true,
            "maxPoints": 30,
            "scoringRules": [
              { "condition": "less_than",  "value": "100000",  "points": 30 },
              { "condition": "between",    "value": "100000",  "value2": "300000", "points": 20 },
              { "condition": "greater_than","value": "300000", "points": 5  }
            ]
          }
        },
        {
          "id": 8,
          "label": "Subject-wise Marks",
          "type": "row",
          "required": true,
          "enabled": true,
          "columns": 3,
          "columnTitles": ["Subject", "Max Marks", "Marks Obtained"],
          "rows": 4,
          "rowTitles": ["Maths", "Science", "English", "Social"],
          "firstColumnHeader": "Subject"
        }
      ]
    },
    {
      "id": 3,
      "title": "Documents",
      "description": "Upload required documents",
      "order": 3,
      "fields": [
        {
          "id": 9,
          "label": "Marksheet",
          "type": "file",
          "required": true,
          "enabled": true,
          "helpText": "Upload your latest marksheet (PDF/JPG, max 5 MB)"
        },
        {
          "id": 10,
          "label": "Income Certificate",
          "type": "file",
          "required": true,
          "enabled": true
        }
      ]
    }
  ],

  "scoringConfig": {
    "enabled": true,
    "minimumThreshold": 40,
    "autoRejectBelowThreshold": false,
    "showScoreToAdmin": true
  },

  "theme": {
    "primaryColor": "#3b82f6",
    "backgroundColor": "#ffffff",
    "fontFamily": "Inter"
  },

  "submissionSettings": {
    "confirmationMessage": "Your application has been submitted successfully.",
    "notificationEmails": ["admin@org.com"]
  }
}
```

---

## 19. TypeScript Type Definitions

```typescript
export interface ScoringRule {
  condition:
    | 'equals' | 'not_equals'
    | 'greater_than' | 'less_than' | 'between'
    | 'contains' | 'is_not_empty' | 'is_uploaded'
    | 'before' | 'after' | 'includes';
  value: string;
  value2?: string;   // only for 'between'
  points: number;
}

export interface FieldScoring {
  enabled: boolean;
  maxPoints: number;
  scoringRules: ScoringRule[];
}

export interface FormField {
  id: number;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    customMessage?: string;
  };
  columns?: number;
  columnTitles?: string[];
  rows?: number;
  rowTitles?: string[];
  firstColumnHeader?: string;
  conditionalLogic?: {
    field: number;
    operator: string;
    value: string;
    action?: 'show' | 'hide' | 'require' | 'optional';
  };
  scoring?: FieldScoring;
}

export interface FormPage {
  id: number;
  title: string;
  description?: string;
  fields: FormField[];
  order?: number;
  conditionalLogic?: {
    field: number;
    operator: string;
    value: string;
  };
}

export interface FormInstruction {
  id: number;
  text: string;
  order: number;
}

export interface FormScoringConfig {
  enabled: boolean;
  minimumThreshold: number;         // 0–100 (percentage)
  autoRejectBelowThreshold: boolean;
  showScoreToAdmin: boolean;
}

export interface FormConfiguration {
  title: string;
  description?: string;
  enabled: boolean;
  emailNotifications: boolean;
  allowDrafts: boolean;
  requiresReview: boolean;
  pages: FormPage[];
  instructions?: FormInstruction[];
  scoringConfig?: FormScoringConfig;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    customCSS?: string;
  };
  submissionSettings?: {
    confirmationMessage?: string;
    redirectUrl?: string;
    notificationEmails?: string[];
  };
}

// Field types that cannot have scoring
export const NON_SCORABLE_TYPES = ['title', 'html', 'page', 'group', 'row', 'column'];
```

---

## 20. Scoring Conditions Reference

| Field Type | Condition | Value Example | Notes |
|---|---|---|---|
| `number` | `greater_than` | `"18"` | |
| `number` | `less_than` | `"60"` | |
| `number` | `between` | `value: "18"`, `value2: "35"` | Both boundaries needed |
| `number` | `equals` | `"25"` | |
| `text` | `is_not_empty` | — | No value needed |
| `text` | `equals` | `"Delhi"` | |
| `text` | `contains` | `"engineering"` | Case-insensitive check |
| `select` / `radio` / `dropdown` | `equals` | `"Graduate"` | Must match option exactly |
| `multiselect` | `includes` | `"Python"` | Checks if array includes value |
| `yesno` | `equals` | `"yes"` or `"no"` | Always lowercase |
| `checkbox` | `equals` | `"true"` or `"false"` | String of boolean |
| `date` / `datetime` | `before` | `"2000-01-01"` | ISO date string |
| `date` / `datetime` | `after` | `"1990-01-01"` | |
| `date` / `datetime` | `between` | `value: "1990-01-01"`, `value2: "2005-12-31"` | |
| `file` | `is_uploaded` | — | No value needed |
| `email` / `phone` / `url` / `time` / `textarea` | `is_not_empty` | — | Only condition available |

---

## 21. Frontend Form Builder Flow

### Navigation to Form Builder

```
Schemes List → (click "Configure Form" on a scheme) 
→ /form-builder?schemeId=<id>&schemeName=<name>&renewal=false
```

### What the Builder Loads

1. Calls `GET /api/schemes/:schemeId/form-config`
2. If form exists → loads `pages`, `scoringConfig`, `instructions`, settings
3. If no form exists → starts with empty `pages: []`

### Save Payload

```javascript
await api.updateFormConfiguration(schemeId, {
  title,
  description,
  enabled,
  emailNotifications,
  pages,          // full pages array
  scoringConfig,
  instructions
});
```

### Permissions Required

- `schemes.create` OR `schemes.manage` OR `schemes.update.assigned`

### Form Builder UI Tabs

| Tab | Content |
|---|---|
| **Builder** | Field canvas with page tabs, FieldEditor panels |
| **Preview** | Live rendered preview of the form as beneficiaries see it |
| **Settings** | Form title, description, toggles, scoring config |

### Field Addition Flow

1. Click **Add Field** button (or select from `FieldTypeSelector`)  
2. A new field with default `label: "New <type> Field"` is appended to the current page
3. Admin edits label, type, required toggle directly inline
4. Click **Settings icon** on the field to expand advanced options (placeholder, options, conditional logic, scoring)

### Page Management

- Click **+ Add Page** to add a new page tab
- Drag page tabs to reorder
- Click **trash icon** on page tab to delete (minimum one page must remain)
- Page title is editable inline at the top of the canvas

---

*End of Form Configuration Guide*
