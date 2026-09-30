import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { SourceReadModel, CloudSource } from "./read-model"
import type { OperatorPreferencePatch, OperatorPreferences } from "./preferences"

export async function fetchCloudSource<T>(source: CloudSource): Promise<SourceReadModel<T>> {
  const response=await fetch(`/api/cloud-control/sources/${source}`,{cache:"no-store",headers:{Accept:"application/json"}})
  if(!response.ok) throw new Error(`Cloud source ${source} returned ${response.status}`)
  return response.json() as Promise<SourceReadModel<T>>
}
export async function refreshCloudSource<T>(source: CloudSource): Promise<SourceReadModel<T>> {
  const response=await fetch(`/api/cloud-control/sources/${source}/refresh`,{method:"POST",cache:"no-store",headers:{Accept:"application/json"}})
  const payload=(await response.json()) as SourceReadModel<T>
  if(!response.ok&&payload.state!=="unavailable") throw new Error(`Cloud source ${source} refresh returned ${response.status}`)
  return payload
}
export function useCloudSource<T>(source:CloudSource){return useQuery({queryKey:["cloud-source",source],queryFn:()=>fetchCloudSource<T>(source),staleTime:30_000,refetchOnWindowFocus:false,refetchInterval:false})}
export function useRefreshCloudSources(sources:readonly CloudSource[]){const client=useQueryClient();return useMutation({mutationFn:async()=>Promise.allSettled(sources.map(refreshCloudSource)),onSettled:async()=>{await Promise.all(sources.map(source=>client.invalidateQueries({queryKey:["cloud-source",source]})))}})}
export function sourceAgeLabel(model:SourceReadModel<unknown>|undefined){if(!model||model.ageSeconds==null)return"no snapshot";if(model.ageSeconds<60)return`${model.ageSeconds}s old`;const m=Math.floor(model.ageSeconds/60);return m<60?`${m}m old`:`${Math.floor(m/60)}h old`}
export function sourceTone(model:SourceReadModel<unknown>|undefined):"neutral"|"live"|"warn"|"danger"{if(!model)return"neutral";if(model.state==="fresh")return"live";if(model.state==="stale")return"warn";return"danger"}
export async function cancelCloudOperation(id:string){const response=await fetch(`/api/cloud-control/operations/${encodeURIComponent(id)}/cancel`,{method:"POST",cache:"no-store",headers:{Accept:"application/json"}});const payload=await response.json() as {ok:boolean;id?:string;state?:string;reason?:string;code?:string};if(!response.ok)throw new Error(payload.reason||payload.code||`Cancel returned ${response.status}`);return payload}
export async function fetchOperatorPreferences():Promise<{preferences:OperatorPreferences;persistence:"supabase"|"unbound"}>{const response=await fetch("/api/cloud-control/preferences",{cache:"no-store",headers:{Accept:"application/json"}});if(!response.ok)throw new Error(`Preferences returned ${response.status}`);return response.json()}
export async function updateOperatorPreferences(patch:OperatorPreferencePatch):Promise<OperatorPreferences>{const response=await fetch("/api/cloud-control/preferences",{method:"PUT",cache:"no-store",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify(patch)});const payload=await response.json() as {preferences?:OperatorPreferences;code?:string};if(!response.ok||!payload.preferences)throw new Error(payload.code||`Preferences update returned ${response.status}`);return payload.preferences}
export async function resetOperatorPreferences():Promise<OperatorPreferences>{const response=await fetch("/api/cloud-control/preferences",{method:"DELETE",cache:"no-store",headers:{Accept:"application/json"}});const payload=await response.json() as {preferences?:OperatorPreferences;code?:string};if(!response.ok||!payload.preferences)throw new Error(payload.code||`Preferences reset returned ${response.status}`);return payload.preferences}
