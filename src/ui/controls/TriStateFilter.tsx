import { Segmented } from './Segmented'

const OPTIONS = [
  { value: 0, label: '—' },
  { value: 1, label: 'Include' },
  { value: 2, label: 'Require' },
  { value: 3, label: 'Exclude', danger: true },
]

/** Include (any of) / require (all of) / exclude, per class or series. ← → cycle. */
export function TriStateFilter({ value, onChange, label, navId }: { value: number; onChange: (v: number) => void; label: string; navId?: string }) {
  return <Segmented options={OPTIONS} value={value} onChange={onChange} label={label} navId={navId} />
}
