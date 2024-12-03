import { expect, test } from '@playwright/test';
import { waitForEnvelopeItem } from '@sentry-internal/test-utils';

test('Cron job triggers send of in_progress envelope', async ({ baseURL }) => {
  const inProgressEnvelopePromise = waitForEnvelopeItem('nestjs-8', envelope => {
    return envelope[0].type === 'check_in' && envelope[1]['status'] === 'in_progress';
  });

  const okEnvelopePromise = waitForEnvelopeItem('nestjs-8', envelope => {
    return envelope[0].type === 'check_in' && envelope[1]['status'] === 'ok';
  });

  const inProgressEnvelope = await inProgressEnvelopePromise;
  const okEnvelope = await okEnvelopePromise;

  expect(inProgressEnvelope[1]).toEqual(
    expect.objectContaining({
      check_in_id: expect.any(String),
      monitor_slug: 'test-cron-slug',
      status: 'in_progress',
      environment: 'qa',
      monitor_config: {
        schedule: {
          type: 'crontab',
          value: '* * * * *',
        },
      },
      contexts: {
        trace: {
          span_id: expect.stringMatching(/[a-f0-9]{16}/),
          trace_id: expect.stringMatching(/[a-f0-9]{32}/),
        },
      },
    }),
  );

  expect(okEnvelope[1]).toEqual(
    expect.objectContaining({
      check_in_id: expect.any(String),
      monitor_slug: 'test-cron-slug',
      status: 'ok',
      environment: 'qa',
      duration: expect.any(Number),
      contexts: {
        trace: {
          span_id: expect.stringMatching(/[a-f0-9]{16}/),
          trace_id: expect.stringMatching(/[a-f0-9]{32}/),
        },
      },
    }),
  );

  // kill cron so tests don't get stuck
  await fetch(`${baseURL}/kill-test-cron`);
});