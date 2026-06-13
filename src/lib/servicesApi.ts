import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface Service {
  id: string;
  service_name: string;
  service_value: string;
  description: string;
  duration_minutes: number;
  price: number; // dollars; 0 when is_free
  is_free: boolean;
  is_active: boolean;
  sort_order: number;
}

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-e8cd329a`;

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
  };
}

async function handle(res: Response, context: string) {
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${context}: non-JSON response (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || json.ok === false) {
    throw new Error(`${context}: ${json.error || res.status}`);
  }
  return json;
}

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch(`${BASE}/services`, { headers: headers() });
  const json = await handle(res, 'Error fetching services');
  return json.services as Service[];
}

// Seeds the default Milah Grace services only if none exist yet, then returns the list.
export async function seedServicesIfEmpty(): Promise<Service[]> {
  const res = await fetch(`${BASE}/services/seed`, { method: 'POST', headers: headers() });
  const json = await handle(res, 'Error seeding services');
  return json.services as Service[];
}

export async function createService(input: Partial<Service>): Promise<Service> {
  const res = await fetch(`${BASE}/services`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const json = await handle(res, 'Error creating service');
  return json.service as Service;
}

export async function updateService(id: string, input: Partial<Service>): Promise<Service> {
  const res = await fetch(`${BASE}/services/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(input),
  });
  const json = await handle(res, 'Error updating service');
  return json.service as Service;
}

export async function deleteService(id: string): Promise<void> {
  const res = await fetch(`${BASE}/services/${id}`, { method: 'DELETE', headers: headers() });
  await handle(res, 'Error deleting service');
}

export function formatServiceMeta(service: Pick<Service, 'duration_minutes' | 'price' | 'is_free'>): string {
  const duration =
    service.duration_minutes >= 60 && service.duration_minutes % 60 === 0
      ? `${service.duration_minutes / 60} hour${service.duration_minutes / 60 > 1 ? 's' : ''}`
      : `${service.duration_minutes} minutes`;
  if (service.is_free || service.price === 0) return duration;
  const price = service.price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
  return `${duration} @ ${price}`;
}
