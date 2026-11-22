import {z} from 'zod';

// Shared by the HTTP routes and automated validation tests.
export const journeyTaskCreate=z.object({
 title:z.string().trim().min(2).max(180),
 description:z.string().max(4000).default(''),
 assignedTo:z.string().uuid().nullable().default(null)
}).strict();

export const journeyTaskUpdate=z.object({
 title:z.string().trim().min(2).max(180).optional(),
 description:z.string().max(4000).optional(),
 assignedTo:z.string().uuid().nullable().optional(),
 status:z.enum(['todo','in_progress','blocked','done']).optional()
}).strict().refine(x=>Object.keys(x).length>0);

export const canManageJourneyTasks=role=>role==='owner'||role==='admin';
export const canReadJourneyTasks=role=>['owner','admin','sales','viewer'].includes(role);

// Server-side scope for the personal task inbox. Never trust a client-supplied user id.
export function taskInboxScope(admin){
 if(admin?.role==='owner')return {owner:true,userId:null};
 if(typeof admin?.userId!=='string'||!admin.userId)return null;
 return {owner:false,userId:admin.userId};
}
