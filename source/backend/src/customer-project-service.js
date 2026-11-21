/**
 * Single transactional project-creation entry point.
 * Caller must hold the relevant draft row lock and manage BEGIN/COMMIT/ROLLBACK.
 * This function deliberately does not create orders or mutate drafts.
 */
export async function createCustomerJourneyProject(client, {
  customerName, customerEmail, customerAccountId, createdBy,
  templateId = null, status = 'draft'
}) {
  if (!customerName || !customerAccountId || !createdBy) {
    throw new Error('Customer project requires identity, name and creator');
  }
  const result = await client.query(
    `INSERT INTO customer_journey_projects
       (customer_name,customer_email,template_id,created_by,customer_account_id,status)
     VALUES($1,$2,$3,$4,$5,$6)
     RETURNING id,status`,
    [customerName,customerEmail ?? null,templateId,createdBy,customerAccountId,status]
  );
  return result.rows[0];
}
