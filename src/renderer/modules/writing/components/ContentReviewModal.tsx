import { useMemo, useState } from 'react'
import { useIpcData, useIpcMutation } from '@/hooks/useIpc'
import { useToast } from '@/components/ui/toast'

interface MetricSnapshot {
  snapshotDate: string
  views: number
  likes: number
  comments: number
  shares: number
  favorites: number
  engagement: number
}

interface PublishedContentReview {
  receiptId: number
  platform: string
  destinationUrl: string
  publishedAt: string | null
  latest: MetricSnapshot | null
  previous: MetricSnapshot | null
  engagementDelta: number | null
  viewsDelta: number | null
}

interface ContentReviewModalProps {
  articleId: number
  articleTitle: string
  onClose: () => void
}

const METRIC_FIELDS = [
  ['views', 'Views'],
  ['likes', 'Likes'],
  ['comments', 'Comments'],
  ['shares', 'Shares'],
  ['favorites', 'Favorites'],
] as const

type MetricKey = (typeof METRIC_FIELDS)[number][0]
type MetricForm = Record<MetricKey, string>

function getLocalDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function formatMetric(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

function formatDelta(value: number | null): string {
  if (value === null) return 'No prior snapshot'
  return `${value >= 0 ? '+' : ''}${formatMetric(value)} vs prior`
}

function toMetricForm(snapshot: MetricSnapshot | null): MetricForm {
  return {
    views: String(snapshot?.views ?? 0),
    likes: String(snapshot?.likes ?? 0),
    comments: String(snapshot?.comments ?? 0),
    shares: String(snapshot?.shares ?? 0),
    favorites: String(snapshot?.favorites ?? 0),
  }
}

export function ContentReviewModal({ articleId, articleTitle, onClose }: ContentReviewModalProps) {
  const { toast } = useToast()
  const {
    data: reviews,
    loading,
    refetch,
  } = useIpcData<PublishedContentReview[]>('publish-metrics:getArticleReview', articleId)
  const { mutate: upsertMetrics, loading: saving } =
    useIpcMutation<boolean>('publish-metrics:upsert')
  const [snapshotDate, setSnapshotDate] = useState(getLocalDate)
  const [forms, setForms] = useState<Record<number, MetricForm>>({})
  const totalEngagement = useMemo(
    () => reviews?.reduce((total, review) => total + (review.latest?.engagement ?? 0), 0) ?? 0,
    [reviews],
  )

  const getForm = (review: PublishedContentReview): MetricForm =>
    forms[review.receiptId] ?? toMetricForm(review.latest)

  const updateForm = (
    receiptId: number,
    key: MetricKey,
    value: string,
    review: PublishedContentReview,
  ) => {
    setForms((current) => ({
      ...current,
      [receiptId]: { ...getForm(review), ...current[receiptId], [key]: value },
    }))
  }

  const handleSave = async (review: PublishedContentReview) => {
    const form = getForm(review)
    const values = Object.fromEntries(
      METRIC_FIELDS.map(([key]) => [key, Number(form[key])]),
    ) as Record<MetricKey, number>
    if (Object.values(values).some((value) => !Number.isInteger(value) || value < 0)) {
      toast({ title: 'Metrics must be non-negative whole numbers', variant: 'error' })
      return
    }
    const result = await upsertMetrics({ receiptId: review.receiptId, snapshotDate, ...values })
    if (!result) {
      toast({ title: 'Could not save content snapshot', variant: 'error' })
      return
    }
    setForms((current) => ({
      ...current,
      [review.receiptId]: toMetricForm({
        ...values,
        snapshotDate,
        engagement: values.likes + values.comments + values.shares + values.favorites,
      }),
    }))
    await refetch()
    toast({ title: 'Content snapshot saved', variant: 'success' })
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-md backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-outline-variant/30 px-lg py-md">
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-[19px]">query_stats</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Content Review</h2>
              <p className="text-[11px] text-on-surface-variant">
                {articleTitle} · {formatMetric(totalEngagement)} total recorded engagement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
            aria-label="Close content review"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        <div className="border-b border-outline-variant/25 bg-surface-container-low px-lg py-sm">
          <label className="flex items-center gap-sm text-[11px] font-bold text-on-surface-variant">
            Snapshot date{' '}
            <input
              type="date"
              value={snapshotDate}
              onChange={(event) => setSnapshotDate(event.target.value)}
              className="h-8 rounded-lg border border-outline-variant/35 bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-lg">
          {loading ? (
            <div className="space-y-sm">
              {[1, 2].map((item) => (
                <div key={item} className="h-48 animate-pulse rounded-xl bg-surface-container" />
              ))}
            </div>
          ) : !reviews?.length ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">
                monitoring
              </span>
              <p className="mt-sm text-body-md text-on-surface-variant">
                No confirmed publications yet
              </p>
              <p className="mt-xs text-body-sm text-on-surface-variant">
                Confirm a real published URL before recording performance.
              </p>
            </div>
          ) : (
            <div className="grid gap-md lg:grid-cols-2">
              {reviews.map((review) => {
                const form = getForm(review)
                return (
                  <article
                    key={review.receiptId}
                    className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-md"
                  >
                    <div className="flex items-start justify-between gap-sm">
                      <div>
                        <p className="font-label-lg text-on-surface capitalize">
                          {review.platform}
                        </p>
                        <a
                          href={review.destinationUrl}
                          onClick={(event) => {
                            event.preventDefault()
                            window.electronAPI.openExternal(review.destinationUrl)
                          }}
                          className="mt-0.5 inline-flex max-w-[260px] items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <span className="truncate">Open published content</span>
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                          Engagement
                        </p>
                        <p className="mt-0.5 text-headline-md font-headline-md text-primary">
                          {review.latest ? formatMetric(review.latest.engagement) : '—'}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {formatDelta(review.engagementDelta)}
                        </p>
                      </div>
                    </div>
                    {review.latest ? (
                      <div className="mt-md grid grid-cols-2 gap-2 rounded-lg bg-surface-container-lowest p-sm text-[11px]">
                        <span>
                          Views{' '}
                          <b className="float-right text-on-surface">
                            {formatMetric(review.latest.views)}
                          </b>
                        </span>
                        <span>
                          Likes{' '}
                          <b className="float-right text-on-surface">
                            {formatMetric(review.latest.likes)}
                          </b>
                        </span>
                        <span>
                          Comments{' '}
                          <b className="float-right text-on-surface">
                            {formatMetric(review.latest.comments)}
                          </b>
                        </span>
                        <span>
                          Shares{' '}
                          <b className="float-right text-on-surface">
                            {formatMetric(review.latest.shares)}
                          </b>
                        </span>
                      </div>
                    ) : (
                      <p className="mt-md rounded-lg bg-surface-container-lowest px-sm py-2 text-[11px] text-on-surface-variant">
                        Waiting for first content snapshot.
                      </p>
                    )}
                    <div className="mt-md grid grid-cols-5 gap-1.5">
                      {METRIC_FIELDS.map(([key, label]) => (
                        <label key={key} className="min-w-0">
                          <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">
                            {label}
                          </span>
                          <input
                            inputMode="numeric"
                            value={form[key]}
                            onChange={(event) =>
                              updateForm(review.receiptId, key, event.target.value, review)
                            }
                            className="h-8 w-full rounded-lg border border-outline-variant/35 bg-surface-container-lowest px-1.5 text-center text-[11px] text-on-surface outline-none focus:border-primary"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-sm flex justify-end">
                      <button
                        onClick={() => handleSave(review)}
                        disabled={saving}
                        className="h-8 rounded-lg bg-primary px-3 text-[11px] font-bold text-on-primary disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save snapshot'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
