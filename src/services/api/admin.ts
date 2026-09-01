import { apiFetch } from './client';

export interface AdminStats {
  products:number;
  observations:number;
  users:number;
  openReports:number;
  priceConflicts:number;
}
export interface AdminReport {
  id:string;
  entity_type:string;
  entity_id:string|null;
  reason:string;
  details:string|null;
  status:'open'|'reviewing'|'resolved'|'dismissed';
  created_at:string;
  reporter_email:string|null;
}

export async function adminSummary():Promise<AdminStats>{
  const result=await apiFetch<{stats:AdminStats}>('/api/v1/admin/summary');
  return result.stats;
}
export async function adminReports():Promise<AdminReport[]>{
  const result=await apiFetch<{reports:AdminReport[]}>('/api/v1/admin/reports');
  return result.reports;
}
export async function updateAdminReport(id:string,status:AdminReport['status'],reason?:string):Promise<AdminReport>{
  const result=await apiFetch<{report:AdminReport}>(`/api/v1/admin/reports/${id}`,{
    method:'PATCH',body:JSON.stringify({status,reason})
  });
  return result.report;
}
