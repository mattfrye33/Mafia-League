import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { NightRecap } from "@/lib/services/gameEngine";

const RESULT_CLASS = "font-heading text-lg";

export function NightRecapCards({ recap }: { recap: NightRecap }) {
  return (
    <div className="space-y-3">
      <MafiaCard recap={recap} />
      <Card>
        <CardTitle>COPS</CardTitle>
        {recap.cops.length > 0 ? (
          <div className="mt-2 space-y-3">
            {recap.cops.map((c, i) => (
              <div key={i}>
                <p className="text-sm text-muted">
                  Checked: <span className="text-foreground">{c.targetName}</span>
                </p>
                <p className={cn(RESULT_CLASS, c.result === "MAFIA" ? "text-red-soft" : "text-civilian")}>
                  RESULT: {c.result}
                </p>
                {c.isGodfather && <Badge tone="gold" className="mt-1">GODFATHER CHECK: {c.checkCount} / 2</Badge>}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">{recap.copsReason}</p>
        )}
      </Card>

      <Card>
        <CardTitle>MEDIC</CardTitle>
        {recap.medic.acted ? (
          <div className="mt-2">
            <p className="text-sm text-muted">
              Protected: <span className="text-foreground">{recap.medic.targetName}</span>
              {recap.medic.selfSave && " (self-save)"}
            </p>
            {recap.medic.outcome === "saved" && (
              <>
                <p className={cn(RESULT_CLASS, "text-civilian")}>SAVE SUCCESSFUL</p>
                <p className="mt-1 text-sm text-foreground">The Mafia kill was stopped.</p>
              </>
            )}
            {recap.medic.outcome === "no_save" && (
              <>
                <p className={cn(RESULT_CLASS, "text-red-soft")}>NO SAVE</p>
                <p className="mt-1 text-sm text-foreground">The Mafia targeted {recap.medic.mafiaTargetName} instead.</p>
              </>
            )}
            {recap.medic.outcome === "not_tested" && (
              <p className="mt-1 text-sm text-foreground">No Mafia kill was attempted, so protection wasn&apos;t needed.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">{recap.medic.reason}</p>
        )}
      </Card>

      <Card>
        <CardTitle>SILENCER</CardTitle>
        {recap.silencer.acted ? (
          <div className="mt-2">
            <p className="text-sm text-muted">
              Silenced: <span className="text-foreground">{recap.silencer.targetName}</span>
            </p>
            <p className={cn(RESULT_CLASS, "text-gold")}>SILENCED</p>
            <p className="mt-1 text-sm text-foreground">
              {recap.silencer.targetName} cannot speak during the upcoming daytime round.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">{recap.silencer.reason}</p>
        )}
      </Card>

      {recap.kamikaze.length > 0 && (
        <Card className="border-mafia/40">
          <CardTitle>KAMIKAZE</CardTitle>
          <div className="mt-2 space-y-1">
            {recap.kamikaze.map((k, i) => (
              <p key={i} className="text-sm text-foreground">
                {k.targetName} was also taken down in a Kamikaze chain.
              </p>
            ))}
          </div>
        </Card>
      )}

      {recap.mafia.action !== "recruit" && (
        <Card>
          <CardTitle>RECRUITMENT</CardTitle>
          <p className="mt-2 text-sm text-muted">No recruit attempted</p>
          <p className="mt-1 text-xs text-muted">Recruits Left: {recap.recruitsLeft}</p>
        </Card>
      )}
    </div>
  );
}

function MafiaCard({ recap }: { recap: NightRecap }) {
  const { mafia } = recap;
  return (
    <Card className="border-gold/20">
      <CardTitle>MAFIA</CardTitle>
      {mafia.action === "kill" && (
        <div className="mt-2">
          <p className="text-sm text-muted">
            Target: <span className="text-foreground">{mafia.targetName}</span>
          </p>
          <p className={cn(RESULT_CLASS, mafia.killOutcome === "killed" ? "text-red-soft" : "text-civilian")}>
            {mafia.killOutcome === "killed" ? "KILL SUCCESSFUL" : "KILL STOPPED"}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {mafia.killOutcome === "killed" ? `${mafia.targetName} was eliminated.` : `The Medic saved ${mafia.targetName}.`}
          </p>
        </div>
      )}
      {mafia.action === "recruit" && (
        <div className="mt-2">
          <p className="text-sm text-muted">Action: Recruit</p>
          <p className="text-sm text-muted">
            Target: <span className="text-foreground">{mafia.targetName}</span>
          </p>
          <p className={cn(RESULT_CLASS, "text-gold")}>RECRUIT SUCCESSFUL</p>
          <p className="mt-1 text-sm text-foreground">New Status: {mafia.newStatusLabel}</p>
          <p className="mt-1 text-xs text-muted">Recruits Left: {recap.recruitsLeft}</p>
        </div>
      )}
      {mafia.action === "skip" && <p className="mt-2 text-sm text-muted">The Mafia stayed quiet last night.</p>}
    </Card>
  );
}
