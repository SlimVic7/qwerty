import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobAlertsStore, MAX_ALERTS_PER_USER } from '../server/services/jobAlerts/jobAlertsStore.js';
import { CURRENT_JOB_ALERTS_VERSION } from '../server/services/jobAlerts/types.js';

const validUserId = '11111111-1111-4111-a111-111111111111';
const otherUserId = '22222222-2222-4222-a222-222222222222';

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => null,
  getAuthClient: () => null
}));

describe('Stage 6.3 Job Alerts Unit & Store Tests', () => {
  beforeEach(() => {
    JobAlertsStore.clearFallbackStore();
  });

  describe('UUID & Validation', () => {
    it('validates standard UUIDs correctly', () => {
      expect(JobAlertsStore.isValidUuid(validUserId)).toBe(true);
      expect(JobAlertsStore.isValidUuid('invalid-uuid')).toBe(false);
      expect(JobAlertsStore.isValidUuid('')).toBe(false);
      expect(JobAlertsStore.isValidUuid(null as any)).toBe(false);
    });

    it('rejects invalid alert name (missing or whitespace)', async () => {
      await expect(JobAlertsStore.createAlert(validUserId, { name: '' }))
        .rejects.toThrow('INVALID_ALERT_NAME');
      await expect(JobAlertsStore.createAlert(validUserId, { name: '   ' }))
        .rejects.toThrow('INVALID_ALERT_NAME');
    });

    it('rejects alert name longer than 80 characters', async () => {
      const longName = 'a'.repeat(81);
      await expect(JobAlertsStore.createAlert(validUserId, { name: longName }))
        .rejects.toThrow('ALERT_NAME_TOO_LONG');
    });

    it('accepts daily and weekly frequency, rejects instant or invalid frequency', async () => {
      const daily = await JobAlertsStore.createAlert(validUserId, {
        name: 'Daily Alert',
        frequency: 'daily'
      });
      expect(daily.frequency).toBe('daily');

      const weekly = await JobAlertsStore.createAlert(validUserId, {
        name: 'Weekly Alert',
        frequency: 'weekly'
      });
      expect(weekly.frequency).toBe('weekly');

      await expect(JobAlertsStore.createAlert(validUserId, {
        name: 'Instant Alert',
        frequency: 'instant' as any
      })).rejects.toThrow('INVALID_FREQUENCY');

      await expect(JobAlertsStore.createAlert(validUserId, {
        name: 'Monthly Alert',
        frequency: 'monthly' as any
      })).rejects.toThrow('INVALID_FREQUENCY');
    });

    it('rejects invalid workplace type or employment type', async () => {
      await expect(JobAlertsStore.createAlert(validUserId, {
        name: 'Backend Dev',
        workplace_type: 'metaverse' as any
      })).rejects.toThrow('INVALID_WORKPLACE_TYPE');

      await expect(JobAlertsStore.createAlert(validUserId, {
        name: 'Backend Dev',
        employment_type: 'gig_work' as any
      })).rejects.toThrow('INVALID_EMPLOYMENT_TYPE');
    });
  });

  describe('Alert CRUD & Candidate Isolation', () => {
    it('creates, lists, and retrieves candidate alerts', async () => {
      const created = await JobAlertsStore.createAlert(validUserId, {
        name: 'Senior Frontend Engineer',
        keywords: 'React TypeScript',
        location_query: 'London',
        workplace_type: 'hybrid',
        employment_type: 'full_time',
        frequency: 'daily'
      });

      expect(created.id).toBeDefined();
      expect(created.user_id).toBe(validUserId);
      expect(created.name).toBe('Senior Frontend Engineer');
      expect(created.is_active).toBe(true);

      const list = await JobAlertsStore.listAlerts(validUserId);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(created.id);
    });

    it('enforces maximum alert count (10) per candidate', async () => {
      for (let i = 0; i < MAX_ALERTS_PER_USER; i++) {
        await JobAlertsStore.createAlert(validUserId, { name: `Alert #${i + 1}` });
      }

      await expect(JobAlertsStore.createAlert(validUserId, { name: 'Alert #11' }))
        .rejects.toThrow('MAX_ALERTS_REACHED');
    });

    it('prevents cross-user alert access or mutation', async () => {
      const alertA = await JobAlertsStore.createAlert(validUserId, { name: 'User A Alert' });

      // User B cannot get User A's alert
      await expect(JobAlertsStore.getAlert(otherUserId, alertA.id))
        .rejects.toThrow('ALERT_NOT_FOUND');

      // User B cannot update User A's alert
      await expect(JobAlertsStore.updateAlert(otherUserId, alertA.id, { name: 'Tampered' }))
        .rejects.toThrow('ALERT_NOT_FOUND');

      // User B cannot delete User A's alert
      await expect(JobAlertsStore.deleteAlert(otherUserId, alertA.id))
        .rejects.toThrow('ALERT_NOT_FOUND');

      // User A can still retrieve it
      const fetched = await JobAlertsStore.getAlert(validUserId, alertA.id);
      expect(fetched.name).toBe('User A Alert');
    });

    it('updates and toggles alerts', async () => {
      const alert = await JobAlertsStore.createAlert(validUserId, {
        name: 'DevOps Engineer',
        is_active: true
      });

      const updated = await JobAlertsStore.updateAlert(validUserId, alert.id, {
        name: 'Cloud Platform Engineer',
        workplace_type: 'remote',
        frequency: 'weekly'
      });
      expect(updated.name).toBe('Cloud Platform Engineer');
      expect(updated.workplace_type).toBe('remote');
      expect(updated.frequency).toBe('weekly');

      const paused = await JobAlertsStore.toggleAlert(validUserId, alert.id, false);
      expect(paused.is_active).toBe(false);
    });

    it('deletes alerts cleanly', async () => {
      const alert = await JobAlertsStore.createAlert(validUserId, { name: 'To Delete' });
      const delRes = await JobAlertsStore.deleteAlert(validUserId, alert.id);
      expect(delRes.success).toBe(true);

      const list = await JobAlertsStore.listAlerts(validUserId);
      expect(list.length).toBe(0);
    });
  });

  describe('Deterministic Boolean Matcher Structure', () => {
    it('returns deterministic matches response without percentages or match_score', async () => {
      const alert = await JobAlertsStore.createAlert(validUserId, {
        name: 'Frontend Engineer',
        keywords: 'React'
      });

      const alertMatches = await JobAlertsStore.findMatchesForAlert(validUserId, alert.id);
      expect(alertMatches.version).toBe(CURRENT_JOB_ALERTS_VERSION);
      expect(alertMatches.alert?.id).toBe(alert.id);
      expect(Array.isArray(alertMatches.matches)).toBe(true);

      for (const match of alertMatches.matches) {
        expect(match.matched).toBe(true);
        expect((match as any).match_score).toBeUndefined();
        expect((match as any).score).toBeUndefined();
        expect(Array.isArray(match.matched_criteria)).toBe(true);
      }
    });
  });
});
