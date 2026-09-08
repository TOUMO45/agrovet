import { useId } from 'react'

/**
 * Labeled form control. Pass a native element type via `as` ("input" default,
 * "textarea", "select"). `hint` shows under the field; `error` replaces it and
 * turns the border red. Children are used for <select> options.
 */
export default function Field({
  as = 'input',
  label,
  hint,
  error,
  className = '',
  children,
  id,
  ...rest
}) {
  const autoId = useId()
  const fieldId = id || autoId
  const Tag = as

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-fg-dim">
          {label}
        </label>
      )}
      <Tag
        id={fieldId}
        className="field"
        style={error ? { borderColor: '#F2415A', boxShadow: '0 0 0 3px rgba(242,65,90,.16)' } : undefined}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      >
        {children}
      </Tag>
      {error ? (
        <p className="mt-1.5 text-[12px] text-danger-bright">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-fg-mute">{hint}</p>
      ) : null}
    </div>
  )
}
