export const PIPELINE_STAGES = ['verify', 'deploy', 'resolve', 'export'] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type StageState = 'done' | 'current' | 'upcoming';

/** The stage an incident is waiting on. A closed incident's remaining step is its record. */
export function currentStage(status: string): PipelineStage {
  switch (status) {
    case 'Unverified':
    case 'Rejected':
      return 'verify';
    case 'Verified':
      return 'deploy';
    case 'Responding':
      return 'resolve';
    default:
      return 'export';
  }
}

export function stageState(stage: PipelineStage, status: string): StageState {
  const at = PIPELINE_STAGES.indexOf(currentStage(status));
  const index = PIPELINE_STAGES.indexOf(stage);
  return index < at ? 'done' : index === at ? 'current' : 'upcoming';
}

/** Nothing is sent or closed on a report nobody has confirmed. */
export function stageLocked(stage: PipelineStage, status: string): boolean {
  return (stage === 'deploy' || stage === 'resolve') && (status === 'Unverified' || status === 'Rejected');
}
