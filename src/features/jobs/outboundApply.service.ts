/**
 * QWERTY Stage 6.2 — Outbound Apply Client Service
 */

import { authFetch } from '../../lib/authFetch.js';

export interface OutboundApplyResult {
  destination: string;
  source_type: string;
  external: boolean;
}

export const outboundApplyService = {
  async triggerOutboundApply(jobId: string): Promise<OutboundApplyResult> {
    return authFetch(`/api/candidate/jobs/${jobId}/outbound-apply`, {
      method: 'POST',
    });
  },
};
