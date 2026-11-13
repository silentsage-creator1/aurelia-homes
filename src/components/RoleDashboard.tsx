import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Activity, ArrowUpRight, Building2, CalendarDays, ClipboardCheck, FileText, Home, KeyRound, Landmark, MessageSquare, Shield, Users } from 'lucide-react';

type ManagedRole = 'tenant' | 'agent' | 'property_manager' | 'contractor' | 'admin' | 'super_admin';
interface DashboardSection { id: string; label: string; description: string; }

const ROLE_CONFIG: Record<ManagedRole, { title: string; subtitle: string; metrics: string[]; sections: DashboardSection[]; actions: string[] }> = {
  tenant: {
    title: 'Tenant dashboard', subtitle: 'Your home, lease, payments, and maintenance in one place.',
    metrics: ['Current Property', 'Next Rent Due', 'Outstanding Balance', 'Lease Expiration'],
    sections: [
      { id: 'overview', label: 'Overview', description: 'Your tenancy at a glance.' },
      { id: 'property', label: 'My Property', description: 'Property, landlord, and lease dates.' },
      { id: 'applications', label: 'Applications', description: 'Rental application history and status.' },
      { id: 'payments', label: 'Payments', description: 'Rent schedule, payment history, and receipts.' },
      { id: 'lease', label: 'Lease Agreement', description: 'Agreement status and renewal information.' },
      { id: 'maintenance', label: 'Maintenance', description: 'Requests and progress updates.' },
      { id: 'documents', label: 'Documents', description: 'Lease documents, receipts, and notices.' },
      { id: 'notifications', label: 'Notifications', description: 'Important tenancy updates.' },
      { id: 'settings', label: 'Settings', description: 'Profile and account settings.' },
    ], actions: ['Pay Rent', 'View Lease', 'Request Maintenance', 'Download Receipt', 'Contact Landlord'],
  },
  agent: {
    title: 'Agent dashboard', subtitle: 'Manage assigned listings, clients, viewings, and deals.',
    metrics: ['Assigned Properties', 'Active Clients', 'New Enquiries', 'Upcoming Viewings', 'Completed Transactions', 'Pending Commissions'],
    sections: [
      { id: 'overview', label: 'Overview', description: 'Your assigned work at a glance.' },
      { id: 'properties', label: 'My Properties', description: 'Properties assigned to you.' },
      { id: 'listings', label: 'Listings', description: 'Listings you are authorized to manage.' },
      { id: 'clients', label: 'Clients', description: 'Buyers and prospective tenants.' },
      { id: 'enquiries', label: 'Enquiries', description: 'Rental and sales enquiries.' },
      { id: 'viewings', label: 'Viewings', description: 'Property inspection appointments.' },
      { id: 'transactions', label: 'Transactions', description: 'Rental and sales deals.' },
      { id: 'commissions', label: 'Commissions', description: 'Commission records.' },
      { id: 'notifications', label: 'Notifications', description: 'Updates on your listings and clients.' },
      { id: 'settings', label: 'Settings', description: 'Profile and account settings.' },
    ], actions: ['View Assigned Properties', 'Add Client', 'Schedule Viewing', 'Follow Up Enquiry', 'View Transactions'],
  },
  property_manager: {
    title: 'Property manager dashboard', subtitle: 'Coordinate the daily operation of assigned properties.',
    metrics: ['Managed Properties', 'Occupied Units', 'Vacant Units', 'Pending Maintenance', 'Outstanding Rent', 'Expiring Leases'],
    sections: [
      { id: 'overview', label: 'Overview', description: 'Operations across assigned properties.' },
      { id: 'properties', label: 'Properties', description: 'Properties assigned to you.' },
      { id: 'tenants', label: 'Tenants', description: 'Tenant records for managed properties.' },
      { id: 'leases', label: 'Leases', description: 'Lease status and renewal dates.' },
      { id: 'payments', label: 'Payments', description: 'Rent payment monitoring.' },
      { id: 'maintenance', label: 'Maintenance', description: 'Requests, assignments, and completion.' },
      { id: 'inspections', label: 'Inspections', description: 'Upcoming property inspections.' },
      { id: 'contractors', label: 'Contractors', description: 'Service providers and assignments.' },
      { id: 'expenses', label: 'Expenses', description: 'Property operating expenses.' },
      { id: 'reports', label: 'Reports', description: 'Occupancy, maintenance, lease, and expense reports.' },
      { id: 'notifications', label: 'Notifications', description: 'Operational updates.' },
      { id: 'settings', label: 'Settings', description: 'Account settings.' },
    ], actions: ['Add Maintenance Request', 'Assign Contractor', 'Record Expense', 'Schedule Inspection', 'View Tenants'],
  },
  contractor: {
    title: 'Technician / contractor dashboard', subtitle: 'Review assigned work orders, site visits, and completion records.',
    metrics: ['Assigned Work Orders', 'Scheduled Visits', 'Urgent Jobs', 'Awaiting Approval'],
    sections: [
      { id: 'overview', label: 'Overview', description: 'Your assigned service work at a glance.' },
      { id: 'work-orders', label: 'Work Orders', description: 'Maintenance jobs assigned to you.' },
      { id: 'schedule', label: 'Schedule', description: 'Upcoming property visits.' },
      { id: 'properties', label: 'Properties', description: 'Property details shared for assigned jobs.' },
      { id: 'reports', label: 'Completion Reports', description: 'Work notes, photos, and completion approvals.' },
      { id: 'payments', label: 'Invoices', description: 'Submitted invoices and payment status.' },
      { id: 'notifications', label: 'Notifications', description: 'Assignment changes and service updates.' },
      { id: 'settings', label: 'Settings', description: 'Contact and service profile.' },
    ], actions: ['View Work Orders', 'Open Schedule', 'Submit Completion Report', 'View Invoices'],
  },
  admin: {
    title: 'Admin dashboard', subtitle: 'Daily platform operations and review queues.',
    metrics: ['Total Users', 'Total Properties', 'Active Listings', 'Listing Approvals', 'Rental Applications', 'Transactions', 'Complaints'],
    sections: [
      { id: 'overview', label: 'Overview', description: 'Operational activity and outstanding reviews.' },
      { id: 'users', label: 'Users', description: 'Registered platform users.' },
      { id: 'listings', label: 'Property Listings', description: 'Review and verify submitted listings.' },
      { id: 'landlords', label: 'Landlords', description: 'Property owner accounts.' },
      { id: 'agents', label: 'Agents', description: 'Agent profiles and assignments.' },
      { id: 'managers', label: 'Property Managers', description: 'Manager accounts and assignments.' },
      { id: 'buyers', label: 'Buyers', description: 'Buyer accounts.' },
      { id: 'tenants', label: 'Tenants', description: 'Tenant accounts.' },
      { id: 'applications', label: 'Rental Applications', description: 'Monitor application progress.' },
      { id: 'sales', label: 'Sales Transactions', description: 'Purchase transaction progress.' },
      { id: 'mortgages', label: 'Mortgage Applications', description: 'Mortgage enquiries and applications.' },
      { id: 'payments', label: 'Payments', description: 'Payment monitoring.' },
      { id: 'complaints', label: 'Complaints', description: 'Reported issues and properties.' },
      { id: 'reports', label: 'Reports & Analytics', description: 'Platform activity and statistics.' },
      { id: 'notifications', label: 'Notifications', description: 'Platform announcements.' },
      { id: 'settings', label: 'Settings', description: 'Admin profile settings.' },
    ], actions: ['Verify Property', 'Review User', 'Review Application', 'Resolve Complaint', 'Generate Report'],
  },
  super_admin: {
    title: 'Super Admin dashboard', subtitle: 'Platform-wide administration, security, and system configuration.',
    metrics: ['Registered Users', 'Properties', 'Active Listings', 'Transactions', 'Platform Revenue', 'Administrators', 'System Issues'],
    sections: [
      { id: 'overview', label: 'Overview', description: 'Platform-wide activity and system health.' },
      { id: 'administrators', label: 'Administrators', description: 'Create and manage admin accounts.' },
      { id: 'users', label: 'All Users', description: 'Platform user directory.' },
      { id: 'roles', label: 'Roles & Permissions', description: 'Access control and role assignment.' },
      { id: 'properties', label: 'Properties', description: 'All property records.' },
      { id: 'transactions', label: 'Transactions', description: 'Platform transaction history.' },
      { id: 'financial', label: 'Financial Overview', description: 'Platform financial performance.' },
      { id: 'payments', label: 'Payment Configuration', description: 'Payment integrations and configuration.' },
      { id: 'system', label: 'System Settings', description: 'Platform configuration and policies.' },
      { id: 'security', label: 'Security', description: 'Security events and platform monitoring.' },
      { id: 'audit', label: 'Audit Logs', description: 'Administrative activity records.' },
      { id: 'integrations', label: 'Integrations', description: 'External services and connection status.' },
      { id: 'analytics', label: 'Analytics', description: 'Overall platform performance.' },
      { id: 'notifications', label: 'Notifications', description: 'Platform announcements.' },
      { id: 'settings', label: 'Settings', description: 'Super Admin account settings.' },
    ], actions: ['Create Administrator', 'Assign Permissions', 'Configure Platform', 'View Audit Logs', 'Manage Integrations'],
  },
};

const ICONS = [Home, Building2, Users, CalendarDays, FileText, MessageSquare, Landmark, Activity, Shield, ClipboardCheck, KeyRound];

interface RoleDashboardProps { user: UserProfile; role: ManagedRole; }

export const RoleDashboard: React.FC<RoleDashboardProps> = ({ user, role }) => {
  const config = ROLE_CONFIG[role];
  const [activeSection, setActiveSection] = useState('overview');
  const active = config.sections.find((section) => section.id === activeSection) || config.sections[0];
  const isTenant = role === 'tenant';

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] gap-5 lg:gap-8">
        <aside className="h-fit rounded-2xl border border-[#E4DFD3] bg-white p-3 lg:sticky lg:top-28">
          <div className="px-3 py-3 border-b border-[#E4DFD3] mb-2"><p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#9C7C3E]">Workspace</p><p className="text-sm font-bold text-[#142D4E] mt-1">{config.title}</p></div>
          <nav aria-label={`${config.title} navigation`} className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {config.sections.map((section, index) => {
              const Icon = ICONS[index % ICONS.length];
              return <button key={section.id} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? 'page' : undefined} className={`shrink-0 lg:w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${activeSection === section.id ? 'bg-[#142D4E] text-white' : 'text-slate-600 hover:bg-[#F7F5F0] hover:text-[#142D4E]'}`}><Icon className={`h-4 w-4 ${activeSection === section.id ? 'text-[#D8BD8C]' : 'text-[#9C7C3E]'}`} />{section.label}</button>;
            })}
          </nav>
          <div className="hidden lg:block mt-4 border-t border-[#E4DFD3] pt-3 px-3"><p className="text-xs font-semibold text-[#142D4E]">{user.name}</p><p className="text-[11px] text-slate-500 truncate">{user.email}</p><p className="mt-2 text-[10px] text-amber-800">Demo workspace · no records connected</p></div>
        </aside>

        <main className="min-w-0 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#9C7C3E]">{active.label}</p><h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#142D4E] mt-1">{config.title}</h1><p className="text-sm text-slate-500 mt-1">{active.description}</p></div><span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900">Dashboard demo · backend not connected</span></header>

          {activeSection === 'overview' ? <>
            {isTenant && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>No active tenancy is linked to this account.</strong> Tenant payment, lease, and maintenance tools become available after an approved application, signed agreement, and tenancy activation. If you have only applied, use the Applicant dashboard instead.</div>}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{config.metrics.map((metric) => <div key={metric} className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><p className="text-xs font-semibold text-slate-500">{metric}</p><p className="font-heading text-2xl font-bold text-[#142D4E] mt-3">—</p><p className="text-[10px] text-slate-400 mt-1">No connected records</p></div>)}</div>
            <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5 sm:p-7"><h2 className="font-heading text-lg font-bold text-[#142D4E]">{isTenant ? 'Tenancy overview' : 'Workspace overview'}</h2><p className="text-sm text-slate-500 mt-2">{isTenant ? 'Your current property, payment schedule, agreement, and maintenance history will appear here when a tenancy is activated.' : 'This role dashboard is ready for its records and workflows. It does not contain sample financial, customer, or platform activity.'}</p><div className="mt-5 grid sm:grid-cols-2 gap-3">{config.actions.map((action) => <button key={action} onClick={() => setActiveSection(action.includes('Maintenance') ? 'maintenance' : action.includes('Lease') ? 'lease' : action.includes('Property') ? 'properties' : action.includes('Application') ? 'applications' : action.includes('Viewing') ? 'viewings' : action.includes('Tenant') ? 'tenants' : config.sections[1]?.id || 'overview')} className="flex items-center justify-between rounded-xl border border-[#E4DFD3] px-4 py-3 text-left text-xs font-semibold text-[#142D4E] hover:border-[#C5A46D] hover:bg-[#F7F5F0]">{action}<ArrowUpRight className="h-4 w-4 text-[#9C7C3E]" /></button>)}</div></section>
          </> : <section className="rounded-2xl border border-[#E4DFD3] bg-white p-6 sm:p-8"><h2 className="font-heading text-xl font-bold text-[#142D4E]">{active.label}</h2><p className="text-sm text-slate-500 mt-2">{active.description}</p><div className="mt-6 rounded-xl bg-[#F7F5F0] p-5"><p className="text-sm font-semibold text-[#142D4E]">No records to show</p><p className="text-xs text-slate-500 mt-1">Connect the shared database and role permissions to load this section. Actions are disabled until the backend enforces access for this role.</p></div></section>}
        </main>
      </div>
    </div>
  );
};
