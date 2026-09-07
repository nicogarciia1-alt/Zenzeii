/**
 * @fileoverview Headline + body for ToshokanGateModal. Renders Radix's
 * Dialog.Title/Description (not plain h2/p) so the modal's
 * aria-labelledby/aria-describedby wire up automatically — styling is
 * fully custom via className, only the a11y plumbing is reused.
 */
import * as Dialog from '@radix-ui/react-dialog';

export function GateModalHeader({ headline, body }) {
  return (
    <>
      <Dialog.Title className="toshokan-gate-headline">{headline}</Dialog.Title>
      <Dialog.Description className="toshokan-gate-body">{body}</Dialog.Description>
    </>
  );
}
