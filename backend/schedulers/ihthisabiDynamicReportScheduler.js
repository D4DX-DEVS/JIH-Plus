const cron = require('node-cron');
const DynamicReport = require('../models/ihthisabi/dynamicReport');

/**
 * Generates monthly dynamic report instances for IHTISABI templates.
 * Runs at midnight on the 1st of every month (Asia/Kolkata timezone).
 */
const initializeIhthisabiDynamicReportScheduler = () => {
  cron.schedule(
    '0 0 1 * *',
    async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      console.log(
        `[IhthisabiDynamicReportScheduler] Running for ${currentYear}-${currentMonth
          .toString()
          .padStart(2, '0')}`
      );

      try {
        const templates = await DynamicReport.find({
          type: 'monthly',
          recurringMonthly: true
        }).lean();

        for (const template of templates) {
          const templateRootId = template.templateRootId || template._id;

          // Skip if already exists
          const existing = await DynamicReport.exists({
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

          const newReport = new DynamicReport({
            type: 'monthly',
            title: newTitle,
            titleBase: baseTitle,
            description: template.description,
            parts: template.parts,
            createdBy: template.createdBy,
            scheduledFor,
            recurringMonthly: false,
            month: currentMonth,
            year: currentYear,
            templateRootId,
            isActive: true
          });

          await newReport.save();

          console.log(
            `[IhthisabiDynamicReportScheduler] Created dynamic report ${newReport._id} from template ${templateRootId} for ${currentYear}-${currentMonth}`
          );
        }
      } catch (error) {
        console.error('[IhthisabiDynamicReportScheduler] Error:', error);
      }
    },
    {
      timezone: 'Asia/Kolkata'
    }
  );
};

module.exports = initializeIhthisabiDynamicReportScheduler;

