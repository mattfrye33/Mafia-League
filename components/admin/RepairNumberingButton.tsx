"use client";

import { useState, useTransition } from "react";
import { repairOfficialGameNumbersAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";

/** Renumbers every official (non-test) game sequentially from #1 by created
 * date — the one-time fix for a numbering sequence polluted by pre-fix test
 * games. Safe while the league is young; not meant as a routine action. */
export function RepairNumberingButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRepair() {
    setError(null);
    startTransition(async () => {
      try {
        const count = await repairOfficialGameNumbersAction();
        setResult(`Renumbered ${count} official game${count === 1 ? "" : "s"} from #1.`);
        setConfirming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not repair numbering.");
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Repair Official Game Numbers
        </Button>
        {result && <p className="text-xs text-civilian">{result}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <p className="max-w-xs text-right text-xs text-muted">
        This renumbers every official game sequentially from #1 by start date. Test games always stay unnumbered.
        Stats/participants are untouched.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button variant="primary" disabled={pending} onClick={handleRepair}>
          {pending ? "Repairing..." : "Confirm Repair"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-soft">{error}</p>}
    </div>
  );
}
