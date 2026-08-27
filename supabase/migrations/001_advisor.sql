-- Adds the Escalation Advisor's output to the audit trail.
-- Holds the agent's recommendation, the tools it chose to invoke, and the
-- graph trace, so any past escalation can be replayed with its reasoning.
alter table pipeline_runs
  add column if not exists advisor jsonb;
