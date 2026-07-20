const cron = require('node-cron');
const Report = require('../models/report');

/**
 * Generates yearly report instances for every recurring yearly report template.
 * Runs at midnight on January 1st of every year (Asia/Kolkata timezone).
 */
const initializeYearlyReportScheduler = () => {
  // Schedule job for 00:00 on January 1st every year
  cron.schedule(
    '0 0 1 1 *',
    async () => {
      const now = new Date();
      const currentYear = now.getFullYear();

      console.log(
        `[YearlyReportScheduler] Running job for year ${currentYear}`
      );

      try {
        // Fetch all templates that should spawn yearly reports
        const templates = await Report.find({
          type: 'yearly',
          recurringYearly: true
        }).lean();

        for (const template of templates) {
          const templateRootId = template.templateRootId || template._id;

          // Skip if a report already exists for this year
          const existing = await Report.exists({
            templateRootId,
            year: currentYear
          });

          if (existing) {
            continue;
          }

          const scheduledFor = new Date(currentYear, 0, 1); // Jan 1 of current year
          const baseTitle = template.titleBase || template.title || 'Yearly Report';
          const newTitle = `${baseTitle} - ${currentYear}`;

          const newReport = new Report({
            type: 'yearly',
            reportFor: template.reportFor,
            title: newTitle,
            titleBase: baseTitle,
            description: template.description,
            ...(template.pages && template.pages.length > 0
              ? { pages: template.pages }
              : { parts: template.parts }),
            createdBy: template.createdBy,
            scheduledFor,
            recurringYearly: false, // only the template remains recurring
            year: currentYear,
            templateRootId,
            isActive: true,
            version: 1,
            isPublished: false
          });

          await newReport.save();

          console.log(
            `[YearlyReportScheduler] Created yearly report ${newReport._id} from template ${templateRootId} for year ${currentYear}`
          );
        }
      } catch (error) {
        console.error('[YearlyReportScheduler] Error generating yearly reports:', error);
      }
    },
    {
      timezone: 'Asia/Kolkata'
    }
  );
};

module.exports = initializeYearlyReportScheduler;
