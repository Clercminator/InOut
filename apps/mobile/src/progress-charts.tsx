import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { colors } from "@inout/design-tokens";
import { Button, Card, Copy, Label, s } from "./ui";
import { breakdown, statsDuration, summarize, type StatsBucket } from "./progress";
import { chartColors, chartLayout } from "./chart-layout";

function ChartFrame({ buckets, ticks, selected, select, description, column }: {
  buckets: StatsBucket[]; ticks: string[]; selected: number; select: (index: number) => void;
  description: string; column: (bucket: StatsBucket, index: number) => ReactNode;
}) {
  const dimensions = useWindowDimensions();
  const [width, setWidth] = useState(Math.max(160, dimensions.width - 88));
  const layout = chartLayout(width, buckets.length, dimensions.fontScale);
  const scrollView = useRef<ScrollView>(null);
  const revealSelection = useCallback(() => {
    const visibleWidth = width - layout.axisWidth - 8;
    const center = (selected + 0.5) * layout.plotWidth / Math.max(1, buckets.length);
    scrollView.current?.scrollTo({ x: layout.scroll ? Math.max(0, center - visibleWidth / 2) : 0, animated: false });
  }, [selected, width, layout.axisWidth, layout.plotWidth, layout.scroll, buckets.length]);
  useEffect(revealSelection, [revealSelection]);
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ gap: 10 }}>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View accessible={false} style={{ width: layout.axisWidth, height: 128, justifyContent: "space-between" }}>
        {ticks.map((tick, index) => <Copy key={index} style={{ fontSize: 11, color: colors.secondaryText }}>{tick}</Copy>)}
      </View>
      <ScrollView ref={scrollView} horizontal scrollEnabled={layout.scroll} showsHorizontalScrollIndicator={layout.scroll} onContentSizeChange={revealSelection} style={{ flex: 1 }}>
        <View accessible accessibilityRole="adjustable" accessibilityLabel={description}
          accessibilityHint="Swipe up or down to inspect another period, or use the Previous and Next buttons."
          accessibilityValue={{ min: 1, max: buckets.length, now: selected + 1 }}
          accessibilityActions={[{ name: "increment", label: "Next period" }, { name: "decrement", label: "Previous period" }]}
          onAccessibilityAction={event => select(Math.max(0, Math.min(buckets.length - 1, selected + (event.nativeEvent.actionName === "increment" ? 1 : -1))))}
          style={{ width: layout.plotWidth }}>
          <View style={{ flexDirection: "row", height: 128 }}>
            {[0, 64, 127].map(top => <View key={top} style={{ position: "absolute", top, left: 0, right: 0, height: 1, backgroundColor: colors.border }} />)}
            {buckets.map((bucket, index) => <View key={bucket.key} style={{ flex: 1, paddingHorizontal: 2, borderBottomWidth: index === selected ? 3 : 0, borderColor: colors.text }}>
              {column(bucket, index)}
            </View>)}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingTop: 6 }}>
            <Copy style={s.small}>{buckets[0]?.label}</Copy>
            {buckets.length > 1 && <Copy style={[s.small, { textAlign: "right" }]}>{buckets.at(-1)?.label}</Copy>}
          </View>
        </View>
      </ScrollView>
    </View>
    {layout.scroll && <Copy style={s.small}>Scroll horizontally to view the full chart.</Copy>}
    <Copy accessibilityLiveRegion="polite">{description}</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <Button title="Previous period" secondary disabled={selected === 0} onPress={() => select(selected - 1)} />
      <Button title="Next period" secondary disabled={selected === buckets.length - 1} onPress={() => select(selected + 1)} />
    </View>
  </View>;
}

export function PracticeChart({ title, subtitle, buckets, metric, by }: {
  title: string; subtitle?: string; buckets: StatsBucket[]; metric: "time" | "sessions"; by: "goal" | "source";
}) {
  const [key, setKey] = useState<string | null>(null);
  const selected = Math.max(0, key && buckets.some(b => b.key === key) ? buckets.findIndex(b => b.key === key) : buckets.length - 1);
  const groups = breakdown(buckets.flatMap(b => b.records), by).sort((a, b) => Object.keys(chartColors).indexOf(a.label) - Object.keys(chartColors).indexOf(b.label));
  const totals = buckets.map(b => { const summary = summarize(b.records); return metric === "time" ? summary.totalMs : summary.count; });
  const maximum = Math.max(1, ...totals);
  const max = metric === "sessions" ? Math.max(2, Math.ceil(maximum / 2) * 2) : Math.max(2000, Math.ceil(maximum / 2000) * 2000);
  const total = totals.reduce((a, b) => a + b, 0);
  const format = (value: number) => metric === "time" ? statsDuration(value) : `${value} ${value === 1 ? "session" : "sessions"}`;
  const chosen = buckets[selected];
  return <Card>
    <Label>{title}</Label>{subtitle && <Copy>{subtitle}</Copy>}
    {!total ? <Copy>No breathing sessions in this period.</Copy> : <>
      <ChartFrame buckets={buckets} selected={selected} select={index => setKey(buckets[index].key)}
        ticks={[metric === "time" ? statsDuration(max) : String(max), metric === "time" ? statsDuration(max / 2) : String(max / 2), "0"]}
        description={`${chosen.label}: ${format(totals[selected])}`}
        column={bucket => <View style={{ flex: 1, justifyContent: "flex-end" }}>{groups.map(group => {
          const summary = summarize(bucket.records.filter(r => (by === "source" ? r.source === "manual" ? "Manual" : "In-app" : r.goal) === group.label));
          const value = metric === "time" ? summary.totalMs : summary.count;
          return value > 0 ? <View key={group.label} testID={`segment-${bucket.key}-${group.label}`} style={{ backgroundColor: chartColors[group.label] ?? colors.muted, height: value / max * 124 }} /> : null;
        })}</View>} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {groups.map(group => <Copy key={group.label} style={s.small}><Copy style={{ color: chartColors[group.label] }}>● </Copy>{group.label} {Math.round((metric === "time" ? group.totalMs : group.count) / total * 100)}%</Copy>)}
      </View>
      {breakdown(chosen.records, by).map(group => <Copy key={group.label} style={s.small}>{group.label}: {format(metric === "time" ? group.totalMs : group.count)}</Copy>)}
    </>}
  </Card>;
}

export function StateShiftChart({ buckets }: { buckets: StatsBucket[] }) {
  const [key, setKey] = useState<string | null>(null);
  const selected = Math.max(0, key && buckets.some(b => b.key === key) ? buckets.findIndex(b => b.key === key) : buckets.length - 1);
  const chosen = buckets[selected], summary = summarize(chosen?.records ?? []);
  const label = (value: number | null) => value === null ? "No paired ratings" : `${value > 0 ? "+" : ""}${value.toFixed(1)} average State Shift`;
  return <Card>
    <Label>STATE SHIFT OVER TIME</Label>
    <Copy style={s.small}>Positive means lower self-reported tension. Gaps mean no paired ratings.</Copy>
    {!buckets.some(b => summarize(b.records).shifts) ? <Copy>Add before-and-after ratings to see your trend.</Copy> : <ChartFrame buckets={buckets}
      selected={selected} select={index => setKey(buckets[index].key)} ticks={["+9", "0", "−9"]}
      description={`${chosen.label}: ${label(summary.averageShift)} · ${summary.shifts} paired ratings`}
      column={bucket => {
        const value = summarize(bucket.records).averageShift;
        return value === null ? null : <View style={{ position: "absolute", left: 2, right: 2, top: value > 0 ? 64 - value * 7 : 64,
          height: Math.max(2, Math.abs(value) * 7), backgroundColor: value < 0 ? colors.hold : colors.exhale }} />;
      }} />}
  </Card>;
}
