import { CalendarCheck, Mail, Phone } from 'lucide-react'
import type { IntakeConfig, Lead } from '../../lib/api'

export function DoneStep({ lead, config }: { lead: Lead; config: IntakeConfig }) {
  const when =
    lead.bookingDate &&
    new Date(`${lead.bookingDate}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <CalendarCheck className="w-7 h-7 text-primary" />
      </div>

      <div>
        <h2 className="mb-2">You’re on the schedule</h2>
        <p className="text-muted-foreground">
          Thanks {lead.name.split(' ')[0]} — {config.tenant.name} will confirm by email.
        </p>
      </div>

      {when && (
        <div className="inline-flex flex-col items-center gap-1 rounded-xl border border-border px-6 py-4">
          <span className="text-sm text-muted-foreground">Requested visit</span>
          <span className="font-medium">
            {when}
            {lead.bookingTime ? ` at ${lead.bookingTime}` : ''}
          </span>
        </div>
      )}

      <div className="text-left rounded-xl border border-border p-5 space-y-2">
        <h3 className="mb-1">What happens next</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
          <li>We review your photos and confirm the visit by email.</li>
          <li>
            You’ll get pricing for the work you selected before anyone starts — nothing is charged
            until you approve it.
          </li>
          <li>Our crew arrives and takes care of the yard.</li>
        </ol>
      </div>

      {(config.tenant.contactEmail || config.tenant.contactPhone) && (
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          {config.tenant.contactEmail && (
            <a
              href={`mailto:${config.tenant.contactEmail}`}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              {config.tenant.contactEmail}
            </a>
          )}
          {config.tenant.contactPhone && (
            <a
              href={`tel:${config.tenant.contactPhone.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Phone className="w-4 h-4" />
              {config.tenant.contactPhone}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
