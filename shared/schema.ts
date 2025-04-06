export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  barcode: string;
  created_at: Date;
}

export interface Laboratory {
  id: number;
  name: string;
  code: string;
}

export interface Tube {
  id: number;
  barcode: string;
  type: string;
  patient_id: string;
  collection_date: Date;
  temperature_requirement: TemperatureType;
  box_id?: number;
  status: 'pending' | 'in_box' | 'delivered';
  lab_id: number;
  created_at: Date;
  last_updated: Date;
}

export interface Box {
  id: number;
  barcode: string;
  temperature_type: TemperatureType;
  status: 'open' | 'sealed' | 'in_transit' | 'delivered';
  source_lab_id: number;
  destination_lab_id?: number;
  tube_count: number;
  pickup_date?: Date;
  delivery_date?: Date;
  transporter_id?: string;
  created_at: Date;
  last_updated: Date;
}

export interface Alert {
  id: number;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  tube_id?: number;
  box_id?: number;
  lab_id: number;
  resolved: boolean;
  created_at: Date;
}

export interface Activity {
  id: number;
  type: string;
  details: Record<string, any>;
  user_id: number;
  lab_id: number;
  tube_id?: number;
  box_id?: number;
  created_at: Date;
}

export const temperatureTypes = {
  ROOM: 'room',
  COLD: 'cold',
  FROZEN: 'frozen',
} as const;

export type TemperatureType = typeof temperatureTypes[keyof typeof temperatureTypes];
