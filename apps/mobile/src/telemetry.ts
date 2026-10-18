import type { AnalyticsSink, ProductEvent, ProductEventProperties } from "./analytics";

export interface TelemetryAdapter {
  consent(enabled: boolean): Promise<void>;
  record(event: ProductEvent, properties?: ProductEventProperties): Promise<void>;
}
export class TelemetrySink implements AnalyticsSink {
  private enabled = false;
  private ready = false;
  private queue = Promise.resolve();
  private requested: boolean | undefined;
  private generation = 0;
  constructor(private adapter: TelemetryAdapter) {}
  get collectionReady() { return this.ready && this.enabled; }
  setConsent(enabled: boolean) {
    if (this.requested === enabled) return this.queue;
    this.requested = enabled;
    const generation = ++this.generation;
    this.enabled = enabled;
    this.ready = false;
    // Serialize rapid toggles; withdrawal suppresses new events immediately.
    this.queue = this.queue.then(async () => {
      await this.adapter.consent(enabled);
      this.ready = enabled && this.enabled && generation === this.generation;
      if (this.ready) await this.adapter.record("app_open");
    }).catch(() => { this.ready = false; this.requested = undefined; });
    return this.queue;
  }
  record(event: ProductEvent, properties?: ProductEventProperties) {
    if (!this.enabled || !this.ready || event === "state_before_logged" || event === "state_after_logged") return;
    void this.adapter.record(event, properties).catch(() => {});
  }
}
