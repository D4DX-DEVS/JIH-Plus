const UnitAdminMessage = require('../models/ihthisabi/UnitAdminMessage');
const { sendWhatsAppMessage } = require('./whatsapp');

const queue = [];
const jobs = new Map();
let processing = false;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runJob = async (job) => {
  const {
    id,
    title,
    description,
    recipients,
    sentBy
  } = job;

  const rateDelayMs = 1100;
  const messageBody = `*${title}*\n\n${description}`;

  let sentCount = 0;
  let failedCount = 0;
  let missingContactCount = 0;
  const failures = [];

  jobs.set(id, {
    ...job,
    status: 'processing',
    sentCount,
    failedCount,
    missingContactCount
  });

  for (const recipient of recipients) {
    if (!recipient.contactNo || !recipient.contactNo.trim()) {
      missingContactCount += 1;
      jobs.set(id, {
        ...jobs.get(id),
        missingContactCount
      });
      continue;
    }

    const result = await sendWhatsAppMessage(recipient.contactNo, messageBody);
    if (!result.success && result.status === 429) {
      await wait(65000);
      const retryResult = await sendWhatsAppMessage(recipient.contactNo, messageBody);
      if (retryResult.success) {
        sentCount += 1;
      } else {
        failedCount += 1;
        failures.push({
          id: recipient._id,
          name: recipient.name,
          unit: recipient.unit,
          error: retryResult.error
        });
      }
      jobs.set(id, {
        ...jobs.get(id),
        sentCount,
        failedCount,
        missingContactCount
      });
      await wait(rateDelayMs);
      continue;
    }

    if (result.success) {
      sentCount += 1;
    } else {
      failedCount += 1;
      failures.push({
        id: recipient._id,
        name: recipient.name,
        unit: recipient.unit,
        error: result.error
      });
    }

    jobs.set(id, {
      ...jobs.get(id),
      sentCount,
      failedCount,
      missingContactCount
    });
    await wait(rateDelayMs);
  }

  await UnitAdminMessage.findByIdAndUpdate(
    id,
    {
      sentBy: sentBy?.id || sentBy?._id || sentBy?.userId || 'admin',
      sentByRole: sentBy?.role,
      sentByEmail: sentBy?.email,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      missingContactCount
    },
    { new: true }
  );

  jobs.set(id, {
    ...jobs.get(id),
    status: 'completed',
    sentCount,
    failedCount,
    missingContactCount,
    failures: failures.slice(0, 25)
  });
};

const processQueue = async () => {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    await runJob(job);
  }

  processing = false;
};

const enqueueBroadcast = async ({ title, description, recipients, sentBy }) => {
  const messageRecord = await UnitAdminMessage.create({
    title: title.trim(),
    description: description.trim(),
    totalRecipients: recipients.length
  });

  const job = {
    id: String(messageRecord._id),
    title: title.trim(),
    description: description.trim(),
    recipients,
    sentBy,
    status: 'queued',
    sentCount: 0,
    failedCount: 0,
    missingContactCount: 0
  };

  jobs.set(job.id, job);
  queue.push(job);
  setImmediate(processQueue);

  return job;
};

const getBroadcastJob = (id) => {
  return jobs.get(String(id)) || null;
};

module.exports = {
  enqueueBroadcast,
  getBroadcastJob
};
