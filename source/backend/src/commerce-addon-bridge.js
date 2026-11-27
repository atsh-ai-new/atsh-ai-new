// Internal contract for the independent commerce runtime. Catalog and activation
// stay in the ATSH platform, not in a duplicate merchant price table.
export async function commerceAddonSnapshot(db,projectId){
 const project=(await db.query("SELECT id FROM customer_project_drafts WHERE id=$1 AND deleted_at IS NULL",[projectId])).rows[0];
 if(!project)return null;
 const catalog=(await db.query("SELECT code,name,description,price,pricing_type,category_code FROM shared_addons WHERE is_active=true ORDER BY sort_order,code")).rows;
 const services=(await db.query("SELECT service_code, COUNT(*)::int AS quantity FROM customer_service_entitlements WHERE project_draft_id=$1 AND status='active' AND activated_at<=now() AND (expires_at IS NULL OR expires_at>now()) GROUP BY service_code",[projectId])).rows;
 return {projectId,catalog,activeCodes:services.map(x=>x.service_code),quantities:Object.fromEntries(services.map(x=>[x.service_code,x.quantity]))};
}
