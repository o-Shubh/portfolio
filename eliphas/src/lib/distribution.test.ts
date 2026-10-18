import test from "node:test";
import assert from "node:assert/strict";
import { distributionEstimate } from "./distribution.ts";
test("split conserves proceeds and deducts platform operating costs",()=>{
 assert.deepEqual(distributionEstimate(25000,12000,20,1000,1500),{pool:13000,platform:2600,author:10400,contribution:1600,viable:true});
});
test("losses and zero surplus cannot pass margin gate",()=>{
 assert.equal(distributionEstimate(10000,12000,20,1000,0).contribution,-3000);
 assert.equal(distributionEstimate(10000,12000,20,1000,0).viable,false);
 assert.equal(distributionEstimate(0,0,20,0,0).viable,false);
});
test("rounding retains every minor unit",()=>{
 const r=distributionEstimate(101,0,33,0,0); assert.equal(r.platform+r.author,101);
});
test("reject invalid input and unsafe amounts",()=>{
 for(const v of [NaN,Infinity,-1,1.5,Number.MAX_SAFE_INTEGER]) assert.throws(()=>distributionEstimate(v,0,20,0,0));
 assert.throws(()=>distributionEstimate(100,0,101,0,0));
});
