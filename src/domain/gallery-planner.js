import { calculateItemScore, ITEM_SCORE_TABLE_VERSION } from './item-score.js';

export function planGallerySet(items, set, events = []) {
  const addedIds = new Set(events.filter((event)=>event.type==='gallery:added'&&event.details===set.id).map((event)=>event.instanceId));
  const added = items.filter((item)=>addedIds.has(item.instanceId));
  const pool = items.filter((item) => {
    if (addedIds.has(item.instanceId)) return false;
    if (set.includePast !== true && item.status !== 'club') return false;
    if (set.includeProtected !== true && item.protected) return false;
    if (set.minimumOvr && item.ovr < set.minimumOvr) return false;
    if (set.maximumOvr && item.ovr > set.maximumOvr) return false;
    if (set.rarity && String(item.rarity).toLowerCase() !== String(set.rarity).toLowerCase()) return false;
    return true;
  }).map((item)=>({ item, ...calculateItemScore(item) }));
  const committedScore=added.reduce((sum,item)=>sum+calculateItemScore(item).score,0);
  const thresholds = (set.thresholds || []).filter((value)=>Number.isInteger(value)&&value>0).sort((a,b)=>a-b);
  const target=thresholds.find((value)=>committedScore<value)??null;
  const selected=target?findSubset(pool,target-committedScore):thresholds.length?[]:pool;
  const plannedScore=selected.reduce((sum,entry)=>sum+entry.score,0);
  const score=committedScore+plannedScore;
  return { setId:set.id, eligibleInstanceIds:selected.map((entry)=>entry.item.instanceId), addedInstanceIds:added.map((item)=>item.instanceId), score, committedScore, plannedScore, estimated:added.some((item)=>calculateItemScore(item).estimated)||selected.some((entry)=>entry.estimated), scoreTableVersion:ITEM_SCORE_TABLE_VERSION, nextThreshold:target, itemCount:selected.length };
}

function findSubset(items,target){
  let best=null;let visited=0;
  const sorted=items.sort((a,b)=>Number(b.item.duplicate)-Number(a.item.duplicate)||a.item.ovr-b.item.ovr||a.item.instanceId.localeCompare(b.item.instanceId));
  function walk(start,chosen,score,nonDuplicates,totalOvr){
    visited++;if(visited>180000)return;
    if(score>=target){const candidate={chosen:[...chosen],score,nonDuplicates,totalOvr};if(!best||candidate.nonDuplicates<best.nonDuplicates||candidate.nonDuplicates===best.nonDuplicates&&(candidate.totalOvr<best.totalOvr||candidate.totalOvr===best.totalOvr&&candidate.score<best.score))best=candidate;return;}
    for(let index=start;index<sorted.length;index++){if(best&&nonDuplicates+Number(!sorted[index].item.duplicate)>best.nonDuplicates)continue;const entry=sorted[index];walk(index+1,[...chosen,entry],score+entry.score,nonDuplicates+Number(!entry.item.duplicate),totalOvr+entry.item.ovr);if(visited>180000)return;}
  }
  walk(0,[],0,0,0);
  return best?.chosen??sorted;
}
