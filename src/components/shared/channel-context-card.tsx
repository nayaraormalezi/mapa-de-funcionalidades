import { ChannelBadge } from "@/components/badges/channel-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { temporalStatusLabel } from "@/lib/labels";
import type { ChannelContext, Channel, TemporalStatus } from "@/types";

export function ChannelContextCard({
  audienceName,
  momentName,
  items,
}: {
  audienceName: string;
  momentName: string;
  items: {
    context: ChannelContext;
    channel: Channel;
    temporalStatus: TemporalStatus;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {audienceName} · {momentName}
        </CardTitle>
        <CardDescription>
          Canais oficiais deste contexto (atual e futuro).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhum canal configurado.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map(({ channel, temporalStatus }) => (
              <li
                key={`${channel.id}-${temporalStatus}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
              >
                <ChannelBadge
                  name={channel.name}
                  temporalStatus={temporalStatus}
                />
                <span className="text-xs text-[var(--muted-foreground)]">
                  {temporalStatusLabel[temporalStatus]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
