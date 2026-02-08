
// Fix: Added 'line_magic_edit_success' to the EventType union to allow logging this specific event from the LyricCard component
export type EventType = 'generation_start' | 'generation_success' | 'audio_play' | 'export_trigger' | 'error_boundary' | 'line_magic_edit_success';

interface TelemetryEvent {
  event: EventType;
  timestamp: number;
  variant: string;
  metadata?: Record<string, any>;
}

class TelemetryService {
  private static instance: TelemetryService;
  private variant: string = 'A';

  private constructor() {
    this.variant = localStorage.getItem('ab_variant') || (Math.random() > 0.5 ? 'A' : 'B');
    localStorage.setItem('ab_variant', this.variant);
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  public log(event: EventType, metadata?: Record<string, any>) {
    const data: TelemetryEvent = {
      event,
      timestamp: Date.now(),
      variant: this.variant,
      metadata
    };
    
    // In a real app, this would send to a backend or analytics endpoint
    console.debug(`[Telemetry] ${this.variant}: ${event}`, data);
    
    // Simulate persistence
    const logs = JSON.parse(localStorage.getItem('telemetry_logs') || '[]');
    logs.push(data);
    localStorage.setItem('telemetry_logs', JSON.stringify(logs.slice(-100)));
  }

  public getVariant() {
    return this.variant;
  }
}

export const telemetry = TelemetryService.getInstance();
