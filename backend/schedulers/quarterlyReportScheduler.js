const cron = require('node-cron');
const Report = require('../models/report');

/**
 * Generates quarterly report instances for every recurring quarterly report template.
 *
 * Logic:
 *   - A quarterly template has `recurringQuarterly: true` and a `quarterStartDate`.
 *   - Each instance covers a 3-month period starting from the anchor date (or a
 *     subsequent +3-month jump).
 *   - A new instance is spawned when the current date has reached or passed the
 *     next-due period start date AND no instance already exists for that
 *     (templateRootId, quarter, year) combination.
 *
 * Runs: every day at midnight (Asia/Kolkata) so no instance is missed.
 */
const initializeQuarterlyReportScheduler = () => {
  cron.schedule(
    '0 0 * * *',
    async () => {
      const now = new Date();
      console.log(`[QuarterlyReportScheduler] Running job at ${now.toISOString()}`);

      try {
        const templates = await Report.find({
          type: 'quarterly',
          recurringQuarterly: true
        }).lean();

        for (const template of templates) {
          const templateRootId = template.templateRootId || template._id;
          const anchor = template.quarterStartDate
            ? new Date(template.quarterStartDate)
            : new Date(template.createdAt);

          // Find the most recent instance spawned from this template
          const lastInstance = await Report.findOne({
            templateRootId,
            recurringQuarterly: false
          })
            .sort({ scheduledFor: -1 })
            .select('scheduledFor quarter year')
            .lean();

          // Compute the next period start date
          let nextPeriodStart;
          if (!lastInstance) {
            // No instance yet; the first period starts at the anchor date
            nextPeriodStart = new Date(anchor);
          } else {
            // Next period = last instance scheduledFor + 3 months
            nextPeriodStart = new Date(lastInstance.scheduledFor);
            nextPeriodStart.setMonth(nextPeriodStart.getMonth() + 3);
          }

          // Only spawn if we have reached/passed the period start
          if (now < nextPeriodStart) {
            continue;
          }

          const periodYear = nextPeriodStart.getFullYear();
          const periodMonth = nextPeriodStart.getMonth() + 1; // 1-12
          const periodQuarter = Math.ceil(periodMonth / 3);   // 1-4

          // Deduplication check
          const existing = await Report.exists({
            templateRootId,
            quarter: periodQuarter,
            year: periodYear
          });

          if (existing) {
            continue;
          }

          const baseTitle = template.titleBase || template.title || 'Quarterly Report';
          const newTitle = `${baseTitle} - Q${periodQuarter} ${periodYear}`;

          const newReport = new Report({
            type: 'quarterly',
            reportFor: template.reportFor,
            title: newTitle,
            titleBase: baseTitle,
            description: template.description,
            ...(template.pages && template.pages.length > 0
              ? { pages: template.pages }
              : { parts: template.parts }),
            createdBy: template.createdBy,
            scheduledFor: nextPeriodStart,
            recurringQuarterly: false, // only the template remains recurring
            quarterStartDate: nextPeriodStart,
            quarter: periodQuarter,
            year: periodYear,
            templateRootId,
            isActive: true,
            version: 1,
            isPublished: false
          });

          await newReport.save();

          console.log(
            `[QuarterlyReportScheduler] Created quarterly report ${newReport._id} ` +
            `from template ${templateRootId} for Q${periodQuarter} ${periodYear}`
          );
        }
      } catch (error) {
        console.error('[QuarterlyReportScheduler] Error generating quarterly reports:', error);
      }
    },
    {
      timezone: 'Asia/Kolkata'
    }
  );
};

module.exports = initializeQuarterlyReportScheduler;
