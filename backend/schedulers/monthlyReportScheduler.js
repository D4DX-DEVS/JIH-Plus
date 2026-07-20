const cron = require('node-cron');
const Report = require('../models/report');

/**
 * Generates monthly report instances for every recurring monthly report template.
 * Runs at midnight on the 1st of every month (Asia/Kolkata timezone).
 */
const initializeMonthlyReportScheduler = () => {
  // Schedule job for 00:00 on the 1st of every month
  cron.schedule(
    '0 0 1 * *',
    async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      console.log(
        `[MonthlyReportScheduler] Running job for ${currentYear}-${currentMonth
          .toString()
          .padStart(2, '0')}`
      );

      try {
        // Fetch all templates that should spawn monthly reports
        const templates = await Report.find({
          type: 'monthly',
          recurringMonthly: true
        }).lean();

        for (const template of templates) {
          const templateRootId = template.templateRootId || template._id;

          // Skip if a report already exists for this month
          const existing = await Report.exists({
            templateRootId,
            month: currentMonth,
            year: currentYear
          });

          if (existing) {
            continue;
          }

          const scheduledFor = new Date(currentYear, currentMonth - 1, 1);
          const baseTitle = template.titleBase || template.title || 'Monthly Report';
          const monthName = scheduledFor.toLocaleString('en-US', { month: 'long' });
          const newTitle = `${baseTitle} - ${monthName} ${currentYear}`;

          const newReport = new Report({
            type: 'monthly',
            reportFor: template.reportFor,
            title: newTitle,
            titleBase: baseTitle,
            description: template.description,
            ...(template.pages && template.pages.length > 0
              ? { pages: template.pages }
              : { parts: template.parts }),
            createdBy: template.createdBy,
            scheduledFor,
            recurringMonthly: false, // only the template remains recurring
            month: currentMonth,
            year: currentYear,
            templateRootId,
            isActive: true,
            version: 1,
            isPublished: false
          });

          await newReport.save();

          console.log(
            `[MonthlyReportScheduler] Created monthly report ${newReport._id} from template ${templateRootId} for ${currentYear}-${currentMonth}`
          );
        }
      } catch (error) {
        console.error('[MonthlyReportScheduler] Error generating monthly reports:', error);
      }
    },
    {
      timezone: 'Asia/Kolkata'
    }
  );
};

module.exports = initializeMonthlyReportScheduler;

