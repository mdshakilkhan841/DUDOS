import {devscopeError,fromStatus} from './errors';
import type {DevscopeBuildStatus,DevscopeSubmission,DevscopeSubmissionResult} from './types';

// The ONE place DUDOS talks to DevScope.
//
// Nothing else in DUDOS may fetch DevScope directly, and no DevScope credential
// ever reaches a client bundle: this module is server-only (it reads the Worker
// env) and is imported exclusively from route handlers.

type Env={
 DEVSCOPE_BASE_URL?:string;
 DEVSCOPE_SERVICE_TOKEN?:string;
 DEVSCOPE_REQUEST_TIMEOUT?:string;
};

const config=()=>{
 const e=process.env as unknown as Env;
 const baseUrl=(e.DEVSCOPE_BASE_URL||'http://127.0.0.1:8000').trim().replace(/\/+$/,'');
 // No fallback: the builder checks this against its DUDOS_SERVICE_TOKEN, so unset
 // must read as "not configured" (isConfigured), never as a token in the source.
 const token=(e.DEVSCOPE_SERVICE_TOKEN||'').trim();
 // Clamped: a mis-set value must not hold a Worker request open indefinitely,
 // nor abort before DevScope can accept a large SRS.
 const timeout=Math.min(120000,Math.max(3000,Number(e.DEVSCOPE_REQUEST_TIMEOUT)||30000));
 return {baseUrl,token,timeout};
};

export const isConfigured=()=>{const {baseUrl,token}=config();return !!(baseUrl&&token)};

/** Never expose the token. Used by the admin integration panel only. */
export const configSummary=()=>{
 const {baseUrl,token,timeout}=config();
 return {base_url:baseUrl||null,token_configured:!!token,timeout_ms:timeout};
};

async function request<T>(path:string,init:{method:string;body?:unknown;requestId:string}):Promise<T>{
 const {baseUrl,token,timeout}=config();
 if(!baseUrl||!token)throw devscopeError('not_configured');

 let response:Response;
 try{
  response=await fetch(baseUrl+path,{
   method:init.method,
   signal:AbortSignal.timeout(timeout),
   headers:{
    'Content-Type':'application/json',
    'X-DUDOS-Token':token,
    // Correlation id: the same value is logged on both sides so one customer
    // submission can be traced end to end without sharing databases.
    'X-Request-Id':init.requestId,
   },
   ...(init.body===undefined?{}:{body:JSON.stringify(init.body)}),
  });
 }catch(e){
  throw devscopeError((e as Error)?.name==='TimeoutError'?'timeout':'unavailable');
 }

 if(!response.ok){
  // Read and discard the upstream body so the connection is not left open, but
  // never surface it: it may contain internal paths or configuration detail.
  try{await response.text()}catch{/* ignore */}
  throw devscopeError(fromStatus(response.status));
 }

 try{
  return await response.json() as T;
 }catch{
  throw devscopeError('upstream_error');
 }
}

export const submitProject=(submission:DevscopeSubmission,requestId:string)=>
 request<DevscopeSubmissionResult>('/api/v1/integrations/dudos/projects',
  {method:'POST',body:submission,requestId});

/** Polling fallback for a missed webhook. `externalProjectId` is always sent so
 *  DevScope can refuse a build id that does not belong to this DUDOS project. */
export const buildStatus=(buildId:string,externalProjectId:string,requestId:string)=>
 request<DevscopeBuildStatus>(
  `/api/v1/integrations/dudos/builds/${encodeURIComponent(buildId)}`
  +`?external_project_id=${encodeURIComponent(externalProjectId)}`,
  {method:'GET',requestId});

export const submitApproval=(
 buildId:string,
 decision:{decision:string;comment?:string;actor_reference?:string},
 requestId:string,
)=>request<{build_id:string;decision:string;recorded:boolean;forwarded_to_pipeline:boolean;note?:string}>(
 `/api/v1/integrations/dudos/builds/${encodeURIComponent(buildId)}/approvals`,
 {method:'POST',body:decision,requestId});

/** Connection state for the admin integration panel. Never returns the token. */
export async function health(requestId:string){
 const {baseUrl,token}=config();
 if(!baseUrl&&!token)return {state:'misconfigured' as const,detail:'No DevScope base URL or service token is configured.'};
 if(!baseUrl)return {state:'misconfigured' as const,detail:'No DevScope base URL is configured.'};
 if(!token)return {state:'misconfigured' as const,detail:'No DevScope service token is configured.'};
 try{
  const body=await request<{status:string;webhooks_configured:boolean}>(
   '/api/v1/integrations/dudos/health',{method:'GET',requestId});
  return {state:'connected' as const,webhooks_configured:!!body.webhooks_configured};
 }catch(e){
  const code=(e as {code?:string})?.code;
  if(code==='unauthorized')return {state:'authentication_failed' as const,detail:'DevScope rejected the configured service token.'};
  if(code==='not_configured')return {state:'misconfigured' as const,detail:'The integration is not configured.'};
  return {state:'unavailable' as const,detail:'DevScope did not respond.'};
 }
}
