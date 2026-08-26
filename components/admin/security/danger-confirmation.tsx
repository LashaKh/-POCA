export function DangerConfirmation({
  phrase,
  impact,
  alternative,
}: {
  phrase: string;
  impact: string;
  alternative: string;
}) {
  return (
    <fieldset className="danger-confirmation">
      <legend>Protected Owner action</legend>
      <p>{impact}</p>
      <p>
        Reversible alternative: <strong>{alternative}</strong>
      </p>
      <label>
        <span>
          Type <code>{phrase}</code>
        </span>
        <input
          name="confirmation"
          required
          autoComplete="off"
          pattern={phrase.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}
        />
      </label>
      <label>
        <span>Reason (recorded in the protected-operation history)</span>
        <textarea name="reason" minLength={2} maxLength={500} required />
      </label>
    </fieldset>
  );
}
