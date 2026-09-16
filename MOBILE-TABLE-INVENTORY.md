# Mobile tables and tabs — implemented inventory

Paths below are relative to frontend/src. Updated 7 September 2026.

## Shared conversion (46 source files)

Each file below uses ResponsiveTable. On phones below 640px, exposed table rows become vertical labelled cards. Grouped headings are combined into labels; existing inputs, callbacks, values and totals stay mounted. Desktop and print remain tables. Tables already hidden for a separate mobile list stay hidden, preventing duplicates.

- `components/admin/ConsolidationTab.jsx`
- `components/forms/area/AreaPageB.jsx`
- `components/forms/area/AreaPageD.jsx`
- `components/forms/area/AreaPageF.jsx`
- `components/forms/area/AreaSurveyView.jsx`
- `components/forms/district/DistrictPageA.jsx`
- `components/forms/district/DistrictPageB.jsx`
- `components/forms/district/DistrictSurveyView.jsx`
- `components/forms/monthly/MonthlySurveyPartE.jsx`
- `components/forms/monthly/PartB.jsx`
- `components/forms/monthly/PartC.jsx`
- `components/forms/monthly/PartD.jsx`
- `components/forms/monthly/PartE.jsx`
- `components/forms/unit/UnitSurveyView.jsx`
- `components/ihthisabi/AbroadCountryManagement.jsx`
- `components/ihthisabi/ArchiveManagement.jsx`
- `components/ihthisabi/MasterDataManagement.jsx`
- `components/ihthisabi/UserManagement.jsx`
- `components/ihthisabi/UserManagementDynamic.jsx`
- `components/reportBuilder/RowColumnEditor.jsx`
- `components/reportRenderer/RowColumnField.jsx`
- `components/reportRenderer/RowColumnReadonly.jsx`
- `pages/AdminDashboardPage.jsx`
- `pages/AreaDashboardPage.jsx`
- `pages/AreaSurveyDetailPage.jsx`
- `pages/DynamicSubmissionsPage.jsx`
- `pages/FormDetailPage.jsx`
- `pages/FormSubmissionPage.jsx`
- `pages/LocationMasterPage.jsx`
- `pages/MonthlySurveyDashboard.jsx`
- `pages/ReportSubmissionsPage.jsx`
- `pages/ReportsPage.jsx`
- `pages/UnitDashboardPage.jsx`
- `pages/UserReportsPage.jsx`
- `pages/ihthisabi/AdminDashboard.jsx`
- `pages/ihthisabi/AllSubmissions.jsx`
- `pages/ihthisabi/Consolidation.jsx`
- `pages/ihthisabi/DistrictAdminDashboard.jsx`
- `pages/ihthisabi/DynamicFormsUser.jsx`
- `pages/ihthisabi/UnitAdminDashboard.jsx`
- `pages/members/AccessLinksPage.jsx`
- `pages/members/AccountsPage.jsx`
- `pages/members/ApplicationsPage.jsx`
- `pages/members/FormsPage.jsx`
- `pages/members/MasterDataPage.jsx`
- `pages/members/RolesPage.jsx`

## Dedicated statistics cards

UnitMonthlyStatsTable, AreaMonthlyStatsTable and DistrictMonthlyStatsTable keep native desktop tables and render MobileRecordCards on phones. Their section tabs stack vertically. Native table sources remaining:

- `components/tables/AreaMonthlyStatsTable.jsx`
- `components/tables/DistrictMonthlyStatsTable.jsx`
- `components/tables/ResponsiveTable.jsx`
- `components/tables/UnitMonthlyStatsTable.jsx`

ResponsiveTable.jsx is the underlying native table wrapper, not an outstanding conversion.

## Mobile selector coverage

Shared members Tabs and reportBuilder/PageTabs stack on small screens. The mobile-tab-grid, ih-mobile-tabs and ih-segment patterns wrap into two-column selector cards below 640px with full labels; desktop layout remains horizontal. Statistics selectors use full-width mobile cards for long section titles.

- `components/ihthisabi/AbroadCountryManagement.jsx`
- `components/ihthisabi/MasterDataManagement.jsx`
- `components/members/ui.jsx`
- `components/reportBuilder/PageTabs.jsx`
- `pages/AdminDashboardPage.jsx`
- `pages/AreaDashboardPage.jsx`
- `pages/AreaSurveyEditPage.jsx`
- `pages/DistrictDashboardPage.jsx`
- `pages/DynamicSubmissionsPage.jsx`
- `pages/NotificationsPage.jsx`
- `pages/ReportsPage.jsx`
- `pages/ihthisabi/AbroadSubmissions.jsx`
- `pages/ihthisabi/AllSubmissions.jsx`
- `pages/ihthisabi/DistrictAdminDashboard.jsx`
- `pages/ihthisabi/DistrictAreaDetails.jsx`
- `pages/ihthisabi/DynamicFormsAdmin.jsx`
- `pages/ihthisabi/UnitAdminDashboard.jsx`
- `pages/ihthisabi/UnitAdminDetails.jsx`
- `pages/members/FormBuilderPage.jsx`

Additional dedicated statistics selectors are in the three statistics files above.

## Verification and limits

- Browser fixture at 378px: container width and scroll width both 378px; table displays as cards.
- Grouped header fixture retained “Staff · ഹാജർ” and “Staff · ലീവ്” labels.
- Editable input changed from 3 to 7 and retained its value.
- At 1280px the same component returned to native table display.
- Unit statistics fixture: no horizontal overflow at 320, 378 or 430px; mobile cards visible, desktop table hidden. At 1280px the desktop table is visible. All five section selectors were exercised.
- Production and PWA build passed using installed compatible Node runtime.
- Live accounts and all individual page states have not been exhaustively exercised. Source coverage is not an all-role functional certification.
- PDF generators and archived backups are excluded; PDF layout is unchanged.
