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
      logger.warn('N8N_WEBHOOK_URL not set; audit-submission webhook skipped. Set N8N_WEBHOOK_URL in .env (local) or in your host env (e.g. Vercel).');
      res.status(503).json({
        success: false,
        error: 'Webhook not configured. Set N8N_WEBHOOK_URL in .env (local) or in your deployment environment (e.g. Vercel dashboard).',
      });
      return;
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ success: false, error: 'Invalid payload' });
      return;
    }

    // Accept both snake_case and camelCase (client/DB may send either)
    const employeeEmail = payload.employee_email ?? payload.employeeEmail ?? null;
    if (!employeeEmail) {
      logger.warn('audit-submission webhook called without employee_email or employeeEmail');
      res.status(400).json({ success: false, error: 'employee_email or employeeEmail required' });
      return;
    }
    // Normalize so n8n receives consistent shape
    const normalizedPayload = { ...payload, employee_email: employeeEmail };

    logger.info('Proxying audit-submission to n8n', { url: n8nWebhookUrl, audit_id: normalizedPayload.audit_id ?? normalizedPayload.id });

    const forward = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(normalizedPayload),
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

    logger.info('n8n webhook succeeded', { audit_id: normalizedPayload.audit_id ?? normalizedPayload.id });
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
