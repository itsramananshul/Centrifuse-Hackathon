export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  age: number;
  email: string;
  phone: string;
  patientCount: number;
  avgResponseTime: string;
  unresolvedAlerts: number;
  dropoutRate: number;
  status: "active" | "busy" | "offline";
}

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Sarah Mitchell",
    specialty: "Oncology",
    age: 42,
    email: "s.mitchell@voxvitals.med",
    phone: "+1 (555) 201-4010",
    patientCount: 3,
    avgResponseTime: "12 min",
    unresolvedAlerts: 2,
    dropoutRate: 8.5,
    status: "active",
  },
  {
    id: "doc-2",
    name: "Dr. James Park",
    specialty: "Rheumatology",
    age: 38,
    email: "j.park@voxvitals.med",
    phone: "+1 (555) 302-5521",
    patientCount: 2,
    avgResponseTime: "28 min",
    unresolvedAlerts: 4,
    dropoutRate: 15.2,
    status: "busy",
  },
  {
    id: "doc-3",
    name: "Dr. Priya Sharma",
    specialty: "Cardiology",
    age: 35,
    email: "p.sharma@voxvitals.med",
    phone: "+1 (555) 418-7703",
    patientCount: 0,
    avgResponseTime: "8 min",
    unresolvedAlerts: 0,
    dropoutRate: 3.1,
    status: "active",
  },
];
