
export interface Shipment {
  houseBolNumber: string; // Unique Identifier
  shipperName: string;
  consigneeName: string;
  consigneeCity: string;
  consigneeAddress: string;
  notifyParty?: string; // Added field
  placeOfReceipt: string;
  usArrivalPort: string;
  arrivalDate: string; // ISO Date string YYYY-MM-DD
  teu: number;
  nvoccName: string;
  voccCode: string;
  voccName: string; // Added for clarity in charts
}

export type CustomerType = 'Partnership' | 'Pvt Ltd' | 'LLP' | 'Limited' | 'Proprietorship' | 'Other' | '';
export type CompanySize = 'SME' | 'Large' | 'Ultra Large' | '';

export interface ShipperContact {
  shipperName: string;
  email: string;
  contactNumber: string; // Mobile Number
  address: string;
  city?: string; // Added for Map View
  panNumber: string;
  cinNumber: string;
  customerType: CustomerType;
  companySize: CompanySize;
  contactPersonName: string;
  designation: string;
  lastUpdated?: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  TRADE_LANE = 'TRADE_LANE',
  PRE_BUILT_REPORTS = 'PRE_BUILT_REPORTS',
  MAP_VIEW = 'MAP_VIEW',
  CONTACTS = 'CONTACTS',
  IMPORT = 'IMPORT'
}

export interface AggregatedConsignee {
  name: string;
  city: string;
  address: string;
  teu: number;
  shipmentCount: number;
}

export interface AggregatedRoute {
  origin: string;
  destination: string;
  teu: number;
}

export interface AggregatedCarrier {
  name: string;
  teu: number;
  type: 'VOCC' | 'NVOCC';
  topPort?: string;
  topReceipt?: string;
}
