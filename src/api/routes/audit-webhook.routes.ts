/**
 * Audit webhook proxy API
 * POST /api/webhooks/audit-submission — forwards payload to n8n (server-side to avoid CORS)
 */

import { Router, Request, Response } from 'express';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('AuditWebhook');

/**
 * POST /api/webhooks/audit-submission
 * Proxies audit submission payload to n8n webhook (server-side to avoid browser CORS).
 * Requires N8N_WEBHOOK_URL in .env. Body: same shape as client (employee_email, auditor_email, etc.).
 */
router.post('/audit-submission', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      logger.warn('N8N_WEBHOOK_URL not set in .env; audit-submission webhook skipped');
      res.status(503).json({ success: false, error: 'Webhook not configured. Set N8N_WEBHOOK_URL in .env.' });
      return;
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ success: false, error: 'Invalid payload' });
      return;
    }

    if (!payload.employee_email) {
      logger.warn('audit-submission webhook called without employee_email');
      res.status(400).json({ success: false, error: 'employee_email required' });
      return;
    }

    logger.info('Proxying audit-submission to n8n', { url: n8nWebhookUrl, audit_id: payload.audit_id ?? payload.id });

    const forward = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!forward.ok) {
      const errorText = await forward.text();
      logger.error('n8n webhook error', {
        status: forward.status,
        statusText: forward.statusText,
        body: errorText?.slice(0, 500),
      });
      res.status(forward.status).json({
        success: false,
        error: errorText || forward.statusText,
      });
      return;
    }

    const contentType = forward.headers.get('content-type') || '';
    let result: unknown = null;
    if (contentType.includes('application/json')) {
      try {
        result = await forward.json();
      } catch {
        result = await forward.text();
      }
    } else {
      result = await forward.text();
    }

    logger.info('n8n webhook succeeded', { audit_id: payload.audit_id ?? payload.id });
    res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    logger.error('audit-submission proxy error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Proxy error',
    });
  }
});

export default router;
