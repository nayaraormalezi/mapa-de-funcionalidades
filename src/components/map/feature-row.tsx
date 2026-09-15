import Link from "next/link";
import { AudienceBadge } from "@/components/badges/audience-badge";
import { ChannelBadge } from "@/components/badges/channel-badge";
import { ExperienceBadge } from "@/components/badges/experience-badge";
import { MomentBadge } from "@/components/badges/moment-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import type { FeatureMapRow } from "@/types";

export function FeatureRow({ row }: { row: FeatureMapRow }) {
  return (
    <tr className="border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/60">
      <td className="px-3 py-3">
        <AudienceBadge code={row.audienceCode} name={row.audienceName} />
      </td>
      <td className="px-3 py-3">
        <MomentBadge code={row.momentCode} name={row.momentName} />
      </td>
      <td className="px-3 py-3 text-sm">{row.journeyName}</td>
      <td className="px-3 py-3 text-sm">{row.userNeedName}</td>
      <td className="px-3 py-3">
        <Link
          href={`/funcionalidades/${row.featureId}`}
          className="text-sm font-medium text-[var(--brand)] hover:underline"
        >
          {row.featureName}
        </Link>
        {row.isDemo ? (
          <span className="ml-2 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
            DEMO
          </span>
        ) : null}
      </td>
      <td className="px-3 py-3">
        <ChannelBadge
          name={row.channelName}
          temporalStatus={row.temporalStatus}
        />
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-3 py-3">
        <ExperienceBadge experience={row.experience} />
      </td>
      <td className="px-3 py-3">
        <PriorityBadge priority={row.priority} />
      </td>
    </tr>
  );
}
