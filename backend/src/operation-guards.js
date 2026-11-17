// Fail closed for controlled write operations; GET endpoints remain available for inspection.
export function operationGuard(pool,key){
 return async (req,res,next)=>{
  try {
   const {rows}=await pool.query('SELECT enabled FROM platform_service_controls WHERE service_key=$1',[key]);
   if(rows[0]?.enabled===false)return res.status(503).json({error:'Service temporarily disabled',service:key});
   return next();
  } catch(error){
   console.error('service_control_check_failed',key,error?.code||'unknown');
   return res.status(503).json({error:'Service availability cannot be verified',service:key});
  }
 };
}
