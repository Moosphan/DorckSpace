import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface Project {
  id: number
  name: string
  status: string
}

interface AIActionProposal {
  id: number
  title: string
  description: string | null
  priority: 'high' | 'medium' | 'low'
  dueDate: string | null
  tags: string[]
  status: 'proposed' | 'applied' | 'dismissed'
  taskId: number | null
}

interface AIActionPlan {
  id: number
  projectId: number
  objective: string
  summary: string
  provider: string | null
  model: string
  createdAt: string
  proposals: AIActionProposal[]
}

interface ApplyResult {
  createdTaskIds: number[]
  plan: AIActionPlan
}

interface AIActionPlannerDialogProps {
  open: boolean
  onClose: () => void
  onApplied: () => void
}

const PRIORITY_STYLE = {
  high: 'bg-error/10 text-error',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-surface-container text-on-surface-variant',
}

export function AIActionPlannerDialog({ open, onClose, onApplied }: AIActionPlannerDialogProps) {
  const { toast } = useToast()
  const { data: projects } = useIpcData<Project[]>(open ? 'projects:getActive' : '')
  const { mutate: generatePlan, loading: generating, error: generateError } =
    useIpcMutation<AIActionPlan>('ai-actions:generate')
  const { mutate: applyPlan, loading: applying, error: applyError } =
    useIpcMutation<ApplyResult>('ai-actions:apply')
  const { mutate: dismissProposal, loading: dismissing, error: dismissError } =
    useIpcMutation<AIActionPlan>('ai-actions:dismiss')

  const [projectId, setProjectId] = useState('')
  const [objective, setObjective] = useState('')
  const [plan, setPlan] = useState<AIActionPlan | null>(null)
  const [selectedProposalIds, setSelectedProposalIds] = useState<number[]>([])

  const proposedIds = useMemo(
    () => plan?.proposals.filter((proposal) => proposal.status === 'proposed').map((proposal) => proposal.id) ?? [],
    [plan],
  )

  useEffect(() => {
    if (!open) {
      setPlan(null)
      setSelectedProposalIds([])
      return
    }
    if (!projectId && projects?.[0]) setProjectId(String(projects[0].id))
  }, [open, projectId, projects])

  useEffect(() => {
    if (!generateError) return
    toast({ title: generateError, variant: 'error' })
  }, [generateError, toast])

  useEffect(() => {
    if (!applyError) return
    toast({ title: applyError, variant: 'error' })
  }, [applyError, toast])

  useEffect(() => {
    if (!dismissError) return
    toast({ title: dismissError, variant: 'error' })
  }, [dismissError, toast])

  const handleGenerate = async () => {
    const id = Number(projectId)
    const nextPlan = await generatePlan({ projectId: id, objective: objective.trim() })
    if (!nextPlan) return
    setPlan(nextPlan)
    setSelectedProposalIds(nextPlan.proposals.filter((proposal) => proposal.status === 'proposed').map((proposal) => proposal.id))
  }

  const handleApply = async () => {
    if (!plan) return
    const proposalIds = selectedProposalIds.filter((id) => proposedIds.includes(id))
    if (proposalIds.length === 0) {
      toast({ title: 'Select at least one draft task', variant: 'info' })
      return
    }
    const result = await applyPlan({ planId: plan.id, proposalIds })
    if (!result) return
    setPlan(result.plan)
    setSelectedProposalIds([])
    onApplied()
    toast({ title: `${result.createdTaskIds.length} task${result.createdTaskIds.length === 1 ? '' : 's'} created`, variant: 'success' })
  }

  const handleDismiss = async (proposalId: number) => {
    const nextPlan = await dismissProposal(proposalId)
    if (!nextPlan) return
    setPlan(nextPlan)
    setSelectedProposalIds((current) => current.filter((id) => id !== proposalId))
    toast({ title: 'Draft dismissed', variant: 'success' })
  }

  const toggleProposal = (proposalId: number) => {
    setSelectedProposalIds((current) => (
      current.includes(proposalId)
        ? current.filter((id) => id !== proposalId)
        : [...current, proposalId]
    ))
  }

  const canGenerate = Boolean(projectId) && Boolean(objective.trim()) && !generating
  const canApply = selectedProposalIds.some((id) => proposedIds.includes(id)) && !applying

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-32px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-xl">
          <div className="flex items-start justify-between gap-md border-b border-outline-variant/30 px-lg py-md">
            <div>
              <Dialog.Title className="font-headline-sm text-on-surface">Plan tasks</Dialog.Title>
              <Dialog.Description className="mt-1 text-body-sm text-on-surface-variant">
                Create local draft tasks from one active project.
              </Dialog.Description>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-lg py-md">
            <div className="grid grid-cols-1 gap-sm md:grid-cols-[240px_1fr]">
              <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                Project
                <select
                  aria-label="Project"
                  value={projectId}
                  onChange={(event) => {
                    setProjectId(event.target.value)
                    setPlan(null)
                    setSelectedProposalIds([])
                  }}
                  className="mt-1.5 block h-10 w-full rounded-lg border border-outline-variant/35 bg-surface-container-low px-2 text-body-sm text-on-surface outline-none focus:border-primary"
                >
                  <option value="">Choose project</option>
                  {projects?.filter((project) => project.status === 'active').map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                Objective
                <textarea
                  aria-label="Planning objective"
                  maxLength={500}
                  value={objective}
                  onChange={(event) => {
                    setObjective(event.target.value)
                    setPlan(null)
                    setSelectedProposalIds([])
                  }}
                  className="mt-1.5 block min-h-[88px] w-full resize-none rounded-lg border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                  placeholder="What should this project move toward next?"
                />
              </label>
            </div>

            <div className="mt-md flex items-center justify-between gap-sm">
              <p className="text-[11px] text-on-surface-variant">{objective.length}/500</p>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="h-9 rounded-lg bg-primary px-md text-label-sm font-bold text-on-primary transition-opacity disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate draft'}
              </button>
            </div>

            {plan && (
              <div className="mt-lg space-y-sm">
                <div className="rounded-lg bg-surface-container-low p-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Summary</p>
                  <p className="mt-1 text-body-sm text-on-surface">{plan.summary}</p>
                </div>

                <div className="space-y-sm">
                  {plan.proposals.map((proposal) => {
                    const isProposed = proposal.status === 'proposed'
                    const checked = selectedProposalIds.includes(proposal.id)
                    return (
                      <div key={proposal.id} className="rounded-lg border border-outline-variant/35 bg-surface-container-low p-sm">
                        <div className="flex items-start gap-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!isProposed}
                            onChange={() => toggleProposal(proposal.id)}
                            className="mt-1 h-4 w-4 accent-primary disabled:opacity-40"
                            aria-label={`Select ${proposal.title}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-xs">
                              <h3 className={cn('font-label-md text-on-surface', !isProposed && 'line-through opacity-60')}>
                                {proposal.title}
                              </h3>
                              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', PRIORITY_STYLE[proposal.priority])}>
                                {proposal.priority}
                              </span>
                              {proposal.dueDate && (
                                <span className="flex items-center gap-0.5 text-[10px] text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[12px]">event</span>
                                  {proposal.dueDate}
                                </span>
                              )}
                              {proposal.status !== 'proposed' && (
                                <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">
                                  {proposal.status}
                                </span>
                              )}
                            </div>
                            {proposal.description && (
                              <p className="mt-xs text-body-sm text-on-surface-variant">{proposal.description}</p>
                            )}
                            {proposal.tags.length > 0 && (
                              <div className="mt-xs flex flex-wrap gap-xs">
                                {proposal.tags.map((tag) => (
                                  <span key={tag} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {isProposed && (
                            <button
                              onClick={() => handleDismiss(proposal.id)}
                              disabled={dismissing}
                              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-sm border-t border-outline-variant/30 px-lg py-md">
            <button
              onClick={onClose}
              className="h-9 rounded-lg bg-surface-container-low px-md text-label-sm font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Close
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply}
              className="h-9 rounded-lg bg-primary px-md text-label-sm font-bold text-on-primary transition-opacity disabled:opacity-50"
            >
              {applying ? 'Applying...' : 'Apply selected'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
