import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAttemptBudget} from './attempt-budget.mjs';
import {createAnalyzer} from './nebius.mjs';

test('independent processes and restarts share four exclusive attempt slots',t=>{
  const root=mkdtempSync(join(tmpdir(),'clearbrief-budget-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const dir=join(root,'budget'),a=createAttemptBudget(dir),b=createAttemptBudget(dir);
  a.reserve();b.reserve();a.reserve();b.reserve();
  const restarted=createAttemptBudget(dir);
  assert.equal(restarted.remaining(),0);
  for(const budget of [a,b,restarted])assert.throws(()=>budget.reserve(),/PERSISTENT_CALL_LIMIT/);
});

test('failed network attempts remain consumed after adapter restart; fifth sends nothing',async t=>{
  const root=mkdtempSync(join(tmpdir(),'clearbrief-budget-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const dir=join(root,'budget');let requests=0;
  for(let index=0;index<5;index++) {
    const analyzer=createAnalyzer({key:'synthetic-test',attemptBudget:createAttemptBudget(dir),
      fetchImpl:async()=>{requests++;throw new Error('simulated connection loss');}});
    await assert.rejects(analyzer.analyze('A fictional brief long enough to validate.'),
      index<4?/NEBIUS_REQUEST_FAILED/:/PERSISTENT_CALL_LIMIT/);
  }
  assert.equal(requests,4);
});

test('unwritable or missing budget storage prevents any network request',async t=>{
  const root=mkdtempSync(join(tmpdir(),'clearbrief-budget-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const file=join(root,'file');writeFileSync(file,'not a directory');
  assert.throws(()=>createAttemptBudget(file),/ATTEMPT_BUDGET_UNAVAILABLE/);
  const dir=join(root,'budget'),budget=createAttemptBudget(dir);rmSync(dir,{recursive:true});
  let requests=0;
  const analyzer=createAnalyzer({key:'synthetic-test',attemptBudget:budget,fetchImpl:async()=>requests++});
  await assert.rejects(analyzer.analyze('A fictional brief long enough to validate.'),/ATTEMPT_BUDGET_UNAVAILABLE/);
  assert.equal(requests,0);
});
