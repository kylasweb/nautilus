import { Shipment, ShipperContact } from '../types';
import { INITIAL_SHIPMENTS, INITIAL_CONTACTS } from './data';

// Helper to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status} ${text}`);
  }
  return response.json();
};

export const fetchShipments = async (): Promise<Shipment[]> => {
  try {
    const data = await handleResponse(await fetch('/api/shipments'));
    return data;
  } catch (err) {
    console.error('Error fetching shipments from API:', err);
    // Fallback for development/offline if API fails
    console.warn('Falling back to local mock data');
    return INITIAL_SHIPMENTS;
  }
};

export const fetchContacts = async (): Promise<ShipperContact[]> => {
  try {
    const data = await handleResponse(await fetch('/api/contacts'));
    return data;
  } catch (err) {
    console.error('Error fetching contacts from API:', err);
    console.warn('Falling back to local mock data');
    return INITIAL_CONTACTS;
  }
};

export const seedDatabase = async () => {
  try {
    const data = await handleResponse(await fetch('/api/seed'));
    console.log('Seeding result:', data);
    return true;
  } catch (err) {
    console.error('Error requesting DB seed:', err);
    return false;
  }
};